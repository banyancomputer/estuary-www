import styles from '@pages/app.module.scss';

import * as React from 'react';
import * as U from '@common/utilities';
import * as C from '@common/constants';
import * as R from '@common/requests';
import * as Flags from '@common/flags';
import * as Crypto from '@common/crypto';

/* Wallet Sign In */
import WalletConnect from '@walletconnect/web3-provider';
import { ethers } from 'ethers';
import { SiweMessage } from 'siwe';

declare global {
  interface Window {
    ethereum: { request: (opt: {method: string}) => Promise<Array<string>> };
    web3: unknown;
  }
}

const enum Providers {
  METAMASK = 'metamask',
  WALLET_CONNECT = 'walletconnect',
}

let metamask = undefined;
let walletconnect: WalletConnect;

import Cookies from 'js-cookie';
import Page from '@components/Page';
import Navigation from '@components/Navigation';
import SingleColumnLayout from '@components/SingleColumnLayout';
import Input from '@components/Input';
import Button from '@components/Button';

import { H1, H2, H3, H4, P } from '@components/Typography';

const ENABLE_SIGN_IN_WITH_FISSION = false;

export async function getServerSideProps(context) {

  const viewer = await U.getViewerFromHeader(context.req.headers);
  const host = context.req.headers.host;
  const protocol = host.split(':')[0] === 'localhost' ? 'http' : 'https';

  if (viewer) {
    return {
      redirect: {
        permanent: false,
        destination: '/home',
      },
    };
  }

  return {
    props: { host, protocol, api: process.env.ESTUARY_API, hostname: `https://${host}` },
  };
}

/*
  Handles Authenticating a User with an API Token
  Routes directly to /user/stats, and is validated by middleware
 */
async function handleTokenAuthenticate(state: any, host) {
  let response = await fetch(`${host}/user/stats`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${state.key}`,
    },
  });
  if (response && response.status === 403) {
    alert("Invalid API key");
  }else {
    Cookies.set(C.auth, state.key);
    window.location.reload();
  }
  return response;
}

/*
  Handle Sign In with a Crypto Wallet
  This should support logic for all login Providers.
  References to MetaMask extensions must be passed in as a prop.
 */
async function handleSiweLogin(state: any, host, connector: Providers, _metamask: any = undefined) {
  console.log("Handling Siwe Login");

  /*
   * Fetch a new nonce from the Estuary backend in order to use it for the Siwe message
   * This nonce is kept in a short-lived (5 min) session on the Estuary backend
   * The Request needs to succeed within that period of time.
   */
  const nonce = await fetch(`${host}/nonce`, {
    mode: 'cors',
    headers: {
      'Access-Control-Allow-Origin': `http://${host}`,
      'Access-Control-Allow-Credentials': 'true'
    },
    method: 'GET',
    credentials: 'include',
  }).then((res) => res.text().then((text) => {
        // TODO: Figure out why Estuary handleNonce gives us this messed up format
        // Remove any non-aplha-numeric characters from the nonce
        return text.replace(/[^a-zA-Z0-9]/g, '');
      }
  ));

  console.log(" - Received nonce: ", nonce);


  /**
   * Connect to a user's wallet and start an etherjs provider.
   */
  let provider: ethers.providers.Web3Provider;

  if (connector === 'metamask') {
    await _metamask.request({
      method: 'eth_requestAccounts',
    });
    // Fun fact: MetaMask also uses infura for its RPC: we should maybe use the same Infura for all providers
    provider = new ethers.providers.Web3Provider(_metamask);
  } else {
    walletconnect = new WalletConnect({
      // TODO - replace with your own Infura ID
      infuraId: '8fcacee838e04f31b6ec145eb98879c8',
    });
    walletconnect.enable();
    provider = new ethers.providers.Web3Provider(walletconnect);
  }

  // Get the user's address
  const [address] = await provider.listAccounts();
  if (!address) {
    throw new Error('Address not found.');
  }
  console.log(" - Wallet address: ", address);

  /**
   * Try to resolve address ENS and updates the title accordingly.
   */
  let ens: string;
  try {
    ens = await provider.lookupAddress(address);
    console.log(' - ENS:', ens);
  } catch (error) {
    console.error(error);
  }

  /**
   * Creates the message object
   */

  // note (al) - the domain should not include protocol or port, this won't parse correctly if it does
  const domain = host.split('//')[1].split(':')[0];

  const message = new SiweMessage({
    domain,
    address,
    chainId: await provider.getNetwork().then(({ chainId }) => chainId),
    uri: document.location.origin,
    version: '1',
    statement: 'Banyan Estuary Login',
    nonce
  }).prepareMessage();

  // Log the message
  console.log(' - Message:', message);


  /**
   * Generates the message to be signed and uses the provider to ask for a signature
   */
  const signature = await provider.getSigner().signMessage(message);

  /**
   * Calls our login endpoint to validate the message, if successful it will
   * provide the user with an API token they can use to authenticate themselves
   */
  fetch(`${host}/login`, {
    method: 'POST',
    body: JSON.stringify({ message, ens, signature }),
    mode: 'cors',
    headers: {
      'Access-Control-Allow-Origin': `http://${host}`,
      'Access-Control-Allow-Credentials': 'true'
    },
    credentials: 'include',
    // credentials: 'include'
  }).then((res) => {
    if (res.status === 200) {
      res.json().then((data) => {
        console.log('Authenticated with SIWE scheme.');

        Cookies.set(C.auth, data.token);
        window.location.href = '/home';
        return;
      }
    )} else {
      res.json().then((err) => {
        /* TODO - handle errors on the frontend */
        console.error(err);
      });
  }});
}

/*
  Handles sign in with a username and password
  I don't think we plan on supporting that workflow, but I'll keep the definition around
 */
async function handleSignIn(state: any, host, connector: Providers) {
  let provider = ethers.providers.Web3Provider;

  if (U.isEmpty(state.username)) {
    return { error: 'Please provide a username.' };
  }

  if (U.isEmpty(state.password)) {
    return { error: 'Please provide a password.' };
  }

  if (!U.isValidUsername(state.username)) {
    return { error: 'Your username must be 1-48 characters or digits.' };
  }

  // NOTE(jim) We've added a new scheme to keep things safe for users.
  state.passwordHash = await Crypto.attemptHashWithSalt(state.password);

  let r = await fetch(`${host}/login`, {
    method: 'POST',
    body: JSON.stringify({ passwordHash: state.passwordHash, username: state.username }),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (r.status !== 200) {
    // NOTE(jim): We don't know the users password ever so we can't do anything on their
    // behalf, but if they were authenticated using the old method, we can do one more retry.
    const retryHash = await Crypto.attemptHash(state.password);

    let retry = await fetch(`${host}/login`, {
      method: 'POST',
      body: JSON.stringify({ passwordHash: retryHash, username: state.username }),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (retry.status !== 200) {
      return { error: 'Failed to authenticate' };
    }

    const retryJSON = await retry.json();
    if (retryJSON.error) {
      return retryJSON;
    }

    if (!retryJSON.token) {
      return { error: 'Failed to authenticate' };
    }

    console.log('Authenticated using legacy scheme.');

    Cookies.set(C.auth, retryJSON.token);

    console.log('Attempting legacy scheme revision on your behalf');

    try {
      const response = await R.put('/user/password', { newPasswordHash: state.passwordHash }, host);
    } catch (e) {
      console.log('Failure:', e);
    }

    window.location.href = '/home';
    return;
  }

  const j = await r.json();
  if (j.error) {
    return j;
  }

  if (!j.token) {
    return { error: 'Failed to authenticate' };
  }

  console.log('Authenticated using advanced scheme.');
  Cookies.set(C.auth, j.token);
  window.location.href = '/home';
  return;
}

function SignInPage(props: any) {


  const [state, setState] = React.useState({ loading: false, authLoading: false, fissionLoading: false, username: '', password: '', key: '' });

  const authorise = null;
  const authScenario = null;
  const signIn = null;

  /* TODO: Figure out UI layout */
  return (
    <Page title="Banyan: Sign in" description="Sign in with your Crypto Wallet." url={`${props.hostname}/sign-in`}>
      <Navigation active="SIGN_IN" />
      <SingleColumnLayout style={{ maxWidth: 488 }}>
        <H2>Sign in</H2>

        <P style={{ marginTop: 16 }}>You can use your Crypto Wallet to sing in!</P>
        {/*<H4 style={{ marginTop: 32 }}>Username</H4>*/}
        {/*<Input*/}
        {/*  style={{ marginTop: 8 }}*/}
        {/*  placeholder="Your account's username"*/}
        {/*  name="username"*/}
        {/*  value={state.username}*/}
        {/*  onChange={(e) => setState({ ...state, [e.target.name]: e.target.value })}*/}
        {/*/>*/}

        {/*<H4 style={{ marginTop: 24 }}>Password</H4>*/}
        {/*<Input*/}
        {/*  style={{ marginTop: 8 }}*/}
        {/*  placeholder="Your account's password"*/}
        {/*  type="password"*/}
        {/*  value={state.password}*/}
        {/*  name="password"*/}
        {/*  onChange={(e) => setState({ ...state, [e.target.name]: e.target.value })}*/}
        {/*  onSubmit={async () => {*/}
        {/*    setState({ ...state, loading: true });*/}
        {/*    const response = await handleSignIn(state, props.api);*/}
        {/*    if (response && response.error) {*/}
        {/*      alert(response.error);*/}
        {/*      setState({ ...state, loading: false });*/}
        {/*    }*/}
        {/*  }}*/}
        {/*/>*/}

        <div className={styles.actions}>
            {/*/!*TODO: Figure out how to control whether this is rendered *!/*/}
            {/*/!*TODO: NextJs Can only access `window.ethereum` in the browser*!/*/}
            <Button
              style={{ width: '100%' }}
              loading={state.loading ? state.loading : undefined}
              onClick={async () => {
                // If we metamask is available, we can use it to sign in.
                if (window.ethereum) {
                  setState({...state, loading: true});
                  // You need to pass `window.ethereum` to the sign in function,
                  // If the provider is MetaMask
                  const response = await handleSiweLogin(
                      state, props.api, Providers.METAMASK, window.ethereum
                  );
                  if (response && response.error) {
                    alert(response.error);
                  }
                  setState({...state, loading: false});
                } else {
                  alert('Please install MetaMask to sign in.');
                }
              }}
            >
              Sign in with MetaMask
            </Button>

          <Button
              style={{ width: '100%', marginTop: 8 }}
              onClick={async () => {
                setState({ ...state, loading: true });
                const response = await handleSignIn(state, props.api, Providers.WALLET_CONNECT);
                if (response && response.error) {
                  alert(response.error);
                  setState({ ...state, loading: false });
                }
              }}
          >
            Sign in with WalletConnect
          </Button>

          {/* TODO: Point to resource for creating a wallet*/}
          {/*<Button*/}
          {/*  style={{*/}
          {/*    width: '100%',*/}
          {/*    marginTop: 12,*/}
          {/*    background: 'var(--main-button-background-secondary)',*/}
          {/*    color: 'var(--main-button-text-secondary)',*/}
          {/*  }}*/}
          {/*  href="/sign-up"*/}
          {/*>*/}
          {/*  Create an account instead*/}
          {/*</Button>*/}
        </div>

        {/*TODO: Remove, we're not supporting Key Authentication */}
        {/*TODO: Determine if we still want to allow people to register wallets with an API key*/}
        {/*TODO: I assume that would be a good feature to have*/}
        <H3 style={{ marginTop: 32 }}>Authenticate Using Key</H3>
        <P style={{ marginTop: 8 }}>You can authenticate using an API key if you have one.</P>

        <H4 style={{ marginTop: 32 }}>API key</H4>
        <Input
          style={{ marginTop: 8 }}
          placeholder="ex: ESTxxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxxARY"
          name="key"
          value={state.key}
          onChange={(e) => setState({ ...state, [e.target.name]: e.target.value })}
        />

        <div className={styles.actions}>
          <Button
            style={{ width: '100%' }}
            loading={state.authLoading ? state.authLoading : undefined}
            onClick={async () => {
              setState({ ...state, authLoading: true });
              if(U.isEmpty(state.key)){
                alert('Please enter an API key');
                setState({ ...state, authLoading: false });
                return;
              }
              await handleTokenAuthenticate(state, props.api).then((response) => {
                if(response.status == 403){
                  setState({ ...state, authLoading: false });
                }
              });
            }}
          >
            Authenticate
          </Button>
        </div>
      </SingleColumnLayout>
    </Page>
  );
}

export default SignInPage;
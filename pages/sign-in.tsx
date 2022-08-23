import styles from '@pages/app.module.scss';

import * as React from 'react';
import * as U from '@common/utilities';
import * as C from '@common/constants';

/* Wallet Sign In */
import * as S from '@common/siwe';

declare global {
  interface Window {
    ethereum: { request: (opt: {method: string}) => Promise<Array<string>> };
    web3: unknown;
  }
}

import Cookies from 'js-cookie';
import Page from '@components/Page';
import Navigation from '@components/Navigation';
import SingleColumnLayout from '@components/SingleColumnLayout';
import Input from '@components/Input';
import Button from '@components/Button';

import { H1, H2, H3, H4, P } from '@components/Typography';

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

/**
 * Sign in with a crypto wallet
 * @param state
 * @param host
 * @param connector
 * @param _extension - A reference to a browser extension referencing a wallet address. In this case, MetaMask.
 * @returns {Promise<err>} - Returns a promise that resolves to an error if there is one.
 */
async function handleSiweLogin(state: any, host, connector: S.EthProviders, _extension: any = undefined) {
  console.log("Handling Siwe Login");
  // Note (al): figure out why TS is complaining about this
  let providerData = await S.getProviderData(connector, _extension).catch(err => {
    return null;
  });
    if (!providerData) {
        alert("Could not connect to wallet");
        return;
    }
  let { provider, address, ens } = providerData;
  let authKey: string | {error: any} = await S.estuaryAuth(provider, address, ens).catch(err => {
    return null;
  });
    if (!authKey) {
        alert("Could not retrieve auth key");
        return;
    }
  console.log("Auth Key: ", authKey);
  Cookies.set(C.auth, authKey, {
    expires: 1,
    sameSite: 'lax',
  });
  // Set a cookie with the provider
  Cookies.set(C.providerData, providerData, {
    expires: 1,
  });
  // Delete the cookie for the nonce
  Cookies.remove(C.siweNonce);
  // Navigate to the home page
  window.location.href = '/home';
  return null;
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
                  let err = await handleSiweLogin(
                      state, props.api, S.EthProviders.METAMASK, window.ethereum
                  );
                  if (err && err.error) {
                    alert(err.error);
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
                let err = await handleSiweLogin(
                    state, props.api, S.EthProviders.WALLET_CONNECT
                );
                if (err) {
                  alert(err.error);
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
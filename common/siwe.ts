/**
 * Banyan Browser Authentication:
 *  - This is an example/template for the browser authentication flow.
 *  - Use this in order to retrieve an API key from an Estuary node in order to allow your clients
 *    to start using the Banyan network.
 */

import WalletConnect from '@walletconnect/web3-provider';
import { ethers } from 'ethers';
import { SiweMessage } from "siwe";
import * as C from '@common/constants';

const EstuaryHost = C.api.host;

/* note (al): the Ethereum providers we currently support are: */
export const enum EthProviders {
    METAMASK = 'metamask',
    WALLET_CONNECT = 'walletconnect',
}

/*
 * Type to hold the current provider
 * This can be used to identify the user and sign transactions
 */
export type ProviderData = {
    provider: ethers.providers.Web3Provider,
    address: string,
    ens: string
}

/**
 * @description Attempt to get an Ethereum provider from the client.
 * @returns {providerData} - The provider data.
 */
export async function getProviderData(
    connector: EthProviders, // The connector to use
    _extension: any = undefined // The extension to use (if any)
): Promise<ProviderData> {
    /**
     * Connect to a user's wallet and start an etherjs provider.
     */
    let provider: ethers.providers.Web3Provider;

    if (connector === 'metamask') {
        await _extension.request({
            method: 'eth_requestAccounts',
        });
        provider = new ethers.providers.Web3Provider(_extension);
    } else {
        let walletconnect: WalletConnect = new WalletConnect({
            // TODO - replace with your own Infura ID
            infuraId: '8fcacee838e04f31b6ec145eb98879c8',
        });
        walletconnect.enable();
        provider = new ethers.providers.Web3Provider(walletconnect);
    }

    // Get the user's address
    const [address] = await provider.listAccounts();
    if (!address) {
        throw new Error('No address found');
    }

    /**
     * Try to resolve address ENS and updates the title accordingly.
     */
    let ens: string;
    try {
        ens = await provider.lookupAddress(address);
    } catch (error) {
        throw new Error(error);
    }
    return { provider, address, ens } as ProviderData;
}

/**
 * Retrieve an API key from Estuary using an ETH provider and address. This key is used to authenticate requests to stage files.
 * @param provider The ETH provider to use to retrieve the API key.
 * @param address The address to use to retrieve the API key.
 * @param ens=undefined The ENS to use to retrieve the API key.
 * @param host=EstuaryHost The host to use to retrieve the API key from.
 * @returns The API key that lasts 30 days. Either keep track of it or sign it out when you're done using it.
 */
export async function estuaryAuth(
    provider: ethers.providers.Web3Provider,
    address: string,
    ens: string = '', // TODO: Should we resolve the ENS ourself?
    host: string = EstuaryHost
): Promise<string> {
    // In order to prevent Replay Attacks, we need to get a nonce from the server.
    const nonce = await getNonce();
    if (!nonce) {
        throw new Error('Could not get nonce');
    }

    // Create a message to sign
    const message = new SiweMessage({
        // Constant Configuration
        domain: host.split('//')[1],
        chainId: await provider.getNetwork().then(({chainId}) => chainId),
        uri: document.location.origin,
        version: '1',
        statement: 'Banyan Estuary Login',
        // Variable Per-User Configuration
        address,
        nonce
    }).prepareMessage();
    // Sign the message using the provider to ask for a signature
    const signature = await provider.getSigner().signMessage(message);
    // Now we send the message to our Estuary Endpoint to get an API key
    const authKey = await getAuthKey(message, signature, ens, host);
    if (!authKey) {
        throw new Error('Could not get auth key');
    }
    return authKey;
}

/**
 * @description Attempt to get the nonce from the Estuary server.
 * @returns {string} - The nonce.
 */
async function getNonce(host: string = EstuaryHost): Promise<string> {
    return await fetch(`${host}/nonce`, {
        // Allow cross-origin requests
        mode: 'cors',
        headers: {
            'Access-Control-Allow-Origin': `http://${host}`,
            'Access-Control-Allow-Credentials': 'true'
        },
        method: 'GET',
        credentials: 'include',
    }).then((res) =>
        res.text().then((text) => {
            // Remove any non-aplha-numeric characters from the nonce
            // TODO - Figure out how to simplify this
            return text.replace(/[^a-zA-Z0-9]/g, '');
        }).catch((err) => {
            console.log(err);
            return '';
        })
    ).catch((err) => {
        console.log(err);
        return '';
    });
}

/**
 * Get an API key from Estuary using an existing session and SIWE message
 * @param message The SIWE message to use to get the API key.
 * @param signature The signature of the SIWE message.
 * @param ens='' The ENS to use to get the API key. This can be blank.
 * @param host=EstuaryHost The host to use to retrieve the API key from.
 * @returns The API key that lasts 30 days. Either keep track of it or sign it out when you're done using it.
 */
export async function getAuthKey(
    message: string,
    signature: string,
    ens: string = '',
    host: string = EstuaryHost
): Promise<string> {
    // Submit a Sign-In request to the Estuary server
    return fetch(`${host}/login`, {
        method: 'POST',
        body: JSON.stringify({message, ens, signature}),
        mode: 'cors',
        headers: {
            'Access-Control-Allow-Origin': `http://${host}`,
            'Access-Control-Allow-Credentials': 'true'
        },
        credentials: 'include',
    }).then((res) => {
        console.log(res);
        if (res.status === 200) {
            // Extract the API key from the response
            return res.json().then((data) => {
                console.log(data);
                return data.token;
            }).catch((err) => {
                console.log("Error authenticating against Estuary: ", err);
                return '';
            });
        }
        else {
            console.log("Error authenticating against Estuary: Bad status code: ", res.status);
            return '';
        }
    }).catch((err) => {
        console.log("Error authenticating against Estuary: ", err);
        return '';
    });
}
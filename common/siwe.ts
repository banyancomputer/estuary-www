/**
 * Banyan Browser Authentication:
 *  - This is an example/template for the browser authentication flow.
 *  - Use this in order to retrieve an API key from an Estuary node in order to allow your clients
 *    to start using the Banyan network.
 */

import WalletConnect from '@walletconnect/web3-provider';
import { ethers } from 'ethers';
import { SiweMessage } from "siwe";

const EstuaryHost = process.env.ESTUARY_HOST || 'http://localhost:4443';

/**
 * Retrieve an API key from Estuary using an ETH provider and address. This key is used to authenticate requests to stage files.
 * @param provider The ETH provider to use to retrieve the API key.
 * @param address The address to use to retrieve the API key.
 * @param ens=undefined The ENS to use to retrieve the API key.
 * @param host=EstuaryHost The host to use to retrieve the API key from.
 * @returns The API key that lasts 30 days. Either keep track of it or sign it out when you're done using it.
 */
export async function getStagingAuthKey(
    provider: ethers.providers.Web3Provider,
    address: string,
    ens: string = '', // TODO: Should we resolve the ENS ourself?
    host: string = EstuaryHost
): Promise<string | undefined> {
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
    return await getAuthKey(message, signature, ens, host);
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
): Promise<string | undefined> {
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
            res.json().then((data) => {
                return data.token;
            });
        }
        else {
            // TODO: More Descriptive Error Handling
            console.error("Could not retrieve API key");
            return '';
        }
    }).catch((err) => {
        console.log(err);
        return '';
    });
}
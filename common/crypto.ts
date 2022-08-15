import bcrypt from 'bcryptjs';

import * as U from '@common/utilities';
import * as C from '@common/constants';

/* Wallet Sign In */
import WalletConnect from '@walletconnect/web3-provider';
import { ethers } from 'ethers';

export async function attemptHash(password) {
  if (U.isEmpty(password)) {
    return '';
  }

  const bcryptPromise = async () =>
    new Promise((resolve, reject) => {
      bcrypt.hash(password, C.salt, function(err, hash) {
        if (err) {
          console.log(err);
          return reject('');
        }

        return resolve(hash);
      });
    });

  var hash = await bcryptPromise();
  return hash;
}

export async function attemptHashWithSalt(password) {
  if (U.isEmpty(password)) {
    return '';
  }

  let saltedPassword = `${password}-${C.salt}`;

  const bcryptPromise = async () =>
    new Promise((resolve, reject) => {
      bcrypt.hash(saltedPassword, C.salt, function(err, hash) {
        if (err) {
          console.log(err);
          return reject('');
        }

        return resolve(hash);
      });
    });

  var hash = await bcryptPromise();
  return hash;
}

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
export async function getProviderData(connector: EthProviders, _extension: any = undefined): Promise<ProviderData | { error: any }> {
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
    return { error: Error('Address not found.') };
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
    return { error: error };
  }

  return { provider, address, ens } as ProviderData;
}

import {DealConfiguration} from "./banyan";
import WalletConnect from "@walletconnect/web3-provider";

/*
 * Application Defining Constants:
 * */

/* Endpoints and Contract Addresses */
export const default_executor_address = '0x1000000000000000000000000000000000000000';
export const eth_blocks_per_year = 365 * 6344; // TODO: Find a better way to do this
export const USDC_ADDRESS = '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174';

/* Constant and default Structs and Classes */

/*
 * Our Default Deal Configuration
 */
export const DefaultDealConfiguration: DealConfiguration = {
  executor_address: default_executor_address,
  deal_length_in_blocks: eth_blocks_per_year,
  proof_frequency_in_blocks: 1, // TODO: What is the unit for this?
  bounty_per_tib: 10.00,
  collateral_per_tib: .01,
  erc20_token_denomination: USDC_ADDRESS,
}

/* Cookie Related Constants */

// Auth Cookie key
export const auth = 'ESTUARY_TOKEN';
// SIWE Session Cookie key
export const siweNonce = 'SIWE_NONCE';
// Cookie for holding what provider the user is using
export const userWallet = 'USER_WALLET';

/* Misc Constants */

// Application Status Colors
export const statusColors = {
  0: `var(--status-0)`,
  1: `var(--status-1)`,
  2: `var(--status-2)`,
  3: `var(--status-3)`,
  4: `var(--status-4)`,
  5: `var(--status-5)`,
  6: `var(--status-6)`,
  7: `var(--status-7)`,
  8: `var(--status-8)`,
  9: `var(--status-9)`,
  10: `var(--status-10)`,
  11: `var(--status-11)`,
  12: `var(--status-12)`,
  13: `var(--status-13)`,
  14: `var(--status-14)`,
  15: `var(--status-15)`,
  16: `var(--status-16)`,
};

/* Helpers */

// TODO - this is a temporary solution until we have a better way to configure the API host

export function getContractAddress(): string {
  if (process.env.BANYAN_CONTRACT_ADDRESS) {
    return process.env.BANYAN_CONTRACT_ADDRESS;
  }

  switch (process.env.NODE_ENV) {
    case 'production':
      // TODO: Get a real contract address
      return '0x0000000000000000000000000000000000000000';
    default:
      return '0x595481A61df02A716b829411daD9838578d10072';
  }
}

function getAPIHost(): string {
  if (process.env.ESTUARY_API) {
    return process.env.ESTUARY_API;
  }

  switch (process.env.NODE_ENV) {
    case 'production':
      // TODO: Configure to point to our acutal production API
      return 'https://api.estuary.tech';
    default:
      return 'http://localhost:3004';
  }
}

export const api = {
  host: getAPIHost(),
};

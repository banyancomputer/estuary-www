// NOTE(jim): https://github.com/filecoin-project/go-data-transfer/blob/master/statuses.go
// Definitions
import * as O from "@common/ethDeal";

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

// Auth Cookie key
export const auth = 'ESTUARY_TOKEN';
// SIWE Session Cookie key
export const siweNonce = 'SIWE_NONCE';
// Cookie for holding what provider the user is using
export const providerData = 'PROVIDER_DATA';

// A statsResp Type to handle responses from /contents/stats
export type StatsResp = {
  id: string;
  cid: string;
  filename: string;
  dealId: string;
}

// NOTE(jim)
// Valid username regex
export const regex = {
  // NOTE(jim): only characters and digits.
  username: /^[a-zA-Z0-9]{1,32}$/,
  // NOTE(jim): eight characters, at least one letter and one number.
  password: /^(?=.*[A-Za-z])(?=.*\d).{8,}$/,
};

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

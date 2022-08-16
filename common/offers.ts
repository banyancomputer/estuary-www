/* note (al): This file contains all the constants and functions to interact with Ethereum */


// The information needed in order to submit a deal to the blockchain
export type DealConfiguration = {
    deal_length_in_blocks: number, // How long the deal should be in Ehtereum Blocks
    proof_frequency: number, // How often Proofs should be submitted

    price: number, // The price of the deal in Ether, in $ per TiB
    price_denomination: string, // The Token denomination for the price

    collateral: number, // The amount of collateral in Ether, in $ per TiB
    collateral_denomination: string, // The Token denomination for the collateral

    // Not sure what else needs to get added here
}

export const DefaultDealConfiguration: DealConfiguration = {
    deal_length_in_blocks: 0,
    proof_frequency: 0,
    price: 1,
    price_denomination: 'USDC',
    collateral: .01,
    collateral_denomination: 'USDC',
}

export enum OfferStatus { NON, OFFER_CREATED, OFFER_COMPLETED, OFFER_CANCELLED, OFFER_WITHDRAWN }

export function offerDescription(offerStatus: OfferStatus): string {
    switch (offerStatus) {
        case OfferStatus.OFFER_CREATED:
            return 'Offer Created';
        case OfferStatus.OFFER_COMPLETED:
            return 'Offer Completed';
        case OfferStatus.OFFER_CANCELLED:
            return 'Offer Cancelled';
        case OfferStatus.OFFER_WITHDRAWN:
            return 'Offer Withdrawn';
        default:
            return 'Make an Offer';
    }
}

export type OfferCounterpart = {
    // bytes32 commitment;
    // uint256 amount;
    // UserStatus offerorStatus;
}

export type Offer = {
    // address: token;
    // address: creator;
    // OfferCounterpart creatorCounterpart;
    // address executor;
    // OfferCounterpart executorCounterpart;
    // uint256 id;
    offerStatus: OfferStatus;
    fileCid: string; // TODO: Doesn't this have to be on chain?
};

/* For querying and interacting with the blockchain */

// Get Offer MetaData by its on-chain ID
export async function getOffer(id: number): Promise<Offer> {return {
    offerStatus: OfferStatus.NON,
    fileCid: '',
}}

// Get all Offers for a User based on their address
export async function getOffers(address: string): Promise<Offer[]> {
    return [{
        offerStatus: OfferStatus.NON,
        fileCid: '',
    }]
}

// Submit a deal to chain
export async function makeOffer(config: DealConfiguration): Promise<number> {
    return 0;
}

/* For Using on-chain data to populate the UI */

// TODO: Figure out where the CID is cross-referenced with the offer on-chain
// Get the status of a file based on its CID and on-chain Offers
export function getOfferStatus(cid: string, offers: Offer[]): OfferStatus {
    // If the CID is included in the offer, then return the offer status
    for (let offer of offers) {
        if (offer.fileCid === cid) {
            return offer.offerStatus;
        }
    }
    // Otherwise, an offer has not been made yet
    return OfferStatus.NON;
}

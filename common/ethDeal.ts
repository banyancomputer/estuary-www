import Cookies from 'js-cookie';
import * as C from './constants';

/* note (al): This file contains all the constants and functions to interact with Ethereum */

/* Constants */

// The address of the default Executor to propose deals to. This should just be Banyan
export const defaultExecutorAddress = '0x0000000000000000000000000000000000000000';
// The address of our Smart Contract where transactions are sent to.
export const smartContractAddress = '0x0000000000000000000000000000000000000000';

/* Types */

/**
 * This represents a default deal configuration.
 * These variables should eventually be configurable by the user.
 * This is agnostic of the finalized deal parameters.
 */
export type DealConfiguration = {
    deal_length_in_blocks: number, // How long the deal should be in Ehtereum Blocks
    proof_frequency: number, // How often Proofs should be submitted, in proofs per block

    // TODO: Figure out a better Unit for this
    bounty_per_byte: number, // The price of the deal in the Token, in $ per Byte
    collateral_per_byte: number, // The amount of collateral in Ether, in $ per Byte
    token_denomination: string, // The Token denomination for the collateral

    // Everything else needs to be generated based on the file
}

export const DefaultDealConfiguration: DealConfiguration = {
    deal_length_in_blocks: 0,
    proof_frequency: 0,
    bounty_per_byte: 0.01,
    collateral_per_byte: .001,
    token_denomination: 'USDC',
}

/**
 * This represents a deal proposal that is ready to be sent to the smart contract.
 */
export type DealProposal = {
    executor_address: string, // The address of the Executor to propose the deal to

    deal_length_in_blocks: number, // How long the deal should be in Ehtereum Blocks
    proof_frequency: number, // How often Proofs should be submitted, in proofs per block

    bounty: number, // The price of the deal in the Token, in $ per Byte
    collateral: number, // The amount of collateral in Ether, in $ per Byte
    // TODO: figure out what type this field should be
    token_denomination: string, // The Token denomination for the collateral

    file_cid: string, // The CID of the file to be uploaded
    file_size: number, // The size of the file to be uploaded
    file_blake3: string, // The Blake3 hash of the file to be uploaded
}


/**
 * The different states a deal can be in.
 */
export enum DealStatus { NON, PROPOSED, ACCEPTED, REJECTED, EXPIRED, COMPLETED , WITHDRAWN }

/**
 * This represents a deal that has been finalized and exists on chain
 */
export type Deal = {
    // TODO: Figure out what additional fields we need to read from the smart contract
    // Or rather what data you can read from the smart contract
    status: DealStatus, // The status of the deal
}

/* Functions */

// TODO (al): the names of these functions are not great.

/**
 * description: This function generates an empty DealProposal from a DealConfiguration, but no CID or Blake3 hash.
 * @param executorAddress The address of the Executor to propose the deal to
 * @param dealConfiguration The DealConfiguration to use to generate the DealProposal
 * @param file The file to be uploaded
 */
export function generateDealProposal(
    executorAddress: string, dealConfiguration: DealConfiguration, file: File): DealProposal
{
    // TODO: Need to get the CID and Blake3 hash of the file somehow
    // Either you do this in the browser or you pre-batch the file into staging, process it, then get the CID and Blake3 hash

    return {} as DealProposal;
}

/**
 * description: This function finalizes a DealProposal with a CID and Blake3 hash.
 * @param dealProposal The DealProposal to finalize
 * @param cid The CID of the file to be uploaded
 * @param blake3 The Blake3 hash of the file to be uploaded
 */
export function finalizeDealProposal(dealProposal: DealProposal, cid: string, blake3: string): DealProposal
{
    dealProposal.file_cid = cid;
    dealProposal.file_blake3 = blake3;
    return dealProposal;
}

export function getDealStatusDescription(dealStatus: DealStatus): string {
    switch (dealStatus) {
        case DealStatus.NON:
            return 'Non';
        case DealStatus.PROPOSED:
            return 'Proposed';
        case DealStatus.ACCEPTED:
            return 'Accepted';
        case DealStatus.REJECTED:
            return 'Rejected';
        case DealStatus.EXPIRED:
            return 'Expired';
        case DealStatus.COMPLETED:
            return 'Completed';
        case DealStatus.WITHDRAWN:
            return 'Withdrawn';
        default:
            return 'Unknown';
    }
}

/* For querying and interacting with the blockchain */

// Get Offer MetaData by its on-chain ID
export async function getDealByID(id: number): Promise<Deal | undefined> {
    return {
        status: DealStatus.NON,
    } as Deal;
}

// Get all Offers for associated with the given address
export async function getDealsByAddress(address: string): Promise<Deal[]> {
    return [] as Deal[];
}

// Get all offers associated with a User based on their address stored in the Session
export async function getUsersOffers(): Promise<Deal[]> {
    // Extract the address from the Session
    let address = Cookies.get(C.providerData).address;

    // Query the blockchain for all offers associated with the address

    return [] as Deal[];
}

// Submit a deal to chain. Returns the ID of the deal on chain.
export async function proposeDeal(dealProposal: DealProposal): Promise<number> {
    return 1;
}

import * as C from './constants';
import * as R from "@common/requests";
import Cookies from 'js-cookie';
import {ethers} from "ethers";
import Web3Modal from "web3modal";
import {web3ModalConfig} from "@common/siwe";

/* Exports for Interacting with Banyan Infrastructure */

// TODO: Did you know that Env variables in Next.js are extremely annoying?
// TODO: This is a temporary fix until we can figure out how to use them properly.
const BanyanContractAddress  = '0x899647E1A672ecC9d352027e372A453467313889' || '0x0000000000000000000000000000000000000000';

// TODO: This needs to be refactored to use the Banyan Contract correctly
const BanyanContractABI = [
    // Create a new Banyan Deal
    "function createOffer(" +
    "   address _executor_address, " +
    "   uint256 _deal_length_in_blocks, " +
    "   uint256 _proof_frequency_in_blocks, " +
    "   uint256 _bounty, " +
    "   uint256 _collateral, " +
    "   string _erc20_token_denomination," +
    "   uint256 _file_size, " +
    "   string calldata _file_cid, " +
    "   string calldata _file_blake3, " +
    ") public view returns (uint256)",

    // // Check the status of a Banyan Deal
    "function getDealStatus(uint256 _deal_id) public view returns (uint256)",

    // Get the details of a Banyan Deal
    "function getDeal(uint256 _deal_id) public view returns (uint256)", // TODO: Figure out the correct return type for this
];

/**
 * File-Agnostic Deal Configuration options
 */
export type DealConfiguration = {
    // Who to make a deal with
    executor_address: string; // The address of the Executor to propose the deal to
    // Deal timing information
    deal_length_in_blocks: number; // The number of blocks the deal will last for
    proof_frequency_in_blocks: number; // The number of blocks between each proof
    // The amount of tokens that the deal will be worth
    bounty_per_tib: number; // The price of the deal in the Token, in $ per Byte
    collateral_per_tib: number; // The amount of collateral in Ether, in $ per Byte
    erc20_token_denomination: string; // The erc20 Token denomination for the collateral
}

export interface DealMakerOptions {
    // Required
    deal_configuration: DealConfiguration; // The configuration of the deal
    // Optional
    estuary_api_key?: string // The API key for the Estuary API;
    estuary_host?: string; // The host of the Estuary node
}

/**
 * This class is used to create deals on the Banyan network.
 * It is supposed to be used by a Browser client.
 * Take full advantage of this class by using an XMLHttpRequest to upload files while tracking progress.
 */
export class DealMaker {
    private options: DealMakerOptions;
    constructor(options: DealMakerOptions) {
        this.options = options;
        // Use the Estuary host if provided, otherwise use the default.
        if (!this.options.estuary_host) {
            this.options.estuary_host = C.api.host;
        }
        // Check if the API key is defined.
        if (!this.options.estuary_api_key) {
            this.options.estuary_api_key = Cookies.get(C.auth);
        }
    }

    /**
     * @description Return the current deal configuration.
     */
    public getDealConfiguration(): DealConfiguration {
        return this.options.deal_configuration;
    }

    /**
     * @description Initialize a DealProposal to submit to our Smart Contract.
     * @param {File} file - The file to upload.
     * @param {string} cid - The content-identifier of the file. If not provided, the deal proposal won't be valid.
     * @param {string} blake3 - The blake3 hash of the file. If not provided, the deal proposal won't be valid.
     */
    public generateDealProposal(file: File, cid: string = '', blake3: string = ''): DealProposal {
        // TODO: Check if this is right
        let num_tib = (file.size / Math.pow(1024, 4))
        return {
            executor_address: this.options.deal_configuration.executor_address,
            deal_length_in_blocks: this.options.deal_configuration.deal_length_in_blocks,
            proof_frequency_in_blocks: this.options.deal_configuration.proof_frequency_in_blocks,
            bounty: this.options.deal_configuration.bounty_per_tib * num_tib,
            collateral: this.options.deal_configuration.collateral_per_tib * num_tib,
            erc20_token_denomination: this.options.deal_configuration.erc20_token_denomination,
            file_size: file.size,
            file_cid: cid,
            file_blake3: blake3,
        } as DealProposal;
    };

    /**
     * @description Upload a file to Staging and return the CID and Blake3 hash.
     * @param {File} file - The file to upload.
     * @param {XMLHttpRequest} _xhr? - The XMLHttpRequest object to use for the upload.
     *                                If no XMLHttpRequest is provided, a new one will be created.
     *                                This function implements onloadend and onerror for whatever Requester is used
     *                                and returns the response or error as a Promise.Any other handler must be customized
     *                                by the caller.
     * @returns {Promise<{cid: string, blake3: string}>} - The CID and Blake3 hash of the file.
     */
    public async stageFile(
      file: any, // The file to upload.
      _xhr?: XMLHttpRequest, // The (optional) XMLHttpRequest object to use for the upload.
    ): Promise<FileStagingResponse> {
        if (!file) {
            throw new Error('File is required.');
        }
        if (!this.options.estuary_api_key) {
            throw new Error('Key is required.');
        }
        // If no XMLHttpRequest is provided, create a new one.

        // Include the File in a new FormData object.
        let formData = new FormData();
        formData.append('data', file, file.filename);
        // Return a Promise that resolves to the response or error.
        return new Promise((resolve, reject) => {
            let xhr: XMLHttpRequest = _xhr || new XMLHttpRequest();
            xhr.onloadend = () => {
                // NOTE (al): Typescript complains that `xhr` might be undefined.
                // This is a bit of a hack to get around the issue.
                if (xhr && xhr.status === 200) {
                    resolve(JSON.parse(xhr.response) as FileStagingResponse);
                } else {
                    if (xhr) {
                        reject(xhr.response);
                    } else {
                        reject('XMLHttpRequest is not defined.');
                    }
                }
            }
            xhr.onerror = (error) => {
                reject(error);
            }
            xhr.open('POST', `${this.options.estuary_host}/content/add`);
            xhr.setRequestHeader('Authorization', `Bearer ${this.options.estuary_api_key}`);
            xhr.send(formData);
        });
    }

    /**
     * @description Submit a DealProposal to the Banyan network.
     * @param {DealProposal} dealProposal - The DealProposal to submit.
     * @return {Promise<string>} - The ID of the DealProposal.
     */
    public async submitDealProposal(dealProposal: DealProposal): Promise<string> {
        // Check if the deal proposal is valid.
        // TODO: Make this more robust.

        if (!dealProposal.file_cid || !dealProposal.file_blake3) {
            throw new Error('Deal proposal is not valid.');
        }
        console.log("Submitting new deal Proposal: ", dealProposal);
        // TODO: Read this from some sort of cache with Web3Modal
        // Get the Provider from the options.

        const web3Modal = new Web3Modal(web3ModalConfig);
        const instance = await web3Modal.connect();
        const provider = new ethers.providers.Web3Provider(instance);
        const signer = provider.getSigner();

        /** BUG: The following will throw an error saying the contract reverted.
         *  I am not sure why this is happening. This needs to be explored and fixed in the next overhaul of the frontend.
         */
          // Initialize a Contract instance to interact with the Smart Contract.
        const contract = new ethers.Contract(
            BanyanContractAddress, BanyanContractABI, signer
          )
        // Submit the deal proposal to the Banyan network as an offer
        let txResponse = await contract.createOffer(
          dealProposal.executor_address,
          dealProposal.deal_length_in_blocks,
          dealProposal.proof_frequency_in_blocks,
          // TODO: Get Types to work correctly with ethers.js, as part of refactor.
          // dealProposal.bounty,
          // dealProposal.collateral,
          1,1,
          dealProposal.erc20_token_denomination,
          dealProposal.file_size,
          dealProposal.file_cid,
          dealProposal.file_blake3,
        ).catch(error => {
            console.log("Error Submitting proposal to chain: ", error);
            error.message = "Error Submitting proposal to chain: " + error.message +
              " - Contract Address: " + contract.address;
            throw error;
        });
        // Return the ID of the DealProposal, which is the response
        return txResponse.toString();
    }

    /**
     * @description Update the dealId of the file we uploaded to staging.
     * @param {string} estuaryId - The ID of the file in Estuary.
     * @param {string} dealId - The ID of the DealProposal.
     */
    public async updateDealId(estuaryId: string, dealId: string): Promise<string> {
        return await R.post('/content/update-deal-id', { estuaryId, dealId }).then((json) => {
            // TODO: Figure out appropriate error handling for this.
            if (!json.dealId) {
                // alert('Error: Could not record DealID in the database.');
                return '';
            }
            return json.dealId;
        });
    }
}

/**
 * What data a client needs to provide to the smart contract to create a deal.
 */
export type DealProposal = {
    executor_address: string; // The address of the Executor to propose the deal to

    deal_length_in_blocks: number; // The number of blocks the deal will last for
    proof_frequency_in_blocks: number; // The number of blocks between each proof

    // The amount of tokens that the deal will be worth
    bounty: number; // The price of the deal in the Token, in $ per Byte
    collateral: number; // The amount of collateral in Ether, in $ per Byte
    erc20_token_denomination: string; // The Token denomination for the collateral

    // File data
    file_size: number; // The size of the file to be uploaded
    file_cid: string; // The CID of the file to be uploaded
    file_blake3: string; // The Blake3 hash of the file to be uploaded
}

/**
 * What Data is associated with a deal made on the Banyan network.
 */
export type Deal = {
    // TODO: Do I need this? I assume we'd read Deals based on the DealID
    // deal_id: string; // The ID of the deal
    // Deal timing information
    deal_start_block: number; // The block number the deal started at
    deal_length_in_blocks: number; // The number of blocks the deal will last for
    proof_frequency_in_blocks: number; // The number of blocks between each proof

    // The amount of tokens that the deal will be worth
    bounty: number; // The price of the deal in the Token, in $ per Byte
    collateral: number; // The amount of collateral in Ether, in $ per Byte
    erc20_token_denomination: string; // The Token denomination for the collateral

    // File data
    file_size: number; // The size of the file to be uploaded (in bytes)
    file_cid: string; // The CID of the file to be uploaded
    file_blake3: string; // The Blake3 hash of the file to be uploaded

    status: string, // The status of the deal
}

// export function getDealStatusDescription(dealStatus: DealStatus): string {
//     switch (dealStatus) {
//         case DealStatus.NON:
//             return 'Non';
//         case DealStatus.PROPOSED:
//             return 'Proposed';
//         case DealStatus.ACCEPTED:
//             return 'Accepted';
//         case DealStatus.TIMEDOUT:
//             return 'Timed Out';
//         case DealStatus.CANCELLED:
//             return 'Cancelled';
//         case DealStatus.COMPLETE:
//             return 'Complete';
//         case DealStatus.FINALIZING:
//             return 'Finalizing';
//         case DealStatus.DONE:
//             return 'Done';
//         default:
//             return 'Unknown';
//     }
// }

/**
 * @description Get the on-chain deal status of a deal by its ID
 * @param dealId
 * @returns {Promise<DealStatus>}
 */
export async function getDealStatus(dealId: string): Promise<string> {
    const web3Modal = new Web3Modal(web3ModalConfig);
    const instance = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(instance);

    // Initialize a Contract instance to interact with the Smart Contract.
    const contract = new ethers.Contract(
      BanyanContractAddress, BanyanContractABI, provider
    )

    return await contract.getDealStatus(Number(dealId)).catch((error) => {
        console.log(error);
        return 'NON';
    });
}

/**
 * @description Get the on-chain deal on-chain its ID
 * @param dealId
 * @returns {Promise<Deal>}
 */
export async function getDeal(dealId: string): Promise<Deal> {
    // TODO: Figure out the format of this data on chain and how its passed back.
    const web3Modal = new Web3Modal(web3ModalConfig);
    const instance = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(instance);

    // Initialize a Contract instance to interact with the Smart Contract.
    const contract = new ethers.Contract(
      BanyanContractAddress, BanyanContractABI, provider
    )

    // TODO: Figure out the transform function for the Deal.
    return await contract.getDeal(Number(dealId)).catch((error) => {
        console.log(error);
        // For now, return a default deal.
        return {
            deal_start_block: 0,
            deal_length_in_blocks: 0,
            proof_frequency_in_blocks: 0,
            bounty: 0,
            collateral: 0,
            erc20_token_denomination: '',
            file_size: 0,
            file_cid: '',
            file_blake3: '',
            status: 'NON',
        };
    });
}

/**
 * @description Get the String representation of a token denomination from its Address.
 * @param {string} tokenAddress - The address of the token.
 * @returns {string} - The String representation of the token denomination.
 */
export function addressToDenomination(tokenAddress: string): string {
    // TODO: Populate this with actual token denominations or use an API call.
    switch (tokenAddress) {
        case BanyanContractAddress:
            return 'Banyan';
        case C.USDC_ADDRESS:
            return 'USDC';
        default:
            return 'Unknown';
    }
}

// HELPERS //

interface FileStagingResponse {
    cid: string;
    blake3hash: string; // TODO: add blake3 to the response
    estuaryId: string; // I feel like this is a bad name. TODO: rename
}
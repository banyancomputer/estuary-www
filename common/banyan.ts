import * as C from './constants';
import * as R from "@common/requests";
import Cookies from 'js-cookie';
import {ethers} from "ethers";
import Web3Modal from "web3modal";
import {web3ModalConfig} from "@common/siwe";

/* Exports for Interacting with Banyan Infrastructure */

// TODO: Did you know that Env variables in Next.js are extremely annoying?
// TODO: This is a temporary fix until we can figure out how to use them properly.
const BanyanContractAddress  = '0x9B6F0b095159E5670F5433ED640515D4eaA1Ed69' || '0x0000000000000000000000000000000000000000';

// TODO: This needs to be refactored to use the Banyan Contract correctly
const BanyanContractABI = [
    // Create a new Banyan Deal
    "function createDeal(" +
    "   address _executor_address, " +
    "   uint256 _deal_length_in_blocks, " +
    "   uint256 _proof_frequency_in_blocks, " +
    "   uint256 _bounty, " +
    "   uint256 _collateral, " +
    "   string _erc20_token_denomination," +
    "   uint256 _file_size, " +
    "   string calldata _file_cid, " +
    "   string calldata _file_blake3, " +
    ") public payable returns (uint256)",

  // An Event to be emitted when a Deal is created
  "event DealCreated(" +
    "   address indexed creator_address, " +
    "   uint256 indexed dealId, " +
    ")",

    // // Check the status of a Banyan Deal
    "function getDealStatus(uint256 _dealId) public view returns (uint8)",

    // Get the details of a Banyan Deal
    "function getDeal(uint256 _dealId) public view returns (" +
    "        uint8 deal_status," +
    "        address creator_address," +
    "        address executor_address," +
    "        uint256 deal_start_block," +
    "        uint256 deal_length_in_blocks," +
    "        uint256 proof_frequency_in_blocks," +
    "        uint256 bounty," +
    "        uint256 collateral," +
    "        address erc20_token_denomination," +
    "        uint256 file_size," +
    "        string memory file_cid," +
    "        string memory file_blake3" +
    "    ) ", // TODO: Figure out the correct return type for this
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
        if (!dealProposal.file_cid || !dealProposal.file_blake3) {
            throw new Error('Deal proposal is not valid.');
        }

        /**
         * Initialize access to our Provider and Signer
         */
        console.log("Initializing Provider...")
        const web3Modal = new Web3Modal(web3ModalConfig);
        const instance = await web3Modal.connect();
        const provider = new ethers.providers.Web3Provider(instance);
        const signer = await provider.getSigner();
        const signerAddress = await signer.getAddress();

        console.log("Signer Address: " + signerAddress)

        /**
         * Initialize a contract instance and filter to submit and catch the result of the Deal Proposal
         */
        console.log("Initializing Contract...")
        // Initialize a Contract instance to interact with the Smart Contract.
        const contract = new ethers.Contract(BanyanContractAddress, BanyanContractABI, provider)
        // Initialize a filter to catch the DealCreated event
        const filter = contract.filters.DealCreated(signerAddress, null)

        /**
         * Interact with the contract in order to trigger a state change
         */
        console.log("Submitting Transaction...")
        // Connect the Contract to the signer.
        const contractWithSigner = contract.connect(signer);
        // Submit the deal proposal to the Banyan network as an offer
        let txResponse = await contractWithSigner.createDeal(
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
          {
            gasLimit: ethers.utils.parseUnits('100000', 'wei'),
            gasPrice: ethers.utils.parseUnits('1', 'gwei'),
              value: ethers.utils.parseUnits('0', 'wei')
          }
        ).catch(error => {
            console.log("Error Submitting proposal to chain: ", error);
            error.message = "Error Submitting proposal to chain: " + error.message +
              " - Contract Address: " + contract.address;
            throw error;
        });

        let txReceipt = await txResponse.wait();
        console.log("Transaction Receipt: ", txReceipt);
        let dealId = txReceipt.events.find(event => event.event === 'DealCreated').args.dealId;
        console.log("Deal ID: ", dealId);
        return dealId;
        /**
         * Wait for the transaction to be mined and return the ID of the DealProposal.
         * Listen for the DealCreated event to be emitted by the Smart Contract.
         */
        // console.log("Listening for event...")
        // let ret = 0;
        // await contract.once(filter, (creator_address, dealId, event) => {
        //     console.log("Received event: ", event)
        //     ret = dealId;
        // });
        // return ret.toString();
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
    deal_status: DealStatus; // The status of the deal
    creator_address: string; // The address of the creator of the deal
    executor_address: string; // The address of the executor of the deal

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
}

export enum DealStatus {
    NON = 'NON',
    PROPOSED = 'PROPOSED',
    ACCEPTED = 'ACCEPTED',
    ACTIVE = 'ACTIVE',
    COMPLETED = 'COMPLETED',
    FINALIZING = 'FINALIZING',
    FINALIZED = 'FINALIZED',
    TIMEDOUT = 'TIMEDOUT',
    CANCELLED = 'CANCELLED',
}

export function getDealStatusFromInt(status: number): DealStatus {
    switch (status) {
        case 0:
            return DealStatus.NON;
        case 1:
            return DealStatus.PROPOSED;
        case 2:
            return DealStatus.ACCEPTED;
        case 3:
            return DealStatus.ACTIVE;
        case 4:
            return DealStatus.COMPLETED;
        case 5:
            return DealStatus.FINALIZING;
        case 6:
            return DealStatus.FINALIZED;
        case 7:
            return DealStatus.TIMEDOUT;
        case 8:
            return DealStatus.CANCELLED;
        default:
            return DealStatus.NON;
    }
}

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

    return await contract.getDealStatus((dealId)).catch((error) => {
        console.log(error);
        throw error;
    }).then((status) => {
        return getDealStatusFromInt(status);
    });
}

/**
 * A mapping for extracting the deal from the Banyan smart contract.
 */
const getDealReturnMapping = {
    'deal_status': {}
}



/**
 * @description Get the on-chain deal on-chain its ID
 * @param dealId
 * @returns {Promise<Deal>}
 */
export async function getDeal(dealId: string): Promise<Deal> {
    const web3Modal = new Web3Modal(web3ModalConfig);
    const instance = await web3Modal.connect();
    const provider = new ethers.providers.Web3Provider(instance);

    // Initialize a Contract instance to interact with the Smart Contract.
    const contract = new ethers.Contract(
      BanyanContractAddress, BanyanContractABI, provider
    )

    /*
     * This returns an array of variables specified by the following ABI:
     * function getDeal(uint256 _dealId) public view returns (
            uint8 deal_status,
            address creator_address,
            address executor_address,
            uint256 deal_start_block,
            uint256 deal_length_in_blocks,
            uint256 proof_frequency_in_blocks,
            uint256 bounty,
            uint256 collateral,
            address erc20_token_denomination,
            uint256 file_size,
            string memory file_cid,
            string memory file_blake3
     * )
     * These variables must be read into the Deal object in the same order as the ABI.
     */
    return await contract.getDeal(Number(dealId)).catch((error) => {
        console.log(error);
        throw error;
    }).then((data) => {
        // If the deal is not found, raise an error.
        if (data[0] === 0) {
            throw new Error('Deal not found.');
        }
        return {
            deal_status: getDealStatusFromInt(data[0]),
            creator_address: data[1],
            executor_address: data[2],
            deal_start_block: data[3].toString(),
            deal_length_in_blocks: data[4].toString(),
            proof_frequency_in_blocks: data[5].toString(),
            bounty: data[6].toString(),
            collateral: data[7].toString(),
            erc20_token_denomination: data[8],
            file_size: data[9].toString(),
            file_cid: data[10],
            file_blake3: data[11]
        } as Deal;
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
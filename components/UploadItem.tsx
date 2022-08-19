import styles from '@components/UploadItem.module.scss';

import * as React from 'react';
import * as U from '@common/utilities';
import * as C from '@common/constants';
import * as R from '@common/requests';

import Cookies from 'js-cookie';
import ProgressBlock from '@components/ProgressBlock';
import ActionRow from '@components/ActionRow';
import LoaderSpinner from '@components/LoaderSpinner';
import * as O from "@common/ethDeal";
import {finalizeDealProposal} from "@common/ethDeal";

export class PinStatusElement extends React.Component<any> {
  state = { pinned: false, delegates: ['none'] };

  componentDidMount() {
    const checkPinStatus = () => {
      window.setTimeout(async () => {
        const response = await R.get(`/pinning/pins/${this.props.id}`, this.props.host);
        console.log(response);

        if (response.status === 'pinned') {
          console.log('stop loop');
          this.setState({ pinned: true, ...response });
          this.forceUpdate();
          return;
        }

        checkPinStatus();
      }, 5000);
    };

    checkPinStatus();
  }

  render() {
    let maybePinStatusElement = null;

    if (this.state.pinned) {
      return (
        <React.Fragment>
          <ActionRow>Your file is pinned on our staging node.</ActionRow>
          <ActionRow> CID: {this.props.cid}</ActionRow>
          {/*<ActionRow>Delegate {this.state.delegates[0]}</ActionRow>*/}
        </React.Fragment>
      );
    }

    return (
      <ActionRow style={{ background: `#000`, color: `#fff` }}>
        This CID is now being pinned to IPFS in the background, it make take a few minutes. <LoaderSpinner style={{ marginLeft: 8, height: 10, width: 10 }} />
      </ActionRow>
    );
  }
}

// Interface that describes the contents of a single Upload
export interface Upload {
  id: string;
  dealProposal: O.DealProposal;
  file: File;
}

// Long-winded way of describing return type of /content/add endpoint
export interface ContentAddResponse {
  cid: string;
  blake3hash: string; // TODO: add blake3 to the response
  retrievalUrl: string;
  estuaryId: string; // I feel like this is a bad name. TODO: rename
  providers: string[]; // note/TODO (al): Not really sure what this is for...
}

// Class that describes how a single Upload is handled
export default class UploadItem extends React.Component<any> {
  state = {
    loaded: 0,
    total: this.props.upload.file.size,
    secondsRemaining: 0,
    secondsElapsed: 0,
    bytesPerSecond: 0,
    // staging: !this.props.file.estimation,
    contentAddResponse: null,
    dealFinalized: false,
    dealSubmitted: false,
  };

  upload = async () => {
    let {id, file} = this.props.upload;
    console.log("Handling upload", id);

    if (this.state.loaded > 0) {
      console.log('already attempted', id);
      return;
    }

    if (!file) {
      alert('Broken file constructor.');
      return;
    }

    // Declare a Request object to handle the upload.
    // We use the Request object to track the upload's progress.
    let xhr = new XMLHttpRequest();
    let startTime = new Date().getTime();
    let secondsElapsed = 0;

    // A handler for tracking the progress of the Upload.
    xhr.upload.onprogress = async (event) => {
      if (!startTime) {
        startTime = new Date().getTime();
      }

      secondsElapsed = (new Date().getTime() - startTime) / 1000;
      let bytesPerSecond = event.loaded / secondsElapsed;
      let secondsRemaining = (event.total - event.loaded) / bytesPerSecond;

      this.setState({
        ...this.state,
        loaded: event.loaded,
        total: event.total,
        secondsElapsed,
        bytesPerSecond,
        secondsRemaining,
      });
    };

    // A handler for catching upload errors.
    xhr.upload.onerror = async () => {
      alert(`Error uploading file to staging: ${xhr.status}`);
      startTime = null;
      secondsElapsed = 0;
    };

    // A handler for catching upload success.
    xhr.onloadend = (event: any) => {
      if (!event.target || !event.target.response) {
        return
      }
      
      startTime = null;
      secondsElapsed = 0;
      if (event.target.status === 200) {
        let contentAddResponse = {}
        try {
          // This returns a JSON object with the CID and the Blake3 hash of the file.
          contentAddResponse = JSON.parse(event.target.response) as ContentAddResponse;
        } catch (e) {
          console.log(e);
        }
        this.setState({ ...this.state, contentAddResponse });
        // Finalize the deal proposal based on the response from the staging server (CID, Blake3 hash, etc.)
        this.finalizeDealProposal();
      } else {
        alert(`[${event.target.status}]Error during the upload: ${event.target.response}`);
      }
    };

    // Declare a new FormData object to hold our Upload data.
    const formData = new FormData();
    // Add our data to the FormData object.
    formData.append('data', file, file.filename);
    // Extract our Auth Token from the cookies.
    const token = Cookies.get(C.auth);

    let targetURL = `${C.api.host}/content/add`;
    if (this.props.viewer.settings.uploadEndpoints && this.props.viewer.settings.uploadEndpoints.length) {
      targetURL = this.props.viewer.settings.uploadEndpoints[0];
    }

    /* TODO: Why isn't this just in a Post Request? */
    xhr.open('POST', targetURL);
    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.send(formData);
    this.setState({ ...this.state, loaded: 1 });
  };

  // This is called once the Upload is complete.
  // It finalizes the deal proposal.
  finalizeDealProposal = async () => {
    console.log("Response: ", this.state.contentAddResponse);
    // Extract the CID and the Blake3 hash of the file we uploaded.
    let { cid, blake3hash, estuaryId } = this.state.contentAddResponse;
    console.log("CID: ", cid);
    console.log("Blake3: ", blake3hash);
    let {id, dealProposal} = this.props.upload;
    if (!cid || !blake3hash) {
        alert('Error: CID or Blake3 hash not found!');
        return;
    }
    // Finalize the DealProposal.
    this.props.upload.dealProposal.cid = cid;
    this.props.upload.dealProposal.blake3hash = blake3hash;
    this.setState({ ...this.state, dealFinalized: true });
    return;
  }

  // Finally, we post the DealProposal to-chain and update Estuary's state to track it.
  submitDealProposal = async () => {
    // Extract the id and the DealProposal from the Upload.
    let {id, dealProposal} = this.props.upload;
    let { estuaryId } = this.state.contentAddResponse;
    // Post the DealProposal to the Ethereum network.
    let dealId = await O.proposeDeal(dealProposal);
    if (!dealId) {
      alert('Error: Could not post DealProposal to the Ethereum network.');
      return;
    }
    console.log('dealProposal', dealProposal);
    console.log('dealId', dealId);
    // Record the DealID in the database.
    await R.post('/content/update-deal-id', { estuaryId, dealId }).then((json) => {
      // TODO: Figure out appropriate error handling for this.
      if (!json.dealId) {
        alert('Error: Could not record DealID in the database.');
        return;
      }
      this.setState({ ...this.state, dealSubmitted: true });
    }).catch((e) => {
      alert('Error: Could not record DealID in the database.');
      console.log(e);
    });
  }

  render() {
    const isLoading = !this.state.contentAddResponse && this.state.loaded > 0;

    let targetURL = `${C.api.host}/content/add`;
    if (this.props.viewer.settings.uploadEndpoints && this.props.viewer.settings.uploadEndpoints.length) {
      targetURL = this.props.viewer.settings.uploadEndpoints[0];
    }

    // note (al): I don't think we need this anymore, but I'm leaving it in for now.
    // TODO(jim)
    // States getting messy here, need to refactor this component.
    // Not sure if this will be an ongoing problem of tracking pin status.
    let maybePinStatusElement = null;
    if (this.state.contentAddResponse) {
      maybePinStatusElement = <PinStatusElement
          id={this.state.contentAddResponse.estuaryId}
          cid={this.state.contentAddResponse.cid}
          host={this.props.host}
      />;
    }

    return (
      <section className={styles.item}>
        {/*Have we received a content response?*/}
        {this.state.contentAddResponse ? (
          <React.Fragment>
            {/*Message that the upload is complete*/}
            <div className={styles.actions}>
              {!this.state.dealSubmitted ? (
                <div className={styles.left}>
                  <ActionRow isHeading style={{ fontSize: '0.9rem', fontWeight: 500, background: `var(--status-success-bright)` }}>
                    {this.props.upload.file.name} staged to our node and ready for hosting!
                  </ActionRow>
                  {this.state.dealFinalized ? (
                    // TODO: Figure out how to make this inline with the above ActionRow.
                    <div className={styles.right}>
                       <span className={styles.button} onClick={this.submitDealProposal}>
                         Submit Deal
                       </span>
                    </div>
                  ) : null }
                </div>
              ) : (
                <ActionRow isHeading style={{ fontSize: '0.9rem', fontWeight: 500, background: `var(--status-success-bright)` }}>
                  {this.props.upload.file.name} staged to our node and deal submitted to Ethereum!
                </ActionRow>
              )}
            </div>
            {/*Retrieval Link so they can verify*/}
            <ActionRow>https://dweb.link/ipfs/{this.state.contentAddResponse.cid}</ActionRow>
            {/*Pin Status*/}
            {maybePinStatusElement}
            {/*Price Estimation*/}
            {/*Note/TODO (al) We maybe don't need this if statement-- if we do error checking correctly the deal should always specify a price*/}
            {this.props.upload.dealProposal.price && this.props.upload.dealProposal.collateral ? (
              <div>
                <ActionRow style={{ background: `var(--status-success-bright)` }}>
                  Proposing to store {this.props.upload.file.name} for {this.props.upload.dealProposal.price} {this.props.upload.dealProposal.token_denomination}.
                </ActionRow>
                <ActionRow style={{ background: `var(--status-success-bright)` }}>
                  Providers requested to put up Collateral of {this.props.upload.dealProposal.collateral} {this.props.upload.dealProposal.token_denomination}.
                </ActionRow>
              </div>
            ) : (
              <ActionRow>No price or collateral configured for {this.props.upload.file.name}!</ActionRow>
            )}
            {/*TODO: Figure out how all this is displayed to a user. Should they have a view into staging?*/}
            {/*{this.props.file.estimation ? (*/}
            {/*{ null ? (*/}
            {/*  <ActionRow onClick={() => window.open('/deals')}>→ See all Filecoin deals.</ActionRow>*/}
            {/*) : (*/}
            {/*  <ActionRow onClick={() => window.open('/staging')}>→ View all staging bucket data.</ActionRow>*/}
            {/*)}*/}
          </React.Fragment>
        ) : (
          <React.Fragment>
            <div className={styles.actions}>
              <div className={styles.left}>
                <ActionRow isHeading style={{ fontSize: '0.9rem', fontWeight: 500, background: isLoading ? `#000` : null, color: isLoading ? `#fff` : null }}>
                  {this.props.upload.file.name} {isLoading ? <LoaderSpinner style={{ marginLeft: 8, height: 10, width: 10 }} /> : null}
                </ActionRow>
              </div>
              {!isLoading ? (
                <div className={styles.right}>
                  {this.state.contentAddResponse ? null : (
                    <span className={styles.button} onClick={this.upload}>
                      {/*Note/TODO (al): Huh? Why is this here?*/}
                      {/*{this.props.file.estimination ? `Upload` : `Upload`}*/}
                        Upload
                    </span>
                  )}
                  {!this.state.contentAddResponse ? (
                    <span className={styles.button} onClick={() => this.props.onRemove(this.props.upload.id)}>
                      Remove
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
            {/*TODO: Reimplement This Div with correct Estimation presentation based on the Eth deal*/}
            {!isLoading ? (
              <React.Fragment>
                <ActionRow>{U.bytesToSize(this.props.upload.file.size)}</ActionRow>
                { this.props.upload.dealProposal.price ? (
                  <ActionRow>
                    {/*Will cost {U.convertFIL(this.props.file.estimation)} FIL ⇄ {(Number(U.convertFIL(this.props.file.estimation)) * Number(this.props.file.price)).toFixed(2)} USD*/}
                    {/*and this Estuary Node will pay.*/}
                    Estimated cost: {this.props.upload.dealProposal.price} {this.props.upload.dealProposal.token_denomination}
                  </ActionRow>
                ) : (
                  <ActionRow>{this.props.upload.file.name}: no price estimation</ActionRow>
                )}
                {/*Don't support verified deals atm*/}
                {/*{this.props.file.estimation && this.props.viewer.settings.verified ?*/}
                {/*  <ActionRow>The Filecoin deal will be verified.</ActionRow>*/}
                {/*  ) : null*/}
                {/*}*/}
              </React.Fragment>
            ) : null}
            <ActionRow style={{ background: isLoading ? `#000` : null, color: isLoading ? `#fff` : null }}>Data will be sent to {targetURL}</ActionRow>
          </React.Fragment>
        )}
        {/*Progress tracker while we're uploading files to staging*/}
        {isLoading ? (
          <ProgressBlock secondsRemaining={this.state.secondsRemaining} bytesPerSecond={this.state.bytesPerSecond} loaded={this.state.loaded} total={this.state.total} />
        ) : null}
      </section>
    );
  }
}

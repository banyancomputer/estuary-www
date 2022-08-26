import styles from '@components/UploadItem.module.scss';

import * as React from 'react';
import * as U from '@common/utilities';
import * as C from '@common/constants';
import * as R from '@common/requests';
import * as B from '@common/banyan';

import { Subject } from 'rxjs';

import Cookies from 'js-cookie';
import ProgressBlock from '@components/ProgressBlock';
import ActionRow from '@components/ActionRow';
import LoaderSpinner from '@components/LoaderSpinner';

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
  dealProposal: B.DealProposal;
  file: File;
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
    fileStagedResponse: null,
    dealProposal: this.props.upload.dealProposal,
    dealSubmitted: false,
  };

  upload = async () => {
    let {id, file} = this.props.upload;
    let dealMaker = this.props.dealMaker;
    console.log("Handling upload", id);

    if (this.state.loaded > 0) {
      console.log('already attempted', id);
      return;
    }

    if (!file) {
      alert('Broken file constructor.');
      return;
    }

    // Declare a custom Request object to handle the upload.
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

    // Stage the file and extract relevant data from the response.
    let resp = await
      dealMaker.stageFile(file, xhr)
        .then((resp) => {
          console.log('staged', resp);
          // On success, reset state and extract relevant data from the response.
          startTime = null;
          secondsElapsed = 0;
          let dealProposal = dealMaker.generateDealProposal(file);
          this.setState({
            ...this.state,
            loaded: 1,
            fileStagedResponse: resp,
            dealProposal,
          });
          return resp;
        }).catch((error) => {
        alert(`Error staging file: ${error}`);
        return {error: error};
      });
    if (resp && resp.error) {
      this.setState({
        ...this.state,
        loaded: 0,
      });
      return;
    }
    const {cid, blake3hash } = resp;
    // Create the DealProposal.
    let dealProposal = dealMaker.generateDealProposal(file, cid, blake3hash);
    this.setState({...this.state, dealProposal});
  }

  submitDeal = async () => {
    let {estuaryId} = this.state.fileStagedResponse;
    let {dealProposal} = this.state;
    let dealMaker = this.props.dealMaker;
    // Submit the DealProposal to chain
    let dealId = await
      dealMaker.submitDealProposal(dealProposal).then(() => {
        this.setState({
          ...this.state,
          dealSubmitted: true,
        });
      }).catch((error) => {
        alert("Could not submit deal proposal: " + error);
        return;
      });
    // Update the dealId of the file in Estuary.
    dealId = await dealMaker.updateDealId(estuaryId, dealId).catch((error) => {
      // throw new Error(error);
      alert("Could not update dealId in Estuary: " + error +
        "- EstuaryId: " + estuaryId + " - DealId: " + dealId
      );
      return;
    });
  }

  render() {
    const isLoading = !this.state.fileStagedResponse && this.state.loaded > 0;

    let targetURL = `${C.api.host}/content/add`;
    if (this.props.viewer.settings.uploadEndpoints && this.props.viewer.settings.uploadEndpoints.length) {
      targetURL = this.props.viewer.settings.uploadEndpoints[0];
    }

    // note (al): I don't think we need this anymore, but I'm leaving it in for now.
    // TODO(jim)
    // States getting messy here, need to refactor this component.
    // Not sure if this will be an ongoing problem of tracking pin status.
    let maybePinStatusElement = null;
    if (this.state.fileStagedResponse) {
      maybePinStatusElement = <PinStatusElement
        id={this.state.fileStagedResponse.estuaryId}
        cid={this.state.fileStagedResponse.cid}
        host={this.props.host}
      />;
    }

    return (
      <section className={styles.item}>
        {/*Have we received a content response?*/}
        {this.state.fileStagedResponse ? (
          <React.Fragment>
            {/*Message that the upload is complete*/}
            <div className={styles.actions}>
              {!this.state.dealSubmitted ? (
                <div className={styles.left}>
                  <ActionRow isHeading style={{ fontSize: '0.9rem', fontWeight: 500, background: `var(--status-success-bright)` }}>
                    {this.props.upload.file.name} staged to our node and ready for hosting!
                  </ActionRow>
                  {this.state.dealProposal ? (
                    // TODO: Figure out how to make this inline with the above ActionRow.
                    <div className={styles.right}>
                       <span className={styles.button} onClick={this.submitDeal}>
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
            {/*Retrieval Link so users can verify their data is pinned*/}
            <ActionRow>https://dweb.link/ipfs/{this.state.fileStagedResponse.cid}</ActionRow>
            {/*Pin Status*/}
            {maybePinStatusElement}
            {/*bounty Estimation*/}
            <div>
              <ActionRow style={{ background: `var(--status-success-bright)` }}>
                Proposing to store {this.props.upload.file.name} for {this.state.dealProposal.bounty} {this.state.dealProposal.token_denomination}.
              </ActionRow>
              <ActionRow style={{ background: `var(--status-success-bright)` }}>
                Providers requested to put up Collateral of {this.state.dealProposal.collateral} {this.state.dealProposal.token_denomination}.
              </ActionRow>
            </div>
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
                  {this.state.fileStagedResponse ? null : (
                    <span className={styles.button} onClick={this.upload}>
                        Upload
                    </span>
                  )}
                  {!this.state.fileStagedResponse ? (
                    <span className={styles.button} onClick={() => this.props.onRemove(this.props.upload.id)}>
                      Remove
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>
            {!isLoading ? (
              <React.Fragment>
                <ActionRow>{U.bytesToSize(this.props.upload.file.size)}</ActionRow>
                { this.state.dealProposal.bounty ? (
                  <ActionRow>
                    Estimated cost: {this.state.dealProposal.bounty} {this.state.dealProposal.erc20_token_denomination}
                  </ActionRow>
                ) : (
                  <ActionRow>{this.props.upload.file.name}: no bounty estimation</ActionRow>
                )}
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

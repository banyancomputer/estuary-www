import styles from '@pages/app.module.scss';

import * as React from 'react';
import * as U from '@common/utilities';
import * as C from '@common/constants';
import { Upload } from "@components/UploadItem";

import * as ipfs from 'ipfs-core';

import Page from '@components/Page';
import Navigation from '@components/Navigation';
import AuthenticatedLayout from '@components/AuthenticatedLayout';
import AuthenticatedSidebar from '@components/AuthenticatedSidebar';
import SingleColumnLayout from '@components/SingleColumnLayout';
import UploadZone from '@components/UploadZone';
import UploadList from '@components/UploadList';
import Button from '@components/Button';

import { H1, H2, H3, H4, P } from '@components/Typography';
import {DealMaker, addressToDenomination} from "@common/banyan";

export async function getServerSideProps(context) {
  const viewer = await U.getViewerFromHeader(context.req.headers);

  if (!viewer) {
    return {
      redirect: {
        permanent: false,
        destination: '/sign-in',
      },
    };
  }

  if (viewer.settings && viewer.settings.contentAddingDisabled) {
    return {
      redirect: {
        permanent: false,
        destination: '/upload-disabled',
      },
    };
  }

  return {
    props: { viewer, api: process.env.ESTUARY_API, hostname: `https://${context.req.headers.host}` },
  };
}


/**
 * Note (al): For my own sanity, I'm going to reduce what this page does to handling single-file uploads.
 * TODO: Re-implement multi-file uploads.
 */
export default class UploadPage extends React.Component<any> {
  list = React.createRef<any>();


  // Configure a Deal Maker instance to handle uploads.
  dealMakerOptions = {
    deal_configuration: C.DefaultDealConfiguration,
  }

  state = {
    // Initialize the Deal Maker instance in the state.
    dealMaker: new DealMaker(this.dealMakerOptions),
    uploads: [],
  };

  // Upload any files in the queue
  _handleUpload = () => {
    return this.list.current.uploadAll();
  };

  // Remove a single file from the list.
  _handleRemove = (id) => {
    this.setState({ uploads: this.state.uploads.filter((each) => each.id !== id) });
  };

  // Remove all files from the list.
  _handleFlush = () => {
    this.setState({ uploads: [] });
  };

  // Process a file into a DealProposal, CID, and Blake3 Hash.
  _handleFile = async (file) => {
    console.log('_handleFile', file);
    if (!file) {
      console.log('MISSING DATA');
      return;
    }

    const upload = {
      // This generates a deal proposal for the file w/o an IPFS cid or Blake3 hash.
      id: `file-${new Date().getTime()}`,
      dealProposal: this.state.dealMaker.generateDealProposal(file),
      file,
    } as Upload;

    // Record the new Upload in our state.
    return this.setState({
      uploads: [upload, ...this.state.uploads],
    });
  };

  /* TODO: Implement Updating The deal configuration of the DealMaker.*/

  render() {
    const sidebarElement = <AuthenticatedSidebar active="UPLOAD" viewer={this.props.viewer} />;

    return (
      <Page title="Estuary: Upload data" description="Upload your data to the Filecoin Network." url={`${this.props.hostname}/upload`}>
        <AuthenticatedLayout navigation={<Navigation isAuthenticated isRenderingSidebar={!!sidebarElement} />} sidebar={sidebarElement}>
          <SingleColumnLayout>
            <H2>Upload data</H2>
            <P style={{ marginTop: 16 }}>Add your public data to Estuary so anyone can retrieve it anytime.</P>
            <P style={{ marginTop: 16 }}>On this page you can upload your files and submit a storage deals to the Ethereum network.</P>
            <P style={{ marginTop: 16 }}>By default your deals will use the following configuration:</P>
            <P style={{ marginTop: 16 }}>Storage Duration: {this.state.dealMaker.getDealConfiguration().deal_length_in_blocks} Ethereum Blocks (~1 Year)</P>
            <P style={{ marginTop: 16 }}>Storage Price: {this.state.dealMaker.getDealConfiguration().bounty_per_tib}
              {addressToDenomination(this.state.dealMaker.getDealConfiguration().erc20_token_denomination)} per TiB
            </P>
            <P style={{ marginTop: 16 }}>Storage Collateral: {this.state.dealMaker.getDealConfiguration().collateral_per_tib}
              {addressToDenomination(this.state.dealMaker.getDealConfiguration().erc20_token_denomination)} per TiB
            </P>
            <UploadZone onFile={this._handleFile} onFlush={this._handleFlush} host={this.props.api} />

            {this.state.uploads.length ? (
              <React.Fragment>
                <H3 style={{ marginTop: 64 }}>
                  Queued {U.pluralize('file', this.state.uploads.length)} {`(${this.state.uploads.length})`}
                </H3>
                <P style={{ marginTop: 16 }}>Our Estuary node is ready to accept your data.</P>
                <P style={{ marginTop: 16 }}>Start adding your files to the queue; once you're ready, first upload your file to staging, and then submit an Ethereum deal for your file!</P>

                <div className={styles.actions}>
                  {/*Note/TODO (al): it's annoying to have to sign a bunch of transactions at once*/}
                  {/*          users should just upload one file at a time until we figure this out*/}
                  {/*<Button style={{ marginRight: 24, marginBottom: 24 }} onClick={this._handleUpload}>*/}
                  {/*  Upload all*/}
                  {/*</Button>*/}

                  <Button
                    style={{
                      marginBottom: 24,
                      background: 'var(--main-button-background-secondary)',
                      color: 'var(--main-button-text-secondary)',
                    }}
                    onClick={this._handleFlush}
                  >
                    Clear list
                  </Button>
                </div>

                <UploadList
                  ref={this.list}
                  dealMaker={this.state.dealMaker}
                  uploads={this.state.uploads}
                  viewer={this.props.viewer}
                  onRemove={this._handleRemove}
                  host={this.props.api} />
              </React.Fragment>
            ) : null}
          </SingleColumnLayout>
        </AuthenticatedLayout>
      </Page>
    );
  }
}

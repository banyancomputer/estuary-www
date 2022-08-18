import styles from '@pages/app.module.scss';

import * as React from 'react';
import * as U from '@common/utilities';
import * as C from '@common/constants';
import * as R from '@common/requests';
import * as O from '@common/ethDeal';
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
import {Cookies} from "js-cookie";

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

  state = {
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
    this.setState({ files: [] });
  };

  // Process a file into a DealProposal, CID, and Blake3 Hash.
  _handleFile = async (file) => {
    console.log('_handleFile', file);
    if (!file) {
      console.log('MISSING DATA');
      return;
    }

    // NOTE(jim): Prevents small files from being made directly into deals.
    // NOTE (al): In the future it would be nice if any files that are too small get batched up into a single deal.
    // For now all files should get handled the same way
    // if (file.size < this.props.viewer.settings.fileStagingThreshold) {
    //   return this.setState({
    //     files: [{ id: `file-${new Date().getTime()}`, data: file, estimation: null, price: null }, ...this.state.files],
    //   });
    // }
    //
    // // note (al): For now we just fetch a Default Deal Configuration and use that to estimate the price of the file.

    // In order to submit a deal to-chain: We need to know:
    // 1. Who's making the deal
    // const creatorAddress = Cookies.get(C.providerData).address;
    // 2. Who to make a deal with
    const executorAddress = O.defaultExecutorAddress
    // 3. What sort of deal the creator wants to make. For now we'll just use the default deal configuration.
    const dealConfig = O.DefaultDealConfiguration;
    // Then you generate a proposal for the deal.
    const upload = {
        // This generates a deal proposal for the file w/o an IPFS cid or Blake3 hash.
        id: `file-${new Date().getTime()}`,
        dealProposal: O.generateDealProposal(executorAddress, dealConfig, file),
        file,
    } as Upload;

    // Record the new Upload in our state.
    return this.setState({
      uploads: [upload, ...this.state.uploads],
    });

    // return this.setState({
    //   files: [{ id: `file-${new Date().getTime()}`, data: file, estimation: null, price: null }, ...this.state.files],
    // });


    // note (al) : this hangs if the file is too small.
    // const response = await R.post(
    //   '/deals/estimate',
    //   {
    //     size: file.size,
    //     replication: this.props.viewer.settings.replication,
    //     durationBlks: this.props.viewer.settings.dealDuration,
    //     verified: this.props.viewer.settings.verified,
    //   },
    //   this.props.api
    // );

    // const local = await fetch('/api/fil-usd');
    // const { price } = await local.json();
    //
    // const estimate = response && response.totalAttoFil ? response.totalAttoFil : null;
    //
    // return this.setState({
    //   files: [{ id: `file-${new Date().getTime()}`, data: file, estimation: estimate, price }, ...this.state.files],
    // });
  };

  render() {
    const sidebarElement = <AuthenticatedSidebar active="UPLOAD" viewer={this.props.viewer} />;

    return (
      <Page title="Estuary: Upload data" description="Upload your data to the Filecoin Network." url={`${this.props.hostname}/upload`}>
        <AuthenticatedLayout navigation={<Navigation isAuthenticated isRenderingSidebar={!!sidebarElement} />} sidebar={sidebarElement}>
          <SingleColumnLayout>
            <H2>Upload data</H2>
            <P style={{ marginTop: 16 }}>Add your public data to Estuary so anyone can retrieve it anytime.</P>
            <UploadZone onFile={this._handleFile} onFlush={this._handleFlush} host={this.props.api} />

            {this.state.uploads.length ? (
              <React.Fragment>
                <H3 style={{ marginTop: 64 }}>
                  Queued {U.pluralize('file', this.state.uploads.length)} {`(${this.state.uploads.length})`}
                </H3>
                <P style={{ marginTop: 16 }}>Our Estuary node is ready to accept your data, click upload all to upload everything or click upload to upload individual files.</P>

                <div className={styles.actions}>
                  <Button style={{ marginRight: 24, marginBottom: 24 }} onClick={this._handleUpload}>
                    Upload all
                  </Button>

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
                    ref={this.list} // Bind the list to the component so we can upload all at once.
                    uploads={this.state.uploads}
                    viewer={this.props.viewer}
                    onRemove={this._handleRemove}
                    host={this.props.api} />
              </React.Fragment>
            ) : <P>No files queued.</P>}
          </SingleColumnLayout>
        </AuthenticatedLayout>
      </Page>
    );
  }
}

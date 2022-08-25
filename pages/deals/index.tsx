import styles from '@pages/app.module.scss';
import tstyles from '@pages/table.module.scss';

import * as React from 'react';
import * as U from '@common/utilities';
import * as C from '@common/constants';
import * as R from '@common/requests';
import * as O from '@common/ethDeal';

import ProgressCard from '@components/ProgressCard';
import Navigation from '@components/Navigation';
import Page from '@components/Page';
import LoaderSpinner from '@components/LoaderSpinner';
import PageHeader from '@components/PageHeader';
import AuthenticatedLayout from '@components/AuthenticatedLayout';
import AuthenticatedSidebar from '@components/AuthenticatedSidebar';
import Button from '@components/Button';
import ActionRow from '@components/ActionRow';
import AlertPanel from '@components/AlertPanel';
import { ethers} from "ethers";

import { H1, H2, H3, H4, P } from '@components/Typography';
import {useRouter} from "next/router";

const INCREMENT = 100;

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
  return {
    props: { viewer, api: process.env.ESTUARY_API, hostname: `https://${context.req.headers.host}` },
  };
}


// Old Declaration
// export const ContentCard = ({ content, deals, id, root, failuresCount, viewer }): any => {
export const ContentCard = ({ contentStatus, offer }): any => {
  const [state, setState] = React.useState({ });
  let id = contentStatus.id;

  /* This page doesn't actually get any deal statistics right now */
  let offerElement =
    offer ? (
        <P> There's an offer for this on chain </P>
        ) : (
        <P> There's no offer for this on chain </P>
    );
  // note (al): this is the deal logic that was implemented previously
  // let dealElements =
  //     deals && deals.length ? (
  //         deals.map((d, index) => {
  //           const message = U.getDealStateMessage(d.deal, d.transfer, d.onChainState);
  //           if (message === 'Failed' || message === 'FailedAfterTransfer') {
  //             failureCount = failureCount + 1;
  //
  //             if (!state.showFailures) {
  //               return null;
  //             }
  //           }
  //
  //           if (message === 'ActiveOnChain') {
  //             successCount = successCount + 1;
  //           }
  //
  //           return <ProgressCard key={`${d.ID}-${id}-${index}`} contentId={id} deal={d.deal} chain={d.onChainState} transfer={d.transfer} message={message} marketing={false} />;
  //         })
  //     ) : (
  //         <div className={styles.empty}>Estuary has not performed any deals for this file, yet.</div>
  //     );

  const retrievalURL = contentStatus ? `https://dweb.link/ipfs/${contentStatus.cid}` : null;

  let name = '...';
  if (contentStatus && contentStatus.name) {
    name = contentStatus.name;
  }
  if (name === 'aggregate') {
    name = '/';
  }

  const dealErrorURL = `/errors/${id}`;

  return (
    <div className={styles.group}>
      <table className={tstyles.table}>
        <tbody className={tstyles.tbody}>
          <tr className={tstyles.tr}>
            <th className={tstyles.th} style={{ width: '25%' }}>
              Name
            </th>
            <th className={tstyles.th} style={{ width: '50%' }}>
              Retrieval CID
            </th>
            <th className={tstyles.th} style={{ width: '12.5%' }}>
              ID
            </th>
            <th className={tstyles.th} style={{ width: '12.5%' }}>
              Size
            </th>
          </tr>
          <tr className={tstyles.tr}>
            <td className={tstyles.td}>{name}</td>

            <td className={tstyles.tdcta}>
              <a className={tstyles.cta} href={retrievalURL} target="_blank">
                {retrievalURL}
              </a>
            </td>

            <td className={tstyles.td}>{id}</td>

            <td className={tstyles.td}>{contentStatus ? U.bytesToSize(contentStatus.size, 2) : null}</td>
          </tr>
        </tbody>
      </table>
      {/*{root && root.aggregatedFiles > 1 ? (*/}
      {/*  <div className={styles.titleSection}>*/}
      {/*    {root.aggregatedFiles} additional {U.pluralize('file', root.aggregatedFiles)} in this deal*/}
      {/*  </div>*/}
      {/*) : null}*/}
      {/*<div className={styles.titleSection}>*/}
      {/*  Estuary made {dealElements.length} {U.pluralize('attempt', dealElements.length)}&nbsp;*/}
      {/*  <a href={dealErrorURL} style={{ color: `var(--main-text)` }} target="_blank">*/}
      {/*    (view logs)*/}
      {/*  </a>*/}
      {/*  &nbsp;*/}
      {/*  {failureCount > 0 ? (*/}
      {/*    <span style={{ color: `var(--main-text)`, textDecoration: 'underline', cursor: 'pointer' }} onClick={() => setState({ ...state, showFailures: !state.showFailures })}>*/}
      {/*      (toggle {failureCount} {U.pluralize('failure', failureCount)})*/}
      {/*    </span>*/}
      {/*  ) : null}*/}
      {/*</div>*/}
      {/*{content && content.replication ? (*/}
      {/*  <React.Fragment>*/}
      {/*    {successCount === content.replication ? (*/}
      {/*      <div className={styles.titleSection} style={{ backgroundColor: `var(--status-success-bright)`, fontFamily: 'MonoMedium' }}>*/}
      {/*        Your data is backed up to the Filecoin Network*/}
      {/*      </div>*/}
      {/*    ) : (*/}
      {/*      <div className={styles.titleSection} style={{ fontFamily: 'MonoMedium' }}>*/}
      {/*        <LoaderSpinner style={{ border: `2px solid rgba(0, 0, 0, 0.1)`, borderTop: `2px solid #000` }} />*/}
      {/*        &nbsp; Estuary is working on {content.replication} successful on chain deals. {successCount} / {content.replication}*/}
      {/*      </div>*/}
      {/*    )}*/}
      {/*  </React.Fragment>*/}
      {/*) : null}*/}
      <div className={styles.deals}>{offerElement}</div>
    </div>
  );
};

class ContentStatus extends React.Component<any, any> {
  state = {
    contentStatus: null,
    offer: null,
  };

  async componentDidMount() {
    // Get the status of a file based on its Estuary content ID
    // This returns an entire `content` object, indexed by the content ID
    const contentStatus = await R.get(`/content/status/${this.props.id}`, this.props.host);
    // Get the offer from off chain
    const offer = await O.getOffer(this.props.id);

    if (contentStatus.error) {
      console.error(contentStatus.error);
      return;
    }

    this.setState({ contentStatus, offer });
  }

  render() {
    return <ContentCard
        contentStatus={this.state.contentStatus}
        offer={this.state.offer}
        // TODO: Make sure we don't need the root for information deals
        // root={this.props.root}
    />;
  }
}

export default class Dashboard extends React.Component<any, any> {
  state = {
    fileStats: [],
    offset: 0,
    limit: INCREMENT,

    // Our array for open offers
    offers: [],
  };

  async componentDidMount() {
    // note (al) - This will eventually need to call our deals backend when we sync on-chain data with Estuary
    // const entities = await R.get(`/content/deals?offset=${this.state.offset}&limit=${this.state.limit}`, this.props.api);

    // Get a list of file status objects from Estuary
    const fileStats = await R.get(
        `/content/stats?offset=${this.state.offset}&limit=${this.state.limit}`, this.props.api);
    if (fileStats.error) {
        console.error(fileStats.error);
        return;
    }

    // Get the list of deals for this user from on-chain
    const offers = await O.getUsersOffers();
    // TODO - Add error handling for this

    console.log('File Stats: ', fileStats)
    console.log('Offers: ', offers);
    this.setState({ fileStats, offers });
  }

  async getNext() {
    const offset = this.state.offset + INCREMENT;
    const limit = this.state.limit;
    const next = await R.get(
        `/content/stats?offset=${this.state.offset}&limit=${this.state.limit}`, this.props.api);
    if (!next || !next.length) {
      return;
    }

    this.setState({
      ...this.state,
      offset,
      limit,
      files: [...this.state.fileStats, ...next],
    });
  }

  render() {
    const statusElements = this.state.fileStats.length ?
        this.state.fileStats.map((s, index) => {
          <ContentStatus
              host={this.props.api}
              viewer={this.props.viewer}
              estuary_content_id={s.id}
              // TODO: For now this is just using the Estuary Content ID as the deal ID, which is not correct
              // Either you need to be able to lookup the deal ID from the CID, or this needs to be stored on Estuary
              offer_id={s.id}
              // root={s}
          />
        }) : null;
    const sidebarElement = <AuthenticatedSidebar active="DEALS" viewer={this.props.viewer} />;
    const navigationElement = <Navigation isAuthenticated isRenderingSidebar={!!sidebarElement} />;

    return (
      <Page title="Estuary: Deals" description="Check the status of your Filecoin storage deals" url={`${this.props.hostname}/deals`}>
        <AuthenticatedLayout navigation={navigationElement} sidebar={sidebarElement}>
          <PageHeader>
            <H2>Deals</H2>
            <P style={{ marginTop: 16 }}>
              All of your storage deals and logs will appear here.
              You can configure a new deal here specifying $/GiB and duration.
            </P>

            {JSON.stringify(O.DefaultDealConfiguration)}

            <div className={styles.actions}>
              {/*TODO: You would */}
              <Button href="/upload">Upload data</Button>
            </div>
          </PageHeader>
          <div>{statusElements}</div>
          {/*TODO (al): Ok but what happens if length % INCREMENT = 0. Fix this */}
          {this.state.fileStats && this.state.offset + this.state.limit === this.state.fileStats.length ? (
            <ActionRow style={{ paddingLeft: 16, paddingRight: 16 }} onClick={() => this.getNext()}>
              ➝ Next {INCREMENT}
            </ActionRow>
          ) : null}
        </AuthenticatedLayout>
      </Page>
    );
  }
}

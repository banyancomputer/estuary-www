import styles from '@pages/app.module.scss';
import tstyles from '@pages/table.module.scss';

import * as React from 'react';
import * as U from '@common/utilities';
import * as R from '@common/requests';
import * as O from '@common/ethDeal';
import * as C from '@common/constants';

import ProgressCard from '@components/ProgressCard';
import Navigation from '@components/Navigation';
import Page from '@components/Page';
import AuthenticatedLayout from '@components/AuthenticatedLayout';
import AuthenticatedSidebar from '@components/AuthenticatedSidebar';
import EmptyStatePlaceholder from '@components/EmptyStatePlaceholder';
import SingleColumnLayout from '@components/SingleColumnLayout';
import PageHeader from '@components/PageHeader';
import Button from '@components/Button';
import ActionRow from '@components/ActionRow';
import AlertPanel from '@components/AlertPanel';

import { H1, H2, H3, H4, P } from '@components/Typography';
import Cookies from 'js-cookie';

const INCREMENT = 1000;

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

// Get the next set of files from Estuary
const getNext = async (state, setState, host) => {
  const offset = state.offset + INCREMENT;
  const limit = state.limit;
  const next = await R.get(`/content/stats?offset=${offset}&limit=${limit}`, host);

  if (!next || !next.length) {
    return;
  }

  setState({
    ...state,
    offset,
    limit,
    files: [...state.files, ...next],
  });
};

function HomePage(props: any) {
  const [state, setState] = React.useState({
    files: null,
    stats: null,
    offset: 0,
    limit: INCREMENT,

    // All offers the User has submitted to chain
    offers: []
  });

  React.useEffect(() => {
    const run = async () => {
      // Get the users Ethereum address
      const userAddress = Cookies.get(C.providerData).address;

      // The Stat Reps for all files the user has uploaded to Estuary
      const files = await R.get(`/content/stats?offset=${state.offset}&limit=${state.limit}`, props.api);
      // A users aggregated stats
      const stats = await R.get('/user/stats', props.api);
      // All offers the User has submitted to chain
      const offers = await O.getOffers(userAddress);

      if (files && !files.error) {
        setState({ ...state, files, stats, offers });
      }
    };

    run();
  }, []);

  console.log(props.viewer);
  console.log(state);

  const sidebarElement = <AuthenticatedSidebar active="FILES" viewer={props.viewer} />;

  return (
    <Page title="Estuary: Home" description="Analytics about Filecoin and your data." url={`${props.hostname}/home`}>
      <AuthenticatedLayout navigation={<Navigation isAuthenticated isRenderingSidebar={!!sidebarElement} />} sidebar={sidebarElement}>
        {/* <AlertPanel title="Storage deals are experiencing delays">
          Currently Filecoin deals are experiencing delays that are effecting the accuracy of receipts and status reporting. We are waiting for patches in the Lotus implementation
          of Filecoin to be deployed by miners.
        </AlertPanel> */}

        {state.files && !state.files.length ? (
          <PageHeader>
            <H2>Upload public data</H2>
            <P style={{ marginTop: 16 }}>
              Uploading your public data to IPFS and backing it up on Filecoin is easy. <br />
              <br />
              Lets get started!
            </P>

            <div className={styles.actions}>
              <Button href="/upload">Upload your first file</Button>
            </div>
          </PageHeader>
        ) : (
          <PageHeader>
            <H2>Files</H2>
            <P style={{ marginTop: 16 }}>
              Files that you upload to Banyan are listed here. <br />
              You can configure deals for files on an individual basis, and they will eventually be pinned by an IPFS node. <br />
              Deals you configure will show up here once they are confirmed.
            </P>
          </PageHeader>
        )}

        {state.stats ? (
          <div className={styles.group}>
            <table className={tstyles.table}>
              <tbody className={tstyles.tbody}>
                <tr className={tstyles.tr}>
                  <th className={tstyles.th}>Total size bytes</th>
                  <th className={tstyles.th}>Total size</th>
                  <th className={tstyles.th}>Total number of pins</th>
                </tr>
                <tr className={tstyles.tr}>
                  <td className={tstyles.td}>{U.formatNumber(state.stats.totalSize)}</td>
                  <td className={tstyles.td}>{U.bytesToSize(state.stats.totalSize)}</td>
                  <td className={tstyles.td}>{U.formatNumber(state.stats.numPins)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}

        <div className={styles.group}>
          <table className={tstyles.table}>
            <tbody className={tstyles.tbody}>
              <tr className={tstyles.tr}>
                <th className={tstyles.th} style={{ width: '96px' }}>
                  Local ID
                </th>
                <th className={tstyles.th} style={{ width: '30%' }}>
                  Name
                </th>
                <th className={tstyles.th}>Retrieval link</th>
                <th className={tstyles.th} style={{ width: '120px' }}>
                  Files
                </th>
                <th className={tstyles.th} style={{ width: '120px' }}>
                  Deal Status
                </th>
              </tr>
              {state.files && state.files.length
                ? state.files.map((data, index) => {
                    const fileURL = `https://dweb.link/ipfs/${data.cid['/']}`;

                    let name = '...';
                    if (data && data.filename) {
                      name = data.filename;
                    }
                    if (name === 'aggregate') {
                      name = '/';
                    }

                    // Get an Enum describing the deal status
                    let offerStatus = O.getOfferStatus(data.cid['/'], state.offers);
                    // And a string describing the deal status
                    let offerDescription = O.offerDescription(offerStatus);

                    return (
                      <tr key={`${data.cid['/']}-${index}`} className={tstyles.tr}>
                        <td className={tstyles.td} style={{ fontSize: 12, fontFamily: 'Mono', opacity: 0.4 }}>
                          {String(data.id).padStart(9, '0')}
                        </td>
                        <td className={tstyles.td}>{name}</td>
                        <td className={tstyles.tdcta}>
                          <a href={fileURL} target="_blank" className={tstyles.cta}>
                            {fileURL}
                          </a>
                        </td>
                        <td className={tstyles.td}>{data.aggregatedFiles + 1}</td>
                        {/*TODO (al): Right now the user shouldn't be able to access the deals page*/}
                        {/*They make deals upfront and can see a very simple status here*/}
                        {/*<td className={tstyles.td}>{<a href={`/deals/${String(data.id).padStart(9, '0')}`}>{offerDescription}</a>}</td>*/}
                        <td className={tstyles.td}>{offerDescription}</td>
                      </tr>
                    );
                  })
                : null}
            </tbody>
          </table>
          {state.files && state.offset + state.limit === state.files.length ? (
            <ActionRow style={{ paddingLeft: 16, paddingRight: 16 }} onClick={() => getNext(state, setState, props.api)}>
              ➝ Next {INCREMENT}
            </ActionRow>
          ) : null}
        </div>
      </AuthenticatedLayout>
    </Page>
  );
}

export default HomePage;

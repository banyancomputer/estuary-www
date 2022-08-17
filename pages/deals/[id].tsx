import styles from '@pages/app.module.scss';
import tstyles from '@pages/table.module.scss';

import * as React from 'react';
import * as U from '@common/utilities';
import * as R from '@common/requests';
import * as O from '@common/ethDeal';

import Navigation from '@components/Navigation';
import Page from '@components/Page';
import AuthenticatedLayout from '@components/AuthenticatedLayout';
import AuthenticatedSidebar from '@components/AuthenticatedSidebar';

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
    props: { viewer, ...context.params, api: process.env.ESTUARY_API, hostname: `https://${context.req.headers.host}` },
  };
}

function DealPage(props: any) {
  // const [state, setState] = React.useState({ deal: null, transfer: null, onChainState: null });
  const [state, setState] = React.useState({offer: null});
  React.useEffect(() => {
    const run = async () => {
      // TODO: pull this from Estuary once off-chain tracking is implemented
      // const response = await R.get(`/deals/status/${props.id}`, props.api);
      console.log(props.id);

      const offer = await O.getOffer(props.id);

      setState({offer});
    };

    run();
  }, []);

  // let fileURL;
  // if (state.transfer) {
  //   fileURL = `https://dweb.link/ipfs/${state.transfer.baseCid}`;
  // }

  const sidebarElement = <AuthenticatedSidebar viewer={props.viewer} active="DEAL_BY_ID" />;

  return (
    <Page title={`Estuary: Deal: ${props.id}`} description={`Deal status and transfer information`} url={`${props.hostname}/deals/${props.id}`}>
      <AuthenticatedLayout navigation={<Navigation isAuthenticated isRenderingSidebar={!!sidebarElement} active="DEAL_BY_ID" />} sidebar={sidebarElement}>
        {state.offer ?
            null : (<h1>Deal {props.id}</h1>)
        }






        {/*{state.deal ? (*/}
        {/*  <React.Fragment>*/}
        {/*    <table className={tstyles.table}>*/}
        {/*      <tbody className={tstyles.tbody}>*/}
        {/*        <tr className={tstyles.tr}>*/}
        {/*          <th className={tstyles.th}>Created date</th>*/}
        {/*          <th className={tstyles.th}>Failed</th>*/}
        {/*        </tr>*/}

        {/*        <tr className={tstyles.tr}>*/}
        {/*          <td className={tstyles.td}>{state.deal.CreatedAt}</td>*/}
        {/*          <td className={tstyles.td}>{String(state.deal.failed)}</td>*/}
        {/*        </tr>*/}
        {/*      </tbody>*/}
        {/*    </table>*/}

        {/*    <table className={tstyles.table}>*/}
        {/*      <tbody className={tstyles.tbody}>*/}
        {/*        <tr className={tstyles.tr}>*/}
        {/*          <th className={tstyles.th}>Deal Database ID</th>*/}
        {/*          <th className={tstyles.th}>Content ID</th>*/}
        {/*          <th className={tstyles.th}>Network Deal ID</th>*/}
        {/*          <th className={tstyles.th}>Provider</th>*/}
        {/*        </tr>*/}

        {/*        <tr className={tstyles.tr}>*/}
        {/*          <td className={tstyles.td}>{state.deal.ID}</td>*/}
        {/*          <td className={tstyles.td}>{state.deal.content}</td>*/}
        {/*          <td className={tstyles.tdcta}>*/}
        {/*            <a className={tstyles.cta} href={`/receipts/${state.deal.dealId}`}>*/}
        {/*              {state.deal.dealId}*/}
        {/*            </a>*/}
        {/*          </td>*/}
        {/*          <td className={tstyles.tdcta}>*/}
        {/*            <a className={tstyles.cta} href={`/providers/stats/${state.deal.miner}`}>*/}
        {/*              {state.deal.miner}*/}
        {/*            </a>*/}
        {/*          </td>*/}
        {/*        </tr>*/}
        {/*      </tbody>*/}
        {/*    </table>*/}

        {/*    <table className={tstyles.table}>*/}
        {/*      <tbody className={tstyles.tbody}>*/}
        {/*        <tr className={tstyles.tr}>*/}
        {/*          <th className={tstyles.th}>Data Transfer Channel</th>*/}
        {/*        </tr>*/}

        {/*        <tr className={tstyles.tr}>*/}
        {/*          <td className={tstyles.td}>{state.deal.dtChan}</td>*/}
        {/*        </tr>*/}
        {/*      </tbody>*/}
        {/*    </table>*/}

        {/*    <table className={tstyles.table}>*/}
        {/*      <tbody className={tstyles.tbody}>*/}
        {/*        <tr className={tstyles.tr}>*/}
        {/*          <th className={tstyles.th}>Proposal CID + inspection link</th>*/}
        {/*        </tr>*/}

        {/*        <tr className={tstyles.tr}>*/}
        {/*          <td className={tstyles.tdcta}>*/}
        {/*            <a className={tstyles.cta} href={`/proposals/${state.deal.propCid}`}>*/}
        {/*              /proposals/{state.deal.propCid}*/}
        {/*            </a>*/}
        {/*          </td>*/}
        {/*        </tr>*/}
        {/*      </tbody>*/}
        {/*    </table>*/}

        {/*    <table className={tstyles.table}>*/}
        {/*      <tbody className={tstyles.tbody}>*/}
        {/*        <tr className={tstyles.tr}>*/}
        {/*          <th className={tstyles.th}>Base CID + retrieval link</th>*/}
        {/*        </tr>*/}

        {/*        <tr className={tstyles.tr}>*/}
        {/*          {!U.isEmpty(fileURL) ? (*/}
        {/*            <td className={tstyles.tdcta}>*/}
        {/*              <a className={tstyles.cta} href={fileURL} target="_blank">*/}
        {/*                {fileURL}*/}
        {/*              </a>*/}
        {/*            </td>*/}
        {/*          ) : (*/}
        {/*            <td className={tstyles.td}>Does not exist</td>*/}
        {/*          )}*/}
        {/*        </tr>*/}
        {/*      </tbody>*/}
        {/*    </table>*/}

        {/*    <table className={tstyles.table}>*/}
        {/*      <tbody className={tstyles.tbody}>*/}
        {/*        <tr className={tstyles.tr}>*/}
        {/*          <th className={tstyles.th}>Channel ID</th>*/}
        {/*        </tr>*/}

        {/*        <tr className={tstyles.tr}>*/}
        {/*          <td className={tstyles.td}>{state.transfer ? state.transfer.channelId.ID : `NO TRANSFER`}</td>*/}
        {/*        </tr>*/}
        {/*      </tbody>*/}
        {/*    </table>*/}

        {/*    <table className={tstyles.table}>*/}
        {/*      <tbody className={tstyles.tbody}>*/}
        {/*        <tr className={tstyles.tr}>*/}
        {/*          <th className={tstyles.th}>Channel Initiator</th>*/}
        {/*        </tr>*/}

        {/*        <tr className={tstyles.tr}>*/}
        {/*          <td className={tstyles.td}>{state.transfer ? state.transfer.channelId.Initiator : `NO TRANSFER`}</td>*/}
        {/*        </tr>*/}
        {/*      </tbody>*/}
        {/*    </table>*/}

        {/*    <table className={tstyles.table}>*/}
        {/*      <tbody className={tstyles.tbody}>*/}
        {/*        <tr className={tstyles.tr}>*/}
        {/*          <th className={tstyles.th}>Channel Responder</th>*/}
        {/*        </tr>*/}

        {/*        <tr className={tstyles.tr}>*/}
        {/*          <td className={tstyles.td}>{state.transfer ? state.transfer.channelId.Responder : `NO TRANSFER`}</td>*/}
        {/*        </tr>*/}
        {/*      </tbody>*/}
        {/*    </table>*/}

        {/*    {state.transfer && !U.isEmpty(state.transfer.message) ? (*/}
        {/*      <table className={tstyles.table}>*/}
        {/*        <tbody className={tstyles.tbody}>*/}
        {/*          <tr className={tstyles.tr}>*/}
        {/*            <th className={tstyles.th}>Message</th>*/}
        {/*          </tr>*/}

        {/*          <tr className={tstyles.tr}>*/}
        {/*            <td className={tstyles.td}>{state.transfer.message}</td>*/}
        {/*          </tr>*/}
        {/*        </tbody>*/}
        {/*      </table>*/}
        {/*    ) : null}*/}

        {/*    {state.transfer ? (*/}
        {/*      <table className={tstyles.table}>*/}
        {/*        <tbody className={tstyles.tbody}>*/}
        {/*          <tr className={tstyles.tr}>*/}
        {/*            <th className={tstyles.th}>Received</th>*/}
        {/*            <th className={tstyles.th}>Sent</th>*/}
        {/*            <th className={tstyles.th}>Status</th>*/}
        {/*            <th className={tstyles.th}>Message</th>*/}
        {/*          </tr>*/}

        {/*          <tr className={tstyles.tr}>*/}
        {/*            <td className={tstyles.td}>{U.bytesToSize(state.transfer.received)}</td>*/}
        {/*            <td className={tstyles.td}>{U.bytesToSize(state.transfer.sent)}</td>*/}
        {/*            <td className={tstyles.td}>{state.transfer.status}</td>*/}
        {/*            <td className={tstyles.td}>{state.transfer.statusMessage}</td>*/}
        {/*          </tr>*/}
        {/*        </tbody>*/}
        {/*      </table>*/}
        {/*    ) : null}*/}

        {/*    {state.transfer ? (*/}
        {/*      <table className={tstyles.table}>*/}
        {/*        <tbody className={tstyles.tbody}>*/}
        {/*          <tr className={tstyles.tr}>*/}
        {/*            <th className={tstyles.th}>Remote peer</th>*/}
        {/*          </tr>*/}

        {/*          <tr className={tstyles.tr}>*/}
        {/*            <td className={tstyles.td}>{state.transfer.remotePeer}</td>*/}
        {/*          </tr>*/}
        {/*        </tbody>*/}
        {/*      </table>*/}
        {/*    ) : null}*/}

        {/*    {state.transfer ? (*/}
        {/*      <table className={tstyles.table}>*/}
        {/*        <tbody className={tstyles.tbody}>*/}
        {/*          <tr className={tstyles.tr}>*/}
        {/*            <th className={tstyles.th}>Self peer</th>*/}
        {/*          </tr>*/}

        {/*          <tr className={tstyles.tr}>*/}
        {/*            <td className={tstyles.td}>{state.transfer.selfPeer}</td>*/}
        {/*          </tr>*/}
        {/*        </tbody>*/}
        {/*      </table>*/}
        {/*    ) : null}*/}

        {/*    {state.onChainState ? (*/}
        {/*      <React.Fragment>*/}
        {/*        <table className={tstyles.table}>*/}
        {/*          <tbody className={tstyles.tbody}>*/}
        {/*            <tr className={tstyles.tr}>*/}
        {/*              <th className={tstyles.th}>Sector Start Epoch</th>*/}
        {/*            </tr>*/}

        {/*            <tr className={tstyles.tr}>*/}
        {/*              <td className={tstyles.td}>*/}
        {/*                {state.onChainState.sectorStartEpoch > 0 ? U.toDateSinceEpoch(state.onChainState.sectorStartEpoch) : state.onChainState.sectorStartEpoch} (*/}
        {/*                {state.onChainState.sectorStartEpoch})*/}
        {/*              </td>*/}
        {/*            </tr>*/}
        {/*          </tbody>*/}
        {/*        </table>*/}

        {/*        <table className={tstyles.table}>*/}
        {/*          <tbody className={tstyles.tbody}>*/}
        {/*            <tr className={tstyles.tr}>*/}
        {/*              <th className={tstyles.th}>Last Updated Epoch</th>*/}
        {/*            </tr>*/}

        {/*            <tr className={tstyles.tr}>*/}
        {/*              <td className={tstyles.td}>*/}
        {/*                {state.onChainState.lastUpdatedEpoch > 0 ? U.toDateSinceEpoch(state.onChainState.lastUpdatedEpoch) : state.onChainState.lastUpdatedEpoch}*/}
        {/*              </td>*/}
        {/*            </tr>*/}
        {/*          </tbody>*/}
        {/*        </table>*/}

        {/*        <table className={tstyles.table}>*/}
        {/*          <tbody className={tstyles.tbody}>*/}
        {/*            <tr className={tstyles.tr}>*/}
        {/*              <th className={tstyles.th}>Slash Epoch</th>*/}
        {/*            </tr>*/}

        {/*            <tr className={tstyles.tr}>*/}
        {/*              <td className={tstyles.td}>{state.onChainState.slashEpoch > 0 ? U.toDateSinceEpoch(state.onChainState.slashEpoch) : state.onChainState.slashEpoch}</td>*/}
        {/*            </tr>*/}
        {/*          </tbody>*/}
        {/*        </table>*/}
        {/*      </React.Fragment>*/}
        {/*    ) : null}*/}
        {/*  </React.Fragment>*/}
        {/*) : null}*/}
      </AuthenticatedLayout>
    </Page>
  );
}

export default DealPage;

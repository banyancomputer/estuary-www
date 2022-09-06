import styles from '@pages/app.module.scss';
import tstyles from '@pages/table.module.scss';

import * as React from 'react';
import * as U from '@common/utilities';
import * as R from '@common/requests';
import * as B from '@common/banyan';

import Navigation from '@components/Navigation';
import Page from '@components/Page';
import AuthenticatedLayout from '@components/AuthenticatedLayout';
import AuthenticatedSidebar from '@components/AuthenticatedSidebar';
import LoaderSpinner from "@components/LoaderSpinner";
import {P} from "@components/Typography";

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
  const [state, setState] = React.useState({deal: null});
  React.useEffect(() => {
    const run = async () => {
      let deal = await B.getDeal(props.id).catch((err) => {
        alert("Error getting deal: " + err);
        return {
          // For now, return a default deal.
          deal_status: B.DealStatus.NON,
          creator_address: '0x0',
          executor_address: '0x0',
          deal_start_block: 0,
          deal_length_in_blocks: 0,
          proof_frequency_in_blocks: 0,
          bounty: 0,
          collateral: 0,
          erc20_token_denomination: '0x0',
          file_size: 0,
          file_cid: 'NAN',
          file_blake3: 'NAN'
        };
      });
      setState({deal});
    };

    run();
  }, []);

  const sidebarElement = <AuthenticatedSidebar viewer={props.viewer} active="DEAL_BY_ID" />;

  return (
    <Page title={`Estuary: Deal: ${props.id}`} description={`Deal status and transfer information`} url={`${props.hostname}/deals/${props.id}`}>
      <AuthenticatedLayout navigation={<Navigation isAuthenticated isRenderingSidebar={!!sidebarElement} active="DEAL_BY_ID" />} sidebar={sidebarElement}>
        <h1>Deal {props.id}</h1>
        {state.deal ?
          <div>
            <P>Deal status: {state.deal.deal_status}</P>
            <P>Creator address: {state.deal.creator_address}</P>
            <P>Executor address: {state.deal.executor_address}</P>
            <P>Deal Start Block: {state.deal.deal_start_block}</P>
            <P>Deal Length in Blocks: {state.deal.deal_length_in_blocks}</P>
            <P>Proof Frequency in Blocks: {state.deal.proof_frequency_in_blocks}</P>
            <P>Deal Bounty: {state.deal.bounty}</P>
            <P>Deal Collateral: {state.deal.collateral}</P>
            <P>Token Address: {state.deal.erc20_token_denomination}</P>
            <P>File Size: {state.deal.file_size}</P>
            <P>File CID: {state.deal.file_cid}</P>
            <P>File Blake3 Hash: {state.deal.file_blake3}</P>
          </div>
          :
          <LoaderSpinner />
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

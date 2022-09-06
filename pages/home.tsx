import styles from '@pages/app.module.scss';
import tstyles from '@pages/table.module.scss';

import * as React from 'react';
import * as U from '@common/utilities';
import * as R from '@common/requests';
import * as C from '@common/constants';
import * as B from '@common/banyan';

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
import AsyncChild from 'react-async-child';

import { H1, H2, H3, H4, P } from '@components/Typography';
import Cookies from 'js-cookie';
import { DealStatus, getDeal } from '@common/banyan';
import LoaderSpinner from "@components/LoaderSpinner";
import Link from "next/link";

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
    fileStats: [...state.files, ...next],
  });
};

// A statsResp Type to handle responses from /contents/stats
export type FileStat = {
  id: string;
  cid: string;
  filename: string;
  dealId: string;
}

export class FileItem extends React.Component<any> {
  state = { dealStatus: null };

  componentDidMount() {
    const getDealStatus = () => {
      window.setTimeout(async () => {
        // This is a hacky way to error-handle the deal status.
        console.log('Getting deal status for', this.props.fs.dealId);
        const dealStatus = await B.getDealStatus(this.props.fs.dealId).catch(() => DealStatus.NON);
        if (dealStatus) {
          this.setState({ dealStatus });
          this.forceUpdate();
          return;
        }
        getDealStatus();
      }, 5000);
    };
    getDealStatus();
  }

  render() {
    let fileStats = this.props.fs; //as FileStat;
    let index = this.props.index;

    const fileURL = `https://dweb.link/ipfs/${fileStats.cid['/']}`;
    let name = '...';
    if (fileStats && fileStats.filename) {
      name = fileStats.filename;
    }
    if (name === 'aggregate') {
      name = '/';
    }

    return (
      <tr key={`${fileStats.cid['/']}-${index}`} className={tstyles.tr}>
        {/*Local Estuary ID*/}
        <td className={tstyles.td} style={{ fontSize: 12, fontFamily: 'Mono', opacity: 0.4 }}>
          {String(fileStats.id).padStart(9, '0')}
        </td>
        {/*Filename (if any)*/}
        <td className={tstyles.td}>
          {name}
        </td>
        {/*Retrieval Link*/}
        <td className={tstyles.tdcta}>
          <a href={fileURL} target="_blank" className={tstyles.cta}>
            {fileURL}
          </a>
        </td>
        {/*Note (al): I don't see aggregation as a part of the struct returned by the /content/stats endpoint on Estuary*/}
        {/*For now I'm gonna leave this line here but we should figure out what sort of aggregation we should support views into*/}
        {/*<td className={tstyles.td}>{fileStats.aggregatedFiles + 1}</td>*/}
        {/*Deal Status*/}
        <td className={tstyles.td}>
          {this.state.dealStatus ?
            <a href={`deals/${this.props.fs.dealId}`}>{this.state.dealStatus}</a> :
            <LoaderSpinner/>
          }
        </td>
      </tr>
    );
  }
}

function HomePage(props: any) {
  const [state, setState] = React.useState({
    fileStats: null,
    userStats: null,
    offset: 0,
    limit: INCREMENT,
  });

  React.useEffect(() => {
    const run = async () => {
      // Get the users Ethereum address
      // const userAddress = Cookies.get(C.userWallet).address;
      // The Stat Reps for all files the user has uploaded to Estuary
      const fileStats = await R.get(`/content/stats?offset=${state.offset}&limit=${state.limit}`, props.api);
      // A users aggregated stats
      const userStats = await R.get('/user/stats', props.api);

      if (fileStats && !fileStats.error) {
        setState({ ...state, fileStats, userStats });
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

        {state.fileStats && !state.fileStats.length ? (
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
          </PageHeader>
        )}

        {state.userStats ? (
          <div className={styles.group}>
            <table className={tstyles.table}>
              <tbody className={tstyles.tbody}>
              <tr className={tstyles.tr}>
                <th className={tstyles.th}>Total size bytes</th>
                <th className={tstyles.th}>Total size</th>
                <th className={tstyles.th}>Total number of pins</th>
              </tr>
              <tr className={tstyles.tr}>
                <td className={tstyles.td}>{U.formatNumber(state.userStats.totalSize)}</td>
                <td className={tstyles.td}>{U.bytesToSize(state.userStats.totalSize)}</td>
                <td className={tstyles.td}>{U.formatNumber(state.userStats.numPins)}</td>
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
              {/*Note (al): We don't support aggregation, yet*/}
              {/*<th className={tstyles.th} style={{ width: '120px' }}>*/}
              {/*  Files*/}
              {/*</th>*/}
              <th className={tstyles.th} style={{ width: '120px' }}>
                Deal Status
              </th>
            </tr>
            {state.fileStats && state.fileStats.length
              ? state.fileStats.map((data, index) => {
                return (
                  <FileItem key={index} fs={data}/>
                );
              })
              : null}
            </tbody>
          </table>
          {state.fileStats && state.offset + state.limit === state.fileStats.length ? (
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
import styles from '@pages/app.module.scss';
import tstyles from '@pages/table.module.scss';

import * as React from 'react';
import * as U from '@common/utilities';
import * as C from '@common/constants';
import * as R from '@common/requests';

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
import * as O from "@common/offers";
import Cookies from 'js-cookie';

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


function MakeDealPage(props: any) {
    const [state, setState] = React.useState({
        dealConfiguration: null,
        cid: null,
    });

    React.useEffect(() => {
        const run = async () => {
            // Get the users Ethereum address
            const { query } = useRouter();
            const userAddress = Cookies.get(C.providerData).address;

            /**
             * TODO:
             * For now the default deal configuration is hardcoded
             * Eventually this is going to be configured/fetched from Estuary
             */
            // Get the deal configuration
            const dealConfiguration =  O.DefaultDealConfiguration;
            // Get the CID of the file
            const cid = query.cid;

            setState({  dealConfiguration, cid });
        };

        run();
    }, []);

    const sidebarElement = <AuthenticatedSidebar active="FILES" viewer={props.viewer} />;

    return (
        <Page title="Estuary: Make a deal" description="Configure a deal for your file." url={`${props.hostname}/make-deal`}>
            <AuthenticatedLayout navigation={<Navigation isAuthenticated isRenderingSidebar={!!sidebarElement} />} sidebar={sidebarElement}>
                /* TODO: We're not doing any CID validation yet */
                <PageHeader>
                    <H2>Files</H2>
                    <P style={{ marginTop: 16 }}>
                        Files that you upload to Banyan are listed here. <br />
                        You can configure deals for files on an individual basis, and they will eventually be pinned by an IPFS node. <br />
                        Deals you configure will show up here once they are confirmed.
                    </P>
                </PageHeader>

                {/*{state.stats ? (*/}
                {/*    <div className={styles.group}>*/}
                {/*        <table className={tstyles.table}>*/}
                {/*            <tbody className={tstyles.tbody}>*/}
                {/*            <tr className={tstyles.tr}>*/}
                {/*                <th className={tstyles.th}>Total size bytes</th>*/}
                {/*                <th className={tstyles.th}>Total size</th>*/}
                {/*                <th className={tstyles.th}>Total number of pins</th>*/}
                {/*            </tr>*/}
                {/*            <tr className={tstyles.tr}>*/}
                {/*                <td className={tstyles.td}>{U.formatNumber(state.stats.totalSize)}</td>*/}
                {/*                <td className={tstyles.td}>{U.bytesToSize(state.stats.totalSize)}</td>*/}
                {/*                <td className={tstyles.td}>{U.formatNumber(state.stats.numPins)}</td>*/}
                {/*            </tr>*/}
                {/*            </tbody>*/}
                {/*        </table>*/}
                {/*    </div>*/}
                {/*) : null}*/}

                {/*<div className={styles.group}>*/}
                {/*    <table className={tstyles.table}>*/}
                {/*        <tbody className={tstyles.tbody}>*/}
                {/*        <tr className={tstyles.tr}>*/}
                {/*            <th className={tstyles.th} style={{ width: '96px' }}>*/}
                {/*                Local ID*/}
                {/*            </th>*/}
                {/*            <th className={tstyles.th} style={{ width: '30%' }}>*/}
                {/*                Name*/}
                {/*            </th>*/}
                {/*            <th className={tstyles.th}>Retrieval link</th>*/}
                {/*            <th className={tstyles.th} style={{ width: '120px' }}>*/}
                {/*                Files*/}
                {/*            </th>*/}
                {/*            <th className={tstyles.th} style={{ width: '120px' }}>*/}
                {/*                Deal Status*/}
                {/*            </th>*/}
                {/*        </tr>*/}
                {/*        {state.files && state.files.length*/}
                {/*            ? state.files.map((data, index) => {*/}
                {/*                const fileURL = `https://dweb.link/ipfs/${data.cid['/']}`;*/}
                {/*                console.log(fileURL);*/}

                {/*                let name = '...';*/}
                {/*                if (data && data.filename) {*/}
                {/*                    name = data.filename;*/}
                {/*                }*/}
                {/*                if (name === 'aggregate') {*/}
                {/*                    name = '/';*/}
                {/*                }*/}

                {/*                let offerStatus = O.getOfferStatus(data.cid['/'], state.offers);*/}
                {/*                let offerDescription;*/}

                {/*                // If no deal has been made, show a link to make one*/}
                {/*                if (offerStatus === O.OfferStatus.NON) {*/}
                {/*                    let deal_url = `/deals/` + data.cid['/'];*/}
                {/*                    offerDescription = <a href={deal_url}>Make Deal</a>*/}
                {/*                }*/}
                {/*                // Otherwise, just show the description*/}
                {/*                else {*/}
                {/*                    offerDescription = O.offerDescription(O.getOfferStatus(data.cid, state.offers));*/}
                {/*                }*/}

                {/*                return (*/}
                {/*                    <tr key={`${data.cid['/']}-${index}`} className={tstyles.tr}>*/}
                {/*                        <td className={tstyles.td} style={{ fontSize: 12, fontFamily: 'Mono', opacity: 0.4 }}>*/}
                {/*                            {String(data.id).padStart(9, '0')}*/}
                {/*                        </td>*/}
                {/*                        <td className={tstyles.td}>{name}</td>*/}
                {/*                        <td className={tstyles.tdcta}>*/}
                {/*                            <a href={fileURL} target="_blank" className={tstyles.cta}>*/}
                {/*                                {fileURL}*/}
                {/*                            </a>*/}
                {/*                        </td>*/}
                {/*                        <td className={tstyles.td}>{data.aggregatedFiles + 1}</td>*/}
                {/*                        <td className={tstyles.td}>{offerDescription}</td>*/}
                {/*                    </tr>*/}
                {/*                );*/}
                {/*            })*/}
                {/*            : null}*/}
                {/*        </tbody>*/}
                {/*    </table>*/}
                {/*    {state.files && state.offset + state.limit === state.files.length ? (*/}
                {/*        <ActionRow style={{ paddingLeft: 16, paddingRight: 16 }} onClick={() => getNext(state, setState, props.api)}>*/}
                {/*            ➝ Next {INCREMENT}*/}
                {/*        </ActionRow>*/}
                {/*    ) : null}*/}
                {/*</div>*/}
            </AuthenticatedLayout>
        </Page>
    );
}

export default MakeDealPage;

import styles from '@pages/app.module.scss';

import * as React from 'react';
import * as U from '@common/utilities';

import ProgressCard from '@components/ProgressCard';
import Navigation from '@components/Navigation';
import Page from '@components/Page';
import AuthenticatedLayout from '@components/AuthenticatedLayout';
import AuthenticatedSidebar from '@components/AuthenticatedSidebar';
import EmptyStatePlaceholder from '@components/EmptyStatePlaceholder';
import SingleColumnLayout from '@components/SingleColumnLayout';

function ErrorPage(props: any) {
  return (
    <Page title="Banyan: 404" description="This page does not exist." url={props.hostname ?? ""}>
      <AuthenticatedLayout
        navigation={<Navigation isAuthenticated active="404" />}
        sidebar={props.viewer ? <AuthenticatedSidebar viewer={props.viewer} /> : null}
      >
        <SingleColumnLayout>
          <EmptyStatePlaceholder>404</EmptyStatePlaceholder>
        </SingleColumnLayout>
      </AuthenticatedLayout>
    </Page>
  );
}

export default ErrorPage;

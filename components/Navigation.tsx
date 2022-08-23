import styles from '@components/Navigation.module.scss';

import * as React from 'react';
import * as U from '@common/utilities';
import * as C from '@common/constants';

import Tag from '@components/Tag';

const Navigation = (props: any) => {
  return (
    <div className={styles.navigation}>
      <nav className={styles.container} style={props.style}>
        <div className={styles.left} style={{ backgroundColor: !props.isRenderingSidebar ? `#fff` : null }}>
          <a className={styles.logo} href="/">
            Estuary <Tag>Alpha</Tag>
          </a>
        </div>
        <div className={styles.right}>
          {!props.isAuthenticated && props.active !== 'SIGN_UP' ? (
            <a href="/sign-up" className={styles.item}>
              Sign up
            </a>
          ) : null}
          {!props.isAuthenticated && props.active !== 'SIGN_IN' ? (
            <a href="/sign-in" className={styles.item}>
              Sign in
            </a>
          ) : null}
          {props.isAuthenticated && props.active === 'INDEX' ? (
            <a href="/home" className={styles.item}>
              Home
            </a>
          ) : null}

          {/*NOTE (al): Removing the ability to verify for now*/}
          {/*<a href="/verify-cid" className={styles.webItem}>*/}
          {/*  Verify*/}
          {/*</a>*/}

          {/*TODO: Make this point at our Documentation*/}
          <a href="https://docs.estuary.tech" className={styles.webItem}>
            Documentation
          </a>

          {props.isAuthenticated ? (
            <a href="/_" className={styles.mobileItem}>
              Menu
            </a>
          ) : null}
        </div>
      </nav>
    </div>
  );
};

export default Navigation;

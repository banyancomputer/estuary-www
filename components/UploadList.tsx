import styles from '@components/UploadList.module.scss';

import * as React from 'react';
import * as U from '@common/utilities';
import * as C from '@common/constants';

import UploadItem from '@components/UploadItem';

export default class UploadList extends React.Component<any> {
  items = {};

  uploadAll = async () => {
    const items = Object.keys(this.items);

    for (const key of items) {
      const item = this.items[key];
      if (!item.upload) {
        continue;
      }

      item.upload();
    }
  };

  render() {
    return (
      <section className={styles.layout}>
        {this.props.uploads.map((upload) => {
          return <UploadItem
              host={this.props.host}
              // TODO: Make sure this populates items correctly.
              ref={(a) => (this.items[upload.id] = a)}
              upload={upload}
              key={upload.id}
              // file={upload.file}
              // dealProposal={upload.dealProposal}
              viewer={this.props.viewer}
              onRemove={this.props.onRemove}
          />;
        })}
      </section>
    );
  }
}

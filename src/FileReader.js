import React, { Component } from 'react';
import PropTypes from 'prop-types';
import Dropzone from 'react-dropzone';
// import JSZip from 'jszip';
import _ from 'lodash';
import readAsArrayBuffer from './readAsArrayBuffer';

const style = {
  padding: '0 1rem',
  border: '2px dashed #e0e0e0',
  lineHeight: '166px',
  textAlign: 'center',
  color: '#bdbdbd',
};

const activeStyle = {
  ...style,
  backgroundColor: '#fafafa',
};

export default class extends Component {

  static propTypes = {
    vm: PropTypes.object.isRequired,
  }

  state = {
    progress: 0,
  }

  onDrop = (files) => {
    const vm = this.props.vm;
    const progresses = [];
    const updateProgress = part => value => {
      progresses[part] = value;
      const progress = progresses.reduce((i, sum) => sum + i) / files.length;
      this.setState({ progress });
    };

    const readings = _.map(files, (file, i) => readAsArrayBuffer(file, updateProgress(i + 1)));

    Promise.all(readings)
      .then(readFiles => _.map(readFiles, (file) => {
        vm.emulator.create_file(`/${file.name}`, new Uint8Array(file.body), () => vm.emit('file added', file));
        this.checkIfELF(file);
      }))
      .then(() => this.setState({ progress: 0 }));
  }

  /*
    Encoding API would be better, but is not as good supported.
    https://developers.google.com/web/updates/2014/08/Easier-ArrayBuffer-String-conversion-with-the-Encoding-API

    const dataView = new DataView(buffer.slice(0, 4));
    const decoder = new TextDecoder('utf-8');
    const decodedString = decoder.decode(dataView);
   */
  checkIfELF = (file) => {
    const head = file.body.slice(0, 4);
    const ElfSignature = '\x7fELF';
    const signature = String.fromCharCode.apply(null, new Uint8Array(head));

    if (signature === ElfSignature) {
      this.props.vm.execute(`chmod +x ${file.name}`)
        .then(() => this.props.vm.emit('ELF added', file));
    }
  }

  // unzip() {
  //   JSZip.loadAsync(this.state.file)
  //     .then((zip) => {
  //       this.setState({ zip, error: null });

  //       const relevantFiles = _.filter(zip.files, file => file.name.endsWith('.xml'));
  //       const promises = relevantFiles.map(file => file.async('string'));

  //       return Promise.all(promises)
  //         .then((contents) => {
  //           const authors = {};
  //           _.each(contents, (content) => {
  //             const regex = /w:author="(.*?)"/g;
  //             let matches;
  //             while (matches = regex.exec(content)) { // eslint-disable-line no-cond-assign
  //               authors[matches[1]] = true;
  //             }
  //           });
  //           this.setState({
  //             authors: _.keys(authors),
  //             fileContents: _.zipObject(_.map(relevantFiles, 'name'), contents),
  //           });
  //         });
  //     })
  //     .catch((error) => {
  //       this.setState({ error });
  //     });
  // }

  render() {
    const progress = this.state.progress;

    return (
      <div>
        <Dropzone
          onDrop={this.onDrop}
          multiple
          disablePreview
          style={style}
          activeStyle={activeStyle}
          className="truncate m-b-1"
        >
          Drop File
        </Dropzone>
        {progress > 0 &&
          <div className="progress-bar m-t-1"><div style={{ width: `${progress}%` }} /></div>
        }
      </div>
    );
  }

}

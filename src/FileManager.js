import React, { Component } from 'react';
import PropTypes from 'prop-types';
import FileSaver from 'file-saver';
// import { Treebeard } from 'react-treebeard';
import _ from 'lodash';
import Parser from 'parse-listing';

/*
  TODO: Implement Treebeard: https://github.com/alexcurtis/react-treebeard
 */

/*
  `ls` sepperates files with newlines, but newlines are allowed in filenames,
  so we have to use a different way – see http://mywiki.wooledge.org/ParsingLs

  const listFilesCommand = 'for f in *; do [[ -e $f ]] || continue; echo $f; done';
 */
const listFilesCommand = 'ls -al';

export default class extends Component {

  static propTypes = {
    vm: PropTypes.object.isRequired,
    execute: PropTypes.func,
  }

  state = {
    files: [],
  }

  componentDidMount() {
    this.props.vm.on('file added', _.debounce(this.update, 100));
    this.update();
  }

  download = (e) => {
    e.preventDefault();

    const filename = e.currentTarget.dataset.file;

    this.props.vm.emulator.read_file(filename, (err, uint8array) => {
      if (err) console.error('could not read file', err.message);
      else FileSaver.saveAs(new Blob([uint8array]), filename);
    });
  }

  execute = (e) => {
    e.preventDefault();
    const filename = e.currentTarget.dataset.file;
    this.props.execute(filename);
  }

  remove = (e) => {
    e.preventDefault();
    const filename = e.currentTarget.dataset.file;
    this.props.vm.execute(`rm ${filename}`).then(this.update);
  }

  update = async () => {
    console.log('FileManager update', this);
    const result = await this.props.vm.execute(listFilesCommand);
    Parser.parseEntries(result.cleanResult, (err, files) => {
      console.log('new files', files);
      if (err) console.error(err);
      else {
        this.props.vm.emit('ls', files);
        this.setState({ files });
      }
    });
  }

  render() {
    const center = { textAlign: 'center' };

    return (
      <table className="table-striped table-narrow">
        <thead>
          <tr>
            <th>name</th>
            <th>owner</th>
            <th>size</th>
            <th>time</th>
            <th><svg className="i"><use xmlnsXlink="http://www.w3.org/1999/xlink" xlinkHref="icons.svg#i-play" /></svg></th>
            <th><svg className="i"><use xmlnsXlink="http://www.w3.org/1999/xlink" xlinkHref="icons.svg#i-import" /></svg></th>
            <th><svg className="i"><use xmlnsXlink="http://www.w3.org/1999/xlink" xlinkHref="icons.svg#i-trash" /></svg></th>
          </tr>
        </thead>
        <tbody>
          {_.map(this.state.files, (file, i) =>
            <tr key={i}>
              <td>{file.name}</td>
              <td>{file.owner}</td>
              <td>{file.size}</td>
              <td>{new Date(file.time).toLocaleString()}</td>
              <td style={center}>
                {file.userPermissions.exec &&
                  <a data-file={file.name} onClick={this.execute}>
                    <svg className="i"><use xmlnsXlink="http://www.w3.org/1999/xlink" xlinkHref="icons.svg#i-play" /></svg>
                  </a>
                }
              </td>
              <td style={center}>
                <a data-file={file.name} onClick={this.download}>
                  <svg className="i"><use xmlnsXlink="http://www.w3.org/1999/xlink" xlinkHref="icons.svg#i-import" /></svg>
                </a>
              </td>
              <td style={center}>
                <a data-file={file.name} onClick={this.remove}>
                  <svg className="i"><use xmlnsXlink="http://www.w3.org/1999/xlink" xlinkHref="icons.svg#i-trash" /></svg>
                </a>
              </td>
            </tr>
          )}
        </tbody>
      </table>

    );
  }

}

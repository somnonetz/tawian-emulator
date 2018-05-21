import React, { Component } from 'react';
import PropTypes from 'prop-types';
import _ from 'lodash';

export default class extends Component {

  static propTypes = {
    vm: PropTypes.object.isRequired,
    elf: PropTypes.string.isRequired,
    resolve: PropTypes.func,
  }

  static defaultProps = {
    resolve() {},
  }

  state = {
    libs: {},
    message: '',
  }

  componentDidMount() {
    console.log('ElfManager mounted');
    this.props.vm.on('file added', _.debounce(this.update, 100));
    this.props.vm.on('ls', (files) => this.setState({ files }, this.copyLibs));
    this.update();
  }

  // hack to load files over 9p, otherwise ldd seems to ignore them
  copyLibs = (noCp = false) => {
    const libs = this.state.libs;
    const files = this.state.files;
    console.log('copy libs', libs, files);

    const filenames = _.map(files, 'name');
    const unresolvedLibs = _.map(libs, (value, name) => value ? '' : name)
      .filter(name => filenames.includes(name))
      .join(' ')
      .trim();

    if (unresolvedLibs) {
      console.log('unresolvedLibs', unresolvedLibs);
      this.props.vm.execute(`cp ${unresolvedLibs} /lib/`)
        .then(() => this.update(noCp));
    }
  }

  update = async (noCp = false) => {
    console.log('ElfManager update');
    const result = await this.props.vm.execute(`ldd ${this.props.elf}`);
    const text = result.cleanResult.trim();

    if (text.endsWith('not a dynamic executable') && !text.includes(' => ')) {
      this.setState({ message: 'Not a dynamic executable.' });
    }

    const libs = {};
    const lines = text.split('\n').map(line => line.trim());

    _.each(lines, line => {
      if (line.includes(' => ')) {
        const resolved = !line.endsWith('(0x00000000)') && !line.endsWith('not found');
        const name = _.last(_.first(line.split(' => ')).split('/'));
        libs[name] = resolved;
      }
    });

    console.log('update libs', libs);
    this.setState({ libs }, () => { if (!noCp) this.copyLibs(true); });

    if (_.every(libs, _.identity)) {
      this.props.resolve();
    }
  }

  render() {
    if (this.state.message) {
      return <div className="alert warn">{this.state.message}</div>;
    }

    if (_.keys(this.state.libs).length) {
      return (
        <ul className="list-group m-b-2">
          {_.map(this.state.libs, (resolved, name) =>
            <li className={resolved ? 'bg-success' : 'bg-error'} key={name}>{name}</li>
          )}
        </ul>
      );
    }

    return <div className="alert">Loading<span className="loading" /></div>;
  }

}

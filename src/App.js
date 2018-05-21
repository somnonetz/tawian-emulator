import React, { Component } from 'react';
import createVM from './createVM';
import CommandHistory from './CommandHistory';
import SerialOutput from './SerialOutput';
import FileReader from './FileReader';
import FileManager from './FileManager';
import ElfManager from './ElfManager';

export default class extends Component {

  state = {
    error: null,
    vm: null,
    output: '',
    history: [],
    started: false,
    isRunning: false,
    unresolvedELF: null,
  }

  componentWillMount() {
    this.onInit();
  }

  componentDidMount() {
    this.state.vm.on('ELF added', (file) => {
      if (this.state.unresolvedELF) return;
      this.setState({ unresolvedELF: file.name });
    });
  }

  onInit = () => {
    const vm = createVM({
      // os: 'linux3_token.iso',
      stateFile: 'v86state.bin',
      token: '331fc91d26a738b6',
    });

    vm.once('ready', async () => {
      document.getElementById('screen_container').parentElement.open = false; // TODO remove
      this.setState({ started: true, isRunning: true });
    });

    vm.on('char', char => this.setState({ output: this.state.output + char }));

    this.setState({ vm });
  }

  onSubmit = (event) => {
    event.preventDefault();
    this.execute(event.target.elements[0].value);
    event.target.reset();
  }

  execute = async (command) => {
    const result = await this.state.vm.execute(command);
    this.setState({ history: [...this.state.history, result] });
  }

  toggleRunningState = () => {
    const isRunning = this.state.isRunning; // vm.emulator.is_running()

    if (isRunning) {
      this.state.vm.emulator.stop();
    }
    else {
      this.state.vm.emulator.run();
    }
    this.setState({ isRunning: !isRunning });
  }

  resolveELF = () => {
    console.log('resolve ELF');
    window.setTimeout(() => this.setState({ unresolvedELF: null }), 2500);
  }

  render() {
    const vm = this.state.vm;
    const isRunning = this.state.isRunning;
    const started = this.state.started;

    return (
      <div>
        <form className="form grid-inline m-b-2" onSubmit={this.onSubmit}>
          <input className="cell" type="text" placeholder="command..." style={{ width: '100%' }} />
          <button className="btn btn-default" type="button" onClick={this.toggleRunningState}>{isRunning ? 'Stop' : 'Start'} Emulator</button>
          <button className="btn btn-default" type="button" onClick={vm.saveState}>Download State</button>
        </form>

        {started &&
          <div className="m-b-2 grid">
            <div className="cell cell-8">
              <FileManager vm={vm} execute={this.execute} />
            </div>
            <div className="cell cell-4">
              <FileReader vm={vm} />

              {this.state.unresolvedELF &&
                <ElfManager vm={vm} elf={this.state.unresolvedELF} resolve={this.resolveELF} />
              }
            </div>
          </div>
        }

        <div className="m-b-2">
          <CommandHistory history={this.state.history} open={started} />
        </div>

        <div className="m-b-2">
          <SerialOutput output={this.state.output} open={!started} />
        </div>
      </div>
    );
  }

}

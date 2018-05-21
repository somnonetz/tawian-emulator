/* global V86Starter */
import _ from 'lodash';

/*
  TODO
  - FileSaver statt Eigenbau
 */

export default function createVM(settings = {}) {

  const TOKEN = settings.token;
  const ansiRegex = /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-PRZcf-nqry=><]/g;
  const noop = () => {};
  const events = {};

  const emulator = new V86Starter({
    screen_container: document.getElementById('screen_container'),
    bios: {
      url: 'binaries/seabios.bin',
    },
    vga_bios: {
      url: 'binaries/vgabios.bin',
    },
    cdrom: {
      url: `binaries/${settings.os || 'linux3.iso'}`,
    },
    filesystem: {
      baseurl: 'filesystem/',
      basefs: 'filesystem.json',
    },
    // memory_size: 128 * 1024 * 1024,
    disable_keyboard: true,
    disable_mouse: true,
  });

  emulator.add_listener('emulator-ready', () => {
    if (settings.stateFile) {
      fetch(`binaries/${settings.stateFile}`)
        .then(response => response.arrayBuffer())
        .then(state => {
          emulator.restore_state(state);
          emulator.run();
          emit('ready');
        })
        .catch(console.error);
    }
    else {
      emulator.run();
    }
  });

  let currentReceiver = settings.stateFile ? noop : init();
  emulator.add_listener('serial0-output-char', (char) => {
    emit('char', char);
    currentReceiver(char);
  });

  function init() {
    const DONE = 'DONE';
    const stages = [
      // { pattern: 'login:',        command: 'root\n' },
      { pattern: '\n~% ',         command: `export LD_LIBRARY_PATH="/mnt:$LD_LIBRARY_PATH" PATH="/mnt:$PATH" PS1='\\n${TOKEN}'\n` },
      { pattern: `\n${TOKEN}`,    command: 'cd /mnt\n' },
      { pattern: TOKEN,           command: DONE },
    ];

    let currentStage = stages.shift();
    currentStage.output = '';

    return function listener(char) {
      currentStage.output += char;

      if (currentStage.output.endsWith(currentStage.pattern)) {
        if (currentStage.command === DONE) {
          currentReceiver = noop;
          emit('ready');
        }
        else {
          emulator.serial0_send(currentStage.command);
          currentStage = stages.shift();
          currentStage.output = '';
        }
      }
    };
  }

  const commandQueue = [];

  function execute(command, delimiter = TOKEN) {
    console.log('createVM execute', command);

    return new Promise((resolve) => {
      commandQueue.push({ command, delimiter, resolve });
      processQueue();
    });
  }

  function processQueue() {
    console.log('processQueue', commandQueue);
    if (currentReceiver !== noop || !commandQueue.length) return; // busy

    const { command, delimiter, resolve } = commandQueue.shift();

    const data = { result: '' };
    let currentLine = '';

    currentReceiver = listener;
    emulator.serial0_send(`${command}\n`);

    function listener(char) {
      if (char === '\n') {
        if (!data.command) {
          data.command = currentLine;
        }
        else {
          data.result += currentLine + char;
        }
        currentLine = '';
      }
      else {
        currentLine += char;

        if (currentLine === delimiter) {
          data.cleanResult = data.result.replace(ansiRegex, '');
          currentReceiver = noop;
          resolve(data);
          console.log('createVM resolved', command, data);
          processQueue(); // check for next task
        }
      }
    }
  }

  function saveState() {
    console.log('saveState');
    emulator.save_state((error, result) => {
      if (error) {
        console.error('Could not save state', error);
      }
      else {
        const name = 'v86state.bin';
        const blob = new Blob(result instanceof Array ? result : [result]);
        download(blob, name);
      }
    });

    function download(blob, name) {
      const link = document.createElement('a');
      link.download = name;
      link.href = window.URL.createObjectURL(blob);
      link.dataset.downloadurl = `application/octet-stream:${link.download}:${link.href}`;
      link.click();
      window.URL.revokeObjectURL(link.href);
    }
  }

  // Event Emitter

  function list(type) {
    const t = type.toLowerCase();
    return events[t] || (events[t] = []);
  }

  function on(type, handler) {
    list(type).push(handler);
    return () => off(type, handler);
  }

  function once(type, handler) {
    const newHandler = (...args) => {
      handler(...args);
      off(type, newHandler);
    };
    return on(type, newHandler);
  }

  function off(type, handler) {
    const e = list(type);
    const i = e.indexOf(handler);
    if (~i) e.splice(i, 1);
  }

  function emit(type, event) {
    list('*').concat(list(type)).forEach(f => f(event, type));
  }

  // API
  return { on, off, once, emit, execute, emulator, saveState };

}

import _ from 'lodash';

export default function readAsArrayBuffer(file, progressCallback) {
  let entry = {};

  if (file.type === 'application/zip') {
    window.alert('zip not yet supported');
    // TODO implement .zip
    // return this.handleZipFile(file.getAsFile ? file.getAsFile() : file); // chrome vs. firefox
  }
  else if (file.isFile || file.isDirectory) {
    entry = file;
  }
  else if (file.getAsEntry) {
    entry = file.getAsEntry();
  }
  else if (file.webkitGetAsEntry) {
    entry = file.webkitGetAsEntry();
  }
  else if (_.isFunction(file.getAsFile)) {
    return readFile(file.getAsFile(), progressCallback);
  }
  else if (File && file instanceof File) {
    return readFile(file, progressCallback);
  }
  else {
    return null;
  }

  if (entry.isFile) {
    window.alert('WARNING! Untested Code Path!');
    entry.file(
      file => readFile(file, progressCallback),
      err => console.warn(err)
    );
  }
  else if (entry.isDirectory) {
    // TODO What to do with directories? return Promise?
    window.alert('WARNING! Untested Code Path!');
    entry.createReader().readEntries(
      entries => readAsArrayBuffer(entries),
      err => console.warn(err)
    );
  }
}

// From: http://www.html5rocks.com/en/tutorials/file/dndfiles/
function readFile(file, progressCallback) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onprogress = (event) => {
      if (!event.lengthComputable) { return; } // if event is not a ProgressEvent
      progressCallback(event.loaded / event.total * 100);
    };

    reader.onload = () => {
      file.body = reader.result;
      resolve(file);
    };

    reader.onerror = (event) => reject(`Error reading ${file.name}: ${event.target.result}`);
    reader.onabort = (event) => reject(`Reading ${file.name} aborted: ${event.target.result}`);
    // reader.onloadstart = () => console.log('reader - onloadstart');

    reader.readAsArrayBuffer(file);
  });
}

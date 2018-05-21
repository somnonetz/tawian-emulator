import React from 'react';

export default function (props) {
  return (
    <details className="card" open={props.open}>
      <summary className="card-header">Serial Port</summary>
      <samp className="full-width">{props.output || 'No output yet'}</samp>
    </details>
  );
}

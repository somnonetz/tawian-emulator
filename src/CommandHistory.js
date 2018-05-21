import React from 'react';
import _ from 'lodash';

export default function (props) {
  const rows = [];
  _.each(props.history, (entry, i) => rows.push(
    <strong key={`a${i}`}>{entry.command}</strong>,
    <pre key={`b${i}`}>{entry.cleanResult.trim() || <i>no visible output</i>}</pre>,
  ));

  if (!rows.length) return null;

  return (
    <details className="card" open={props.open}>
      <summary className="card-header">History</summary>
      <div className="list-group list-striped">{rows}</div>
    </details>
  );
}

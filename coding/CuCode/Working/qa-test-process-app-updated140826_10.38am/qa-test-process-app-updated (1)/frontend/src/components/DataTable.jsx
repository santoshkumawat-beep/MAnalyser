import React from 'react';

export default function DataTable({ columns, rows, pk, onEdit, onDelete, readOnly }) {
  if (!rows.length) {
    return <div className="empty-state">No records yet. Use "Add New" to create the first entry.</div>;
  }

  return (
    // Wide grids (e.g. Component QR Code Master has 15+ columns) must not be
    // clipped or squeezed by the card's fixed width — scroll horizontally
    // instead so every column/value stays fully visible and readable.
    <div className="table-scroll">
      <table>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.name}>{c.label}</th>
            ))}
            {!readOnly && <th style={{ width: 120 }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[pk]}>
              {columns.map((c) => (
                <td key={c.name}>{c.render ? c.render(row) : formatCell(row[c.name])}</td>
              ))}
              {!readOnly && (
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn btn-outline btn-sm" onClick={() => onEdit(row)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => onDelete(row)}>Delete</button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(value) {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string' && value.length > 60) return value.slice(0, 57) + '…';
  return String(value);
}

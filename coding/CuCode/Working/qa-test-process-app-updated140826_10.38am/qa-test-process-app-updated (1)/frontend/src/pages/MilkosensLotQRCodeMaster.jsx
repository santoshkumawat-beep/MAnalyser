import React, { useState, useEffect } from 'react';
import api from '../api/api';

export default function MilkosensLotQRCodeMaster() {
  const [ppcOptions, setPpcOptions] = useState([]);
  const [ppcNo, setPpcNo] = useState('');
  const [countRequired, setCountRequired] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  // Edit Modal State
  const [editingRecord, setEditingRecord] = useState(null);

  const loadPpcOptions = async () => {
    try {
      const res = await api.get('/ppc-milkosens');
      setPpcOptions(res.data);
    } catch (e) {
      setPpcOptions([]);
    }
  };

  const loadRows = async () => {
    setLoading(true);
    try {
      const res = await api.get('/process/ppc-lot-qr/list');
      // This pool is shared with the PCB module — only show Milkosens-generated codes here.
      setRows(res.data.filter((r) => r.ComponentName === 'Milkosens'));
    } catch (err) {
      setError((err && err.response && err.response.data && err.response.data.error) || 'Failed to load records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPpcOptions();
    loadRows();
  }, []);

  // ADD (Generate New QR Codes)
  const handleGenerate = async () => {
    setError('');
    if (!ppcNo) {
      setError('Please select a PPC No.');
      return;
    }
    const n = parseInt(countRequired, 10);
    if (!n || n < 1) {
      setError('Enter a valid number of new QR codes required.');
      return;
    }
    try {
      setGenerating(true);

      await api.post('/process/ppc-lot-qr/generate', {
        componentName: 'Milkosens',
        ppcNo: ppcNo,
        count: n,
      });

      setCountRequired('');
      await loadRows();
    } catch (err) {
      setError((err && err.response && err.response.data && err.response.data.error) || 'Failed to generate QR codes.');
    } finally {
      setGenerating(false);
    }
  };

  // DELETE single QR Code record
  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this QR code?')) return;
    try {
      await api.delete(`/process/ppc-lot-qr/${id}`);
      await loadRows();
    } catch (err) {
      alert((err && err.response && err.response.data && err.response.data.error) || 'Delete failed.');
    }
  };

  // EDIT / UPDATE single QR Code record
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/process/ppc-lot-qr/${editingRecord.id}`, editingRecord);
      setEditingRecord(null);
      await loadRows();
    } catch (err) {
      alert((err && err.response && err.response.data && err.response.data.error) || 'Update failed.');
    }
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div>
            <h3>MilkoSens Lot New QR Code</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: '12.5px', color: 'var(--ink-500)' }}>
              Algorithm 2 - generate new Lot QR Codes for a PPC No., ready to print.
            </p>
          </div>
        </div>

        <div style={{ padding: 20 }}>
          {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

          <div className="form-grid">
            <div>
              <label>Product Name</label>
              <input type="text" value="Milkosens" disabled />
            </div>

            <div>
              <label>PPC No.</label>
              <select value={ppcNo} onChange={(e) => setPpcNo(e.target.value)}>
                <option value="">-- Select PPC No. --</option>
                {ppcOptions.map((p) => (
                  <option key={p.id} value={p.PPCNo}>{p.PPCNo}</option>
                ))}
              </select>
            </div>

            <div>
              <label>No. of New Lot QR Code Required</label>
              <input
                type="number"
                min="1"
                value={countRequired}
                onChange={(e) => setCountRequired(e.target.value)}
                placeholder="e.g. 10"
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
            <button className="btn btn-primary" onClick={handleGenerate} disabled={generating}>
              {generating ? 'Generating...' : 'Generate New Lot QR Code'}
            </button>
            <button className="btn btn-outline" onClick={loadRows} disabled={loading}>
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <h3>Generated QR Codes</h3>
        </div>
        {loading ? (
          <div className="empty-state">Loading...</div>
        ) : rows.length === 0 ? (
          <div className="empty-state">No QR codes generated yet.</div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>S.No.</th>
                  <th>PPC No.</th>
                  <th>Product Name</th>
                  <th>Lot QR Code No</th>
                  <th>Label</th>
                  <th>QR Image</th>
                  <th>Allotted</th>
                  <th>Allotted To</th>
                  <th>Generated At</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, idx) => {
                  const generatedAtText = r.DateTimeOfNewQRCodeGenerated
                    ? new Date(r.DateTimeOfNewQRCodeGenerated).toLocaleString()
                    : '-';

                  return (
                    <tr key={r.id}>
                      <td>{idx + 1}</td>
                      <td>{r.PPCNo}</td>
                      <td>{r.ComponentName}</td>
                      <td><strong>{r.LotQRCodeNo}</strong></td>
                      <td>{r.LotQRCodeLabel}</td>
                      <td>
                        {r.LotQRCodeImage ? (
                          <img
                            src={r.LotQRCodeImage}
                            alt={r.LotQRCodeLabel}
                            style={{
                              width: 70,
                              height: 70,
                              border: '1px solid #ddd',
                              padding: 2
                            }}
                          />
                        ) : (
                          <span>-</span>
                        )}
                      </td>
                      <td>{r.Allot ? 'Yes' : 'No'}</td>
                      <td>{r.AllotTo || '-'}</td>
                      <td style={{ fontSize: '0.75rem' }}>{generatedAtText}</td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => setEditingRecord(r)}
                          >
                            Edit
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(r.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* EDIT MODAL */}
      {editingRecord && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h3>Edit QR Code Record #{editingRecord.id}</h3>
              <button className="btn btn-outline btn-sm" onClick={() => setEditingRecord(null)}>Close</button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="modal-body form-grid">
                <div>
                  <label>PPC No.</label>
                  <input
                    type="text"
                    value={editingRecord.PPCNo || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, PPCNo: e.target.value })}
                  />
                </div>
                <div>
                  <label>Lot QR Code No</label>
                  <input
                    type="text"
                    value={editingRecord.LotQRCodeNo || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, LotQRCodeNo: e.target.value })}
                  />
                </div>
                <div>
                  <label>Lot QR Code Label</label>
                  <input
                    type="text"
                    value={editingRecord.LotQRCodeLabel || ''}
                    onChange={(e) => setEditingRecord({ ...editingRecord, LotQRCodeLabel: e.target.value })}
                  />
                </div>
                <div>
                  <label>Allotted Status</label>
                  <select
                    value={editingRecord.Allot}
                    onChange={(e) => setEditingRecord({ ...editingRecord, Allot: Number(e.target.value) })}
                  >
                    <option value={0}>No (0)</option>
                    <option value={1}>Yes (1)</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setEditingRecord(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

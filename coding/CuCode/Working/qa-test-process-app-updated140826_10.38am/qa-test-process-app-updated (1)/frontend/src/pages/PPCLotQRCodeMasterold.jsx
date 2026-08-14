import React, { useState, useEffect } from 'react';
import api from '../api/api';

export default function PPCLotQRCodeMaster() {
  const [ppcOptions, setPpcOptions] = useState([]);
  const [ppcNo, setPpcNo] = useState('');
  const [countRequired, setCountRequired] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  const loadPpcOptions = async () => {
    try {
      const res = await api.get('/ppc-lot-component');
      setPpcOptions(res.data);
    } catch (e) {
      setPpcOptions([]);
    }
  };

  const loadRows = async () => {
    setLoading(true);
    try {
      const res = await api.get('/process/ppc-lot-qr/list');
      setRows(res.data);
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
        componentName: 'PCB',
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

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div>
            <h3>PPC Lot New QR Code</h3>
            <p style={{ margin: '4px 0 0 0', fontSize: 12.5, color: 'var(--ink-500)' }}>
              Algorithm 2 - generate new Lot QR Codes for a PPC No., ready to print.
            </p>
          </div>
        </div>

        <div style={{ padding: 20 }}>
          {error && <div className="error-banner" style={{ marginBottom: 16 }}>{error}</div>}

          <div className="form-grid">
            <div>
              <label>Component Name</label>
              <input type="text" value="PCB" disabled />
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
          <table>
            <thead>
              <tr>
                <th>S.No.</th>
                <th>PPC No.</th>
                <th>Component Name</th>
                <th>Label</th>
                <th>QR Image</th>
                <th>Generated At</th>
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
                    <td>{r.LotQRCodeLabel}</td>
                    <td>
                      {r.LotQRCodeImage ? (
                        <img src={r.LotQRCodeImage} alt={r.LotQRCodeLabel} style={{ width: 70, height: 70 }} />
                      ) : (
                        <span>-</span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.75rem' }}>{generatedAtText}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

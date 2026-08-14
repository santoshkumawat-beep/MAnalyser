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
      /*await api.post('/process/ppc-lot-qr/generate', {
        componentName: 'PCB',
        ppcNo: ppcNo,
        count: n,
      });*/

await app.post('/process/ppc-lot-qr/generate', async (req, res) => {
  const { componentName, ppcNo, count } = req.body;

  try {
    // 1. Fetch the MAX existing sequence number for this specific PPC No.
    // Assuming LotQRCodeNo or numeric ID extracts sequence.
    const [maxResult] = await db.query(
      `SELECT MAX(CAST(LotQRCodeNo AS UNSIGNED)) AS maxSeq 
       FROM ppc_lot_qr_code_master 
       WHERE PPCNo = ? AND ComponentName = ?`,
      [ppcNo, componentName]
    );

    // 2. Start numbering after the highest existing number (default to 0 if none exist)
    let startSeq = (maxResult[0].maxSeq || 0) + 1;

    const newRecords = [];

    // 3. Generate 'count' new records continuing sequentially
    for (let i = 0; i < count; i++) {
      const currentSeq = startSeq + i;
      
      // Pad single digits with leading zeros (e.g., 1 -> "001", 6 -> "006")
      const paddedSeq = String(currentSeq).padStart(3, '0'); 
      const qrLabel = `${componentName} / ${ppcNo} / QR-${paddedSeq}`;
      const qrNo = String(currentSeq);

      // Generate Base64 image or Image Path logic
      const qrImage = await generateQRCodeDataURI(qrLabel);

      newRecords.push([
        componentName,
        ppcNo,
        qrNo,
        qrLabel,
        qrImage,
        new Date(),
        0 // allot = 0
      ]);
    }

    // 4. Insert newly generated non-conflicting QR codes
    await db.query(
      `INSERT INTO ppc_lot_qr_code_master 
       (ComponentName, PPCNo, LotQRCodeNo, LotQRCodeLabel, LotQRCodeImage, DateTimeOfNewQRCodeGenerated, Allot) 
       VALUES ?`,
      [newRecords]
    );

    return res.status(200).json({ success: true, message: `${count} QR code(s) generated successfully.` });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: error.message || 'Failed to generate QR codes.' });
  }
});

///////////////////////////////////////////////////////
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
                <th>Lot QR Code No</th>
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
         <td>
          <strong>{r.LotQRCodeNo}</strong>
        </td>

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

        <td style={{ fontSize: '0.75rem' }}>
          {generatedAtText}
        </td>
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

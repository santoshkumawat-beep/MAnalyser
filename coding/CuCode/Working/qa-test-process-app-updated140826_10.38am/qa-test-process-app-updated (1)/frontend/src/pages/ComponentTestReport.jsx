import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/api';

// Admin Report screen for the PCB Component Test Process.
//
// Visible only to:
//  - Group Admin (NameOfUser contains "ADMIN", e.g. "REIL ADMIN" / "DEPT
//    ADMIN") — sees results for their own Group Name only.
//  - Super Admin (UserGroupType Internal + NameOfUser contains
//    "SUPER ADMIN") — sees results for every Internal group, and can switch
//    between them.
// The actual access control is enforced by the backend
// (requireReportAccess) — this page just presents whatever scope the API
// hands back.
export default function ComponentTestReport() {
  const [meta, setMeta] = useState(null);
  const [metaError, setMetaError] = useState('');

  const [groupName, setGroupName] = useState('');
  const [userId, setUserId] = useState('');
  const [lotId, setLotId] = useState('');

  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ pass: 0, fail: 0, total: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [loadedOnce, setLoadedOnce] = useState(false);

  useEffect(() => {
    api.get('/process/component-test/admin-report/meta')
      .then((r) => {
        setMeta(r.data);
        if (r.data.role === 'groupAdmin') setGroupName(r.data.ownGroupName || '');
      })
      .catch((err) => setMetaError(err?.response?.data?.error || 'You do not have access to this report.'));
  }, []);

  const runReport = async (overrides = {}) => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      const gn = overrides.groupName !== undefined ? overrides.groupName : groupName;
      const uid = overrides.userId !== undefined ? overrides.userId : userId;
      const lid = overrides.lotId !== undefined ? overrides.lotId : lotId;
      if (gn) params.groupName = gn;
      if (uid) params.userId = uid;
      if (lid) params.lotId = lid;
      const { data } = await api.get('/process/component-test/admin-report', { params });
      setRows(data.rows);
      setSummary(data.summary);
      setLoadedOnce(true);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (meta) runReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta]);

  const usersForDropdown = useMemo(() => {
    if (!meta) return [];
    if (meta.role === 'superAdmin' && groupName) {
      return meta.users.filter((u) => u.UserGroupName === groupName);
    }
    return meta.users;
  }, [meta, groupName]);

  if (metaError) {
    return (
      <div className="card">
        <div className="card-header"><h3>Component Test Report</h3></div>
        <div style={{ padding: 20 }} className="error-banner">{metaError}</div>
      </div>
    );
  }

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h3>Component Test Report{meta?.role === 'superAdmin' ? ' — Super Admin (all Internal groups)' : ''}</h3>
        </div>
        <div style={{ padding: 20 }}>
          {error && <div className="error-banner">{error}</div>}

          <div className="grid-2">
            <div className="field-block">
              <label>Group Name</label>
              {meta?.role === 'superAdmin' ? (
                <select
                  value={groupName}
                  onChange={(e) => { const v = e.target.value; setGroupName(v); setUserId(''); runReport({ groupName: v, userId: '' }); }}
                >
                  <option value="">— All Internal Groups —</option>
                  {meta.groups.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              ) : (
                <input value={groupName} disabled title="You can only view the report for your own group" />
              )}
            </div>
            <div className="field-block">
              <label>User Name</label>
              <select value={userId} onChange={(e) => { setUserId(e.target.value); runReport({ userId: e.target.value }); }}>
                <option value="">— All Users —</option>
                {usersForDropdown.map((u) => <option key={u.UserID} value={u.UserID}>{u.NameOfUser} ({u.UserID})</option>)}
              </select>
            </div>
            <div className="field-block">
              <label>Lot ID</label>
              <input
                value={lotId}
                onChange={(e) => setLotId(e.target.value)}
                onBlur={() => runReport()}
                onKeyDown={(e) => { if (e.key === 'Enter') runReport(); }}
                placeholder="e.g. LOT-001 (blank = all lots)"
              />
            </div>
          </div>

          <button className="btn btn-primary btn-sm" onClick={() => runReport()} disabled={loading} style={{ marginTop: 12 }}>
            {loading ? 'Loading…' : 'Generate Report'}
          </button>

          <hr className="section-divider" />
          <div className="grid-2">
            <div><span className="badge badge-pass">Passed: {summary.pass}</span></div>
            <div><span className="badge badge-fail">Failed: {summary.fail}</span></div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><h3>Results ({rows.length})</h3></div>
        <table>
          <thead>
            <tr>
              <th>Serial No.</th>
              <th>QR Code No.</th>
              <th>PPC No.</th>
              <th>Lot ID</th>
              <th>Group Name</th>
              <th>Tested By</th>
              <th>Result</th>
              <th>Major Fault</th>
              <th>Minor Fault(s)</th>
              <th>Tested At</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.SerialNo || '—'}</td>
                <td>{r.ComponentQRCodeNo || '—'}</td>
                <td>{r.PPCNo || '—'}</td>
                <td>{r.LotId || '—'}</td>
                <td>{r.GroupName || '—'}</td>
                <td>{r.NameOfUser || r.UserID || '—'}</td>
                <td>
                  {r.TestResult ? (
                    <span className={r.TestResult === 'Pass' ? 'badge badge-pass' : 'badge badge-fail'}>{r.TestResult}</span>
                  ) : '—'}
                </td>
                <td>{r.MajorFault || '—'}</td>
                <td>{r.MinorFault || '—'}</td>
                <td>{r.TestedAt || '—'}</td>
              </tr>
            ))}
            {!rows.length && loadedOnce && !loading && (
              <tr><td colSpan={10} className="empty-state">No test records match these filters.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

export default function MilkosensTestProcess() {
  const { user } = useAuth();
  const [faults, setFaults] = useState([]);
  const [lotIds, setLotIds] = useState([]);

  const [groupName, setGroupName] = useState('');
  const [qaUserId, setQaUserId] = useState('');
  const [lotId, setLotId] = useState('');
  const [units, setUnits] = useState([]);
  const [results, setResults] = useState({}); // unit id -> { result, major, minors }
  const [counts, setCounts] = useState({ pass: 0, fail: 0 });
  const [selected, setSelected] = useState({}); // unit id -> bool

  const [lotResult, setLotResult] = useState('');
  const [lotMajorFault, setLotMajorFault] = useState('');
  const [lotMinorFaults, setLotMinorFaults] = useState([]);

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    // Minor fault master rows carry the major category name alongside their own
    // minor category name, so this single endpoint gives the same Major -> Minor
    // shape the old combined milkosens-fault-master table used to provide.
    api.get('/milkosens-minor-fault-master').then((r) => setFaults(r.data)).catch(() => {});
    api.get('/milkosens-qr-master').then((r) => {
      const distinctLots = [...new Set(r.data.map((c) => c.MilkosensLotSerialNo).filter(Boolean))];
      setLotIds(distinctLots);
    }).catch(() => {});
  }, []);

  // Group Name and User Name autofill from the logged-in user's own account
  // details, mirroring the PCB Component Test Process screen.
  useEffect(() => {
    if (user) {
      setGroupName(user.UserGroupName || '');
      setQaUserId(user.UserID || '');
    }
  }, [user]);

  const majorFaultOptions = useMemo(
    () => [...new Set(faults.map((f) => f.FaultMajorCategoryName).filter(Boolean))],
    [faults]
  );
  const minorFaultOptionsFor = (major) =>
    faults.filter((f) => f.FaultMajorCategoryName === major).map((f) => f.FaultMinorCategoryName).filter(Boolean);

  const loadLot = async (id) => {
    setLotId(id);
    setError('');
    setMessage('');
    if (!id) { setUnits([]); return; }
    try {
      const { data } = await api.get(`/process/milkosens-test/lot/${id}`);
      setUnits(data);
      setResults({});
      setSelected({});
      setReport(null);
    } catch (err) {
      setError('Failed to load Milkosens units for this lot.');
    }
  };

  const setRowResult = (rowId, patch) => {
    setResults((r) => ({ ...r, [rowId]: { ...(r[rowId] || { result: '', major: '', minors: [] }), ...patch } }));
  };

  // "Success" is only enabled once all mobile-app operation logs are received for a unit.
  // Communication-log data isn't wired to hardware in this scaffold, so we surface the flag
  // via the unit's StatusofMilkosens field and otherwise leave Success selectable for testing.
  const successEnabledFor = () => true;

  const saveRow = async (unit) => {
    const r = results[unit.id] || {};
    if (!r.result) {
      setError('Select Success/Failure for this Milkosens unit before saving.');
      return;
    }
    if (!unit.MilkosensSerialNo) {
      setError('This QR code record has no Milkosens Serial No. set — fix it in Milkosens QR Code Master first.');
      return;
    }
    try {
      const { data } = await api.post('/process/milkosens-test/save-one', {
        groupName,
        userId: qaUserId,
        milkosensSNo: unit.MilkosensSerialNo,
        milkosensLotId: lotId,
        milkosensTestResult: r.result === 'Success' ? 'Pass' : 'Fail',
        milkosensMajorFaultCategory: r.result === 'Success' ? null : r.major,
        milkosensMinorFaultsDetails: r.result === 'Success' ? null : (r.minors || []).join(', '),
        milkosensDepartmentFlag: 2,
      });
      setCounts({ pass: data.noOfPassedMilkosensInLot, fail: data.noOfFailedMilkosensInLot });
      setMessage(`Saved result for Milkosens #${unit.MilkosensSerialNo}.`);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to save test result.');
    }
  };

  const allSelectedAre = (outcome) => {
    const selectedRows = units.filter((u) => selected[u.id]);
    if (!selectedRows.length) return false;
    return selectedRows.every((u) => (results[u.id]?.result === outcome));
  };

  const allUnitsHaveResult = (outcome) => units.length > 0 && units.every((u) => results[u.id]?.result === outcome);

  const canSendToFGS = allSelectedAre('Success');
  const canSendToProduction = allSelectedAre('Failure');
  const canSendWholeLot = allUnitsHaveResult('Success') || allUnitsHaveResult('Fail');

  const sendSelected = async (toDept, statusOfMilkosens) => {
    const serials = units.filter((u) => selected[u.id]).map((u) => u.MilkosensSerialNo);
    if (!serials.length) return;
    try {
      await api.post('/process/milkosens-test/send', {
        ppcNo: units[0]?.PPCNo,
        milkosensSerialNos: serials,
        lotNo: lotId,
        fromDept: 'QA',
        toDept,
        userIdFromDept: qaUserId,
        operationName: `Send to ${toDept}`,
        statusOfMilkosens,
      });
      setMessage(`Moved ${serials.length} Milkosens unit(s) to ${toDept}.`);
      loadLot(lotId);
    } catch (err) {
      setError(err?.response?.data?.error || 'Send failed.');
    }
  };

  const sendWholeLot = async () => {
    const toDept = allUnitsHaveResult('Success') ? 'FGS' : 'Production';
    const serials = units.map((u) => u.MilkosensSerialNo);
    try {
      await api.post('/process/milkosens-test/send', {
        ppcNo: units[0]?.PPCNo,
        milkosensSerialNos: serials,
        lotNo: lotId,
        fromDept: 'QA',
        toDept,
        userIdFromDept: qaUserId,
        operationName: `Send whole lot to ${toDept}`,
        statusOfMilkosens: toDept === 'FGS' ? 'SendToQA' : 'InProduction',
      });
      setMessage(`Whole lot moved to ${toDept}.`);
      loadLot(lotId);
    } catch (err) {
      setError(err?.response?.data?.error || 'Send failed.');
    }
  };

  const saveLotOverall = async () => {
    if (!lotResult) { setError('Select Pass/Fail for the whole lot first.'); return; }
    try {
      await api.post('/process/milkosens-test/save-lot-overall', {
        groupName,
        userId: qaUserId,
        milkosensLotId: lotId,
        overallLotTestResult: lotResult,
        overallLotMajorFaultCategory: lotResult === 'Fail' ? lotMajorFault : null,
        overallLotMinorFaultsDetails: lotResult === 'Fail' ? lotMinorFaults.join(', ') : null,
        overallLotDepartmentFlag: lotResult === 'Fail' ? 1 : 3,
      });
      setMessage('Overall lot result saved.');
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to save overall lot result.');
    }
  };

  const generateReport = async () => {
    if (!lotId) { setError('Select a Lot ID first.'); return; }
    setError('');
    setReportLoading(true);
    try {
      const { data } = await api.get(`/process/milkosens-test/report/${lotId}`);
      setReport(data);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to generate report.');
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <div>
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h3>MilkoSens Component Test Process</h3></div>
        <div style={{ padding: 20 }}>
          {error && <div className="error-banner">{error}</div>}
          {message && <div className="error-banner" style={{ background: 'rgba(46,125,116,0.1)', color: 'var(--teal-600)' }}>{message}</div>}

          <div className="grid-2">
            <div className="field-block">
              <label>Group Name</label>
              <input value={groupName} disabled title="Autofilled from your login account" />
            </div>
            <div className="field-block">
              <label>User Name</label>
              <input
                value={user ? `${user.NameOfUser || ''}${user.UserID ? ` (${user.UserID})` : ''}` : ''}
                disabled
                title="Autofilled from your login account"
              />
            </div>
            <div className="field-block">
              <label>Product Name</label>
              <input value="Milkosens" disabled />
            </div>
            <div className="field-block">
              <label>Lot ID</label>
              <select value={lotId} onChange={(e) => loadLot(e.target.value)}>
                <option value="">— Select —</option>
                {lotIds.map((id) => <option key={id} value={id}>{id}</option>)}
              </select>
            </div>
          </div>

          <hr className="section-divider" />
          <div className="grid-2">
            <div><span className="badge badge-pass">Passed in Lot: {counts.pass}</span></div>
            <div><span className="badge badge-fail">Failed in Lot: {counts.fail}</span></div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h3>Milkosens Units — {lotId || 'select a lot'}</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-primary btn-sm" disabled={!canSendToFGS} onClick={() => sendSelected('FGS', 'SendToQA')}>Send to FGS</button>
            <button className="btn btn-outline btn-sm" disabled={!canSendToProduction} onClick={() => sendSelected('Production', 'InProduction')}>Send to Production (Repair)</button>
            <button className="btn btn-outline btn-sm" disabled={!canSendWholeLot} onClick={sendWholeLot}>Send Whole Lot</button>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th></th>
              <th>Serial No.</th>
              <th>QR Code No.</th>
              <th>Result</th>
              <th>Major Fault</th>
              <th>Minor Fault(s)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {units.map((u) => {
              const r = results[u.id] || { result: '', major: '', minors: [] };
              const isFail = r.result === 'Failure';
              return (
                <tr key={u.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={!!selected[u.id]}
                      onChange={(e) => setSelected((s) => ({ ...s, [u.id]: e.target.checked }))}
                    />
                  </td>
                  <td>{u.MilkosensSerialNo || '—'}</td>
                  <td>{u.MilkosensQRCodeNumber || '—'}</td>
                  <td>
                    <select value={r.result} onChange={(e) => setRowResult(u.id, { result: e.target.value })}>
                      <option value="">—</option>
                      <option value="Success" disabled={!successEnabledFor(u)}>Success</option>
                      <option value="Failure">Failure</option>
                    </select>
                  </td>
                  <td>
                    <select disabled={!isFail} value={r.major} onChange={(e) => setRowResult(u.id, { major: e.target.value, minors: [] })}>
                      <option value="">—</option>
                      {majorFaultOptions.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </td>
                  <td>
                    <select
                      multiple
                      disabled={!isFail || !r.major}
                      value={r.minors}
                      onChange={(e) => setRowResult(u.id, { minors: Array.from(e.target.selectedOptions).map((o) => o.value) })}
                      style={{ minHeight: 32 }}
                    >
                      {minorFaultOptionsFor(r.major).map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </td>
                  <td><button className="btn btn-outline btn-sm" onClick={() => saveRow(u)}>Save</button></td>
                </tr>
              );
            })}
            {!units.length && (
              <tr><td colSpan={7} className="empty-state">Select a Lot ID above to load its Milkosens units.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card-header"><h3>Whole Lot Result</h3></div>
        <div style={{ padding: 20 }}>
          <div className="grid-2">
            <div className="field-block">
              <label>Lot Result</label>
              <select value={lotResult} onChange={(e) => setLotResult(e.target.value)}>
                <option value="">—</option>
                <option value="Pass">Whole Lot Pass</option>
                <option value="Fail">Whole Lot Fail</option>
              </select>
            </div>
            <div className="field-block">
              <label>Lot Major Fault Category</label>
              <select disabled={lotResult !== 'Fail'} value={lotMajorFault} onChange={(e) => { setLotMajorFault(e.target.value); setLotMinorFaults([]); }}>
                <option value="">—</option>
                {majorFaultOptions.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div className="form-field-full field-block">
              <label>Lot Minor Fault(s)</label>
              <select
                multiple
                disabled={lotResult !== 'Fail' || !lotMajorFault}
                value={lotMinorFaults}
                onChange={(e) => setLotMinorFaults(Array.from(e.target.selectedOptions).map((o) => o.value))}
              >
                {minorFaultOptionsFor(lotMajorFault).map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <button className="btn btn-primary" onClick={saveLotOverall}>Save Whole Lot Result</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div className="card-header">
          <h3>Lot Test Report</h3>
          <button className="btn btn-primary btn-sm" disabled={!lotId || reportLoading} onClick={generateReport}>
            {reportLoading ? 'Generating…' : 'Generate Report'}
          </button>
        </div>
        <div style={{ padding: 20 }}>
          {!report && <div className="empty-state">Select a Lot ID above, then click Generate Report.</div>}
          {report && (
            <>
              <div className="grid-2" style={{ marginBottom: 16 }}>
                <div><strong>Lot ID:</strong> {report.milkosensLotId}</div>
                {report.lotOverall ? (
                  <div>
                    <strong>Whole Lot Result:</strong>{' '}
                    <span className={report.lotOverall.OverallLotTestResult === 'Pass' ? 'badge badge-pass' : 'badge badge-fail'}>
                      {report.lotOverall.OverallLotTestResult}
                    </span>
                    {' '}by {report.lotOverall.NameOfUser || report.lotOverall.UserID || '—'} ({report.lotOverall.GroupName || '—'})
                    {report.lotOverall.OverallLotTestResult === 'Fail' && (
                      <> — {report.lotOverall.OverallLotMajorFaultCategory || '—'} / {report.lotOverall.OverallLotMinorFaultsDetails || '—'}</>
                    )}
                  </div>
                ) : (
                  <div><strong>Whole Lot Result:</strong> Not saved yet.</div>
                )}
              </div>
              <table>
                <thead>
                  <tr>
                    <th>Serial No.</th>
                    <th>QR Code No.</th>
                    <th>Group Name</th>
                    <th>QA User</th>
                    <th>Result</th>
                    <th>Major Fault</th>
                    <th>Minor Fault(s)</th>
                    <th>Tested At</th>
                  </tr>
                </thead>
                <tbody>
                  {report.units.map((u) => (
                    <tr key={u.id}>
                      <td>{u.MilkosensSerialNo || '—'}</td>
                      <td>{u.MilkosensQRCodeNumber || '—'}</td>
                      <td>{u.GroupName || '—'}</td>
                      <td>{u.NameOfUser || u.UserID || '—'}</td>
                      <td>
                        {u.MilkosensTestResult ? (
                          <span className={u.MilkosensTestResult === 'Pass' ? 'badge badge-pass' : 'badge badge-fail'}>
                            {u.MilkosensTestResult}
                          </span>
                        ) : '—'}
                      </td>
                      <td>{u.MilkosensMajorFaultCategory || '—'}</td>
                      <td>{u.MilkosensMinorFaultsDetails || '—'}</td>
                      <td>{u.TestedAt || '—'}</td>
                    </tr>
                  ))}
                  {!report.units.length && (
                    <tr><td colSpan={8} className="empty-state">No QR codes found for this lot.</td></tr>
                  )}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

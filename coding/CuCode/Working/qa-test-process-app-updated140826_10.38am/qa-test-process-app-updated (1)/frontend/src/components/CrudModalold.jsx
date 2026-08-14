import React, { useState } from 'react';

export default function CrudModal({ title, fields, initialValues, onClose, onSubmit, pk, pkEditable, isEdit }) {
  const [values, setValues] = useState(() => {
    const base = {};
    fields.forEach((f) => {
      base[f.name] = initialValues?.[f.name] ?? f.default ?? '';
    });
    return base;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (name, val) => setValues((v) => ({ ...v, [name]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    for (const f of fields) {
      if (f.required && !values[f.name] && values[f.name] !== 0) {
        setError(`${f.label} is required.`);
        return;
      }
    }
    try {
      setSaving(true);
      await onSubmit(values);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Something went wrong while saving.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="btn btn-outline btn-sm" onClick={onClose} type="button">Close</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-banner">{error}</div>}
            <div className="form-grid">
              {fields.map((f) => (
                <div key={f.name} className={f.type === 'textarea' ? 'form-field-full' : ''}>
                  <label>{f.label}{f.required ? ' *' : ''}</label>
                  {renderInput(f, values, handleChange, isEdit, pk)}
                </div>
              ))}
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-outline" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add New'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function renderInput(f, values, handleChange, isEdit, pk) {
  const isPkLocked = isEdit && f.name === pk; // don't allow editing the primary key once created

  if (f.type === 'select') {
    const opts = f.options.map((o) => (typeof o === 'object' ? o : { value: o, label: o }));
    return (
      <select
        value={values[f.name] ?? ''}
        onChange={(e) => handleChange(f.name, e.target.value)}
        disabled={isPkLocked}
      >
        <option value="">— Select —</option>
        {opts.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    );
  }
  if (f.type === 'textarea') {
    return (
      <textarea
        value={values[f.name] ?? ''}
        onChange={(e) => handleChange(f.name, e.target.value)}
        disabled={isPkLocked}
      />
    );
  }
  return (
    <input
      type={f.type === 'password' ? 'password' : f.type === 'number' ? 'number' : 'text'}
      value={values[f.name] ?? ''}
      maxLength={f.maxLength}
      placeholder={f.placeholder}
      onChange={(e) => handleChange(f.name, e.target.value)}
      disabled={isPkLocked}
    />
  );
}

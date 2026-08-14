import React, { useState, useEffect } from 'react';
import api from '../api/api';

// Built-in format validators. Add more entries here as new patterns are needed
// elsewhere (e.g. pincode, GST number) — just reference the key via `pattern` in entities.js.
const PATTERNS = {
  email: {
    regex: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: 'must be a valid email address (e.g. name@example.com)',
  },
  mobile10: {
    regex: /^[6-9]\d{9}$/,
    message: 'must be a valid 10-digit mobile number',
  },
};

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
  const [dynamicRawData, setDynamicRawData] = useState({});

  useEffect(() => {
    const dynamicFields = fields.filter((f) => f.optionsEndpoint);
    dynamicFields.forEach(async (f) => {
      try {
        const res = await api.get(f.optionsEndpoint);
        setDynamicRawData((prev) => ({ ...prev, [f.name]: res.data }));
      } catch {
        setDynamicRawData((prev) => ({ ...prev, [f.name]: [] }));
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recursively clears a field (and its autofill targets) plus anything that depends on it.
  const resetFieldAndDescendants = (f, next) => {
    next[f.name] = '';
    if (f.autofill) {
      Object.keys(f.autofill).forEach((target) => {
        next[target] = '';
      });
    }
    fields.forEach((child) => {
      if (child.dependsOn === f.name) resetFieldAndDescendants(child, next);
    });
  };

  const handleChange = (f, val) => {
    setValues((v) => {
      const next = { ...v, [f.name]: val };

      // auto-fill sibling fields from the selected option's row data
      if (f.autofill) {
        const rows = dynamicRawData[f.name] || [];
        const selectedRow = rows.find((r) => String(r[f.optionsValue]) === String(val));
        Object.entries(f.autofill).forEach(([targetField, sourceCol]) => {
          next[targetField] = selectedRow ? (selectedRow[sourceCol] ?? '') : '';
        });
      }

      // reset any field(s) that depend on this one, since their old value/derived
      // data may no longer be valid for the newly selected parent
      fields.forEach((child) => {
        if (child.dependsOn === f.name) resetFieldAndDescendants(child, next);
      });

      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    for (const f of fields) {
      if (f.required && !values[f.name] && values[f.name] !== 0) {
        setError(`${f.label} is required.`);
        return;
      }
      if (f.pattern && values[f.name]) {
        const rule = PATTERNS[f.pattern];
        if (rule && !rule.regex.test(String(values[f.name]).trim())) {
          setError(`${f.label} ${rule.message}.`);
          return;
        }
      }
    }
    try {
      setSaving(true);
      // strip uiOnly fields (used only for cascading filters, never persisted)
      const payload = {};
      fields.forEach((f) => {
        if (!f.uiOnly) payload[f.name] = values[f.name];
      });
      await onSubmit(payload);
    } catch (err) {
      setError(err?.response?.data?.error || err.message || 'Something went wrong while saving.');
    } finally {
      setSaving(false);
    }
  };

  const visibleFields = fields.filter((f) => !f.hiddenInForm);

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
              {visibleFields.map((f) => (
                <div key={f.name} className={f.type === 'textarea' ? 'form-field-full' : ''}>
                  <label>{f.label}{f.required ? ' *' : ''}</label>
                  {renderInput(f, values, handleChange, isEdit, pk, dynamicRawData)}
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

function renderInput(f, values, handleChange, isEdit, pk, dynamicRawData) {
  const isPkLocked = isEdit && f.name === pk; // don't allow editing the primary key once created

  if (f.type === 'select') {
    let opts;
    if (f.optionsEndpoint) {
      let rows = dynamicRawData[f.name] || [];
      if (f.dependsOn) {
        const parentVal = values[f.dependsOn];
        rows = parentVal ? rows.filter((r) => String(r[f.filterKey]) === String(parentVal)) : [];
      }
      opts = rows.map((r) => ({
        value: r[f.optionsValue],
        label: r[f.optionsLabel] || r[f.optionsValue],
      }));
    } else {
      opts = f.options.map((o) => (typeof o === 'object' ? o : { value: o, label: o }));
    }
    const disabledByParent = f.dependsOn && !values[f.dependsOn];
    return (
      <select
        value={values[f.name] ?? ''}
        onChange={(e) => handleChange(f, e.target.value)}
        disabled={isPkLocked || disabledByParent}
      >
        <option value="">
          {disabledByParent ? `— Select ${fieldLabelFor(f.dependsOn)} first —` : '— Select —'}
        </option>
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
        onChange={(e) => handleChange(f, e.target.value)}
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
      onChange={(e) => handleChange(f, e.target.value)}
      disabled={isPkLocked}
    />
  );
}

function fieldLabelFor(name) {
  const nice = name.replace(/ID$/, '').replace(/([a-z])([A-Z])/g, '$1 $2');
  return nice;
}

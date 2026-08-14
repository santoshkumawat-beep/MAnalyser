import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api/api';
import DataTable from '../components/DataTable';
import CrudModal from '../components/CrudModal';
import { entities } from '../config/entities';

export default function CrudPage() {
  const { entityKey } = useParams();
  const entity = Object.values(entities).find((e) => e.key === entityKey);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);

  const load = useCallback(async () => {
    if (!entity) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(entity.endpoint);
      setRows(data);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to load records.');
    } finally {
      setLoading(false);
    }
  }, [entity]);

  useEffect(() => {
    load();
  }, [load]);

  if (!entity) return <div className="error-banner">Unknown master: {entityKey}</div>;

  const openAdd = () => {
    setEditingRow(null);
    setModalOpen(true);
  };
  const openEdit = (row) => {
    setEditingRow(row);
    setModalOpen(true);
  };

  const handleDelete = async (row) => {
    if (!window.confirm('Delete this record? This cannot be undone.')) return;
    try {
      await api.delete(`${entity.endpoint}/${row[entity.pk]}`);
      load();
    } catch (err) {
      alert(err?.response?.data?.error || 'Delete failed.');
    }
  };

  const handleSubmit = async (values) => {
    if (editingRow) {
      await api.put(`${entity.endpoint}/${editingRow[entity.pk]}`, values);
    } else {
      await api.post(entity.endpoint, values);
    }
    setModalOpen(false);
    load();
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <div>
            <h3>{entity.title}</h3>
            {entity.subtitle && <p style={{ margin: '4px 0 0 0', fontSize: 12.5, color: 'var(--ink-500)' }}>{entity.subtitle}</p>}
          </div>
          {!entity.readOnly && (
            <button className="btn btn-primary" onClick={openAdd}>+ Add New</button>
          )}
        </div>
        <div style={{ padding: error ? '16px 20px 0 20px' : 0 }}>
          {error && <div className="error-banner">{error}</div>}
        </div>
        {loading ? (
          <div className="empty-state">Loading…</div>
        ) : (
          <DataTable
            columns={entity.fields.filter((f) => f.type !== 'textarea' && f.type !== 'password')}
            rows={rows}
            pk={entity.pk}
            onEdit={openEdit}
            onDelete={handleDelete}
            readOnly={entity.readOnly}
          />
        )}
      </div>

      {modalOpen && (
        <CrudModal
          title={editingRow ? `Edit — ${entity.title}` : `Add New — ${entity.title}`}
          fields={entity.fields}
          initialValues={editingRow}
          isEdit={!!editingRow}
          pk={entity.pk}
          pkEditable={entity.pkEditable}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
        />
      )}
    </div>
  );
}

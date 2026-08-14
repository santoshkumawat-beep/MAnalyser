import React from 'react';
import { Link } from 'react-router-dom';
import { navGroups, entities } from '../config/entities';

export default function Dashboard() {
  return (
    <div>
      <div className="card" style={{ padding: '20px 24px', marginBottom: 24 }}>
        <h3 style={{ margin: '0 0 6px 0' }}>REIL Ultrasonic Milk Analyzer — Web Application</h3>
        <p style={{ margin: 0, color: 'var(--ink-500)', fontSize: 13.5 }}>
          This dashboard is generated from the attached SRS: Web User Management, the PCB
          Component QA Test Process, and the Milkosens QA Test Process. Every master listed
          below is backed by a MySQL table and a REST CRUD API.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
        {navGroups.map((group) => (
          <div className="card" key={group.title}>
            <div className="card-header">
              <h3>{group.title}</h3>
            </div>
            <div style={{ padding: '12px 20px' }}>
              {group.processLink && (
                <Link to={group.processLink.path} className="btn btn-primary btn-sm" style={{ marginBottom: 12 }}>
                  Open {group.processLink.label}
                </Link>
              )}
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13.5 }}>
                {group.items.map((key) => (
                  <li key={key} style={{ marginBottom: 6 }}>
                    <Link to={`/master/${entities[key].key}`}>{entities[key].title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

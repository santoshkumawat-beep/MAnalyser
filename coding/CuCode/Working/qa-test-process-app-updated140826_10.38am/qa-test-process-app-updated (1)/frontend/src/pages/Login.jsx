import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/milkosens-logo.png';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loginId, setLoginId] = useState('REILADMIN');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(loginId, password);
      navigate('/');
    } catch (err) {
      setError(err?.response?.data?.error || 'Login failed. Check your credentials.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-shell">
      <div className="login-card qr-corner">
        <img src={logo} alt="MilkoSens" style={{ width: 96, height: 'auto', display: 'block', margin: '0 auto 12px' }} />
        <span className="tag">REIL MilkoSens</span>
        <h1>Web User Sign In</h1>
        <p className="subtitle">Milkosens QA Test Process &mdash; Web Application</p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field-block">
            <label>Login ID</label>
            <input value={loginId} onChange={(e) => setLoginId(e.target.value)} required />
          </div>
          <div className="field-block">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} disabled={busy}>
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <p className="hint">
          Seeded demo account: <code>REILADMIN</code> / <code>admin123</code> (run <code>npm run initdb</code> in
          /backend first).
        </p>
      </div>
    </div>
  );
}

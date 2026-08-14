import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import CrudPage from './pages/CrudPage';
import ComponentTestProcess from './pages/ComponentTestProcess';
import MilkosensTestProcess from './pages/MilkosensTestProcess';
import PPCLotQRCodeMaster from './pages/PPCLotQRCodeMaster.jsx';
import MilkosensLotQRCodeMaster from './pages/MilkosensLotQRCodeMaster.jsx';
import ComponentTestReport from './pages/ComponentTestReport';
import MilkosensTestReport from './pages/MilkosensTestReport';
import { hasReportAccess } from './utils/roles';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

// Guards the two Admin Report pages: requires login (like ProtectedRoute)
// AND that the logged-in user qualifies as a Group Admin or Super Admin
// (see frontend/src/utils/roles.js). Anyone else is bounced to the
// dashboard — the backend enforces the real access control regardless.
function AdminRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (!hasReportAccess(user)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="master/:entityKey" element={<CrudPage />} />
        <Route path="process/component-test" element={<ComponentTestProcess />} />
        <Route path="process/milkosens-test" element={<MilkosensTestProcess />} />
        <Route path="process/ppc-lot-qr-code" element={<PPCLotQRCodeMaster />} />
        <Route path="process/milkosens-lot-qr-code" element={<MilkosensLotQRCodeMaster />} />
        <Route
          path="reports/component-test"
          element={<AdminRoute><ComponentTestReport /></AdminRoute>}
        />
        <Route
          path="reports/milkosens-test"
          element={<AdminRoute><MilkosensTestReport /></AdminRoute>}
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}

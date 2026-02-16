import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './i18n';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Routing from './pages/Routing';
import AdminSettings from './pages/AdminSettings';
import Logs from './pages/Logs';
import Accounts from './pages/Accounts';
import Setup from './pages/Setup';
import { adminAPI } from './api';

// Protected Route wrapper with Setup Check
function ProtectedRoute({ children }) {
  const [loading, setLoading] = useState(true);
  const [setupComplete, setSetupComplete] = useState(true);
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const checkSetup = async () => {
      try {
        const res = await adminAPI.getSettings();
        setSetupComplete(res.data.setup_complete);
        if (!res.data.setup_complete && window.location.pathname !== '/setup') {
          navigate('/setup');
        }
      } catch (e) {
        console.error('Setup check failed', e);
      } finally {
        setLoading(false);
      }
    };
    checkSetup();
  }, [token, navigate]);

  if (!token) return <Navigate to="/login" replace />;
  if (loading) return null; // Show nothing or a global loader

  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/setup" element={<ProtectedRoute><Setup /></ProtectedRoute>} />
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="accounts" element={<Accounts />} />
          <Route path="routing" element={<Routing />} />
          <Route path="admin" element={<AdminSettings />} />
          <Route path="logs" element={<Logs />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { AdminAuthProvider } from './contexts/AdminAuthContext';
import { ProtectedRoute } from './components/ui/ProtectedRoute';

// Layouts
import CitizenLayout from './components/citizen/CitizenLayout';
import AdminLayout from './components/admin/AdminLayout';

// Citizen Pages
import LoginPage from './pages/citizen/LoginPage';
import RegisterPage from './pages/citizen/RegisterPage';
import DashboardPage from './pages/citizen/DashboardPage';
import SubmitComplaintPage from './pages/citizen/SubmitComplaintPage';
import TrackComplaintPage from './pages/citizen/TrackComplaintPage';
import HistoryPage from './pages/citizen/HistoryPage';
import ComplaintDetailPage from './pages/citizen/ComplaintDetailPage';
import ProfilePage from './pages/citizen/ProfilePage';
import NotificationsPage from './pages/citizen/NotificationsPage';

// Admin Pages
import AdminLoginPage from './pages/admin/AdminLoginPage';
import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminComplaintsPage from './pages/admin/AdminComplaintsPage';
import AdminComplaintDetailPage from './pages/admin/AdminComplaintDetailPage';
import AdminCitizensPage from './pages/admin/AdminCitizensPage';
import AdminDepartmentsPage from './pages/admin/AdminDepartmentsPage';
import AdminAnalyticsPage from './pages/admin/AdminAnalyticsPage';
import AdminAssignPage from './pages/admin/AdminAssignPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AdminAuthProvider>
          <Routes>
            {/* ─── Public Routes ───────────────────────────────── */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/admin/login" element={<AdminLoginPage />} />

            {/* ─── Citizen Portal (Protected) ──────────────────── */}
            <Route
              element={
                <ProtectedRoute type="citizen">
                  <CitizenLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/submit" element={<SubmitComplaintPage />} />
              <Route path="/track" element={<TrackComplaintPage />} />
              <Route path="/history" element={<HistoryPage />} />
              <Route path="/complaint/:id" element={<ComplaintDetailPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/notifications" element={<NotificationsPage />} />
            </Route>

            {/* ─── Admin Portal (Protected) ────────────────────── */}
            <Route
              element={
                <ProtectedRoute type="admin">
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
              <Route path="/admin/complaints" element={<AdminComplaintsPage />} />
              <Route path="/admin/complaints/:id" element={<AdminComplaintDetailPage />} />
              <Route path="/admin/assign" element={<AdminAssignPage />} />
              <Route path="/admin/departments" element={<AdminDepartmentsPage />} />
              <Route path="/admin/citizens" element={<AdminCitizensPage />} />
              <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
              <Route path="/admin/reports" element={<AdminReportsPage />} />
            </Route>

            {/* ─── Default redirect ────────────────────────────── */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AdminAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;

import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { auth } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import AdminLayout from './components/layouts/AdminLayout';

// Public pages
import Login from './pages/Login';
import Register from './pages/Register';
import LandingPage from './pages/LandingPage';
import NotFound from './pages/NotFound';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import MemberManagement from './pages/admin/MemberManagement';
import MembershipPlans from './pages/admin/MembershipPlans';
import QRGenerator from './pages/admin/QRGenerator';
import AttendanceReports from './pages/admin/AttendanceReports';
import AttendanceGrid from './pages/admin/AttendanceGrid';
import AdminSettings from './pages/admin/Settings';
import AdminNotifications from './pages/admin/Notifications';

// Member pages
import MemberDashboard from './pages/member/Dashboard';
import QRScanner from './pages/member/QRScanner';
import Profile from './pages/member/Profile';
import AttendanceHistory from './pages/member/AttendanceHistory';
import MemberNotifications from './pages/member/Notifications';
import HelpAndSupport from './pages/member/HelpAndSupport';
import ContactUs from './pages/member/ContactUs';
import ThankYou from './pages/member/ThankYou';

// Context
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Create a theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 500,
    },
    h2: {
      fontWeight: 500,
    },
    h3: {
      fontWeight: 500,
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole }) => {
  const { currentUser, userRole, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole && userRole !== requiredRole) {
    // Redirect to the correct dashboard if role doesn't match
    return <Navigate to={userRole === 'admin' ? '/admin/dashboard' : '/member/dashboard'} replace />;
  }

  return children;
};

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Admin Routes */}
          <Route 
            path="/admin/dashboard" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/members" 
            element={
              <ProtectedRoute requiredRole="admin">
                <MemberManagement />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/membership-plans" 
            element={
              <ProtectedRoute requiredRole="admin">
                <MembershipPlans />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/qr-generator" 
            element={
              <ProtectedRoute requiredRole="admin">
                <QRGenerator />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/attendance-reports" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AttendanceReports />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/attendance-grid" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminLayout>
                  <AttendanceGrid />
                </AdminLayout>
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/settings" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminSettings />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin/notifications" 
            element={
              <ProtectedRoute requiredRole="admin">
                <AdminNotifications />
              </ProtectedRoute>
            } 
          />
          
          {/* Member Routes */}
          <Route 
            path="/member/dashboard" 
            element={
              <ProtectedRoute requiredRole="member">
                <MemberDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/member/qr-scanner" 
            element={
              <ProtectedRoute requiredRole="member">
                <QRScanner />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/member/help-support" 
            element={
              <ProtectedRoute requiredRole="member">
                <HelpAndSupport />
              </ProtectedRoute>
            }
          />
          <Route 
            path="/member/contact-us" 
            element={
              <ProtectedRoute requiredRole="member">
                <ContactUs />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/member/thank-you" 
            element={
              <ProtectedRoute requiredRole="member">
                <ThankYou />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/member/profile" 
            element={
              <ProtectedRoute requiredRole="member">
                <Profile />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/member/attendance-history" 
            element={
              <ProtectedRoute requiredRole="member">
                <AttendanceHistory />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/member/notifications" 
            element={
              <ProtectedRoute requiredRole="member">
                <MemberNotifications />
              </ProtectedRoute>
            } 
          />
          
          {/* 404 Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
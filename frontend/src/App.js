import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import StudentFeedback from './pages/StudentFeedback';
import Login from './pages/Login';
import ChiefWarden from './pages/ChiefWarden';

// Helper component: Checks token directly from localStorage
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const handleLogout = () => {
    localStorage.clear();
    window.location.href = '/login';
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Student Feedback Portal (Default) */}
        <Route path="/" element={<StudentFeedback />} />

        {/* Staff Authentication Portal */}
        <Route path="/login" element={<Login />} />

        {/* Protected Dashboard Route */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <ChiefWarden onLogout={handleLogout} />
            </ProtectedRoute>
          } 
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
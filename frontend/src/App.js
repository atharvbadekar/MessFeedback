import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import StudentFeedback from './pages/StudentFeedback';
import Login from './pages/Login';
import ChiefWarden from './pages/ChiefWarden';

function App() {
  // Re-hydrate session state check
  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
    if (token) {
      // session is active
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('role');
    localStorage.removeItem('userRole');
    localStorage.removeItem('hostelId');
    window.location.href = '/login';
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Student Portal (Default) */}
        <Route path="/" element={<StudentFeedback />} />

        {/* Staff Authentication Portal */}
        <Route path="/login" element={<Login />} />

        {/* Protected Dashboard Route */}
        <Route 
          path="/dashboard" 
          element={
            localStorage.getItem('token') || localStorage.getItem('adminToken') ? (
              <ChiefWarden onLogout={handleLogout} />
            ) : (
              <Navigate to="/login" replace />
            )
          } 
        />

        {/* Catch-all fallback redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
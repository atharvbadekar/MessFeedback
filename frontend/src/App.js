import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import StudentFeedback from './pages/StudentFeedback';
import Login from './pages/Login';
import ChiefWarden from './pages/ChiefWarden';

function App() {
  const [user, setUser] = useState(null);

  // Re-hydrate session state from localStorage on page reload
  useEffect(() => {
    const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
    const role = localStorage.getItem('role') || localStorage.getItem('userRole');
    const hostelId = localStorage.getItem('hostelId');

    if (token) {
      setUser({ token, role, hostelId });
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('adminToken');
    localStorage.removeItem('role');
    localStorage.removeItem('userRole');
    localStorage.removeItem('hostelId');
    setUser(null);
    window.location.href = '/login';
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Student Portal (Default) */}
        <Route path="/" element={<StudentFeedback />} />

        {/* Staff Authentication Portal */}
        <Route path="/login" element={<Login setUser={setUser} />} />

        {/* Protected Dashboard Route for Chief Warden & Hostel Wardens */}
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
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import StudentFeedback from './pages/StudentFeedback';
import Login from './pages/Login';
import WardenDashboard from './pages/WardenDashboard';
import NursePortal from './pages/NursePortal';
import HospitalAdmin from './pages/HospitalAdmin';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in on page load
  useEffect(() => {
    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');
    const hostelId = localStorage.getItem('hostelId');

    if (token && role) {
      setUser({ token, role, hostelId });
    }
    setLoading(false);
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
  };

  if (loading) return <div className="flex h-screen items-center justify-center font-bold">Initializing CURAJ Portal...</div>;

  return (
    <Router>
      <Routes>
        {/* Public Route: Student Feedback */}
        <Route path="/" element={<StudentFeedback />} />

        {/* Login Route */}
        <Route 
          path="/login" 
          element={user ? <Navigate to="/dashboard" /> : <Login setUser={setUser} />} 
        />

        {/* Protected Dashboard Route */}
        <Route 
          path="/dashboard" 
          element={
            user ? (
              <WardenDashboard 
                hostelId={user.hostelId} 
                onLogout={handleLogout} 
              />
            ) : (
              <Navigate to="/login" />
            )
          } 
        />
        
        {/* Catch-all: Redirect to Home */}
        <Route path="*" element={<Navigate to="/" />} />

        {/* hospital routses */}
          <Route path="/hospital" element={<NursePortal />} />
          <Route path="/hospital-admin" element={<HospitalAdmin />} />
      </Routes>
    </Router>
  );
}

export default App;
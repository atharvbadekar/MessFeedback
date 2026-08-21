import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, Lock, User, ArrowRight } from 'lucide-react';
import Navbar from './Navbar';

const Login = () => {
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  // Dynamic API URL for Localhost and Render Production
  const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000' 
    : 'https://messfeedbackcuraj.onrender.com';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await axios.post(`${API_URL}/api/admin/login`, { 
        username: creds.username.trim(),
        password: creds.password.trim() 
      });

      if (res.data && res.data.token) {
        // Save session items
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('adminToken', res.data.token);
        localStorage.setItem('role', res.data.role || 'admin');
        localStorage.setItem('userRole', res.data.role || 'admin');
        localStorage.setItem('hostelId', res.data.hostelId || 'B1');

        // Force full page navigation to initialize ChiefWarden with loaded localStorage
        window.location.href = '/dashboard';
      } else {
        setErrorMsg('Authentication failed: No token received.');
      }
    } catch (err) {
      console.error("Login Error:", err);
      if (!err.response) {
        setErrorMsg('Cannot connect to server. If Render backend is sleeping, wait 30 seconds and retry.');
      } else {
        setErrorMsg(err.response.data?.error || err.response.data?.message || 'Invalid username or password.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans text-slate-800">
    <Navbar />
    

      {/* Form Container */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex p-3 rounded-2xl bg-[#1E3A3A]/10 text-[#1E3A3A] mb-3">
              <ShieldCheck size={36} />
            </div>
            <h2 className="text-3xl font-black text-[#212529] tracking-tight">Staff Portal</h2>
            <p className="text-[#6B705C] font-medium text-sm mt-1">Hostel Incharge & Chief Administration Login</p>
          </div>

          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-slate-200/60 border border-slate-100">
            {errorMsg && (
              <div className="mb-5 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold text-center">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Username</label>
                <div className="relative">
                  <User className="absolute left-4 top-4 text-slate-400" size={20} />
                  <input 
                    type="text" 
                    placeholder="admin or warden username" 
                    required
                    value={creds.username}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#1E3A3A] transition-all text-slate-800 font-semibold"
                    onChange={e => setCreds({ ...creds, username: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-4 text-slate-400" size={20} />
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    required
                    value={creds.password}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#1E3A3A] transition-all text-slate-800 font-semibold"
                    onChange={e => setCreds({ ...creds, password: e.target.value })}
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-[#1E3A3A] hover:bg-[#152929] text-white py-4 rounded-2xl font-bold shadow-lg shadow-green-900/10 transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {loading ? "Authenticating..." : "Login to Dashboard"}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100 text-center">
              <button 
                type="button"
                onClick={() => navigate('/')}
                className="text-[#6B705C] text-sm hover:text-[#1E3A3A] transition-colors font-semibold"
              >
                ← Return to Student Assessment Portal
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
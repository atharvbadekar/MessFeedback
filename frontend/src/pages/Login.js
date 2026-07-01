import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, Lock, User, ArrowRight } from 'lucide-react';

const Login = ({ setUser }) => {
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // URL CHECK: 
  const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000' 
    : 'https://messfeedback.onrender.com';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/api/login/staff`, { 
        username: creds.username.trim(), // Remove accidental spaces
        password: creds.password 
      });

      console.log("Login Response:", res.data); // Helpful for debugging

      if (res.data.token) {
        // 1. Store everything in LocalStorage
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('role', res.data.role);
        // Default to 0 for chief warden if hostelId is missing
        localStorage.setItem('hostelId', res.data.hostelId || 0); 
        
        // 2. Update App state
        setUser(res.data);

        // 3. Navigation Logic
        // In your backend, admin = 'chief'. Wardens = 'warden'.
        if (res.data.role === 'chief' || res.data.role === 'admin') {
          console.log("Redirecting to Admin view...");
          navigate('/dashboard'); 
        } else {
          console.log("Redirecting to Warden view...");
          navigate('/dashboard');
        }
      }
    } catch (err) {
      console.error("Login Error:", err);
      const errorMsg = err.response?.data?.message || "Invalid Username or Password";
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex p-4 rounded-2xl bg-indigo-500/10 mb-4">
            <ShieldCheck className="text-indigo-400" size={40} />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight">Staff Portal</h2>
          <p className="text-slate-400 mt-2">Central University of Rajasthan</p>
        </div>

        <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl shadow-indigo-500/10 border border-slate-100">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-4 top-4 text-slate-300" size={20} />
                <input 
                  type="text" 
                  placeholder="admin" 
                  required
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-700"
                  onChange={e => setCreds({...creds, username: e.target.value})}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-4 text-slate-300" size={20} />
                <input 
                  type="password" 
                  placeholder="••••••••" 
                  required
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-700"
                  onChange={e => setCreds({...creds, password: e.target.value})}
                />
              </div>
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-200 transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {loading ? "Authorizing..." : "Login to Dashboard"}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-50 text-center">
            <button 
              type="button"
              onClick={() => navigate('/')}
              className="text-slate-400 text-sm hover:text-indigo-600 transition-colors font-medium"
            >
              ← Return to Student Portal
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-slate-500 text-[10px] uppercase tracking-[0.2em]">
          Internal Academic Network • CURAJ
        </p>
      </div>
    </div>
  );
};

export default Login;
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ShieldCheck, Lock, User, ArrowRight } from 'lucide-react';

const Login = ({ setUser }) => {
  const [creds, setCreds] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Dynamic API URL for Local and Render Production
  const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000' 
    : 'https://messfeedbackcuraj.onrender.com';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await axios.post(`${API_URL}/api/admin/login`, { 
        username: creds.username.trim(),
        password: creds.password.trim() 
      });

      if (res.data.token) {
        // Store tokens & roles in LocalStorage
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('adminToken', res.data.token);
        localStorage.setItem('role', res.data.role);
        localStorage.setItem('userRole', res.data.role);
        localStorage.setItem('hostelId', res.data.hostelId || 'B1'); 
        
        if (typeof setUser === 'function') {
          setUser(res.data);
        }

        navigate('/dashboard');
      }
    } catch (err) {
      console.error("Login Error:", err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || "Invalid Username or Password";
      alert(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans">
      
      {/* =========================================================
          TOP UNIVERSITY BRANDING NAVBAR WITH LOGO & ACCREDITATIONS
          ========================================================= */}
      <nav className="bg-[#1E3A3A] text-white shadow-md border-b-4 border-emerald-500 z-20">
        <div className="w-full mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20 items-center">
            
            {/* TOP LEFT: CURAJ Logo & Portal Header */}
            <div className="flex items-center space-x-4">
              <div className="bg-white p-1.5 rounded-xl shadow-sm flex items-center justify-center">
                <img 
                  src="/logos/curaj-logo.png"
                  alt="CURAJ Logo" 
                  className="h-12 w-auto object-contain"
                  onError={(e) => { 
                    e.target.onerror = null; 
                    e.target.src = "/images/curaj-logo.png"; 
                  }}
                />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight leading-tight">
                  Mega Mess System
                </h1>
                <p className="text-xs sm:text-sm text-emerald-200 font-medium">
                  Central University of Rajasthan
                </p>
              </div>
            </div>

            {/* TOP RIGHT: Accreditations (NAAC & NIRF) */}
            <div className="flex items-center space-x-4">
              <div className="hidden md:block text-right mr-1">
                <p className="text-[10px] text-emerald-200/90 font-black tracking-widest uppercase mb-0.5">Accredited By</p>
                <p className="text-xs font-semibold text-white/90">A++ Grade & Top Ranked</p>
              </div>
              
              {/* NAAC Badge */}
              <div className="bg-white p-1 rounded-lg shadow-sm flex items-center justify-center">
                <img 
                  src="/logos/naac.jpeg" 
                  alt="NAAC" 
                  className="h-10 w-auto object-contain"
                  onError={(e) => { 
                    e.target.onerror = null; 
                    e.target.src = "/logos/naac.jpg"; 
                  }}
                />
              </div>
              
              {/* NIRF Badge */}
              <div className="bg-white p-1 rounded-lg shadow-sm flex items-center justify-center">
                <img 
                  src="/logos/nirf.jpeg" 
                  alt="NIRF" 
                  className="h-10 w-auto object-contain"
                  onError={(e) => { 
                    e.target.onerror = null; 
                    e.target.src = "/logos/nirf.jpg"; 
                  }}
                />
              </div>
            </div>

          </div>
        </div>
      </nav>

      {/* LOGIN CARD CONTAINER */}
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
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-4 text-slate-400" size={20} />
                  <input 
                    type="text" 
                    placeholder="Enter staff username" 
                    required
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#1E3A3A] transition-all text-slate-800 font-semibold"
                    onChange={e => setCreds({ ...creds, username: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-4 text-slate-400" size={20} />
                  <input 
                    type="password" 
                    placeholder="••••••••" 
                    required
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
                {loading ? "Authorizing..." : "Login to Dashboard"}
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

          <footer className="mt-8 text-center">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.25em]">
              Internal Academic Network • CURAJ
            </p>
          </footer>

        </div>
      </div>

    </div>
  );
};

export default Login;
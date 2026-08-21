import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, Trash2, Shield, Home, AlertCircle, CheckCircle2 } from 'lucide-react';

const StaffManagement = () => {
    const [wardens, setWardens] = useState([]);
    const [form, setForm] = useState({ username: '', password: '', hostelId: 'B1' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const hostels = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8'];

    const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000' 
        : 'https://messfeedbackcuraj.onrender.com';

    const getAuthHeaders = () => {
        const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
        return { headers: { Authorization: `Bearer ${token}` } };
    };

    const fetchWardens = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/admin/wardens`, getAuthHeaders());
            setWardens(Array.isArray(res.data) ? res.data : []);
        } catch (err) {
            console.error("Fetch wardens failed:", err);
        }
    };

    useEffect(() => {
        fetchWardens();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleAddWarden = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            const res = await axios.post(`${API_URL}/api/admin/wardens`, form, getAuthHeaders());
            setSuccess(res.data.message || 'Warden registered successfully!');
            setForm({ username: '', password: '', hostelId: 'B1' });
            fetchWardens();
        } catch (err) {
            console.error("Add warden error:", err);
            const msg = err.response?.data?.error || err.response?.data?.message || err.message;
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteWarden = async (id) => {
        if (!window.confirm("Are you sure you want to remove this warden account?")) return;

        try {
            await axios.delete(`${API_URL}/api/admin/wardens/${id}`, getAuthHeaders());
            setSuccess("Warden removed successfully.");
            fetchWardens();
        } catch (err) {
            alert(err.response?.data?.error || "Failed to delete warden.");
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center gap-3 text-sm font-semibold">
                    <AlertCircle size={20} className="shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {success && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl flex items-center gap-3 text-sm font-semibold">
                    <CheckCircle2 size={20} className="shrink-0" />
                    <span>{success}</span>
                </div>
            )}

            {/* Registration Form */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                        <UserPlus size={22} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Register Warden</h2>
                        <p className="text-xs text-slate-400 font-medium">Create login credentials for specific hostel incharge</p>
                    </div>
                </div>

                <form onSubmit={handleAddWarden} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-[11px] font-black uppercase text-slate-400 tracking-wider mb-2 ml-1">Username</label>
                            <input 
                                type="text"
                                placeholder="e.g. warden_b6"
                                required
                                value={form.username}
                                onChange={(e) => setForm({ ...form, username: e.target.value })}
                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#0b1329] font-medium text-slate-800 text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-black uppercase text-slate-400 tracking-wider mb-2 ml-1">Password</label>
                            <input 
                                type="password"
                                placeholder="••••••••"
                                required
                                value={form.password}
                                onChange={(e) => setForm({ ...form, password: e.target.value })}
                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#0b1329] font-medium text-slate-800 text-sm"
                            />
                        </div>

                        <div>
                            <label className="block text-[11px] font-black uppercase text-slate-400 tracking-wider mb-2 ml-1">Assigned Hostel</label>
                            <select 
                                value={form.hostelId}
                                onChange={(e) => setForm({ ...form, hostelId: e.target.value })}
                                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#0b1329] font-bold text-slate-700 text-sm cursor-pointer"
                            >
                                {hostels.map(h => (
                                    <option key={h} value={h}>Hostel {h}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#0b1329] hover:bg-slate-800 text-white font-bold py-4 rounded-2xl transition-all shadow-md active:scale-[0.99] disabled:opacity-50 text-sm"
                    >
                        {loading ? "Registering..." : "Register Staff Member"}
                    </button>
                </form>
            </div>

            {/* List of Registered Wardens */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-slate-100 text-slate-700 rounded-xl">
                        <Shield size={22} />
                    </div>
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Registered Hostel Wardens ({wardens.length})</h2>
                        <p className="text-xs text-slate-400 font-medium">Active hostel warden login accounts</p>
                    </div>
                </div>

                {wardens.length > 0 ? (
                    <div className="divide-y divide-slate-100">
                        {wardens.map(w => (
                            <div key={w.id} className="py-4 flex items-center justify-between hover:bg-slate-50 px-4 rounded-xl transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center font-bold text-slate-700">
                                        {w.hostelId}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-sm">{w.username}</p>
                                        <p className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                                            <Home size={12} /> Assigned to Hostel {w.hostelId}
                                        </p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleDeleteWarden(w.id)}
                                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                                    title="Delete Account"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-slate-400 font-medium text-center py-6">
                        No wardens registered yet.
                    </p>
                )}
            </div>
        </div>
    );
};

export default StaffManagement;
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { UserPlus, Users, Trash2, ShieldCheck, AlertCircle } from 'lucide-react';

const StaffManagement = () => {
    const [formData, setFormData] = useState({ username: '', password: '', hostelId: 'B1' });
    const [wardens, setWardens] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Hostels strictly B1 through B8
    const hostels = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8'];

    const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000' 
        : 'https://messfeedbackcuraj.onrender.com';

    const getAuthHeaders = () => {
        const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
        return {
            headers: { Authorization: `Bearer ${token}` }
        };
    };

    const fetchWardens = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/admin/wardens`, getAuthHeaders());
            setWardens(res.data);
        } catch (err) {
            console.error("Error fetching wardens:", err);
            setError(err.response?.data?.error || "Failed to load staff list.");
        }
    };

    useEffect(() => {
        fetchWardens();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleCreate = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            await axios.post(`${API_URL}/api/admin/create-warden`, formData, getAuthHeaders());
            setSuccess(`Warden "${formData.username}" registered for Hostel ${formData.hostelId}!`);
            setFormData({ username: '', password: '', hostelId: 'B1' });
            fetchWardens();
        } catch (err) {
            setError(err.response?.data?.error || "Registration failed. Username may already exist.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id, username) => {
        if (!window.confirm(`Are you sure you want to remove warden "${username}"?`)) return;

        try {
            await axios.delete(`${API_URL}/api/admin/wardens/${id}`, getAuthHeaders());
            fetchWardens();
        } catch (err) {
            alert(err.response?.data?.error || "Failed to delete warden.");
        }
    };

    return (
        <div className="space-y-8 max-w-6xl mx-auto">
            {/* Notifications */}
            {error && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center gap-3 text-sm font-medium">
                    <AlertCircle size={18} className="shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {success && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl flex items-center gap-3 text-sm font-medium">
                    <ShieldCheck size={18} className="shrink-0" />
                    <span>{success}</span>
                </div>
            )}

            {/* Registration Form */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800">
                    <UserPlus className="text-indigo-600" /> Register Warden
                </h2>
                <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <input 
                        type="text" 
                        placeholder="Username" 
                        value={formData.username}
                        className="p-4 bg-slate-50 rounded-2xl outline-none border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800" 
                        onChange={e => setFormData({ ...formData, username: e.target.value })} 
                        required 
                    />
                    
                    <input 
                        type="password" 
                        placeholder="Password" 
                        value={formData.password}
                        className="p-4 bg-slate-50 rounded-2xl outline-none border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-medium text-slate-800" 
                        onChange={e => setFormData({ ...formData, password: e.target.value })} 
                        required 
                    />
                    
                    <select 
                        value={formData.hostelId}
                        className="p-4 bg-slate-50 rounded-2xl outline-none border border-slate-200 focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-700"
                        onChange={e => setFormData({ ...formData, hostelId: e.target.value })}
                    >
                        {hostels.map(h => (
                            <option key={h} value={h}>Hostel {h}</option>
                        ))}
                    </select>
                    
                    <button 
                        type="submit"
                        disabled={loading}
                        className="md:col-span-3 bg-indigo-600 text-white py-4 rounded-2xl font-bold hover:bg-indigo-700 active:scale-[0.99] transition-all shadow-lg shadow-indigo-100 disabled:opacity-50"
                    >
                        {loading ? "Registering..." : "Register Staff Member"}
                    </button>
                </form>
            </div>

            {/* Wardens List */}
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800">
                    <Users className="text-indigo-600" /> Registered Hostel Wardens ({wardens.length})
                </h2>
                
                {wardens.length === 0 ? (
                    <p className="text-slate-400 text-sm font-medium">No wardens registered yet.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {wardens.map((w) => (
                            <div key={w.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center hover:border-slate-200 transition-all">
                                <div>
                                    <p className="font-bold text-slate-800 text-base">{w.username}</p>
                                    <p className="text-xs text-indigo-600 font-bold uppercase tracking-widest mt-0.5">
                                        Hostel {w.hostel_id || w.hostelId}
                                    </p>
                                </div>
                                <button 
                                    onClick={() => handleDelete(w.id, w.username)}
                                    className="p-2.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                                    title="Delete Warden"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default StaffManagement;
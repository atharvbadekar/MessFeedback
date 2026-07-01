import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, Calendar, Clock, Activity, Pill, User, ClipboardList } from 'lucide-react';

const HospitalAdmin = () => {
    const [students, setStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000' 
        : 'https://messfeedback.onrender.com';

    useEffect(() => {
        const fetchHospitalLogs = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API_URL}/api/admin/students`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setStudents(res.data);
            } catch (err) {
                console.error("Failed to gather health records", err);
            } finally {
                setLoading(false);
            }
        };
        fetchHospitalLogs();
    }, [API_URL]);

    // Flatten all visits along with student metadata for reporting
    const allVisits = [];
    students.forEach(student => {
        if (student.medicalHistory && student.medicalHistory.length > 0) {
            student.medicalHistory.forEach(visit => {
                allVisits.push({
                    name: student.name,
                    collegeId: student.collegeId,
                    hostelId: student.hostelId,
                    symptoms: visit.symptoms,
                    prescribedMedicines: visit.prescribedMedicines,
                    remarks: visit.remarks, // <-- ADD THIS LINE
                    visitedAt: visit.visitedAt
                });
            });
        }
    });

    // Sort logs: Most recent visit at the very top
    const sortedVisits = allVisits.sort((a, b) => new Date(b.visitedAt) - new Date(a.visitedAt));

    const filteredVisits = sortedVisits.filter(v => 
        v.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        v.collegeId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="min-h-screen flex items-center justify-center font-bold text-slate-400">Loading Medical Registrar...</div>;

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-10 font-sans text-slate-800">
            <div className="max-w-6xl mx-auto">
                <header className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm mb-8 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-600 text-white rounded-2xl"><ClipboardList size={24}/></div>
                        <div>
                            <h1 className="text-xl font-black">University Clinic Registry</h1>
                            <p className="text-xs font-bold uppercase text-slate-400 tracking-wider">Administration Dashboard</p>
                        </div>
                    </div>
                    <div className="bg-emerald-50 text-emerald-600 px-4 py-2 rounded-xl text-xs font-black uppercase">
                        Total Logged Visits: {allVisits.length}
                    </div>
                </header>

                <div className="relative mb-8">
                    <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                    <input 
                        type="text" placeholder="Search medical record ledger by name or enrollment code..."
                        className="w-full pl-14 pr-6 py-4 bg-white rounded-2xl border border-slate-100 shadow-sm outline-none font-medium"
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>

                <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                <tr>
                                    <th className="px-8 py-5">Patient Details</th>
                                    <th className="px-6 py-5">Symptoms Reported</th>
                                    <th className="px-6 py-5">Treatment Issued</th>
                                    <th className="px-8 py-5">Timestamp</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredVisits.map((v, i) => (
                                    <tr key={i} className="hover:bg-slate-50/40 transition-colors">
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-slate-100 rounded-lg text-slate-500"><User size={16}/></div>
                                                <div>
                                                    <p className="font-bold text-slate-800">{v.name}</p>
                                                    <p className="text-[10px] font-mono text-slate-400 uppercase">{v.collegeId} • Hostel {v.hostelId}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs">
                                            <div className="flex gap-2 text-xs font-medium text-slate-600">
                                                <Activity size={14} className="text-amber-500 shrink-0 mt-0.5" />
                                                <span className="line-clamp-2">{v.symptoms}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs">
                                            <div className="flex gap-2 text-xs font-semibold text-slate-700 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-100/30">
                                                <Pill size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                                                <span className="line-clamp-2">{v.prescribedMedicines}</span>
                                            </div>
                                            {/* --- NEW REMARKS BOX DISPLAY --- */}
                                            {v.remarks && (
                                                <div className="mt-2 text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
                                                    <strong>Note:</strong> "{v.remarks}"
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-8 py-4">
                                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-600">
                                                <Calendar size={12} className="text-slate-400" /> {new Date(v.visitedAt).toLocaleDateString()}
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-0.5">
                                                <Clock size={12} className="text-slate-400" /> {new Date(v.visitedAt).toLocaleTimeString()}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredVisits.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="text-center py-12 text-sm font-bold text-slate-300 uppercase tracking-wider">No Medical Transactions Found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HospitalAdmin;
import React, { useState, useEffect, useRef } from 'react';
import { 
    LayoutDashboard, Filter, Download, LogOut, Search, Star, 
    BarChart3, Users, X, Clock, Home, Smartphone, CheckCircle2, 
    Hash, MessageSquare, Upload, PieChart
} from 'lucide-react';
import axios from 'axios';
import StaffManagement from './StaffManagement';

// Combined Charting Imports (Doughnut & Bar)
import {
    Chart as ChartJS,
    ArcElement,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';

// Register all chart elements
ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const ChiefWarden = ({ onLogout }) => {
    const [allStudents, setAllStudents] = useState([]);
    const [hostelId, setHostelId] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('overview'); 
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const fileInputRef = useRef(null);

    const questionLabels = [
        "Menu", "Cleanliness", "Staff", "Roti", "Veg", "Rice", "Curd", "Tea", "Breakfast", "Daily"
    ];

    const hostels = [1, 2, 3, 4, 5, 6, 7, 8];

    const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000' 
        : 'https://messfeedback.onrender.com';

    const fetchData = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await axios.get(`${API_URL}/api/admin/students`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAllStudents(res.data);
        } catch (err) {
            console.error("Fetch Error:", err);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [API_URL]);

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target.result;
                const rows = text.split(/\r?\n/).filter(row => row.trim() !== '');
                const headers = rows[0].split(',').map(h => h.trim().replace(/"/g, ''));
                
                const studentsData = rows.slice(1).map(row => {
                    const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
                    const studentObj = {};
                    headers.forEach((header, index) => {
                        studentObj[header] = values[index];
                    });
                    return studentObj;
                });

                const token = localStorage.getItem('token');
                
                await axios.post(`${API_URL}/api/warden/upload`, {
                    students: studentsData,
                    hostelId: Number(hostelId) 
                }, {
                    headers: { 
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}` 
                    }
                });

                alert("✅ Bulk upload successful!");
                fetchData(); 
                
            } catch (err) {
                console.error("Full Upload Error Details:", err);
                const backendMessage = err.response?.data?.message || err.response?.data?.error || err.message;
                alert(`❌ Upload Error: ${typeof backendMessage === 'string' ? backendMessage : JSON.stringify(backendMessage)}`);
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = ''; 
            }
        };

        reader.readAsText(file);
    };

    const currentHostelStudents = allStudents.filter(s => Number(s.hostelId) === Number(hostelId));
    const filteredStudents = currentHostelStudents.filter(s => 
        s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.collegeId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculate Global Analytics Data
    const submittedFeedback = allStudents.filter(s => s.feedback?.isSubmitted);
    const totalStudents = allStudents.length;
    const feedbackCount = submittedFeedback.length;
    const avgGlobalRating = feedbackCount > 0 
        ? (submittedFeedback.reduce((acc, s) => acc + (s.feedback.answers.reduce((a, b) => a + b, 0) / s.feedback.answers.length), 0) / feedbackCount).toFixed(1)
        : 0;

    // --- GRAPH 1: Master Bar Chart (All Hostels Compared) ---
    const getHostelComparisonData = () => {
        const labels = hostels.map(h => `Hostel ${h}`);
        const data = hostels.map(h => {
            const hStudents = allStudents.filter(s => Number(s.hostelId) === Number(h) && s.feedback?.isSubmitted);
            if (hStudents.length === 0) return 0;
            const totalScore = hStudents.reduce((acc, s) => acc + (s.feedback.answers.reduce((a, b) => a + b, 0) / s.feedback.answers.length), 0);
            return (totalScore / hStudents.length).toFixed(1);
        });

        return {
            labels,
            datasets: [{
                label: 'Average Score (out of 5)',
                data,
                backgroundColor: '#1E3A3A',
                borderRadius: 6,
            }]
        };
    };

    // --- GRAPH 2: Individual Doughnut Charts ---
    const getChartDataForHostel = (hId) => {
        const hStudents = allStudents.filter(s => Number(s.hostelId) === Number(hId));
        const submitted = hStudents.filter(s => s.feedback?.isSubmitted);
        const averages = new Array(10).fill(0);
        
        if (submitted.length > 0) {
            submitted.forEach(s => {
                s.feedback.answers.forEach((val, idx) => { averages[idx] += val; });
            });
            averages.forEach((val, idx) => averages[idx] = (val / submitted.length).toFixed(1));
        }

        const bgColors = [
            '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
            '#06b6d4', '#3b82f6', '#6366f1', '#a855f7', '#ec4899'
        ];

        return {
            labels: questionLabels,
            datasets: [{
                label: `Hostel ${hId} Average`,
                data: averages,
                backgroundColor: bgColors,
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverOffset: 5
            }]
        };
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] flex">
            <aside className="w-72 bg-[#1E3A3A] p-8 hidden lg:flex flex-col text-white shadow-xl z-10">
                <div className="flex items-center gap-3 mb-12">
                    <div className="bg-white/10 p-2 rounded-xl text-white">
                        <LayoutDashboard size={24} />
                    </div>
                    <span className="text-xl font-bold tracking-tight">Chief Admin</span>
                </div>

                <nav className="flex-1 space-y-2">
                    <div className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4 px-4">Management</div>
                    
                    <button 
                        onClick={() => setActiveTab('overview')}
                        className={`w-full text-left px-5 py-4 rounded-xl font-medium transition-all ${activeTab === 'overview' ? 'bg-white/20 shadow-inner' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
                    >
                        Overview
                    </button>
                    
                    <button 
                        onClick={() => setActiveTab('analytics')}
                        className={`w-full text-left px-5 py-4 rounded-xl font-medium transition-all ${activeTab === 'analytics' ? 'bg-white/20 shadow-inner' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
                    >
                        Analytics
                    </button>

                    <button 
                        onClick={() => setActiveTab('management')}
                        className={`w-full text-left px-5 py-4 rounded-xl font-medium transition-all ${activeTab === 'management' ? 'bg-white/20 shadow-inner' : 'text-white/60 hover:bg-white/10 hover:text-white'}`}
                    >
                        Staff Management
                    </button>
                </nav>

                <button onClick={onLogout} className="flex items-center gap-3 px-5 py-4 text-rose-300 font-bold hover:bg-rose-500/10 rounded-xl transition-all mt-auto">
                    <LogOut size={20} /> Sign Out
                </button>
            </aside>

            <main className="flex-1 p-8 md:p-12 overflow-y-auto relative">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-12">
                    <div>
                        <h1 className="text-3xl font-bold text-[#212529] tracking-tight">
                            {activeTab === 'overview' ? 'System Overview' : 
                             activeTab === 'analytics' ? 'Performance Analytics' : 
                             'Staff Records'}
                        </h1>
                        <p className="text-[#6B705C] font-medium mt-1">Global Chief Administration Portal</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <input 
                            type="file" 
                            accept=".csv, .xlsx, .xls" 
                            className="hidden" 
                            ref={fileInputRef} 
                            onChange={handleFileUpload} 
                        />
                        <button 
                            onClick={() => fileInputRef.current.click()} 
                            disabled={isUploading}
                            className="flex items-center gap-2 bg-[#E7F5EF] text-[#1E3A3A] px-6 py-3 rounded-xl font-bold shadow-sm hover:bg-[#D4EBE0] transition-all active:scale-95 disabled:opacity-50"
                        >
                            <Upload size={18} /> {isUploading ? "Uploading..." : "Bulk Upload"}
                        </button>
                        <button className="flex items-center gap-2 bg-[#1E3A3A] text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-[#152929] transition-all active:scale-95">
                            <Download size={18} /> Export Data
                        </button>
                    </div>
                </header>

                {activeTab === 'management' && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <StaffManagement />
                    </div>
                )}

                {activeTab === 'overview' && (
                    <div className="animate-in fade-in duration-500">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                            <div className="bg-white p-4 rounded-xl border border-[#E9ECEF] shadow-sm flex items-center gap-4">
                                <div className="p-2 bg-[#F8F9FA] text-[#1E3A3A] rounded-lg"><Filter size={20} /></div>
                                <select className="bg-transparent font-bold text-[#495057] outline-none w-full cursor-pointer" value={hostelId} onChange={(e) => setHostelId(e.target.value)}>
                                    {hostels.map(n => <option key={n} value={n}>Hostel {n}</option>)}
                                </select>
                            </div>
                            <div className="md:col-span-2 bg-white p-4 rounded-xl border border-[#E9ECEF] shadow-sm flex items-center gap-4">
                                <div className="p-2 text-slate-400"><Search size={20} /></div>
                                <input 
                                    type="text" 
                                    placeholder="Search ID or Student Name in selected hostel..." 
                                    className="bg-transparent font-medium text-[#495057] outline-none w-full" 
                                    onChange={(e) => setSearchTerm(e.target.value)} 
                                />
                            </div>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-[#E9ECEF] overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-[#F8F9FA] border-b border-[#E9ECEF] font-bold text-[11px] text-[#6B705C] uppercase tracking-widest">
                                    <tr>
                                        <th className="px-8 py-5">Student</th>
                                        <th className="px-8 py-5">Status</th>
                                        <th className="px-8 py-5 text-center">Avg Rating</th>
                                        <th className="px-8 py-5">Comments</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[#E9ECEF]">
                                    {filteredStudents.length > 0 ? (
                                        filteredStudents.map((s, i) => (
                                            <tr key={i} onClick={() => setSelectedStudent(s)} className="hover:bg-[#F8F9FA] transition-colors cursor-pointer">
                                                <td className="px-8 py-5">
                                                    <div className="font-bold text-[#212529]">{s.name}</div>
                                                    <div className="text-xs text-[#6B705C] font-mono">{s.collegeId}</div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className={`px-4 py-1.5 rounded-lg text-[10px] font-bold ${s.feedback?.isSubmitted ? 'bg-[#E7F5EF] text-[#1E3A3A]' : 'bg-[#FFF4E5] text-[#B25E09]'}`}>
                                                        {s.feedback?.isSubmitted ? 'SUBMITTED' : 'PENDING'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-center font-black text-[#1E3A3A]">
                                                    {s.feedback?.isSubmitted ? (s.feedback.answers.reduce((a,b)=>a+b,0)/s.feedback.answers.length).toFixed(1) : '—'}
                                                </td>
                                                <td className="px-8 py-5 text-[#6B705C] text-sm italic truncate max-w-[200px]">
                                                    {s.feedback?.comments || "No comments yet"}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="4" className="py-20 text-center text-[#6B705C]">No students found in this hostel.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'analytics' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-white p-8 rounded-xl shadow-sm border border-[#E9ECEF]">
                                <Users className="text-[#1E3A3A] mb-4 opacity-70" size={28} />
                                <h3 className="text-[#6B705C] text-xs font-bold uppercase tracking-widest">Total Campus Students</h3>
                                <p className="text-4xl font-bold text-[#212529] mt-2">{totalStudents}</p>
                            </div>
                            <div className="bg-white p-8 rounded-xl shadow-sm border border-[#E9ECEF]">
                                <Star className="text-amber-500 mb-4 opacity-70" size={28} />
                                <h3 className="text-[#6B705C] text-xs font-bold uppercase tracking-widest">Global Satisfaction</h3>
                                <p className="text-4xl font-bold text-[#212529] mt-2">{avgGlobalRating} <span className="text-sm text-[#6B705C] font-normal">/ 5.0</span></p>
                            </div>
                            <div className="bg-white p-8 rounded-xl shadow-sm border border-[#E9ECEF]">
                                <BarChart3 className="text-[#1E3A3A] mb-4 opacity-70" size={28} />
                                <h3 className="text-[#6B705C] text-xs font-bold uppercase tracking-widest">Total Responses</h3>
                                <p className="text-4xl font-bold text-[#212529] mt-2">{feedbackCount}</p>
                            </div>
                        </div>

                        {/* Master Bar Chart */}
                        <div className="bg-white p-8 rounded-xl shadow-sm border border-[#E9ECEF]">
                            <h3 className="text-xl font-bold text-[#212529] mb-6">Hostel Comparison (Average Score)</h3>
                            <div className="h-[300px] w-full">
                                <Bar 
                                    data={getHostelComparisonData()} 
                                    options={{ 
                                        responsive: true, 
                                        maintainAspectRatio: false,
                                        scales: { 
                                            y: { beginAtZero: true, max: 5 } 
                                        },
                                        plugins: { 
                                            legend: { display: false } 
                                        }
                                    }} 
                                />
                            </div>
                        </div>

                        {/* Individual Doughnut Charts Grid */}
                        <h3 className="text-xl font-bold text-[#212529] mt-10 mb-4 px-2">Detailed Category Breakdowns by Hostel</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {hostels.map(hId => {
                                const data = getChartDataForHostel(hId);
                                const hStudents = allStudents.filter(s => Number(s.hostelId) === Number(hId));
                                const hSubmitted = hStudents.filter(s => s.feedback?.isSubmitted).length;

                                return (
                                    <div key={hId} className="bg-white p-6 rounded-xl shadow-sm border border-[#E9ECEF] flex flex-col items-center">
                                        <h4 className="font-black text-lg text-[#1E3A3A] mb-1">Hostel {hId}</h4>
                                        <p className="text-xs text-slate-400 font-bold mb-6">{hSubmitted} Responses</p>
                                        
                                        {hSubmitted > 0 ? (
                                            <div className="relative w-full max-w-[200px] h-[200px]">
                                                <Doughnut 
                                                    data={data} 
                                                    options={{ 
                                                        responsive: true, 
                                                        maintainAspectRatio: false,
                                                        plugins: {
                                                            legend: { display: false }, 
                                                            tooltip: {
                                                                callbacks: { label: (context) => ` ${context.label}: ${context.raw} / 5` }
                                                            }
                                                        } 
                                                    }} 
                                                />
                                            </div>
                                        ) : (
                                            <div className="w-full h-[200px] flex flex-col items-center justify-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                                <PieChart size={32} className="mb-2 text-slate-300"/>
                                                <p className="text-xs font-bold text-slate-400">No Data Yet</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </main>

            {/* --- STUDENT MODAL --- */}
            {selectedStudent && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-start justify-center pt-8 px-4 overflow-y-auto pb-8">
                    <div className="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-10 relative">
                        
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-[#1E3A3A]/10 rounded-2xl text-[#1E3A3A] shadow-sm"><Users size={28}/></div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800">{selectedStudent.name}</h2>
                                    <div className="flex gap-3 mt-1 text-xs font-bold text-slate-400">
                                        <span className="flex items-center gap-1"><Hash size={14}/> {selectedStudent.collegeId}</span>
                                        <span className="flex items-center gap-1"><Home size={14}/> Hostel {selectedStudent.hostelId}</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => setSelectedStudent(null)} className="p-3 bg-white hover:bg-rose-50 hover:text-rose-500 rounded-2xl transition-colors border shadow-sm"><X size={24} /></button>
                        </div>
                        
                        <div className="p-6">
                            <div className="flex flex-wrap gap-4 mb-8">
                                <div className="flex-1 min-w-[150px] bg-slate-50 p-4 rounded-2xl border flex items-center gap-3">
                                    <Smartphone size={20} className="text-[#1E3A3A]" />
                                    <div><p className="text-[10px] font-black text-slate-400 uppercase">Mobile</p><p className="font-bold text-sm">{selectedStudent.mobile || 'Not Provided'}</p></div>
                                </div>
                                <div className="flex-1 min-w-[150px] bg-slate-50 p-4 rounded-2xl border flex items-center gap-3">
                                    <CheckCircle2 size={20} className={selectedStudent.feedback?.isSubmitted ? "text-emerald-500" : "text-slate-400"} />
                                    <div><p className="text-[10px] font-black text-slate-400 uppercase">Status</p><p className="font-bold text-sm">{selectedStudent.feedback?.isSubmitted ? 'Feedback Submitted' : 'Pending Review'}</p></div>
                                </div>
                                {selectedStudent.feedback?.isSubmitted && (
                                    <div className="flex-1 min-w-[150px] bg-[#1E3A3A] text-white p-4 rounded-2xl shadow-md flex flex-col justify-center items-center">
                                        <p className="text-emerald-400 text-[10px] font-black uppercase">Avg Score</p>
                                        <p className="text-2xl font-black">{(selectedStudent.feedback.answers.reduce((a,b)=>a+b,0)/selectedStudent.feedback.answers.length).toFixed(1)} <span className="text-sm text-white/50">/ 5</span></p>
                                    </div>
                                )}
                            </div>

                            {selectedStudent.feedback?.isSubmitted ? (
                                <>
                                    <h3 className="text-sm font-black text-slate-800 uppercase mb-4 flex items-center gap-2"><BarChart3 size={16}/> Individual Category Ratings</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
                                        {questionLabels.map((label, idx) => (
                                            <div key={idx} className="bg-slate-50 border rounded-xl p-3 flex flex-col items-center justify-center text-center">
                                                <span className="text-[10px] font-black text-slate-500 uppercase mb-1">{label}</span>
                                                <div className="flex items-center gap-1 font-bold text-lg text-[#1E3A3A]">
                                                    {selectedStudent.feedback.answers[idx]} <Star size={14} fill="currentColor" className="text-amber-400"/>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="bg-[#1E3A3A]/5 border border-[#1E3A3A]/10 rounded-2xl p-5 relative">
                                        <MessageSquare size={20} className="absolute top-5 right-5 text-[#1E3A3A]/20" />
                                        <p className="text-[10px] font-black text-[#1E3A3A]/60 uppercase mb-2">Student Comments</p>
                                        <p className="text-sm text-[#1E3A3A] italic leading-relaxed">
                                            "{selectedStudent.feedback.comments || "No additional comments provided by the student."}"
                                        </p>
                                        <p className="text-[10px] text-slate-400 mt-4 uppercase font-bold">
                                            Submitted: {new Date(selectedStudent.feedback.submittedAt).toLocaleString()}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed">
                                    <Clock size={40} className="mx-auto text-slate-300 mb-3" />
                                    <p className="font-bold text-slate-500">No Feedback Data Available</p>
                                    <p className="text-xs text-slate-400">This student hasn't submitted their mess feedback yet.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChiefWarden;
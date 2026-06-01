import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, ShieldCheck, LogOut, Star, MessageSquare, UserPlus, 
  Users, LayoutDashboard, Search, FileText, X, Clock, Calendar, 
  BarChart3, User, Hash, Home, Smartphone, CheckCircle2
} from 'lucide-react';
import axios from 'axios';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

import {
  Chart as ChartJS,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Title, Tooltip, Legend);

const WardenDashboard = ({ hostelId, onLogout }) => {
    const [students, setStudents] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [view, setView] = useState('list'); 
    const [loading, setLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [newWarden, setNewWarden] = useState({ username: '', password: '', hostelId: '' });
    
    const fileInputRef = useRef(null);
    const role = localStorage.getItem('role'); 
    const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000' 
        : 'https://hostelfeedback.onrender.com';

    const questionLabels = [
        "Menu", "Cleanliness", "Staff", "Roti", "Veg", "Rice", "Curd", "Tea", "Breakfast", "Daily"
    ];

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API_URL}/api/admin/students`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (role === 'chief' || role === 'admin') {
                setStudents(res.data);
            } else {
                const filtered = res.data.filter(s => Number(s.hostelId) === Number(hostelId));
                setStudents(filtered);
            }
        } catch (err) {
            console.error("Fetch Error:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [API_URL, hostelId, role]);

    const filteredStudents = students.filter(s => 
        s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.collegeId?.toLowerCase().includes(searchTerm.toLowerCase())
    );

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
                
                // FIXED ENDPOINT HERE
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
                fetchDashboardData(); 
                
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

    const downloadPDF = () => {
        const doc = new jsPDF();
        const tableColumn = ["Student Name", "ID", "Hostel", "Avg Rating", "Date"];
        const tableRows = [];

        filteredStudents.filter(s => s.feedback?.isSubmitted).forEach(s => {
            const avg = (s.feedback.answers.reduce((a, b) => a + b, 0) / s.feedback.answers.length).toFixed(1);
            const rowData = [
                s.name,
                s.collegeId,
                `Hostel ${s.hostelId}`,
                avg,
                s.feedback.submittedAt ? new Date(s.feedback.submittedAt).toLocaleDateString() : 'N/A'
            ];
            tableRows.push(rowData);
        });

        doc.setFontSize(18);
        doc.text("CURAJ Mega Mess Feedback Report", 14, 15);
        doc.autoTable(tableColumn, tableRows, { startY: 25 });
        doc.save(`Mess_Report_${new Date().toLocaleDateString()}.pdf`);
    };

    const getChartData = () => {
        const submitted = students.filter(s => s.feedback?.isSubmitted);
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
                label: 'Average Score',
                data: averages,
                backgroundColor: bgColors,
                borderWidth: 2,
                borderColor: '#ffffff',
                hoverOffset: 10
            }]
        };
    };

    const handleCreateWarden = async () => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API_URL}/api/admin/create-warden`, newWarden, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert("✅ Warden Created!");
            setNewWarden({ username: '', password: '', hostelId: '' });
        } catch (err) { alert("❌ Error creating warden."); }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center font-black text-slate-400 animate-pulse">LOADING DASHBOARD...</div>;

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 font-sans text-slate-800">
            <div className="max-w-7xl mx-auto">
                
                <header className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 mb-8 flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex items-center gap-4">
                        <div className={`p-4 rounded-2xl text-white ${role === 'chief' ? 'bg-amber-500' : 'bg-indigo-600'}`}>
                            {role === 'chief' ? <LayoutDashboard size={24} /> : <ShieldCheck size={24} />}
                        </div>
                        <div>
                            <h1 className="text-xl font-black">{role === 'chief' ? "Chief Warden" : `Hostel ${hostelId} Warden`}</h1>
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">CURAJ Mess Management</p>
                        </div>
                    </div>
                    <div className="flex gap-2 flex-wrap justify-end">
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
                            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-all disabled:opacity-50"
                        >
                            <Upload size={18} /> {isUploading ? "Uploading..." : "Bulk Upload"}
                        </button>
                        <button onClick={downloadPDF} className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-all">
                            <FileText size={18} /> Export PDF
                        </button>
                        <button onClick={onLogout} className="p-3 bg-rose-50 text-rose-600 rounded-xl hover:bg-rose-100">
                            <LogOut size={20} />
                        </button>
                    </div>
                </header>

                <div className="flex gap-3 mb-8">
                    <button onClick={() => setView('list')} className={`px-6 py-3 rounded-2xl font-bold text-xs uppercase transition-all ${view === 'list' ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-400 border'}`}>
                        Students
                    </button>
                    <button onClick={() => setView('analysis')} className={`px-6 py-3 rounded-2xl font-bold text-xs uppercase transition-all ${view === 'analysis' ? 'bg-indigo-600 text-white shadow-xl' : 'bg-white text-slate-400 border'}`}>
                        Analytics
                    </button>
                    {(role === 'chief' || role === 'admin') && (
                        <button onClick={() => setView('wardens')} className={`px-6 py-3 rounded-2xl font-bold text-xs uppercase transition-all ${view === 'wardens' ? 'bg-amber-500 text-white shadow-xl' : 'bg-white text-slate-400 border'}`}>
                            Add Warden
                        </button>
                    )}
                </div>

                <main className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-2">
                    {view === 'list' && (
                        <div className="p-4">
                            <div className="relative mb-6">
                                <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                                <input 
                                    type="text" placeholder="Search name or ID..."
                                    className="w-full pl-12 pr-6 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-100 font-medium"
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50/50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                                        <tr>
                                            <th className="px-6 py-4">Student</th>
                                            <th className="px-6 py-4">Hostel</th>
                                            <th className="px-6 py-4 text-center">Score</th>
                                            <th className="px-6 py-4">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {filteredStudents.map((s, i) => (
                                            <tr key={i} className="hover:bg-slate-50/50 cursor-pointer" onClick={() => setSelectedStudent(s)}>
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-slate-800">{s.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-mono">{s.collegeId}</p>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-bold text-slate-500">Hostel {s.hostelId}</td>
                                                <td className="px-6 py-4 text-center">
                                                    {s.feedback?.isSubmitted ? (
                                                        <div className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-lg font-black text-xs">
                                                            <Star size={10} fill="currentColor" />
                                                            {(s.feedback.answers.reduce((a,b)=>a+b,0)/s.feedback.answers.length).toFixed(1)}
                                                        </div>
                                                    ) : <span className="text-slate-200">-</span>}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-md ${s.feedback?.isSubmitted ? 'bg-emerald-50 text-emerald-500' : 'bg-slate-100 text-slate-400'}`}>
                                                        {s.feedback?.isSubmitted ? 'Done' : 'Pending'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {view === 'analysis' && (
                        <div className="p-8 h-[550px] flex flex-col items-center">
                            <h2 className="text-xl font-black mb-6 self-start w-full text-center">Overall Feedback Breakdown</h2>
                            <div className="relative w-full max-w-[400px] flex-1">
                                <Doughnut 
                                    data={getChartData()} 
                                    options={{ 
                                        responsive: true, 
                                        maintainAspectRatio: false,
                                        plugins: {
                                            legend: { position: 'right', labels: { usePointStyle: true, padding: 20 } },
                                            tooltip: {
                                                callbacks: {
                                                    label: (context) => ` Average Score: ${context.raw} / 5`
                                                }
                                            }
                                        } 
                                    }} 
                                />
                            </div>
                        </div>
                    )}

                    {view === 'wardens' && (
                        <div className="p-12 max-w-xl mx-auto space-y-4 text-center">
                            <h3 className="text-2xl font-black">Register Staff</h3>
                            <input type="text" placeholder="Username" className="w-full p-4 bg-slate-50 rounded-2xl outline-none" onChange={(e) => setNewWarden({...newWarden, username: e.target.value})} />
                            <input type="number" placeholder="Hostel Number" className="w-full p-4 bg-slate-50 rounded-2xl outline-none" onChange={(e) => setNewWarden({...newWarden, hostelId: e.target.value})} />
                            <input type="password" placeholder="Password" className="w-full p-4 bg-slate-50 rounded-2xl outline-none" onChange={(e) => setNewWarden({...newWarden, password: e.target.value})} />
                            <button onClick={handleCreateWarden} className="w-full bg-amber-500 text-white py-4 rounded-2xl font-black shadow-lg">Create Warden</button>
                        </div>
                    )}
                </main>

                {selectedStudent && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-start justify-center pt-8 px-4 overflow-y-auto pb-8">
                        <div className="bg-white w-full max-w-3xl rounded-[2rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-10 relative">
                            
                            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                                <div className="flex items-center gap-4">
                                    <div className="p-4 bg-indigo-100 rounded-2xl text-indigo-600 shadow-sm"><User size={28}/></div>
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
                                        <Smartphone size={20} className="text-indigo-500" />
                                        <div><p className="text-[10px] font-black text-slate-400 uppercase">Mobile</p><p className="font-bold text-sm">{selectedStudent.mobile || 'Not Provided'}</p></div>
                                    </div>
                                    <div className="flex-1 min-w-[150px] bg-slate-50 p-4 rounded-2xl border flex items-center gap-3">
                                        <CheckCircle2 size={20} className={selectedStudent.feedback?.isSubmitted ? "text-emerald-500" : "text-slate-400"} />
                                        <div><p className="text-[10px] font-black text-slate-400 uppercase">Status</p><p className="font-bold text-sm">{selectedStudent.feedback?.isSubmitted ? 'Feedback Submitted' : 'Pending Review'}</p></div>
                                    </div>
                                    {selectedStudent.feedback?.isSubmitted && (
                                        <div className="flex-1 min-w-[150px] bg-slate-900 text-white p-4 rounded-2xl shadow-md flex flex-col justify-center items-center">
                                            <p className="text-emerald-400 text-[10px] font-black uppercase">Avg Score</p>
                                            <p className="text-2xl font-black">{(selectedStudent.feedback.answers.reduce((a,b)=>a+b,0)/selectedStudent.feedback.answers.length).toFixed(1)} <span className="text-sm text-slate-400">/ 5</span></p>
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
                                                    <div className="flex items-center gap-1 font-bold text-lg text-indigo-600">
                                                        {selectedStudent.feedback.answers[idx]} <Star size={14} fill="currentColor" className="text-amber-400"/>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-5 relative">
                                            <MessageSquare size={20} className="absolute top-5 right-5 text-indigo-200" />
                                            <p className="text-[10px] font-black text-indigo-400 uppercase mb-2">Student Comments</p>
                                            <p className="text-sm text-indigo-900 italic leading-relaxed">
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
        </div>
    );
};

export default WardenDashboard;
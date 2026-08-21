import React, { useState, useEffect, useRef } from 'react';
import { 
    LayoutDashboard, Filter, Download, LogOut, Search, Star, 
    BarChart3, Users, X, Clock, Home, Smartphone, CheckCircle2, 
    Hash, MessageSquare, Upload, PieChart, Mail, Shield, Calendar, TrendingUp
} from 'lucide-react';
import axios from 'axios';
import Navbar from './Navbar';
import StaffManagement from './StaffManagement';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import {
    Chart as ChartJS,
    ArcElement,
    CategoryScale,
    LinearScale,
    BarElement,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';

ChartJS.register(
    ArcElement, CategoryScale, LinearScale, BarElement, 
    PointElement, LineElement, Title, Tooltip, Legend, Filler
);

const ChiefWarden = ({ onLogout }) => {
    const userRole = localStorage.getItem('role') || localStorage.getItem('userRole') || 'admin';
    const assignedHostel = localStorage.getItem('hostelId') || 'B1';
    const isChief = userRole === 'admin' || userRole === 'chief';

    const [allStudents, setAllStudents] = useState([]);
    const [trendData, setTrendData] = useState([]);
    const [timeRange, setTimeRange] = useState('6m'); // '1m' | '3m' | '6m' | 'all'
    const [hostelId, setHostelId] = useState(isChief ? 'B1' : assignedHostel);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('overview'); 
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const fileInputRef = useRef(null);

    const questionLabels = [
        "Menu", "Cleanliness", "Staff", "Roti", "Veg", "Rice", "Curd", "Tea", "Breakfast", "Daily"
    ];

    const hostels = ['B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8'];

    const API_URL = window.location.hostname === 'localhost' 
        ? 'http://localhost:5000' 
        : 'https://messfeedbackcuraj.onrender.com';

    const getAuthHeaders = () => {
        const token = localStorage.getItem('adminToken') || localStorage.getItem('token');
        return { headers: { Authorization: `Bearer ${token}` } };
    };

    const fetchData = async () => {
        try {
            const res = await axios.get(`${API_URL}/api/admin/students`, getAuthHeaders());
            setAllStudents(res.data);
        } catch (err) {
            console.error("Fetch Error:", err);
        }
    };

    const fetchTrends = async () => {
        try {
            const targetHostel = isChief ? 'ALL' : assignedHostel;
            const res = await axios.get(
                `${API_URL}/api/admin/analytics-trends?range=${timeRange}&hostelId=${targetHostel}`,
                getAuthHeaders()
            );
            setTrendData(res.data);
        } catch (err) {
            console.error("Trends Fetch Error:", err);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        fetchTrends();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [timeRange, hostelId]);

    // CSV Bulk Upload
    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        setIsUploading(true);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target.result;
                const rows = text.split(/\r?\n/).filter(row => row.trim() !== '');
                if (rows.length < 2) throw new Error("CSV file must contain a header row and data.");

                const headers = rows[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
                
                const studentsList = rows.slice(1).map(row => {
                    const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
                    const studentObj = {};
                    headers.forEach((header, index) => {
                        studentObj[header] = values[index];
                    });

                    return {
                        collegeId: studentObj.collegeid || studentObj['college id'] || studentObj.id || values[0],
                        name: studentObj.name || studentObj['student name'] || values[1] || 'Student',
                        email: studentObj.email || studentObj['email id'] || studentObj['student email'] || values[2] || '',
                        hostelId: isChief ? (studentObj.hostelid || studentObj['hostel id'] || values[3] || hostelId) : assignedHostel,
                        mobile: studentObj.mobile || studentObj.phone || values[4] || null
                    };
                }).filter(s => s.collegeId);

                await axios.post(`${API_URL}/api/admin/bulk-students`, {
                    studentsList,
                    hostelId: isChief ? hostelId : assignedHostel
                }, getAuthHeaders());

                alert(`Successfully imported ${studentsList.length} students into PostgreSQL!`);
                fetchData(); 
            } catch (err) {
                console.error("Upload Error:", err);
                alert(`Upload Error: ${err.response?.data?.error || err.message}`);
            } finally {
                setIsUploading(false);
                if (fileInputRef.current) fileInputRef.current.value = ''; 
            }
        };

        reader.readAsText(file);
    };

    


    

    // PDF Export with Submission Dates
    const handleExportPDF = () => {
        const doc = new jsPDF();
        const tableColumn = ["Student Name", "ID", "Email", "Hostel", "Status", "Date & Time", "Avg Rating"];
        const tableRows = [];

        filteredStudents.forEach(s => {
            const isSub = s.feedback?.isSubmitted;
            const avg = isSub && Array.isArray(s.feedback.answers)
                ? (s.feedback.answers.reduce((a, b) => a + b, 0) / s.feedback.answers.length).toFixed(1)
                : 'N/A';

            const dateStr = s.feedback?.submittedAt 
                ? new Date(s.feedback.submittedAt).toLocaleString() 
                : 'Not Submitted';

            tableRows.push([
                s.name,
                s.collegeId,
                s.email || 'N/A',
                `Hostel ${s.hostelId}`,
                isSub ? 'Submitted' : 'Pending',
                dateStr,
                avg
            ]);
        });

        doc.setFontSize(16);
        const reportTitle = isChief 
            ? `CURAJ Mega Mess Feedback Report - Hostel ${hostelId}`
            : `CURAJ Mega Mess Feedback Report - Hostel ${assignedHostel}`;
        doc.text(reportTitle, 14, 15);
        doc.setFontSize(10);
        doc.text(`Generated: ${new Date().toLocaleString()} | Filter Window: ${timeRange.toUpperCase()} | Total Records: ${tableRows.length}`, 14, 22);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 28,
            theme: 'grid',
            headStyles: { fillColor: [11, 19, 41] }
        });

        doc.save(`CURAJ_Mess_Feedback_${isChief ? hostelId : assignedHostel}_${Date.now()}.pdf`);
    };

    const currentHostelStudents = allStudents.filter(s => 
        String(s.hostelId).toUpperCase() === String(isChief ? hostelId : assignedHostel).toUpperCase()
    );

    const filteredStudents = currentHostelStudents.filter(s => 
        s.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.collegeId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const submittedFeedback = currentHostelStudents.filter(s => s.feedback?.isSubmitted && Array.isArray(s.feedback?.answers));
    const totalStudents = currentHostelStudents.length;
    const feedbackCount = submittedFeedback.length;
    const avgHostelRating = feedbackCount > 0 
        ? (submittedFeedback.reduce((acc, s) => acc + (s.feedback.answers.reduce((a, b) => a + b, 0) / s.feedback.answers.length), 0) / feedbackCount).toFixed(1)
        : 0;

    // Line Chart Data for Time-Series Analysis
    const getMonthlyTrendChartData = () => {
        const labels = trendData.length > 0 ? trendData.map(d => d.month_label) : ['No Data'];
        const values = trendData.length > 0 ? trendData.map(d => d.overall_avg) : [0];

        return {
            labels,
            datasets: [{
                label: 'Monthly Overall Average (out of 5.0)',
                data: values,
                borderColor: '#0284c7',
                backgroundColor: 'rgba(2, 132, 199, 0.12)',
                borderWidth: 3,
                fill: true,
                tension: 0.35,
                pointBackgroundColor: '#0284c7',
                pointRadius: 5
            }]
        };
    };

    // Cross-Hostel Comparison Bar Chart (Chief Admin)
    const getHostelComparisonData = () => {
        const labels = hostels.map(h => `Hostel ${h}`);
        const data = hostels.map(h => {
            const hStudents = allStudents.filter(s => String(s.hostelId).toUpperCase() === String(h).toUpperCase() && s.feedback?.isSubmitted && Array.isArray(s.feedback?.answers));
            if (hStudents.length === 0) return 0;
            const totalScore = hStudents.reduce((acc, s) => acc + (s.feedback.answers.reduce((a, b) => a + b, 0) / s.feedback.answers.length), 0);
            return (totalScore / hStudents.length).toFixed(1);
        });

        return {
            labels,
            datasets: [{
                label: 'Average Score (out of 5)',
                data,
                backgroundColor: '#0b1329',
                borderRadius: 8,
            }]
        };
    };

    

    const getChartDataForHostel = (hId) => {
        const hStudents = allStudents.filter(s => String(s.hostelId).toUpperCase() === String(hId).toUpperCase());
        const submitted = hStudents.filter(s => s.feedback?.isSubmitted && Array.isArray(s.feedback?.answers));
        const averages = new Array(10).fill(0);
        
        if (submitted.length > 0) {
            submitted.forEach(s => {
                s.feedback.answers.forEach((val, idx) => { averages[idx] += Number(val) || 0; });
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
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans">
            {/* Top Navbar */}
            <Navbar />

            {/* Dashboard Workspace */}
            <div className="flex-1 flex overflow-hidden">
                
                {/* Sidebar */}
                <aside className="w-72 bg-[#0b1329] p-8 hidden lg:flex flex-col text-white shadow-xl z-10 select-none">
                    <div className="flex items-center gap-3 mb-10 pb-6 border-b border-slate-800">
                        <div className="bg-white/10 p-2.5 rounded-xl text-white">
                            {isChief ? <LayoutDashboard size={24} /> : <Shield size={24} />}
                        </div>
                        <div>
                            <span className="text-lg font-bold tracking-tight block">
                                {isChief ? "Chief Warden" : `Hostel ${assignedHostel} Warden`}
                            </span>
                            <span className="text-[10px] text-sky-400 uppercase tracking-widest font-black">
                                {isChief ? "Campus Administration" : "Hostel Incharge"}
                            </span>
                        </div>
                    </div>

                    <nav className="flex-1 space-y-2">
                        <div className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 px-4">Navigation</div>
                        
                        <button 
                            onClick={() => setActiveTab('overview')}
                            className={`w-full text-left px-5 py-4 rounded-xl font-medium transition-all ${activeTab === 'overview' ? 'bg-white/20 shadow-inner text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
                        >
                            Overview
                        </button>
                        
                        <button 
                            onClick={() => setActiveTab('analytics')}
                            className={`w-full text-left px-5 py-4 rounded-xl font-medium transition-all ${activeTab === 'analytics' ? 'bg-white/20 shadow-inner text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
                        >
                            Analytics & Trends
                        </button>

                        {isChief && (
                            <button 
                                onClick={() => setActiveTab('management')}
                                className={`w-full text-left px-5 py-4 rounded-xl font-medium transition-all ${activeTab === 'management' ? 'bg-white/20 shadow-inner text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`}
                            >
                                Staff Management
                            </button>
                        )}
                    </nav>

                    <button onClick={onLogout} className="flex items-center gap-3 px-5 py-4 text-rose-300 font-bold hover:bg-rose-500/10 rounded-xl transition-all mt-auto border border-rose-500/20">
                        <LogOut size={20} /> Sign Out
                    </button>
                </aside>

                {/* Main Content */}
                <main className="flex-1 p-8 md:p-12 overflow-y-auto relative">
                    <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
                                {activeTab === 'overview' ? (isChief ? 'System Overview' : `Hostel ${assignedHostel} Overview`) : 
                                 activeTab === 'analytics' ? (isChief ? 'Campus Trend Analytics' : `Hostel ${assignedHostel} Trends`) : 
                                 'Staff Records'}
                            </h1>
                            <p className="text-slate-500 font-medium mt-1">
                                {isChief 
                                    ? "Global Chief Administration • All Hostels Monitor" 
                                    : `Hostel ${assignedHostel} Administration Portal`}
                            </p>
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
                                className="flex items-center gap-2 bg-slate-100 text-slate-800 px-6 py-3 rounded-xl font-bold shadow-sm hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-50"
                            >
                                <Upload size={18} /> {isUploading ? "Uploading..." : "Bulk Upload"}
                            </button>
                            <button 
                                onClick={handleExportPDF}
                                className="flex items-center gap-2 bg-[#0b1329] text-white px-6 py-3 rounded-xl font-bold shadow-md hover:bg-slate-800 transition-all active:scale-95"
                            >
                                <Download size={18} /> Export Data
                            </button>
                        </div>
                    </header>

                    {/* Staff Management Tab */}
                    {activeTab === 'management' && isChief && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <StaffManagement />
                        </div>
                    )}

                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div className="animate-in fade-in duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
                                {isChief ? (
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                                        <div className="p-2 bg-slate-50 text-slate-700 rounded-lg"><Filter size={20} /></div>
                                        <select 
                                            className="bg-transparent font-bold text-slate-700 outline-none w-full cursor-pointer" 
                                            value={hostelId} 
                                            onChange={(e) => setHostelId(e.target.value)}
                                        >
                                            {hostels.map(n => <option key={n} value={n}>Hostel {n}</option>)}
                                        </select>
                                    </div>
                                ) : (
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                                        <div className="p-2 bg-emerald-50 text-emerald-800 rounded-lg"><Home size={20} /></div>
                                        <div>
                                            <p className="text-[10px] font-black uppercase text-slate-400">Assigned Incharge</p>
                                            <p className="font-bold text-slate-800">Hostel {assignedHostel}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="md:col-span-2 bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
                                    <div className="p-2 text-slate-400"><Search size={20} /></div>
                                    <input 
                                        type="text" 
                                        placeholder={isChief ? "Search student name, ID, or email..." : `Search students in Hostel ${assignedHostel}...`}
                                        className="bg-transparent font-medium text-slate-700 outline-none w-full" 
                                        onChange={(e) => setSearchTerm(e.target.value)} 
                                    />
                                </div>
                            </div>

                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <table className="w-full text-left">
                                    <thead className="bg-slate-50 border-b border-slate-200 font-bold text-[11px] text-slate-500 uppercase tracking-widest">
                                        <tr>
                                            <th className="px-8 py-5">Student Details</th>
                                            <th className="px-8 py-5">Status</th>
                                            <th className="px-8 py-5">Submission Date</th>
                                            <th className="px-8 py-5 text-center">Avg Rating</th>
                                            <th className="px-8 py-5">Comments</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredStudents.length > 0 ? (
                                            filteredStudents.map((s, i) => (
                                                <tr key={i} onClick={() => setSelectedStudent(s)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                                                    <td className="px-8 py-5">
                                                        <div className="font-bold text-slate-800">{s.name}</div>
                                                        <div className="text-xs text-slate-400 font-mono flex items-center gap-2">
                                                            <span>{s.collegeId}</span>
                                                            {s.email && <span className="text-slate-400">• {s.email}</span>}
                                                        </div>
                                                    </td>
                                                    <td className="px-8 py-5">
                                                        <span className={`px-3 py-1.5 rounded-lg text-[10px] font-bold ${s.feedback?.isSubmitted ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                                                            {s.feedback?.isSubmitted ? 'SUBMITTED' : 'PENDING'}
                                                        </span>
                                                    </td>
                                                    <td className="px-8 py-5 text-xs text-slate-500 font-medium">
                                                        {s.feedback?.submittedAt ? new Date(s.feedback.submittedAt).toLocaleDateString() : '—'}
                                                    </td>
                                                    <td className="px-8 py-5 text-center font-black text-slate-800">
                                                        {s.feedback?.isSubmitted && Array.isArray(s.feedback.answers) 
                                                            ? (s.feedback.answers.reduce((a,b)=>a+b,0)/s.feedback.answers.length).toFixed(1) 
                                                            : '—'}
                                                    </td>
                                                    <td className="px-8 py-5 text-slate-500 text-sm italic truncate max-w-[200px]">
                                                        {s.feedback?.comments || "No comments yet"}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="5" className="py-20 text-center text-slate-400">
                                                    No students found in Hostel {isChief ? hostelId : assignedHostel}.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Analytics & Trends Tab with Time-Range Selector */}
                    {activeTab === 'analytics' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            
                            {/* TIME-RANGE SELECTOR TOOLBAR */}
                            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <Calendar className="text-[#0b1329]" size={20} />
                                    <span className="text-sm font-bold text-slate-800">Analytics Time Window:</span>
                                </div>
                                <div className="flex items-center bg-slate-100 p-1 rounded-xl">
                                    {[
                                        { key: '1m', label: 'Last 1 Month' },
                                        { key: '3m', label: 'Last 3 Months' },
                                        { key: '6m', label: 'Last 6 Months' },
                                        { key: 'all', label: 'All Time' }
                                    ].map(btn => (
                                        <button
                                            key={btn.key}
                                            onClick={() => setTimeRange(btn.key)}
                                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${timeRange === btn.key ? 'bg-[#0b1329] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                                        >
                                            {btn.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Summary Metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                                    <Users className="text-slate-700 mb-4 opacity-70" size={28} />
                                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                                        {isChief ? "Total Hostel Students" : `Hostel ${assignedHostel} Students`}
                                    </h3>
                                    <p className="text-4xl font-bold text-slate-900 mt-2">{totalStudents}</p>
                                </div>
                                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                                    <Star className="text-amber-500 mb-4 opacity-70" size={28} />
                                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                                        Average Quality Rating
                                    </h3>
                                    <p className="text-4xl font-bold text-slate-900 mt-2">{avgHostelRating} <span className="text-sm text-slate-400 font-normal">/ 5.0</span></p>
                                </div>
                                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                                    <BarChart3 className="text-slate-700 mb-4 opacity-70" size={28} />
                                    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">Total Feedbacks Logged</h3>
                                    <p className="text-4xl font-bold text-slate-900 mt-2">{feedbackCount}</p>
                                </div>
                            </div>

                            {/* TIME-SERIES MONTHLY TREND LINE CHART */}
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                            <TrendingUp size={22} className="text-sky-600" /> Monthly Mess Performance Trends
                                        </h3>
                                        <p className="text-xs text-slate-400 mt-1">Average quality ratings progression over selected period</p>
                                    </div>
                                </div>
                                <div className="h-[320px] w-full">
                                    <Line 
                                        data={getMonthlyTrendChartData()} 
                                        options={{ 
                                            responsive: true, 
                                            maintainAspectRatio: false,
                                            scales: { 
                                                y: { beginAtZero: true, max: 5 } 
                                            },
                                            plugins: { 
                                                legend: { position: 'top' } 
                                            }
                                        }} 
                                    />
                                </div>
                            </div>

                            {/* Cross-Hostel Comparison Bar Chart (Chief Warden Only) */}
                            {isChief && (
                                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                                    <h3 className="text-xl font-bold text-slate-900 mb-6">Hostels Comparison (Average Score)</h3>
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
                            )}

                            {/* Category Breakdowns */}
                            <h3 className="text-xl font-bold text-slate-900 mt-10 mb-4 px-2">
                                {isChief ? "Category Breakdowns by Hostel" : `Hostel ${assignedHostel} Category Breakdown`}
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {(isChief ? hostels : [assignedHostel]).map(hId => {
                                    const data = getChartDataForHostel(hId);
                                    const hStudents = allStudents.filter(s => String(s.hostelId).toUpperCase() === String(hId).toUpperCase());
                                    const hSubmitted = hStudents.filter(s => s.feedback?.isSubmitted && Array.isArray(s.feedback?.answers)).length;

                                    return (
                                        <div key={hId} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center">
                                            <h4 className="font-black text-lg text-slate-800 mb-1">Hostel {hId}</h4>
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
            </div>

            {/* Student Feedback Details Modal */}
            {selectedStudent && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-start justify-center pt-8 px-4 overflow-y-auto pb-8">
                    <div className="bg-white w-full max-w-3xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-10 relative">
                        
                        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                            <div className="flex items-center gap-4">
                                <div className="p-4 bg-slate-200 text-slate-800 rounded-2xl shadow-sm"><Users size={28}/></div>
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800">{selectedStudent.name}</h2>
                                    <div className="flex flex-wrap gap-3 mt-1 text-xs font-bold text-slate-400">
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
                                    <Mail size={20} className="text-slate-700" />
                                    <div><p className="text-[10px] font-black text-slate-400 uppercase">Email</p><p className="font-bold text-sm truncate">{selectedStudent.email || 'Not Provided'}</p></div>
                                </div>
                                <div className="flex-1 min-w-[150px] bg-slate-50 p-4 rounded-2xl border flex items-center gap-3">
                                    <Smartphone size={20} className="text-slate-700" />
                                    <div><p className="text-[10px] font-black text-slate-400 uppercase">Mobile</p><p className="font-bold text-sm">{selectedStudent.mobile || 'Not Provided'}</p></div>
                                </div>
                                <div className="flex-1 min-w-[150px] bg-slate-50 p-4 rounded-2xl border flex items-center gap-3">
                                    <Clock size={20} className="text-slate-700" />
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase">Submission Timestamp</p>
                                        <p className="font-bold text-xs">{selectedStudent.feedback?.submittedAt ? new Date(selectedStudent.feedback.submittedAt).toLocaleString() : 'Pending'}</p>
                                    </div>
                                </div>
                            </div>

                            {selectedStudent.feedback?.isSubmitted && Array.isArray(selectedStudent.feedback.answers) ? (
                                <>
                                    <h3 className="text-sm font-black text-slate-800 uppercase mb-4 flex items-center gap-2"><BarChart3 size={16}/> Question Ratings</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
                                        {questionLabels.map((label, idx) => (
                                            <div key={idx} className="bg-slate-50 border rounded-xl p-3 flex flex-col items-center justify-center text-center">
                                                <span className="text-[10px] font-black text-slate-500 uppercase mb-1">{label}</span>
                                                <div className="flex items-center gap-1 font-bold text-lg text-slate-800">
                                                    {selectedStudent.feedback.answers[idx]} <Star size={14} fill="currentColor" className="text-amber-400"/>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 relative">
                                        <MessageSquare size={20} className="absolute top-5 right-5 text-slate-300" />
                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Student Comments</p>
                                        <p className="text-sm text-slate-700 italic leading-relaxed">
                                            "{selectedStudent.feedback.comments || "No additional comments provided by the student."}"
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed">
                                    <Clock size={40} className="mx-auto text-slate-300 mb-3" />
                                    <p className="font-bold text-slate-500">No Feedback Data Available</p>
                                    <p className="text-xs text-slate-400">This student has not submitted feedback for the active cycle.</p>
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
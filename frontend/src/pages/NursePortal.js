import React, { useState } from 'react';
import axios from 'axios';
import { User, KeyRound, Activity, Pill, CheckCircle2, ChevronRight, Fingerprint } from 'lucide-react';

const NursePortal = () => {
  const [step, setStep] = useState(1);
  const [collegeId, setCollegeId] = useState('');
  const [otp, setOtp] = useState('');
  const [studentData, setStudentData] = useState(null);
  
  // HMS Fields
  const [symptoms, setSymptoms] = useState('');
  const [prescribedMedicines, setPrescribedMedicines] = useState('');
  const [remarks, setRemarks] = useState(''); // <-- ADD THIS STATE
  const [loading, setLoading] = useState(false);

  const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000' 
    : 'https://hostelfeedback.onrender.com';

  const handleFetchStudentAndSendOTP = async () => {
    if (!collegeId) return alert("Please enter Student College ID");
    setLoading(true);
    try {
      // Reusing your exact student fetch logic
      const res = await axios.get(`${API_URL}/api/student/${collegeId}`);
      setStudentData(res.data);
      
      // Reusing your exact OTP trigger logic
      await axios.post(`${API_URL}/api/student/send-otp`, { collegeId });
      setStep(2); 
    } catch (err) {
      alert(err.response?.data?.error || "Student not found");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    try {
      const res = await axios.post(`${API_URL}/api/student/verify-otp`, { collegeId, otp });
      if (res.data.success) setStep(3);
    } catch (err) {
      alert("Invalid OTP code provided by student.");
    }
  };

  const handleHospitalSubmit = async () => {
    if (!symptoms || !prescribedMedicines) return alert("Please fill out both diagnosis fields.");
    setLoading(true);
    try {
      // ADD REMARKS TO THE POST REQUEST OBJECT BELOW:
      await axios.post(`${API_URL}/api/hospital/submit-visit`, { 
          collegeId, 
          symptoms, 
          prescribedMedicines, 
          remarks 
      });
      setStep(4);
    } catch (err) {
      alert("Failed to submit medical logs.");
    } finally {
      setLoading(false);
    }
};

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col items-center p-4 font-sans text-slate-800">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-8 mt-10">
        <div className="flex justify-center mb-4 text-emerald-600">
            <Activity size={40} className="animate-pulse" />
        </div>

        {/* STEP 1: Entrance desk check */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">University Health Center</h2>
              <p className="text-slate-400 text-sm mt-1">Nurse Desk: Patient Check-In</p>
            </div>
            <input 
                type="text" placeholder="Enter Patient College ID"
                className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-500 uppercase font-bold"
                onChange={(e) => setCollegeId(e.target.value.toUpperCase())}
            />
            <button onClick={handleFetchStudentAndSendOTP} disabled={loading} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black dynamic-btn flex items-center justify-center gap-2">
              {loading ? "Locating Record..." : "Dispatch Patient Verification"} <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* STEP 2: Ask Student for OTP */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100">
                <div className="flex items-center gap-2 mb-2 text-slate-400"><Fingerprint size={16}/> <span className="text-[10px] font-black uppercase tracking-widest">Profile Snapshot</span></div>
                <p className="font-black text-slate-800">{studentData?.name}</p>
                <p className="text-xs text-slate-400 font-mono mt-0.5">{studentData?.collegeId} • Hostel {studentData?.hostelId}</p>
            </div>
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Ask student for OTP code:</label>
                <input 
                    type="text" placeholder="000000" maxLength={6}
                    className="w-full py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-center text-2xl font-black tracking-widest text-emerald-600"
                    onChange={(e) => setOtp(e.target.value)}
                />
            </div>
            <button onClick={handleVerifyOTP} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black shadow-lg">
              Authorize Medical Intake
            </button>
          </div>
        )}

        {/* STEP 3: Nurse Form Input */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="border-b pb-3">
                <h3 className="font-black text-lg text-slate-900">Intake & Diagnosis</h3>
                <p className="text-xs text-slate-400">Logged for: <span className="font-bold text-slate-600">{studentData?.name}</span></p>
            </div>
            
            <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-black uppercase text-slate-400"><Activity size={14}/> Symptoms / Presenting Illness</label>
                <textarea 
                    placeholder="e.g., High fever since last night, severe headache, body chills..."
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl h-24 outline-none text-sm font-medium"
                    onChange={(e) => setSymptoms(e.target.value)}
                />
            </div>

            <div className="space-y-2">
                <label className="flex items-center gap-2 text-xs font-black uppercase text-slate-400"><Pill size={14}/> Prescribed Treatment / Medicines Given</label>
                <textarea 
                    placeholder="e.g., Paracetamol 650mg TDS x 3 days, ORS pack, complete bed rest."
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl h-24 outline-none text-sm font-medium"
                    onChange={(e) => setPrescribedMedicines(e.target.value)}
                />
            </div>

            {/* --- ADDED REMARKS TEXTAREA --- */}
<div className="space-y-2">
    <label className="flex items-center gap-2 text-xs font-black uppercase text-slate-400">
        Special Remarks / Internal Notes (optional)
    </label>
    <textarea 
        placeholder="e.g., Patient advised to visit again if fever doesn't drop. Allergic to Sulfa drugs."
        className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl h-20 outline-none text-sm font-medium focus:ring-2 focus:ring-emerald-500 transition-all"
        onChange={(e) => setRemarks(e.target.value)}
    />
</div>

            <button onClick={handleHospitalSubmit} disabled={loading} className="w-full bg-emerald-600 text-white py-4 rounded-2xl font-black shadow-xl">
              {loading ? "Saving to Medical Grid..." : "Submit Treatment Log"}
            </button>
          </div>
        )}

        {/* STEP 4: Success Message */}
        {step === 4 && (
          <div className="text-center py-6 space-y-4">
            <CheckCircle2 size={72} className="mx-auto text-emerald-500" />
            <h2 className="text-2xl font-black text-slate-900">Log Saved Securely</h2>
            <p className="text-slate-400 text-sm">Medical history for {studentData?.name} has been synchronized.</p>
            <button onClick={() => window.location.reload()} className="text-emerald-600 font-bold underline text-sm">Process Next Patient</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NursePortal;
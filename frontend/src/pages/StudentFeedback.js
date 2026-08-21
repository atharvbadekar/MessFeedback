import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { 
  User, KeyRound, Star, Send, CheckCircle2, ChevronRight, 
  Fingerprint, Clock, Sparkles, ShieldCheck 
} from 'lucide-react';

const StudentFeedback = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [collegeId, setCollegeId] = useState('');
  const [otp, setOtp] = useState('');
  const [debugOtp, setDebugOtp] = useState('');
  const [studentData, setStudentData] = useState(null);

  // Starts at 0. Students MUST click a star to proceed.
  const [answers, setAnswers] = useState(new Array(10).fill(0));

  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000' 
    : 'https://messfeedbackcuraj.onrender.com';

  const questions = [
    "क्या मेगा मेस में मेन्यु फॉलो किया जा रहा है ? Is the menu being followed at Mega Mess?",
    "मेगा मेस में काउंटर पर खाने की सर्विंग और किचन,डाइनिंग एरिया की साफ़-सफाई कैसी है ? How is the food serving at the counter and the cleanliness of the kitchen and dining area?",
    "मेगा मेस वेंडर के स्टाफ का व्यवहार कैसा है ? How is the behavior of the staff of Mega Mess Vendor?",
    "मेगा मेस में बनने वाली रोटी की गुणवता कैसी है? What is the quality of the aata roti made at Mega Mess?",
    "मेगा मेस में बनने वाली सब्जी की गुणवता कैसी है? What is the quality of vegetables prepared in Mega Mess?",
    "मेगा मेस में बनने वाले चावल की गुणवता कैसी है? What is the quality of rice cooked in Mega Mess?",
    "मेगा मेस में बनने वाले दही रायते की गुणवता कैसी है? What is the quality of curd raita made in Mega Mess?",
    "मेगा मेस में बनने वाली चाय की गुणवता कैसी है? What is the quality of tea made at Mega Mess?",
    "मेगा मेस में बनने वाले सुबह के नाश्ते की गुणवता कैसी है? What is the quality of breakfast prepared in Mega Mess?",
    "दैनिक तौर पर खाने (नाश्ते,दिन के खाने व रात के खाने) की गुणवता कैसी है? What is the daily quality of all meals?"
  ];

  const handleRequestOTP = async () => {
    if (!collegeId.trim()) return alert("Please enter your College ID");
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/student/verify`, { 
        collegeId: collegeId.trim() 
      });
      setStudentData(res.data.student);
      setDebugOtp(res.data.debugOtp);
      setStep(2); 
    } catch (err) {
      alert(err.response?.data?.error || "Student not found or Server error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const cleanOtp = String(otp).trim();
    if (!cleanOtp) return alert("Please enter the 6-digit OTP");
    
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/student/verify-otp`, { 
        collegeId: studentData?.collegeId || collegeId.trim(), 
        otp: cleanOtp 
      });
      if (res.data.success) {
        setStep(3);
      }
    } catch (err) {
      alert(err.response?.data?.error || "Invalid OTP. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (answers.includes(0)) {
      return alert("Please provide a rating (at least 1 star) for all 10 questions before submitting.");
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/api/feedback/submit`, { 
        collegeId: studentData.collegeId, 
        answers, 
        comments 
      });
      setStep(4);
    } catch (err) {
      alert(err.response?.data?.error || "Submission failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const updateRating = (index, val) => {
    const newAnswers = [...answers];
    newAnswers[index] = val;
    setAnswers(newAnswers);
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col font-sans text-slate-800">
      
      {/* =========================================================
          TOP UNIVERSITY BRANDING NAVBAR WITH LOGO, ACCREDITATIONS & STAFF LOGIN
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

            {/* TOP RIGHT: Accreditations & Direct Staff Login Button */}
            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-3 border-r border-emerald-700/50 pr-4">
                <div className="text-right mr-1">
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

              {/* Explicit Staff Login Button */}
              <button 
                onClick={() => navigate('/login')}
                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-[#0F1E1E] px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all active:scale-95"
              >
                <ShieldCheck size={18} /> Staff Login
              </button>
            </div>

          </div>
        </div>
      </nav>

      {/* STUDENT FORM BODY */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-8 my-6">

          {/* Step 1: Login */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="text-2xl font-black text-[#1E3A3A] tracking-tight">Student Mess Feedback</h2>
                <p className="text-slate-500 text-sm mt-1">Enter your University Enrollment ID</p>
              </div>
              <div className="relative">
                <User className="absolute left-4 top-4 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="e.g. 2023MSBC001"
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#1E3A3A] font-semibold"
                  onChange={(e) => setCollegeId(e.target.value.toUpperCase())}
                />
              </div>
              <button 
                onClick={handleRequestOTP} 
                disabled={loading} 
                className="w-full bg-[#1E3A3A] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-900/10 active:scale-95 transition"
              >
                {loading ? "Verifying..." : "Get Started"} <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* Step 2: Identity & OTP */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
              <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                  <Fingerprint className="text-emerald-700" size={18} />
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Verify Profile</span>
                </div>
                <p className="font-bold text-slate-800 text-lg">{studentData?.name}</p>
                <div className="flex justify-between items-center text-xs font-medium text-slate-500">
                  <span>ID: {studentData?.collegeId}</span>
                  <span className="text-emerald-700 font-bold">Hostel {studentData?.hostelId}</span>
                </div>
              </div>

              {/* TESTING BANNER: Displays OTP Directly on Screen */}
              {debugOtp && (
                <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4 text-center space-y-1">
                  <div className="flex items-center justify-center gap-1.5 text-xs font-black uppercase text-amber-800 tracking-wider">
                    <Sparkles size={14} className="text-amber-600" /> Test OTP Code
                  </div>
                  <div className="text-2xl font-black font-mono tracking-[0.25em] text-amber-900">
                    {debugOtp}
                  </div>
                  <p className="text-[11px] text-amber-700/80 font-medium">
                    Use this code to verify (SMS gateway bypassed in test mode)
                  </p>
                </div>
              )}

              <div className="relative">
                <KeyRound className="absolute left-4 top-4 text-slate-400" size={20} />
                <input 
                  type="text" 
                  placeholder="6-Digit OTP" 
                  maxLength={6}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-center text-2xl font-black tracking-[0.2em] focus:ring-2 focus:ring-[#1E3A3A]"
                  onChange={(e) => setOtp(e.target.value)}
                />
              </div>
              <button 
                onClick={handleVerifyOTP} 
                disabled={loading}
                className="w-full bg-[#1E3A3A] text-white py-4 rounded-2xl font-bold shadow-lg shadow-green-900/10 active:scale-95 transition"
              >
                {loading ? "Checking..." : "Verify Account"}
              </button>
              <button 
                onClick={() => setStep(1)} 
                className="w-full text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-rose-500 transition-colors text-center"
              >
                ← Not you? Change ID
              </button>
            </div>
          )}

          {/* Step 3: Feedback Questions */}
          {step === 3 && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
              <div className="border-b pb-4 flex justify-between items-end">
                <div>
                  <h3 className="font-black text-xl text-slate-800">Quality Ratings</h3>
                  <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-1">Select stars for each</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Questions</p>
                  <p className="text-sm font-bold text-slate-400">10 / 10</p>
                </div>
              </div>

              <div className="space-y-12">
                {questions.map((q, i) => (
                  <div key={i} className="space-y-5">
                    <p className="text-sm font-semibold leading-relaxed text-slate-700">
                      <span className="text-emerald-700 font-black mr-2">{i+1}.</span> {q}
                    </p>
                    <div className="flex justify-between px-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          type="button"
                          key={star}
                          onClick={() => updateRating(i, star)}
                          className={`transition-all duration-200 active:scale-150 ${answers[i] >= star ? 'text-amber-500' : 'text-slate-200 hover:text-slate-300'}`}
                        >
                          <Star size={36} fill={answers[i] >= star ? "currentColor" : "none"} strokeWidth={2} />
                        </button>
                      ))}
                    </div>
                    {answers[i] === 0 && (
                      <p className="text-[10px] text-rose-400 font-bold uppercase tracking-tighter text-center italic">Rating Required *</p>
                    )}
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-6 border-t border-slate-50">
                <p className="text-sm font-bold text-slate-800 ml-1">Additional Suggestions (optional)</p>
                <textarea 
                  placeholder="Tell us more about how we can improve..."
                  className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl h-32 outline-none focus:ring-2 focus:ring-[#1E3A3A] text-sm transition-all"
                  onChange={(e) => setComments(e.target.value)}
                />
              </div>

              <button 
                onClick={handleSubmit} 
                disabled={loading}
                className="w-full bg-[#1E3A3A] text-white py-5 rounded-3xl font-black text-lg shadow-2xl shadow-green-900/20 flex items-center justify-center gap-3 active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? "Saving Response..." : <>Submit Assessment <Send size={20} /></>}
              </button>
            </div>
          )}

          {/* Step 4: Success */}
          {step === 4 && (
            <div className="text-center py-10 space-y-6 animate-in zoom-in duration-500">
              <div className="relative inline-block">
                <div className="absolute inset-0 bg-emerald-100 rounded-full blur-2xl opacity-50 scale-150"></div>
                <CheckCircle2 size={100} className="relative text-emerald-500 mx-auto" strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-slate-900 tracking-tight">Success!</h2>
                <p className="text-slate-500 mt-2 font-medium">Your response has been recorded.</p>
              </div>
              <div className="bg-slate-50 p-4 rounded-2xl flex items-center justify-center gap-2 mx-auto w-fit">
                <Clock size={16} className="text-slate-400" />
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Response Logged Securely</span>
              </div>
              <button 
                onClick={() => window.location.reload()} 
                className="block w-full text-[#1E3A3A] font-black text-sm uppercase tracking-widest pt-4"
              >
                Back to Home
              </button>
            </div>
          )}
        </div>

        <footer className="text-center pb-6">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Internal Academic Network • CURAJ</p>
        </footer>
      </div>

    </div>
  );
};

export default StudentFeedback;
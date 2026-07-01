import React, { useState } from 'react';
import axios from 'axios';
import { User, KeyRound, Star, Send, CheckCircle2, ChevronRight, Fingerprint, Clock } from 'lucide-react';

const StudentFeedback = () => {
  const [step, setStep] = useState(1);
  const [collegeId, setCollegeId] = useState('');
  const [otp, setOtp] = useState('');
  const [studentData, setStudentData] = useState(null);
  
  // UPDATED: Starts at 0. Students MUST click a star to proceed.
  const [answers, setAnswers] = useState(new Array(10).fill(0));
  
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);

  const API_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:5000' 
    : 'https://messfeedback.onrender.com';

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
    if (!collegeId) return alert("Please enter your College ID");
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/student/${collegeId}`);
      setStudentData(res.data);
      await axios.post(`${API_URL}/api/student/send-otp`, { collegeId });
      setStep(2); 
    } catch (err) {
      alert(err.response?.data?.error || "Student not found or Server error");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    try {
      const res = await axios.post(`${API_URL}/api/student/verify-otp`, { collegeId, otp });
      if (res.data.success) setStep(3);
    } catch (err) {
      alert("Invalid OTP. Please try again.");
    }
  };

  const handleSubmit = async () => {
    // VALIDATION: Ensure all 10 questions have at least 1 star
    if (answers.includes(0)) {
        return alert("Please provide a rating (at least 1 star) for all 10 questions before submitting.");
    }

    setLoading(true);
    try {
      // The backend will handle the 'submittedAt' timestamp using new Date()
      await axios.post(`${API_URL}/api/student/submit-feedback`, { collegeId, answers, comments });
      setStep(4);
    } catch (err) {
      alert("Submission failed. Please try again.");
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
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center p-4 font-sans text-slate-800">
      {/* Header */}
      <div className="w-full max-w-md flex justify-center py-6">
        <img src="/images/curaj-logo.png" alt="CURAJ" className="h-14 object-contain" />
      </div>

      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-8 mb-8">
        
        {/* Step 1: Login */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-black text-[#1E3A3A] tracking-tight">Mega Mess Feedback</h2>
              <p className="text-slate-500 text-sm mt-1">Official Student Portal</p>
            </div>
            <div className="relative">
                <User className="absolute left-4 top-4 text-slate-400" size={20} />
                <input 
                    type="text" placeholder="College ID (e.g. 2024MSCPY01)"
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#1E3A3A]"
                    onChange={(e) => setCollegeId(e.target.value.toUpperCase())}
                />
            </div>
            <button onClick={handleRequestOTP} disabled={loading} className="w-full bg-[#1E3A3A] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-green-900/10">
              {loading ? "Verifying..." : "Get Started"} <ChevronRight size={18} />
            </button>
          </div>
        )}

        {/* Step 2: Identity & OTP */}
        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <div className="bg-slate-50 rounded-[2rem] p-6 border border-slate-100 space-y-3">
                <div className="flex items-center gap-2 mb-2">
                    <Fingerprint className="text-indigo-600" size={18} />
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Verify Profile</span>
                </div>
                <p className="font-bold text-slate-800 text-lg">{studentData?.name}</p>
                <div className="flex justify-between items-center text-xs font-medium text-slate-500">
                    <span>ID: {studentData?.collegeId}</span>
                    <span className="text-indigo-600">SMS to: XXXXXX{studentData?.mobile?.toString().slice(-4)}</span>
                </div>
            </div>

            <div className="relative">
                <KeyRound className="absolute left-4 top-4 text-slate-400" size={20} />
                <input 
                    type="text" placeholder="6-Digit OTP" maxLength={6}
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-center text-2xl font-black tracking-[0.2em] focus:ring-2 focus:ring-[#1E3A3A]"
                    onChange={(e) => setOtp(e.target.value)}
                />
            </div>
            <button onClick={handleVerifyOTP} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-lg shadow-indigo-100 active:scale-95 transition-transform">
              Verify Account
            </button>
            <button onClick={() => setStep(1)} className="w-full text-slate-400 text-[10px] font-black uppercase tracking-widest hover:text-rose-500 transition-colors text-center">
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
                    <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Questions</p>
                    <p className="text-sm font-bold text-slate-400">10 / 10</p>
                </div>
            </div>

            <div className="space-y-12">
                {questions.map((q, i) => (
                <div key={i} className="space-y-5">
                    <p className="text-sm font-semibold leading-relaxed text-slate-700">
                        <span className="text-indigo-600 font-black mr-2">{i+1}.</span> {q}
                    </p>
                    <div className="flex justify-between px-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                        <button
                        key={star}
                        onClick={() => updateRating(i, star)}
                        className={`transition-all duration-200 active:scale-150 ${answers[i] >= star ? 'text-amber-500' : 'text-slate-100 hover:text-slate-200'}`}
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
                    className="w-full p-5 bg-slate-50 border border-slate-200 rounded-3xl h-32 outline-none focus:ring-2 focus:ring-indigo-500 text-sm transition-all"
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
                className="block w-full text-indigo-600 font-black text-sm uppercase tracking-widest pt-4"
            >
              Back to Home
            </button>
          </div>
        )}
      </div>

      <footer className="mt-4 text-center">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Internal Academic Network • CURAJ</p>
      </footer>
    </div>
  );
};

export default StudentFeedback;
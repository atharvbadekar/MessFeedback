require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const axios = require('axios');

const app = express();

// --- MIDDLEWARE ---
app.use(cors({
    origin: "*", 
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "7MBg44K336q8J1pWCCGjFMYOOikFa6Si8id5eLkIrcC";

// 1. Paste this temporary storage map near the top of your file (outside any routes)
const localOtpStore = new Map();

// --- SCHEMAS ---

// Add this array inside your existing StudentSchema or as a separate model
const medicalVisitSchema = new mongoose.Schema({
    symptoms: { type: String, required: true },
    prescribedMedicines: { type: String, required: true },
    remarks: { type: String, default: "" }, // <-- ADD THIS LINE
    visitedAt: { type: Date, default: Date.now }
});

const StudentSchema = new mongoose.Schema({
    collegeId: { type: String, unique: true, required: true },
    name: String,
    email: String,
    mobile: String,
    hostelId: Number,
    otp: String, 
    // Inside your StudentSchema in server.js
feedback: {
    answers: { type: [Number], default: [] },
    comments: { type: String, default: "" },
    isSubmitted: { type: Boolean, default: false },
    submittedAt: { type: Date } // Add this field
},
// NEW FIELD FOR HOSPITAL DATA
medicalHistory: [medicalVisitSchema]
});
const Student = mongoose.model('Student', StudentSchema);

const WardenSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },
    hostelId: { type: Number, required: true },
    role: { type: String, default: 'warden' }
});
const Warden = mongoose.model('Warden', WardenSchema);

// --- CONNECTION & SEEDING ---
mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log("🚀 Secure Connection to MongoDB Atlas");
        
        // Seed a default Warden/Admin if you want one in the DB
        const adminExists = await Warden.findOne({ username: 'admin' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await Warden.create({
                username: 'admin',
                password: hashedPassword,
                hostelId: 0,
                role: 'chief'
            });
            console.log("✅ Default Admin Created in DB");
        }
    })
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

// --- AUTH MIDDLEWARE ---
const protect = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ message: "Access Denied" });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ message: "Invalid Token" });
    }
};

// --- STAFF ROUTES ---
// Endpoint for Nurse to submit prescription and symptoms
app.post('/api/hospital/submit-visit', async (req, res) => {
    const { collegeId, symptoms, prescribedMedicines } = req.body;
    
    if (!collegeId || !symptoms || !prescribedMedicines) {
        return res.status(400).json({ error: "All fields are required" });
    }

    try {
        const student = await Student.findOneAndUpdate(
            { collegeId: { $regex: new RegExp("^" + collegeId.trim() + "$", "i") } },
            { 
                $push: { 
                    medicalHistory: { 
                        symptoms, 
                        prescribedMedicines, 
                        remarks, // <-- ADD THIS LINE to save it
                        visitedAt: new Date() 
                    } 
                } 
            },
            { new: true }
        );

        if (!student) return res.status(404).json({ error: "Student not found" });
        
        res.json({ success: true, message: "Medical log updated successfully!" });
    } catch (err) {
        res.status(500).json({ error: "Database error" });
    }
});

app.post('/api/login/staff', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Check for hardcoded admin first
        if (username === "admin" && password === "admin123") {
            const token = jwt.sign({ role: 'chief' }, JWT_SECRET, { expiresIn: '24h' });
            return res.json({ token, role: 'chief', name: 'Chief Warden' });
        }

        const warden = await Warden.findOne({ username });
        if (warden) {
            const isMatch = await bcrypt.compare(password, warden.password);
            if (isMatch) {
                const token = jwt.sign(
                    { id: warden._id, role: 'warden', hostelId: warden.hostelId },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );
                return res.json({ token, role: 'warden', hostelId: warden.hostelId });
            }
        }
        res.status(401).json({ message: "Invalid Credentials" });
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

// Used by Warden Dashboard to get all students for their hostel
app.get('/api/admin/students', protect, async (req, res) => {
    try {
        let students;
        if (req.user.role === 'chief') {
            students = await Student.find({});
        } else {
            students = await Student.find({ hostelId: req.user.hostelId });
        }
        res.json(students);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch students" });
    }
});

// CSV Upload Route
app.post('/api/warden/upload', protect, async (req, res) => {
    try {
        const { students, hostelId } = req.body;
        const ops = students.map(s => ({
            updateOne: {
                filter: { collegeId: s.collegeId.trim().toUpperCase() },
                update: { 
                    $set: { 
                        name: s.name, 
                        email: s.email, 
                        mobile: s.mobile,
                        hostelId: hostelId 
                    } 
                },
                upsert: true
            }
        }));
        await Student.bulkWrite(ops);
        res.json({ message: "Upload Successful" });
    } catch (err) {
        res.status(500).json({ error: "Upload Failed" });
    }
});

// --- STUDENT ROUTES ---

app.get('/api/student/:collegeId', async (req, res) => {
    try {
        const idFromUser = req.params.collegeId.trim();
        const student = await Student.findOne({ 
            collegeId: { $regex: new RegExp("^" + idFromUser + "$", "i") } 
        });

        if (!student) return res.status(404).json({ error: "Student not found" });
        res.json(student);
    } catch (err) {
        res.status(500).json({ error: "Server error" });
    }
});

// app.post('/api/student/send-otp', async (req, res) => {
//     try {
//         const { collegeId } = req.body;
//         const student = await Student.findOne({ 
//             collegeId: { $regex: new RegExp("^" + collegeId.trim() + "$", "i") } 
//         });

//         if (!student || !student.mobile) {
//             return res.status(404).json({ error: "Student or mobile number not found" });
//         }

//         const cleanMobile = student.mobile.toString().replace(/\D/g, '').slice(-10);
//         const otp = Math.floor(100000 + Math.random() * 900000).toString();
//         student.otp = otp;
//         await student.save();

//         const params = new URLSearchParams({
//             authorization: process.env.FAST2SMS_API_KEY,
//             route: 'q',
//             message: `Your CURAJ OTP is ${otp}`,
//             language: 'english',
//             flash: '0',
//             numbers: cleanMobile
//         });

//         const response = await axios.get(`https://www.fast2sms.com/dev/bulkV2?${params.toString()}`);

//         if (response.data.return) {
//             console.log(`✅ Success! OTP ${otp} sent to ${cleanMobile}`);
//             res.json({ message: "OTP sent successfully!" });
//         } else {
//             res.status(400).json({ error: response.data.message });
//         }
//     } catch (err) {
//         res.status(500).json({ error: "SMS Gateway Failed" });
//     }
// });

// app.post('/api/student/verify-otp', async (req, res) => {
//     const { collegeId, otp } = req.body;
//     const student = await Student.findOne({ 
//         collegeId: { $regex: new RegExp("^" + collegeId.trim() + "$", "i") }, 
//         otp 
//     });

//     if (student) {
//         student.otp = null; 
//         await student.save();
//         res.json({ success: true });
//     } else {
//         res.status(401).json({ success: false, message: "Invalid OTP" });
//     }
// });




// 2. REPLACEMENT FOR: Send OTP Route
app.post('/api/student/send-otp', async (req, res) => {
    const { collegeId } = req.body;

    if (!collegeId) {
        return res.status(400).json({ error: "College ID is required" });
    }

    try {
        // Generate a random 6-digit code
        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

        // Save it temporarily in our local map using the student's ID as the key
        localOtpStore.set(collegeId.toUpperCase(), generatedOtp);

        // --- THE LOCAL TERMINAL PRINT TRICK ---
        console.log("\n==============================================");
        console.log(`📡 [LOCAL TESTING MODE] OTP requested for: ${collegeId.toUpperCase()}`);
        console.log(`🔑 USE THIS CODE TO LOG IN: ${generatedOtp}`);
        console.log("==============================================\n");

        /* 
        COMMENT OUT YOUR ACTUAL SMS CODE HERE SO IT DOES NOT RUN:
        await axios.post('YOUR_SMS_GATEWAY_URL', { ... });
        */

        // Return a quick success response to move your frontend to Step 2
        res.json({ 
            success: true, 
            message: "Local testing OTP generated successfully." 
        });

    } catch (err) {
        console.error("OTP Error:", err);
        res.status(500).json({ error: "Server failed to generate OTP" });
    }
});

// 3. REPLACEMENT FOR: Verify OTP Route
app.post('/api/student/verify-otp', async (req, res) => {
    const { collegeId, otp } = req.body;

    if (!collegeId || !otp) {
        return res.status(400).json({ error: "Missing identity credentials or OTP code" });
    }

    // Retrieve the active code we saved in our map
    const correctOtp = localOtpStore.get(collegeId.toUpperCase());

    // Check if what the user typed matches our terminal generated code
    if (correctOtp && correctOtp === otp.trim()) {
        // Clear the code so it cannot be used a second time
        localOtpStore.delete(collegeId.toUpperCase()); 
        
        return res.json({ success: true, message: "Identity authorized successfully!" });
    } else {
        return res.status(400).json({ error: "Invalid OTP code. Please try again." });
    }
});






app.post('/api/student/submit-feedback', async (req, res) => {
    try {
        const { collegeId, answers, comments } = req.body;
        await Student.findOneAndUpdate(
            { collegeId: { $regex: new RegExp("^" + collegeId.trim() + "$", "i") } },
            { feedback: { answers, comments, isSubmitted: true, submittedAt: new Date() } }
        );
        res.json({ message: "Success" });
    } catch (err) { 
        res.status(500).json({ error: "Failed to submit" }); 
    }
});

// --- START SERVER ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`✅ Server running on port ${PORT}`);
});

// Add this near the bottom of server.js
app.get('/', (req, res) => {
    res.send('🚀 CURAJ Hostel Feedback API is Running...');
});
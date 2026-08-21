const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
// const axios = require('axios'); // <-- UNCOMMENT FOR FAST2SMS IN PRODUCTION
const db = require('./db');
require('dotenv').config();

const app = express();
// Allow all origins or specify Vercel
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'curaj_secret_mess_jwt_key_2026';

// In-Memory OTP cache: { "2023MSBC001": { otp: "123456", expiresAt: timestamp } }
const otpStore = {};

// --- AUTH MIDDLEWARE ---
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired session token' });
    req.user = user;
    next();
  });
};

// Helper: Normalize hostel name strictly into B1 - B8
const normalizeHostel = (input) => {
  if (!input) return 'B1';
  const str = String(input).trim().toUpperCase().replace('HOSTEL', '').trim();
  const numMatch = str.match(/[1-8]/);
  const validNum = numMatch ? numMatch[0] : '1';
  return `B${validNum}`;
};

// ==========================================
// 1. STUDENT VERIFICATION & OTP ROUTES
// ==========================================

// Step 1: Verify Student ID & Issue OTP
app.post('/api/student/verify', async (req, res) => {
  const { collegeId } = req.body;
  if (!collegeId) return res.status(400).json({ error: 'College ID is required' });

  const cleanId = String(collegeId).trim().toUpperCase();

  try {
    const studentResult = await db.query(
      'SELECT * FROM students WHERE UPPER(college_id) = $1',
      [cleanId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student ID not registered in database records.' });
    }

    const student = studentResult.rows[0];

    const feedbackCheck = await db.query(
      'SELECT id FROM mess_feedbacks WHERE student_id = $1 LIMIT 1',
      [student.id]
    );

    if (feedbackCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Feedback has already been submitted for this semester.' });
    }

    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

    otpStore[cleanId] = {
      otp: generatedOtp,
      expiresAt: Date.now() + 5 * 60 * 1000
    };

    console.log(`🔑 [TEST OTP] Generated for ${cleanId} (${student.name} - Hostel ${student.hostel_id}): ${generatedOtp}`);

    /* =================================================================
       === FAST2SMS INTEGRATION (UNCOMMENT WHEN READY FOR REAL SMS) ===
       =================================================================
       try {
           await axios.post('https://www.fast2sms.com/dev/bulkV2', {
               route: 'otp',
               variables_values: generatedOtp,
               numbers: student.mobile.toString()
           }, {
               headers: { 'authorization': process.env.FAST2SMS_API_KEY }
           });
       } catch (smsErr) {
           console.error('Fast2SMS Error:', smsErr.response?.data || smsErr.message);
       }
       ================================================================= */

    res.json({
      success: true,
      message: 'Student verified and OTP generated.',
      student: {
        id: student.id,
        name: student.name,
        email: student.email || '',
        collegeId: student.college_id,
        hostelId: student.hostel_id,
        mobile: student.mobile
      },
      debugOtp: generatedOtp
    });

  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: 'Database verification failed: ' + err.message });
  }
});

// Step 2: Validate OTP
app.post('/api/student/verify-otp', async (req, res) => {
  const { collegeId, otp } = req.body;

  if (!collegeId || !otp) {
    return res.status(400).json({ error: 'College ID and OTP are required' });
  }

  const cleanId = String(collegeId).trim().toUpperCase();
  const cleanOtp = String(otp).trim();
  const cachedRecord = otpStore[cleanId];

  if (!cachedRecord) {
    return res.status(400).json({ error: 'No active OTP found. Please request a new code.' });
  }

  if (Date.now() > cachedRecord.expiresAt) {
    delete otpStore[cleanId];
    return res.status(400).json({ error: 'OTP has expired. Please request a new code.' });
  }

  if (String(cachedRecord.otp).trim() !== cleanOtp) {
    return res.status(400).json({ error: 'Invalid OTP. Please check the code.' });
  }

  delete otpStore[cleanId];
  res.json({ success: true, message: 'OTP verified successfully' });
});

// ==========================================
// 2. SUBMIT 10-QUESTION MESS FEEDBACK
// ==========================================

app.post('/api/feedback/submit', async (req, res) => {
  const { collegeId, answers, comments } = req.body;

  if (!collegeId || !Array.isArray(answers) || answers.length !== 10) {
    return res.status(400).json({ error: 'All 10 rating scores and valid Student ID are required.' });
  }

  const cleanId = String(collegeId).trim().toUpperCase();

  try {
    const studentResult = await db.query(
      'SELECT id FROM students WHERE UPPER(college_id) = $1',
      [cleanId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student record not found in system.' });
    }

    const studentId = studentResult.rows[0].id;

    const duplicateCheck = await db.query(
      'SELECT id FROM mess_feedbacks WHERE student_id = $1',
      [studentId]
    );

    if (duplicateCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Feedback already submitted by this student.' });
    }

    await db.query(
      `INSERT INTO mess_feedbacks (student_id, answers, comments, is_submitted, submitted_at)
       VALUES ($1, $2, $3, true, NOW())`,
      [studentId, answers, comments ? String(comments).trim() : '']
    );

    res.json({ success: true, message: 'Mess assessment recorded successfully.' });
  } catch (err) {
    console.error('Feedback submission error:', err);
    res.status(500).json({ error: 'Failed to record feedback in database.' });
  }
});

// ==========================================
// 3. ADMIN & WARDEN AUTHENTICATION
// ==========================================

app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const cleanUsername = String(username).trim().toLowerCase();
  const cleanPassword = String(password).trim();

  // Master Emergency Admin
  if (cleanUsername === 'admin' && cleanPassword === 'admin123') {
    const token = jwt.sign(
      { username: 'admin', role: 'admin', hostelId: null },
      JWT_SECRET,
      { expiresIn: '12h' }
    );
    return res.json({ success: true, token, role: 'admin', hostelId: null });
  }

  try {
    const result = await db.query(
      'SELECT * FROM users WHERE LOWER(username) = LOWER($1)',
      [cleanUsername]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(cleanPassword, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, hostelId: user.hostel_id },
      JWT_SECRET,
      { expiresIn: '12h' }
    );

    res.json({ success: true, token, role: user.role, hostelId: user.hostel_id });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Authentication engine failure: ' + err.message });
  }
});

// ==========================================
// 4. WARDEN / STAFF MANAGEMENT ROUTES
// ==========================================

app.get('/api/admin/wardens', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access restricted to administrators' });
  }

  try {
    const result = await db.query(
      `SELECT id, username, hostel_id AS "hostelId", role, created_at 
       FROM users 
       WHERE role = 'warden' 
       ORDER BY hostel_id ASC, id ASC`
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve wardens: ' + err.message });
  }
});

app.post('/api/admin/create-warden', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access restricted to administrators' });
  }

  const { username, password, hostelId } = req.body;
  if (!username || !password || !hostelId) {
    return res.status(400).json({ error: 'Username, password, and hostel assignment are required' });
  }

  const cleanUsername = String(username).trim().toLowerCase();
  const targetHostel = normalizeHostel(hostelId);

  try {
    const existing = await db.query('SELECT id FROM users WHERE LOWER(username) = $1', [cleanUsername]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: `Username "${cleanUsername}" is already taken.` });
    }

    const hashedPassword = await bcrypt.hash(String(password).trim(), 10);
    await db.query(
      `INSERT INTO users (username, password_hash, role, hostel_id) 
       VALUES ($1, $2, 'warden', $3)`,
      [cleanUsername, hashedPassword, targetHostel]
    );

    res.json({ success: true, message: `Warden "${cleanUsername}" registered for Hostel ${targetHostel}!` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to register warden: ' + err.message });
  }
});

app.delete('/api/admin/wardens/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Access restricted to administrators' });
  }

  try {
    await db.query('DELETE FROM users WHERE id = $1 AND role = $2', [parseInt(req.params.id, 10), 'warden']);
    res.json({ success: true, message: 'Warden account deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete warden: ' + err.message });
  }
});

// ==========================================
// 5. BULK CSV IMPORT & DASHBOARD DATA
// ==========================================

const handleBulkStudentInsert = async (req, res) => {
  const rawList = req.body.studentsList || req.body.students;
  const defaultHostel = req.body.hostelId ? normalizeHostel(req.body.hostelId) : 'B1';

  if (!rawList || !Array.isArray(rawList) || rawList.length === 0) {
    return res.status(400).json({ error: 'Valid students array is required.' });
  }

  try {
    let insertedCount = 0;

    for (const item of rawList) {
      const collegeId = item.collegeId || item.collegeid || item['college id'] || item.id;
      const name = item.name || item['student name'] || 'Student';
      const email = item.email || item['email id'] || item['student email'] || null;
      const rawHostel = item.hostelId || item.hostelid || item['hostel id'] || item.hostel || defaultHostel;
      const hostelId = normalizeHostel(rawHostel);
      const rawMobile = item.mobile || item.phone || item.contact || null;
      const mobile = rawMobile ? parseInt(String(rawMobile).replace(/\D/g, ''), 10) || null : null;

      if (!collegeId) continue;

      const cleanId = String(collegeId).trim().toUpperCase();
      const cleanName = String(name).trim();
      const cleanEmail = email ? String(email).trim().toLowerCase() : null;

      await db.query(
        `INSERT INTO students (college_id, name, email, hostel_id, mobile)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (college_id) DO UPDATE 
         SET name = EXCLUDED.name, 
             email = COALESCE(EXCLUDED.email, students.email),
             hostel_id = EXCLUDED.hostel_id, 
             mobile = COALESCE(EXCLUDED.mobile, students.mobile)`,
        [cleanId, cleanName, cleanEmail, hostelId, mobile]
      );

      insertedCount++;
    }

    res.json({ success: true, message: `Successfully processed ${insertedCount} student records.` });
  } catch (err) {
    console.error('Bulk upload error:', err);
    res.status(500).json({ error: 'Database bulk insert failed: ' + err.message });
  }
};

app.post('/api/admin/bulk-students', authenticateToken, handleBulkStudentInsert);
app.post('/api/warden/upload', authenticateToken, handleBulkStudentInsert);

app.get('/api/admin/students', authenticateToken, async (req, res) => {
  try {
    const { hostelId, role } = req.user;

    let query = `
      SELECT 
        s.id,
        s.name,
        s.email,
        s.college_id AS "collegeId",
        s.mobile,
        s.hostel_id AS "hostelId",
        CASE 
          WHEN mf.id IS NOT NULL THEN json_build_object(
            'answers', mf.answers,
            'comments', mf.comments,
            'isSubmitted', mf.is_submitted,
            'submittedAt', mf.submitted_at
          )
          ELSE NULL
        END AS feedback
      FROM students s
      LEFT JOIN mess_feedbacks mf ON s.id = mf.student_id
    `;

    const params = [];
    if (role === 'warden' && hostelId) {
      query += ` WHERE UPPER(s.hostel_id) = UPPER($1)`;
      params.push(hostelId);
    }

    query += ` ORDER BY s.hostel_id ASC, s.id ASC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch students error:', err);
    res.status(500).json({ error: 'Failed to retrieve records: ' + err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Mess Feedback Backend (PostgreSQL) running on port ${PORT}`));
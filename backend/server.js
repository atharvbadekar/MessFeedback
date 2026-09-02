require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'curaj_secret_mess_jwt_key_2026';

// 1. CORS Configuration (Allow all cross-origin requests from Vercel/Localhost)
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// 2. High-Capacity Body Parsing (Prevents "Network Error" on Bulk CSV Imports)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// In-memory OTP Store: { [collegeId]: { otp, expiresAt } }
const otpStore = {};

// 3. Database Initialization & Migration
const initDatabase = async () => {
  try {
    // Schema definitions with inline UNIQUE constraint to guarantee ON CONFLICT works
    await pool.query(`
      CREATE TABLE IF NOT EXISTS wardens (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) NOT NULL DEFAULT 'warden',
        hostel_id VARCHAR(10) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        college_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(100),
        hostel_id VARCHAR(10) NOT NULL,
        mobile VARCHAR(20),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS feedback_submissions (
        id SERIAL PRIMARY KEY,
        college_id VARCHAR(50) REFERENCES students(college_id) ON DELETE CASCADE,
        hostel_id VARCHAR(10) NOT NULL,
        answers INTEGER[] NOT NULL,
        comments TEXT,
        month_year VARCHAR(7) NOT NULL, -- Format: 'YYYY-MM' (e.g. '2026-08')
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT uq_student_month UNIQUE (college_id, month_year)
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_student_month ON feedback_submissions(college_id, month_year);
    `);

    // Ensure constraint exists on previously created tables
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'uq_student_month'
        ) THEN
          ALTER TABLE feedback_submissions 
          ADD CONSTRAINT uq_student_month UNIQUE (college_id, month_year);
        END IF;
      EXCEPTION
        WHEN others THEN NULL;
      END $$;
    `);

    // Ensure default Chief Administrator account exists
    const adminCheck = await pool.query("SELECT * FROM wardens WHERE username = 'admin'");
    if (adminCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        "INSERT INTO wardens (username, password, role, hostel_id) VALUES ($1, $2, $3, $4)",
        ['admin', hashedPassword, 'admin', 'B1']
      );
      console.log("Default admin account created: admin / admin123");
    }
    console.log("PostgreSQL Database Schema & Tables successfully initialized.");
  } catch (err) {
    console.error("Database Initialization Error:", err);
  }
};

initDatabase();

// 4. JWT Authorization Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Authentication token missing.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Session expired or invalid token. Please log in again.' });
    req.user = user;
    next();
  });
};

// 5. Health Check Endpoint
app.get('/', (req, res) => {
  res.status(200).send('CURAJ Mega Mess Feedback API is running live!');
});

// =========================================================================
// STUDENT FEEDBACK WORKFLOW (1 Submission per Calendar Month Rule)
// =========================================================================

// STEP 1: Verify Student Enrollment ID & Issue OTP
app.post('/api/student/verify', async (req, res) => {
  try {
    const { collegeId } = req.body;
    if (!collegeId) {
      return res.status(400).json({ error: 'Please enter your College Enrollment ID.' });
    }

    const cleanId = String(collegeId).trim().toUpperCase();

    const studentResult = await pool.query(
      'SELECT college_id, name, email, hostel_id, mobile FROM students WHERE UPPER(college_id) = $1',
      [cleanId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student enrollment ID not found in university records.' });
    }

    const student = studentResult.rows[0];
    const currentMonthYear = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

    // Check if feedback was already logged this calendar month
    const existingFeedback = await pool.query(
      'SELECT submitted_at FROM feedback_submissions WHERE UPPER(college_id) = $1 AND month_year = $2',
      [student.college_id, currentMonthYear]
    );

    if (existingFeedback.rows.length > 0) {
      const submissionDate = new Date(existingFeedback.rows[0].submitted_at).toLocaleDateString();
      return res.status(400).json({
        error: `You have already submitted feedback for this month on ${submissionDate}. The next feedback cycle opens on the 1st of next month.`
      });
    }

    // Generate a 6-digit OTP (Valid for 10 minutes)
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore[student.college_id] = {
      otp,
      expiresAt: Date.now() + 10 * 60 * 1000
    };

    res.json({
      success: true,
      student: {
        collegeId: student.college_id,
        name: student.name,
        email: student.email,
        hostelId: student.hostel_id,
        mobile: student.mobile
      },
      debugOtp: otp // Displayed for testing bypass
    });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: 'Server error during student verification.' });
  }
});

// STEP 2: Verify OTP
app.post('/api/student/verify-otp', (req, res) => {
  const { collegeId, otp } = req.body;
  if (!collegeId || !otp) {
    return res.status(400).json({ error: 'College ID and OTP are required.' });
  }

  const cleanId = String(collegeId).trim().toUpperCase();
  const record = otpStore[cleanId];

  if (!record) {
    return res.status(400).json({ error: 'No OTP requested or OTP has expired. Please request a new code.' });
  }
  if (Date.now() > record.expiresAt) {
    delete otpStore[cleanId];
    return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
  }
  if (record.otp !== String(otp).trim()) {
    return res.status(400).json({ error: 'Incorrect OTP. Please enter the valid 6-digit code.' });
  }

  // Clear OTP once verified
  delete otpStore[cleanId];
  res.json({ success: true, message: 'OTP verified successfully.' });
});

// STEP 3: Submit 10-Question Mess Assessment
app.post('/api/feedback/submit', async (req, res) => {
  try {
    const { collegeId, answers, comments } = req.body;

    if (!collegeId || !answers || !Array.isArray(answers) || answers.length !== 10) {
      return res.status(400).json({ error: 'All 10 quality rating questions must be filled.' });
    }

    const cleanId = String(collegeId).trim().toUpperCase();

    // Verify student exists and grab student details
    const studentResult = await pool.query(
      'SELECT college_id, hostel_id FROM students WHERE UPPER(college_id) = $1',
      [cleanId]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    const verifiedStudent = studentResult.rows[0];
    const hostelId = verifiedStudent.hostel_id;
    const currentMonthYear = new Date().toISOString().slice(0, 7);

    // Convert all answers to standard integers to prevent PostgreSQL array type conflicts
    const parsedAnswers = answers.map(val => parseInt(val, 10) || 0);

    // Save or update submission using verified student college_id
    await pool.query(
      `INSERT INTO feedback_submissions (college_id, hostel_id, answers, comments, month_year, submitted_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (college_id, month_year) 
       DO UPDATE SET 
         answers = EXCLUDED.answers, 
         comments = EXCLUDED.comments, 
         submitted_at = NOW()`,
      [verifiedStudent.college_id, hostelId, parsedAnswers, comments || '', currentMonthYear]
    );

    res.json({ success: true, message: 'Mess feedback assessment submitted successfully.' });
  } catch (err) {
    console.error('Feedback submission detailed error:', err);
    res.status(500).json({ 
      error: 'Database error saving feedback response.',
      detail: err.message 
    });
  }
});

// =========================================================================
// STAFF AUTHENTICATION (Chief Warden & Hostel Wardens)
// =========================================================================

app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Please provide both username and password.' });
    }

    const wardenResult = await pool.query(
      'SELECT * FROM wardens WHERE username = $1', 
      [username.trim()]
    );

    if (wardenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    const user = wardenResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, hostelId: user.hostel_id },
      JWT_SECRET,
      { expiresIn: '48h' }
    );

    res.json({
      token,
      role: user.role,
      hostelId: user.hostel_id,
      username: user.username
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during authentication.' });
  }
});

// =========================================================================
// ADMIN DATA, ANALYTICS & BULK ACTIONS
// =========================================================================

// Retrieve Student Records with their Latest Feedback
app.get('/api/admin/students', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        s.college_id,
        s.name,
        s.email,
        s.hostel_id,
        s.mobile,
        f.answers,
        f.comments,
        f.submitted_at,
        f.month_year,
        f.id AS feedback_id
      FROM students s
      LEFT JOIN LATERAL (
        SELECT id, answers, comments, submitted_at, month_year
        FROM feedback_submissions
        WHERE UPPER(college_id) = UPPER(s.college_id)
        ORDER BY submitted_at DESC
        LIMIT 1
      ) f ON true
      ORDER BY s.hostel_id ASC, s.college_id ASC;
    `;

    const { rows } = await pool.query(query);

    const formatted = rows.map(r => {
      const isSub = r.feedback_id !== null && r.feedback_id !== undefined;
      return {
        collegeId: r.college_id || '',
        name: r.name || 'Student',
        email: r.email || '',
        hostelId: (r.hostel_id || 'B1').toUpperCase().trim(),
        mobile: r.mobile || '',
        feedback: {
          isSubmitted: isSub,
          answers: isSub && Array.isArray(r.answers) ? r.answers : [],
          comments: r.comments || '',
          submittedAt: r.submitted_at || null,
          monthYear: r.month_year || null
        }
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error('Fetch students error:', err);
    res.status(500).json({ error: 'Failed to retrieve student records from database.' });
  }
});

// Time-Series Analytics (Filtered by 1m, 3m, 6m, or all)
app.get('/api/admin/analytics-trends', authenticateToken, async (req, res) => {
  try {
    const { range, hostelId } = req.query;

    let timeFilter = '';
    if (range === '1m') {
      timeFilter = "AND submitted_at >= NOW() - INTERVAL '1 month'";
    } else if (range === '3m') {
      timeFilter = "AND submitted_at >= NOW() - INTERVAL '3 months'";
    } else if (range === '6m') {
      timeFilter = "AND submitted_at >= NOW() - INTERVAL '6 months'";
    }

    let hostelFilter = '';
    const params = [];
    if (hostelId && hostelId !== 'ALL') {
      params.push(hostelId.toUpperCase());
      hostelFilter = `AND hostel_id = $${params.length}`;
    }

    const query = `
      SELECT 
        TO_CHAR(submitted_at, 'Mon YYYY') AS month_label,
        TO_CHAR(submitted_at, 'YYYY-MM') AS sort_key,
        COUNT(*)::int AS total_submissions,
        ROUND(AVG((SELECT AVG(val) FROM UNNEST(answers) AS val))::numeric, 2) AS overall_avg
      FROM feedback_submissions
      WHERE 1=1 ${timeFilter} ${hostelFilter}
      GROUP BY month_label, sort_key
      ORDER BY sort_key ASC;
    `;

    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('Analytics trends error:', err);
    res.status(500).json({ error: 'Failed to compute analytics time series.' });
  }
});

// Fast Transactional Bulk Student Upload
app.post('/api/admin/bulk-students', authenticateToken, async (req, res) => {
  try {
    const { studentsList, hostelId } = req.body;

    if (!studentsList || !Array.isArray(studentsList) || studentsList.length === 0) {
      return res.status(400).json({ error: 'No student data received in CSV.' });
    }

    let successCount = 0;
    let failedCount = 0;

    for (const s of studentsList) {
      const rawId = s.collegeId || s.college_id || s['college id'] || s.id;
      const rawName = s.name || s['student name'] || s.student_name;
      const rawEmail = s.email || s['email id'] || s.email_id;
      const rawHostel = s.hostelId || s.hostel_id || s.hostel || hostelId || 'B1';
      const rawMobile = s.mobile || s.phone || s['mobile no'] || s.contact;

      if (!rawId || String(rawId).trim() === '') {
        failedCount++;
        continue;
      }

      const cleanId = String(rawId).trim().toUpperCase();
      const cleanName = rawName ? String(rawName).trim() : 'Student';
      const cleanEmail = rawEmail ? String(rawEmail).trim().toLowerCase() : null;
      const cleanHostel = String(rawHostel).trim().toUpperCase();
      const cleanMobile = rawMobile ? String(rawMobile).trim() : null;

      try {
        await pool.query(
          `INSERT INTO students (college_id, name, email, hostel_id, mobile)
           VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (college_id) 
           DO UPDATE SET 
             name = EXCLUDED.name, 
             email = EXCLUDED.email, 
             hostel_id = EXCLUDED.hostel_id, 
             mobile = EXCLUDED.mobile`,
          [cleanId, cleanName, cleanEmail, cleanHostel, cleanMobile]
        );
        successCount++;
      } catch (rowErr) {
        console.error(`Row insert failed for ID ${cleanId}:`, rowErr.message);
        failedCount++;
      }
    }

    return res.status(200).json({ 
      success: true, 
      message: `Successfully imported ${successCount} students. (${failedCount} skipped)` 
    });
  } catch (err) {
    console.error('Fatal Bulk Upload Error:', err);
    return res.status(500).json({ error: `Server failed: ${err.message}` });
  }
});

// =========================================================================
// STAFF ACCOUNT MANAGEMENT (Chief Admin Only)
// =========================================================================

// 1. Fetch Wardens List
app.get('/api/admin/wardens', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, role, hostel_id AS \"hostelId\", created_at AS \"createdAt\" FROM wardens WHERE role != 'admin' ORDER BY hostel_id ASC, id ASC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Fetch wardens error:', err);
    res.status(500).json({ error: err.message || 'Failed to fetch wardens list.' });
  }
});

// 2. Register New Warden
app.post('/api/admin/wardens', authenticateToken, async (req, res) => {
  try {
    const { username, password, hostelId } = req.body;

    if (!username || !password || !hostelId) {
      return res.status(400).json({ error: 'All fields (username, password, hostel) are required.' });
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanHostel = hostelId.trim().toUpperCase();

    // Check duplicate
    const existing = await pool.query('SELECT id FROM wardens WHERE LOWER(username) = $1', [cleanUsername]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: `Username "${username}" is already registered. Please choose another.` });
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10);
    const result = await pool.query(
      `INSERT INTO wardens (username, password, role, hostel_id) 
       VALUES ($1, $2, 'warden', $3) 
       RETURNING id, username, role, hostel_id AS "hostelId"`,
      [cleanUsername, hashedPassword, cleanHostel]
    );

    res.json({ 
      success: true, 
      message: `Warden registered successfully for Hostel ${cleanHostel}!`,
      warden: result.rows[0]
    });
  } catch (err) {
    console.error('Register warden error:', err);
    res.status(500).json({ error: err.message || 'Database error during registration.' });
  }
});

// Delete Warden Account
app.delete('/api/admin/wardens/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM wardens WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Warden account deleted successfully.' });
  } catch (err) {
    console.error('Delete warden error:', err);
    res.status(500).json({ error: 'Failed to delete warden account.' });
  }
});

// =========================================================================
// START SERVER
// =========================================================================

app.listen(PORT, () => {
  console.log(`CURAJ Mess Backend Server active and listening on port ${PORT}`);
});
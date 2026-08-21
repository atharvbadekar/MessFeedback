require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('./db');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'curaj_secret_mess_jwt_key_2026';

// CORS Configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// In-memory OTP store: { [collegeId]: { otp, expiresAt } }
const otpStore = {};

// Initialize Schema with historical feedback submissions table
const initDatabase = async () => {
  try {
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
        month_year VARCHAR(7) NOT NULL, -- e.g. '2026-08'
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS idx_student_month ON feedback_submissions(college_id, month_year);
    `);

    // Ensure default chief admin exists
    const adminCheck = await pool.query("SELECT * FROM wardens WHERE username = 'admin'");
    if (adminCheck.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await pool.query(
        "INSERT INTO wardens (username, password, role, hostel_id) VALUES ($1, $2, $3, $4)",
        ['admin', hashedPassword, 'admin', 'B1']
      );
    }
  } catch (err) {
    console.error('Database Init Error:', err);
  }
};

initDatabase();

// JWT Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token missing' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Root Health Check
app.get('/', (req, res) => {
  res.send('CURAJ Mega Mess Feedback API is running live!');
});

// ==========================================
// STUDENT FLOW (1 Feedback / Month Limit)
// ==========================================

// 1. Verify Student & Request OTP
app.post('/api/student/verify', async (req, res) => {
  try {
    const { collegeId } = req.body;
    if (!collegeId) return res.status(400).json({ error: 'College ID is required' });

    const studentResult = await pool.query(
      'SELECT college_id, name, email, hostel_id, mobile FROM students WHERE college_id = $1',
      [collegeId.trim()]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student enrollment ID not found in records.' });
    }

    const student = studentResult.rows[0];
    const currentMonthYear = new Date().toISOString().slice(0, 7); // 'YYYY-MM'

    // Check if student already submitted feedback for the current month
    const existingFeedback = await pool.query(
      'SELECT submitted_at FROM feedback_submissions WHERE college_id = $1 AND month_year = $2',
      [student.college_id, currentMonthYear]
    );

    if (existingFeedback.rows.length > 0) {
      const submissionDate = new Date(existingFeedback.rows[0].submitted_at).toLocaleDateString();
      return res.status(400).json({
        error: `You have already submitted feedback for this month on ${submissionDate}. The next feedback window opens on the 1st of next month.`
      });
    }

    // Generate 6-digit OTP (expires in 10 mins)
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
      debugOtp: otp // Displayed on screen for instant testing
    });
  } catch (err) {
    console.error('Verify error:', err);
    res.status(500).json({ error: 'Server error during verification.' });
  }
});

// 2. Verify OTP
app.post('/api/student/verify-otp', (req, res) => {
  const { collegeId, otp } = req.body;
  const record = otpStore[collegeId];

  if (!record) return res.status(400).json({ error: 'No OTP requested or OTP has expired.' });
  if (Date.now() > record.expiresAt) {
    delete otpStore[collegeId];
    return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
  }
  if (record.otp !== String(otp).trim()) {
    return res.status(400).json({ error: 'Incorrect OTP. Please enter the valid code.' });
  }

  delete otpStore[collegeId];
  res.json({ success: true, message: 'OTP verified successfully.' });
});

// 3. Submit Feedback (Permanent Time-Stamped Record)
app.post('/api/feedback/submit', async (req, res) => {
  try {
    const { collegeId, answers, comments } = req.body;
    if (!collegeId || !answers || !Array.isArray(answers) || answers.length !== 10) {
      return res.status(400).json({ error: 'All 10 quality questions must be rated.' });
    }

    const studentResult = await pool.query(
      'SELECT hostel_id FROM students WHERE college_id = $1',
      [collegeId.trim()]
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const hostelId = studentResult.rows[0].hostel_id;
    const currentMonthYear = new Date().toISOString().slice(0, 7);

    // Insert new historical submission
    await pool.query(
      `INSERT INTO feedback_submissions (college_id, hostel_id, answers, comments, month_year, submitted_at)
       VALUES ($1, $2, $3, $4, $5, NOW())
       ON CONFLICT (college_id, month_year) 
       DO UPDATE SET answers = EXCLUDED.answers, comments = EXCLUDED.comments, submitted_at = NOW()`,
      [collegeId.trim(), hostelId, answers, comments || '', currentMonthYear]
    );

    res.json({ success: true, message: 'Monthly mess assessment submitted successfully!' });
  } catch (err) {
    console.error('Feedback submission error:', err);
    res.status(500).json({ error: 'Database error saving assessment.' });
  }
});

// ==========================================
// ADMIN & WARDEN AUTHENTICATION
// ==========================================

app.post('/api/admin/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const wardenResult = await pool.query('SELECT * FROM wardens WHERE username = $1', [username.trim()]);
    if (wardenResult.rows.length === 0) {
      return res.status(400).json({ error: 'Invalid username or password.' });
    }

    const user = wardenResult.rows[0];
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid username or password.' });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, hostelId: user.hostel_id },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      role: user.role,
      hostelId: user.hostel_id,
      username: user.username
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during authentication.' });
  }
});

// ==========================================
// ADMIN DATA & TIME-SERIES ANALYTICS
// ==========================================

// Get All Students with their Latest Submission Data
app.get('/api/admin/students', authenticateToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        s.college_id AS "collegeId",
        s.name,
        s.email,
        s.hostel_id AS "hostelId",
        s.mobile,
        f.answers,
        f.comments,
        f.submitted_at AS "submittedAt",
        f.month_year AS "monthYear",
        CASE WHEN f.id IS NOT NULL THEN true ELSE false END AS "isSubmitted"
      FROM students s
      LEFT JOIN LATERAL (
        SELECT answers, comments, submitted_at, month_year, id
        FROM feedback_submissions
        WHERE college_id = s.college_id
        ORDER BY submitted_at DESC
        LIMIT 1
      ) f ON true
      ORDER BY s.hostel_id ASC, s.college_id ASC;
    `;

    const { rows } = await pool.query(query);

    const formatted = rows.map(r => ({
      collegeId: r.collegeId,
      name: r.name,
      email: r.email,
      hostelId: r.hostelId,
      mobile: r.mobile,
      feedback: {
        isSubmitted: r.isSubmitted,
        answers: r.answers || [],
        comments: r.comments || '',
        submittedAt: r.submittedAt || null,
        monthYear: r.monthYear || null
      }
    }));

    res.json(formatted);
  } catch (err) {
    console.error('Fetch students error:', err);
    res.status(500).json({ error: 'Failed to retrieve student records.' });
  }
});

// Historical Time-Series Analytics (1m, 3m, 6m, all)
app.get('/api/admin/analytics-trends', authenticateToken, async (req, res) => {
  try {
    const { range, hostelId } = req.query; // range: '1m', '3m', '6m', 'all'

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
    console.error('Analytics trend error:', err);
    res.status(500).json({ error: 'Failed to compute analytics trends.' });
  }
});

// Bulk Student Upload
app.post('/api/admin/bulk-students', authenticateToken, async (req, res) => {
  try {
    const { studentsList, hostelId } = req.body;
    if (!studentsList || !Array.isArray(studentsList)) {
      return res.status(400).json({ error: 'Valid student array is required.' });
    }

    for (const s of studentsList) {
      const targetHostel = (s.hostelId || hostelId || 'B1').toUpperCase();
      await pool.query(
        `INSERT INTO students (college_id, name, email, hostel_id, mobile)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (college_id) 
         DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, hostel_id = EXCLUDED.hostel_id, mobile = EXCLUDED.mobile`,
        [s.collegeId.trim(), s.name.trim(), s.email?.trim() || null, targetHostel, s.mobile?.trim() || null]
      );
    }

    res.json({ success: true, message: `Successfully imported ${studentsList.length} students.` });
  } catch (err) {
    console.error('Bulk upload error:', err);
    res.status(500).json({ error: 'Failed to import student dataset.' });
  }
});

// Staff Management
app.get('/api/admin/wardens', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, username, role, hostel_id AS \"hostelId\", created_at AS \"createdAt\" FROM wardens WHERE role != 'admin' ORDER BY hostel_id ASC"
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch staff accounts.' });
  }
});

app.post('/api/admin/wardens', authenticateToken, async (req, res) => {
  try {
    const { username, password, hostelId } = req.body;
    if (!username || !password || !hostelId) return res.status(400).json({ error: 'All fields are required.' });

    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO wardens (username, password, role, hostel_id) VALUES ($1, $2, 'warden', $3)",
      [username.trim(), hashedPassword, hostelId.toUpperCase()]
    );

    res.json({ success: true, message: 'Warden registered successfully.' });
  } catch (err) {
    res.status(400).json({ error: 'Username already exists.' });
  }
});

app.delete('/api/admin/wardens/:id', authenticateToken, async (req, res) => {
  try {
    await pool.query('DELETE FROM wardens WHERE id = $1', [req.params.id]);
    res.json({ success: true, message: 'Warden account deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove account.' });
  }
});

app.listen(PORT, () => {
  console.log(`Server active on port ${PORT}`);
});
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Auto-initialize schema & seed default testing records
const initDB = async () => {
  try {
    console.log('⏳ Syncing schema for Hostels B1 to B8 & Student Email...');

    // 1. Users Table (Wardens & Admins)
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(20) DEFAULT 'warden',
        hostel_id VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure hostel_id is VARCHAR(10) to support 'B1' through 'B8'
    await pool.query(`
      ALTER TABLE users 
      ALTER COLUMN hostel_id TYPE VARCHAR(10) USING hostel_id::text;
    `);

    // 2. Students Master Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id SERIAL PRIMARY KEY,
        college_id VARCHAR(50) UNIQUE NOT NULL,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150),
        mobile BIGINT,
        hostel_id VARCHAR(10) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Ensure email exists and hostel_id supports string codes
    await pool.query(`
      ALTER TABLE students 
      ADD COLUMN IF NOT EXISTS email VARCHAR(150);
      
      ALTER TABLE students 
      ALTER COLUMN hostel_id TYPE VARCHAR(10) USING hostel_id::text;
    `);

    // Ensure uniqueness constraint on college_id for safe ON CONFLICT upserts
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'students_college_id_unique'
        ) THEN
          ALTER TABLE students ADD CONSTRAINT students_college_id_unique UNIQUE (college_id);
        END IF;
      END $$;
    `);

    // 3. Mess Feedback Table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS mess_feedbacks (
        id SERIAL PRIMARY KEY,
        student_id INT REFERENCES students(id) ON DELETE CASCADE,
        answers INT[] NOT NULL,
        comments TEXT DEFAULT '',
        is_submitted BOOLEAN DEFAULT TRUE,
        submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4. Default Seed Student Records (Hostels B1 - B8)
    await pool.query(`
      INSERT INTO students (college_id, name, email, hostel_id, mobile)
      VALUES 
        ('2023MSBC001', 'Rahul Sharma', 'rahul.sharma@curaj.ac.in', 'B6', 9876543210),
        ('2023MSBC002', 'Priya Singh', 'priya.singh@curaj.ac.in', 'B1', 9876543211),
        ('2023MSBC003', 'Amit Kumar', 'amit.kumar@curaj.ac.in', 'B5', 9876543212),
        ('2023MSBC004', 'Vikas Meena', 'vikas.meena@curaj.ac.in', 'B8', 9876543213)
      ON CONFLICT (college_id) DO UPDATE
      SET hostel_id = EXCLUDED.hostel_id, email = EXCLUDED.email;
    `);

    console.log('✅ PostgreSQL Schema & CURAJ Hostels (B1-B8) Ready!');
  } catch (err) {
    console.error('❌ Failed to initialize database schema:', err);
  }
};

initDB();

module.exports = {
  query: (text, params) => pool.query(text, params)
};
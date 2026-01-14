/**
 * Script to fetch students without interview links from database
 * and save them to a JSON file
 * 
 * Usage:
 * 1. Update the database connection details below
 * 2. Update the table and column names to match your schema
 * 3. Run: node fetch-students-without-interviews.js
 */

const fs = require('fs');
const path = require('path');

// ============================================
// CONFIGURATION - UPDATE THESE VALUES
// ============================================

// Database connection details
const DB_CONFIG = {
  // For PostgreSQL (using pg library)
  host: 'localhost',
  port: 5432,
  database: 'your_database_name',
  user: 'your_username',
  password: 'your_password',
  
  // OR use connection string:
  // connectionString: 'postgresql://user:password@localhost:5432/database_name'
};

// Database type: 'postgresql', 'mysql', 'mongodb', etc.
const DB_TYPE = 'postgresql';

// Table and column names - UPDATE THESE
const TABLE_CONFIG = {
  tableName: 'students', // or 'applications', 'users', etc.
  applicationIdColumn: 'application_id', // or 'id', 'applicationId', etc.
  nameColumn: 'name', // or 'full_name', 'student_name', etc.
  trackColumn: 'chosen_track', // or 'track', 'program', 'course', etc.
  interviewLinkColumn: 'interview_link', // or 'interview_url', 'interviewLink', etc.
};

// Output file path
const OUTPUT_FILE = path.join(__dirname, 'students-without-interviews.json');

// ============================================
// SCRIPT LOGIC
// ============================================

async function fetchStudentsWithoutInterviews() {
  try {
    let students = [];
    
    if (DB_TYPE === 'postgresql') {
      // PostgreSQL implementation
      const { Client } = require('pg');
      const client = new Client(DB_CONFIG.connectionString || DB_CONFIG);
      
      await client.connect();
      console.log('✅ Connected to PostgreSQL database');
      
      // Query to fetch students without interview links
      const query = `
        SELECT 
          ${TABLE_CONFIG.applicationIdColumn} as "applicationId",
          ${TABLE_CONFIG.nameColumn} as "name",
          ${TABLE_CONFIG.trackColumn} as "chosenTrack"
        FROM ${TABLE_CONFIG.tableName}
        WHERE ${TABLE_CONFIG.interviewLinkColumn} IS NULL 
           OR ${TABLE_CONFIG.interviewLinkColumn} = ''
           OR TRIM(${TABLE_CONFIG.interviewLinkColumn}) = ''
        ORDER BY ${TABLE_CONFIG.applicationIdColumn};
      `;
      
      const result = await client.query(query);
      students = result.rows.map(row => ({
        applicationId: row.applicationId,
        name: row.name,
        chosenTrack: row.chosenTrack
      }));
      
      await client.end();
      
    } else if (DB_TYPE === 'mysql') {
      // MySQL implementation
      const mysql = require('mysql2/promise');
      const connection = await mysql.createConnection(DB_CONFIG);
      
      console.log('✅ Connected to MySQL database');
      
      const query = `
        SELECT 
          ${TABLE_CONFIG.applicationIdColumn} as applicationId,
          ${TABLE_CONFIG.nameColumn} as name,
          ${TABLE_CONFIG.trackColumn} as chosenTrack
        FROM ${TABLE_CONFIG.tableName}
        WHERE ${TABLE_CONFIG.interviewLinkColumn} IS NULL 
           OR ${TABLE_CONFIG.interviewLinkColumn} = ''
           OR TRIM(${TABLE_CONFIG.interviewLinkColumn}) = ''
        ORDER BY ${TABLE_CONFIG.applicationIdColumn};
      `;
      
      const [rows] = await connection.execute(query);
      students = rows.map(row => ({
        applicationId: row.applicationId,
        name: row.name,
        chosenTrack: row.chosenTrack
      }));
      
      await connection.end();
      
    } else if (DB_TYPE === 'mongodb') {
      // MongoDB implementation
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(DB_CONFIG.connectionString || `mongodb://${DB_CONFIG.host}:${DB_CONFIG.port || 27017}`);
      
      await client.connect();
      console.log('✅ Connected to MongoDB database');
      
      const db = client.db(DB_CONFIG.database);
      const collection = db.collection(TABLE_CONFIG.tableName);
      
      const query = {
        $or: [
          { [TABLE_CONFIG.interviewLinkColumn]: { $exists: false } },
          { [TABLE_CONFIG.interviewLinkColumn]: null },
          { [TABLE_CONFIG.interviewLinkColumn]: '' },
          { [TABLE_CONFIG.interviewLinkColumn]: { $regex: /^\s*$/ } }
        ]
      };
      
      const cursor = collection.find(query).sort({ [TABLE_CONFIG.applicationIdColumn]: 1 });
      const docs = await cursor.toArray();
      
      students = docs.map(doc => ({
        applicationId: doc[TABLE_CONFIG.applicationIdColumn],
        name: doc[TABLE_CONFIG.nameColumn],
        chosenTrack: doc[TABLE_CONFIG.trackColumn]
      }));
      
      await client.close();
      
    } else {
      throw new Error(`Unsupported database type: ${DB_TYPE}`);
    }
    
    // Save to JSON file
    const output = {
      totalCount: students.length,
      generatedAt: new Date().toISOString(),
      students: students
    };
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf8');
    
    console.log(`\n✅ Successfully fetched ${students.length} students without interview links`);
    console.log(`📄 Saved to: ${OUTPUT_FILE}`);
    console.log(`\n📊 Summary:`);
    console.log(`   - Total students: ${students.length}`);
    
    if (students.length > 0) {
      console.log(`\n📋 Sample entries (first 3):`);
      students.slice(0, 3).forEach((student, index) => {
        console.log(`   ${index + 1}. Application ID: ${student.applicationId}`);
        console.log(`      Name: ${student.name}`);
        console.log(`      Track: ${student.chosenTrack}`);
        console.log('');
      });
    }
    
    return output;
    
  } catch (error) {
    console.error('❌ Error fetching students:', error.message);
    console.error('\n💡 Make sure to:');
    console.error('   1. Install required database driver:');
    console.error('      - PostgreSQL: npm install pg');
    console.error('      - MySQL: npm install mysql2');
    console.error('      - MongoDB: npm install mongodb');
    console.error('   2. Update DB_CONFIG with your database credentials');
    console.error('   3. Update TABLE_CONFIG with your table/column names');
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  fetchStudentsWithoutInterviews();
}

module.exports = { fetchStudentsWithoutInterviews };


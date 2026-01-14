# Student Database Query Scripts

This directory contains scripts to fetch students without interview links from your database.

## Quick Start

### Option 1: Using the JavaScript Script (Recommended)

1. **Install the required database driver:**
   ```bash
   # For PostgreSQL
   npm install pg
   
   # For MySQL
   npm install mysql2
   
   # For MongoDB
   npm install mongodb
   ```

2. **Edit `fetch-students-without-interviews.js`:**
   - Update `DB_CONFIG` with your database connection details
   - Update `DB_TYPE` to match your database ('postgresql', 'mysql', or 'mongodb')
   - Update `TABLE_CONFIG` with your actual table and column names

3. **Run the script:**
   ```bash
   node fetch-students-without-interviews.js
   ```

4. **Output:**
   - Results will be saved to `students-without-interviews.json`

### Option 2: Using Prisma (If your database uses Prisma)

1. **Update the Prisma schema** (if needed) to include the Student model

2. **Edit `fetch-students-using-prisma.ts`:**
   - Update the model name (e.g., `prisma.student`)
   - Update field names to match your schema

3. **Run the script:**
   ```bash
   npx ts-node fetch-students-using-prisma.ts
   ```

## Configuration Examples

### PostgreSQL Example
```javascript
const DB_CONFIG = {
  host: 'localhost',
  port: 5432,
  database: 'student_database',
  user: 'postgres',
  password: 'your_password'
};

const TABLE_CONFIG = {
  tableName: 'students',
  applicationIdColumn: 'application_id',
  nameColumn: 'full_name',
  trackColumn: 'chosen_track',
  interviewLinkColumn: 'interview_link'
};
```

### MySQL Example
```javascript
const DB_CONFIG = {
  host: 'localhost',
  port: 3306,
  database: 'student_database',
  user: 'root',
  password: 'your_password'
};
```

### MongoDB Example
```javascript
const DB_CONFIG = {
  connectionString: 'mongodb://localhost:27017',
  database: 'student_database'
};

const TABLE_CONFIG = {
  tableName: 'students',  // collection name
  applicationIdColumn: 'applicationId',
  nameColumn: 'name',
  trackColumn: 'chosenTrack',
  interviewLinkColumn: 'interviewLink'
};
```

## Output Format

The script generates a JSON file with the following structure:

```json
{
  "totalCount": 25,
  "generatedAt": "2024-01-15T10:30:00.000Z",
  "students": [
    {
      "applicationId": "APP001",
      "name": "John Doe",
      "chosenTrack": "Software Engineering"
    },
    {
      "applicationId": "APP002",
      "name": "Jane Smith",
      "chosenTrack": "Data Science"
    }
  ]
}
```

## Troubleshooting

### Error: "Cannot find module 'pg'"
- Install the required database driver: `npm install pg` (or mysql2, mongodb)

### Error: "Connection refused"
- Check your database is running
- Verify connection credentials (host, port, username, password)
- Check firewall settings

### Error: "Column does not exist"
- Verify table and column names in `TABLE_CONFIG`
- Check your database schema

### Error: "Table does not exist"
- Verify the table name in `TABLE_CONFIG.tableName`
- Check database name in `DB_CONFIG.database`

## Need Help?

If you need help configuring the script, please provide:
1. Database type (PostgreSQL, MySQL, MongoDB, etc.)
2. Table name
3. Column names for:
   - Application ID
   - Name
   - Chosen track
   - Interview link

Then I can help you customize the script for your specific database schema.


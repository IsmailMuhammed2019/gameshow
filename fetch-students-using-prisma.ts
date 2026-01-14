/**
 * Alternative script using Prisma (if your student database uses Prisma)
 * 
 * This script assumes you have a Prisma schema with a Student model
 * Update the model name and fields according to your schema
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface StudentOutput {
  applicationId: string | number;
  name: string;
  chosenTrack: string;
}

async function fetchStudentsWithoutInterviews() {
  try {
    console.log('🔍 Fetching students without interview links...');
    
    // Update this query based on your Prisma schema
    // Example: If your model is called "Student" or "Application"
    const students = await prisma.student.findMany({
      where: {
        OR: [
          { interviewLink: null },
          { interviewLink: '' },
          { interviewLink: { equals: '' } }
        ]
      },
      select: {
        applicationId: true,  // Update field names to match your schema
        name: true,
        chosenTrack: true,    // or 'track', 'program', etc.
      },
      orderBy: {
        applicationId: 'asc'
      }
    });
    
    // Format the output
    const output: StudentOutput[] = students.map(student => ({
      applicationId: student.applicationId,
      name: student.name,
      chosenTrack: student.chosenTrack
    }));
    
    // Save to JSON file
    const outputFile = path.join(__dirname, 'students-without-interviews.json');
    const result = {
      totalCount: output.length,
      generatedAt: new Date().toISOString(),
      students: output
    };
    
    fs.writeFileSync(outputFile, JSON.stringify(result, null, 2), 'utf8');
    
    console.log(`✅ Successfully fetched ${output.length} students`);
    console.log(`📄 Saved to: ${outputFile}`);
    
    if (output.length > 0) {
      console.log('\n📋 Sample entries (first 3):');
      output.slice(0, 3).forEach((student, index) => {
        console.log(`   ${index + 1}. Application ID: ${student.applicationId}`);
        console.log(`      Name: ${student.name}`);
        console.log(`      Track: ${student.chosenTrack}`);
        console.log('');
      });
    }
    
    return result;
    
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fetchStudentsWithoutInterviews()
  .then(() => {
    console.log('✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });


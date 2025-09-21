import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const sampleQuestions = [
  {
    question: "What is the capital of France?",
    options: ["London", "Berlin", "Paris", "Madrid"],
    correctAnswer: 2,
    difficulty: 1,
  },
  {
    question: "Which planet is known as the Red Planet?",
    options: ["Venus", "Mars", "Jupiter", "Saturn"],
    correctAnswer: 1,
    difficulty: 2,
  },
  {
    question: "What is the largest mammal in the world?",
    options: ["African Elephant", "Blue Whale", "Giraffe", "Hippopotamus"],
    correctAnswer: 1,
    difficulty: 3,
  },
  {
    question: "Who painted the Mona Lisa?",
    options: ["Vincent van Gogh", "Pablo Picasso", "Leonardo da Vinci", "Michelangelo"],
    correctAnswer: 2,
    difficulty: 4,
  },
  {
    question: "What is the chemical symbol for gold?",
    options: ["Go", "Gd", "Au", "Ag"],
    correctAnswer: 2,
    difficulty: 5,
  },
  {
    question: "Which country is home to the kangaroo?",
    options: ["New Zealand", "Australia", "South Africa", "Argentina"],
    correctAnswer: 1,
    difficulty: 6,
  },
  {
    question: "What is the smallest prime number?",
    options: ["0", "1", "2", "3"],
    correctAnswer: 2,
    difficulty: 7,
  },
  {
    question: "Which ocean is the largest?",
    options: ["Atlantic", "Indian", "Arctic", "Pacific"],
    correctAnswer: 3,
    difficulty: 8,
  },
  {
    question: "Who wrote 'Romeo and Juliet'?",
    options: ["Charles Dickens", "William Shakespeare", "Jane Austen", "Mark Twain"],
    correctAnswer: 1,
    difficulty: 9,
  },
  {
    question: "What is the speed of light in vacuum?",
    options: ["300,000 km/s", "150,000 km/s", "450,000 km/s", "600,000 km/s"],
    correctAnswer: 0,
    difficulty: 10,
  },
  {
    question: "Which element has the atomic number 1?",
    options: ["Helium", "Hydrogen", "Lithium", "Carbon"],
    correctAnswer: 1,
    difficulty: 11,
  },
  {
    question: "What is the currency of Japan?",
    options: ["Won", "Yuan", "Yen", "Baht"],
    correctAnswer: 2,
    difficulty: 12,
  },
  {
    question: "Which programming language was created by Brendan Eich?",
    options: ["Python", "Java", "JavaScript", "C++"],
    correctAnswer: 2,
    difficulty: 13,
  },
  {
    question: "What is the largest organ in the human body?",
    options: ["Liver", "Brain", "Skin", "Lungs"],
    correctAnswer: 2,
    difficulty: 14,
  },
  {
    question: "Which year did the Berlin Wall fall?",
    options: ["1987", "1989", "1991", "1993"],
    correctAnswer: 1,
    difficulty: 15,
  },
];

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@millionairegame.com',
      password: hashedPassword,
      role: 'GAME_MASTER',
      uniqueNumber: 'GM001',
      isActive: true,
      score: 0,
    },
  });

  console.log('👑 Created admin user:', adminUser.username);

  // Create sample questions
  for (const questionData of sampleQuestions) {
    await prisma.question.create({
      data: questionData,
    });
  }

  console.log('✅ Database seeded successfully!');
  console.log(`📝 Created ${sampleQuestions.length} sample questions`);
  console.log('🔑 Admin credentials:');
  console.log('   Username: admin');
  console.log('   Password: admin123');
  console.log('   Role: Game Master');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

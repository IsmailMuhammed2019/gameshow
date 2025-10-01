"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new client_1.PrismaClient();
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
    const generalAdminPassword = await bcrypt.hash('admin456', 10);
    const generalAdminUser = await prisma.user.upsert({
        where: { username: 'general_admin' },
        update: {},
        create: {
            username: 'general_admin',
            email: 'general@millionairegame.com',
            password: generalAdminPassword,
            role: 'GENERAL_ADMIN',
            uniqueNumber: 'GA001',
            isActive: true,
            score: 0,
        },
    });
    console.log('👑 Created general admin user:', generalAdminUser.username);
    for (const questionData of sampleQuestions) {
        await prisma.question.create({
            data: {
                ...questionData,
                targetRole: 'PARTICIPANT',
                isActive: true,
            },
        });
    }
    const audienceQuestions = [
        {
            question: "What color is the sky on a clear day?",
            options: ["Red", "Blue", "Green", "Yellow"],
            correctAnswer: 1,
            difficulty: 1,
        },
        {
            question: "How many legs does a cat have?",
            options: ["2", "3", "4", "5"],
            correctAnswer: 2,
            difficulty: 1,
        },
        {
            question: "What do you use to write on paper?",
            options: ["Fork", "Pen", "Spoon", "Plate"],
            correctAnswer: 1,
            difficulty: 1,
        },
        {
            question: "What season comes after winter?",
            options: ["Summer", "Fall", "Spring", "Autumn"],
            correctAnswer: 2,
            difficulty: 2,
        },
        {
            question: "What is 2 + 2?",
            options: ["3", "4", "5", "6"],
            correctAnswer: 1,
            difficulty: 1,
        },
        {
            question: "What animal says 'moo'?",
            options: ["Dog", "Cat", "Cow", "Pig"],
            correctAnswer: 2,
            difficulty: 1,
        },
        {
            question: "How many wheels does a bicycle have?",
            options: ["1", "2", "3", "4"],
            correctAnswer: 1,
            difficulty: 1,
        },
        {
            question: "What do you drink when you're thirsty?",
            options: ["Food", "Water", "Clothes", "Books"],
            correctAnswer: 1,
            difficulty: 1,
        },
        {
            question: "What comes after Monday?",
            options: ["Sunday", "Tuesday", "Wednesday", "Thursday"],
            correctAnswer: 1,
            difficulty: 1,
        },
        {
            question: "What color is grass?",
            options: ["Red", "Blue", "Green", "Yellow"],
            correctAnswer: 2,
            difficulty: 1,
        },
        {
            question: "How many fingers do you have on one hand?",
            options: ["3", "4", "5", "6"],
            correctAnswer: 2,
            difficulty: 1,
        },
        {
            question: "What do you use to cut paper?",
            options: ["Spoon", "Scissors", "Fork", "Plate"],
            correctAnswer: 1,
            difficulty: 1,
        },
        {
            question: "What is the opposite of hot?",
            options: ["Warm", "Cold", "Cool", "Freezing"],
            correctAnswer: 1,
            difficulty: 1,
        },
        {
            question: "What do you wear on your feet?",
            options: ["Hat", "Shirt", "Shoes", "Gloves"],
            correctAnswer: 2,
            difficulty: 1,
        },
        {
            question: "What do you use to brush your teeth?",
            options: ["Soap", "Toothbrush", "Towel", "Comb"],
            correctAnswer: 1,
            difficulty: 1,
        },
        {
            question: "What is the first letter of the alphabet?",
            options: ["B", "A", "C", "D"],
            correctAnswer: 1,
            difficulty: 1,
        },
        {
            question: "What do you use to see?",
            options: ["Ears", "Eyes", "Nose", "Mouth"],
            correctAnswer: 1,
            difficulty: 1,
        },
        {
            question: "What is 1 + 1?",
            options: ["1", "2", "3", "4"],
            correctAnswer: 1,
            difficulty: 1,
        },
        {
            question: "What do you use to eat soup?",
            options: ["Fork", "Knife", "Spoon", "Chopsticks"],
            correctAnswer: 2,
            difficulty: 1,
        },
        {
            question: "What do you call a baby cat?",
            options: ["Puppy", "Kitten", "Cub", "Chick"],
            correctAnswer: 1,
            difficulty: 1,
        },
    ];
    for (const questionData of audienceQuestions) {
        await prisma.question.create({
            data: {
                ...questionData,
                targetRole: 'AUDIENCE',
                isActive: true,
            },
        });
    }
    const yesNoQuestions = [
        {
            question: "Is the sky blue?",
            options: ["Yes", "No"],
            correctAnswer: 0,
            difficulty: 1,
            questionType: 'YES_NO',
        },
        {
            question: "Do birds fly?",
            options: ["Yes", "No"],
            correctAnswer: 0,
            difficulty: 1,
            questionType: 'YES_NO',
        },
        {
            question: "Is water wet?",
            options: ["Yes", "No"],
            correctAnswer: 0,
            difficulty: 2,
            questionType: 'YES_NO',
        },
        {
            question: "Do fish live on land?",
            options: ["Yes", "No"],
            correctAnswer: 1,
            difficulty: 1,
            questionType: 'YES_NO',
        },
        {
            question: "Is the sun a star?",
            options: ["Yes", "No"],
            correctAnswer: 0,
            difficulty: 3,
            questionType: 'YES_NO',
        },
    ];
    for (const questionData of yesNoQuestions) {
        await prisma.question.create({
            data: {
                ...questionData,
                targetRole: 'PARTICIPANT',
                isActive: true,
            },
        });
    }
    const sampleEpisodes = [
        {
            title: "General Knowledge",
            description: "A collection of general knowledge questions covering various topics",
            status: 'PUBLISHED',
        },
        {
            title: "Science & Technology",
            description: "Questions about science, technology, and innovation",
            status: 'PUBLISHED',
        },
        {
            title: "History & Geography",
            description: "Historical events and geographical facts",
            status: 'DRAFT',
        },
        {
            title: "Sports & Entertainment",
            description: "Questions about sports, movies, music, and entertainment",
            status: 'PUBLISHED',
        },
    ];
    for (const episodeData of sampleEpisodes) {
        await prisma.episode.create({
            data: episodeData,
        });
    }
    console.log('✅ Database seeded successfully!');
    console.log(`📝 Created ${sampleQuestions.length} participant questions`);
    console.log(`📝 Created ${audienceQuestions.length} audience questions`);
    console.log(`📝 Created ${yesNoQuestions.length} Yes/No questions`);
    console.log(`📺 Created ${sampleEpisodes.length} episodes`);
    console.log('🔑 Admin credentials:');
    console.log('   Username: admin');
    console.log('   Password: admin123');
    console.log('   Role: Game Master');
    console.log('   Username: general_admin');
    console.log('   Password: admin456');
    console.log('   Role: General Admin');
}
main()
    .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map
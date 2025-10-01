"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new client_1.PrismaClient();
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
    const participantPassword = await bcrypt.hash('participant123', 10);
    const testParticipant1 = await prisma.user.upsert({
        where: { username: 'participant1' },
        update: {},
        create: {
            username: 'participant1',
            email: 'participant1@test.com',
            password: participantPassword,
            role: 'PARTICIPANT',
            uniqueNumber: 'P001',
            isActive: true,
            score: 0,
        },
    });
    const testParticipant2 = await prisma.user.upsert({
        where: { username: 'participant2' },
        update: {},
        create: {
            username: 'participant2',
            email: 'participant2@test.com',
            password: participantPassword,
            role: 'PARTICIPANT',
            uniqueNumber: 'P002',
            isActive: true,
            score: 0,
        },
    });
    console.log('🎯 Created test participants:', testParticipant1.username, testParticipant2.username);
    const audiencePassword = await bcrypt.hash('audience123', 10);
    const testAudience1 = await prisma.user.upsert({
        where: { username: 'audience1' },
        update: {},
        create: {
            username: 'audience1',
            email: 'audience1@test.com',
            password: audiencePassword,
            role: 'AUDIENCE',
            uniqueNumber: 'A001',
            isActive: true,
            score: 0,
        },
    });
    const testAudience2 = await prisma.user.upsert({
        where: { username: 'audience2' },
        update: {},
        create: {
            username: 'audience2',
            email: 'audience2@test.com',
            password: audiencePassword,
            role: 'AUDIENCE',
            uniqueNumber: 'A002',
            isActive: true,
            score: 0,
        },
    });
    console.log('👥 Created test audience:', testAudience1.username, testAudience2.username);
    console.log('📺 Creating episodes...');
    const generalKnowledgeEpisode = await prisma.episode.upsert({
        where: { id: 'episode-general-knowledge' },
        update: {},
        create: {
            id: 'episode-general-knowledge',
            title: "General Knowledge",
            description: "A collection of general knowledge questions covering various topics",
            status: 'PUBLISHED',
            targetRole: 'PARTICIPANT',
        },
    });
    const scienceTechEpisode = await prisma.episode.upsert({
        where: { id: 'episode-science-tech' },
        update: {},
        create: {
            id: 'episode-science-tech',
            title: "Science & Technology",
            description: "Questions about science, technology, and innovation",
            status: 'PUBLISHED',
            targetRole: 'PARTICIPANT',
        },
    });
    const historyGeoEpisode = await prisma.episode.upsert({
        where: { id: 'episode-history-geo' },
        update: {},
        create: {
            id: 'episode-history-geo',
            title: "History & Geography",
            description: "Historical events and geographical facts",
            status: 'PUBLISHED',
            targetRole: 'AUDIENCE',
        },
    });
    const sportsEntertainmentEpisode = await prisma.episode.upsert({
        where: { id: 'episode-sports-entertainment' },
        update: {},
        create: {
            id: 'episode-sports-entertainment',
            title: "Sports & Entertainment",
            description: "Questions about sports, movies, music, and entertainment",
            status: 'PUBLISHED',
            targetRole: 'AUDIENCE',
        },
    });
    console.log('✅ Database seeded successfully!');
    console.log('🔑 Admin credentials:');
    console.log('   Username: admin / Password: admin123');
    console.log('   Username: general_admin / Password: admin456');
    console.log('🎯 Test Participant credentials:');
    console.log('   Username: participant1 / Password: participant123');
    console.log('   Username: participant2 / Password: participant123');
    console.log('👥 Test Audience credentials:');
    console.log('   Username: audience1 / Password: audience123');
    console.log('   Username: audience2 / Password: audience123');
    console.log('📺 Created 4 episodes with different target roles');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map
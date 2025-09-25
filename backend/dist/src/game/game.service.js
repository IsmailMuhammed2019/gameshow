"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let GameService = class GameService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createQuestion(createQuestionDto) {
        return this.prisma.question.create({
            data: createQuestionDto,
        });
    }
    async getAllQuestions() {
        return this.prisma.question.findMany();
    }
    async getActiveQuestions(targetRole) {
        const whereClause = { isActive: true };
        if (targetRole) {
            whereClause.targetRole = targetRole;
        }
        console.log('Getting active questions with whereClause:', whereClause);
        const questions = await this.prisma.question.findMany({ where: whereClause });
        console.log(`Found ${questions.length} questions for role: ${targetRole || 'ALL'}`);
        return questions;
    }
    async startGame(gameMasterId) {
        const gameMaster = await this.prisma.user.findUnique({ where: { id: gameMasterId } });
        if (!gameMaster) {
            throw new common_1.NotFoundException('Game master not found');
        }
        return this.prisma.gameSession.create({
            data: {
                gameMasterId,
                status: client_1.GameStatus.ACTIVE,
                currentQuestionIndex: 0,
            },
        });
    }
    async getNextQuestion(gameSessionId, gameMasterId, targetRole) {
        console.log(`getNextQuestion called with: gameSessionId=${gameSessionId}, gameMasterId=${gameMasterId}, targetRole=${targetRole}`);
        let gameSession = await this.prisma.gameSession.findFirst({
            where: { id: gameSessionId, gameMasterId },
        });
        console.log('Looking for game session with:', { gameSessionId, gameMasterId });
        console.log('Found game session with gameMasterId:', gameSession);
        if (!gameSession) {
            gameSession = await this.prisma.gameSession.findFirst({
                where: { id: gameSessionId },
            });
            console.log('Found game session by ID only:', gameSession);
        }
        if (!gameSession) {
            console.log('Game session not found');
            throw new common_1.NotFoundException('Game session not found');
        }
        if (gameSession.status !== client_1.GameStatus.ACTIVE) {
            console.log('Game is not active, status:', gameSession.status);
            throw new common_1.BadRequestException('Game is not active');
        }
        const questions = await this.getActiveQuestions(targetRole);
        console.log(`Found ${questions.length} questions for role: ${targetRole || 'PARTICIPANT'}`);
        if (questions.length === 0) {
            console.log(`No active questions available for role: ${targetRole || 'PARTICIPANT'}`);
            throw new common_1.BadRequestException(`No active questions available for role: ${targetRole || 'PARTICIPANT'}`);
        }
        const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
        console.log('Selected random question:', randomQuestion.id, randomQuestion.question);
        await this.prisma.gameSession.update({
            where: { id: gameSessionId },
            data: {
                currentQuestionId: randomQuestion.id,
                currentQuestionIndex: gameSession.currentQuestionIndex + 1,
            },
        });
        return randomQuestion;
    }
    async submitAnswer(userId, questionId, gameSessionId, selectedOption) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        const question = await this.prisma.question.findUnique({ where: { id: questionId } });
        const gameSession = await this.prisma.gameSession.findUnique({ where: { id: gameSessionId } });
        if (!user || !question || !gameSession) {
            throw new common_1.NotFoundException('User, question, or game session not found');
        }
        const existingAnswer = await this.prisma.answer.findFirst({
            where: { userId, questionId, gameSessionId },
        });
        if (existingAnswer) {
            throw new common_1.BadRequestException('User already answered this question');
        }
        const isCorrect = selectedOption === question.correctAnswer;
        const responseTime = 0;
        await this.prisma.$transaction(async (tx) => {
            await tx.answer.create({
                data: {
                    userId,
                    questionId,
                    gameSessionId,
                    selectedOption,
                    isCorrect,
                    responseTime,
                },
            });
            if (isCorrect) {
                await tx.user.update({
                    where: { id: userId },
                    data: { score: { increment: 1 } },
                });
            }
        });
        return {
            isCorrect,
            correctAnswer: question.correctAnswer,
        };
    }
    async endGame(gameSessionId, gameMasterId) {
        const gameSession = await this.prisma.gameSession.findFirst({
            where: { id: gameSessionId, gameMasterId },
        });
        if (!gameSession) {
            throw new common_1.NotFoundException('Game session not found');
        }
        const updatedGameSession = await this.prisma.gameSession.update({
            where: { id: gameSessionId },
            data: { status: client_1.GameStatus.FINISHED },
        });
        const answers = await this.prisma.answer.findMany({
            where: { gameSessionId },
            include: { user: true },
        });
        const results = answers.reduce((acc, answer) => {
            const userId = answer.userId;
            if (!acc[userId]) {
                acc[userId] = {
                    user: answer.user,
                    correctAnswers: 0,
                    totalAnswers: 0,
                };
            }
            acc[userId].totalAnswers += 1;
            if (answer.isCorrect) {
                acc[userId].correctAnswers += 1;
            }
            return acc;
        }, {});
        return {
            gameSession: updatedGameSession,
            results: Object.values(results),
        };
    }
    async getUserById(userId) {
        const user = await this.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            throw new common_1.NotFoundException('User not found');
        }
        return {
            ...user,
            score: Number(user.score),
        };
    }
    async getGameSession(gameSessionId) {
        const gameSession = await this.prisma.gameSession.findUnique({
            where: { id: gameSessionId },
            include: { currentQuestion: true, gameMaster: true },
        });
        if (!gameSession) {
            throw new common_1.NotFoundException('Game session not found');
        }
        const result = {
            ...gameSession,
            gameMaster: gameSession.gameMaster ? {
                ...gameSession.gameMaster,
                score: Number(gameSession.gameMaster.score),
            } : null,
        };
        return result;
    }
    async getActiveGameSessions() {
        const gameSessions = await this.prisma.gameSession.findMany({
            where: { status: client_1.GameStatus.ACTIVE },
            include: { currentQuestion: true, gameMaster: true },
        });
        return gameSessions.map(session => ({
            ...session,
            gameMaster: session.gameMaster ? {
                ...session.gameMaster,
                score: Number(session.gameMaster.score),
            } : null,
        }));
    }
    async clearAllScores(gameMasterId) {
        const gameMaster = await this.prisma.user.findUnique({
            where: { id: gameMasterId },
        });
        if (!gameMaster || gameMaster.role !== 'GAME_MASTER') {
            throw new common_1.ForbiddenException('Only game masters can clear scores');
        }
        const result = await this.prisma.user.updateMany({
            where: {
                role: {
                    in: ['PARTICIPANT', 'AUDIENCE'],
                },
            },
            data: {
                score: 0,
            },
        });
        return {
            message: 'All scores cleared successfully',
            clearedCount: result.count,
        };
    }
};
exports.GameService = GameService;
exports.GameService = GameService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GameService);
//# sourceMappingURL=game.service.js.map
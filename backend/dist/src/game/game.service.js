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
    async startGame(gameMasterId, episodeId) {
        const gameMaster = await this.prisma.user.findUnique({ where: { id: gameMasterId } });
        if (!gameMaster) {
            throw new common_1.NotFoundException('Game master not found');
        }
        if (episodeId) {
            const episode = await this.prisma.episode.findUnique({
                where: { id: episodeId },
                include: { questions: { where: { isActive: true } } }
            });
            if (!episode) {
                throw new common_1.NotFoundException('Episode not found');
            }
            if (episode.status !== 'PUBLISHED') {
                throw new common_1.BadRequestException('Episode is not published');
            }
            if (episode.questions.length === 0) {
                throw new common_1.BadRequestException('Episode has no questions');
            }
        }
        return this.prisma.gameSession.create({
            data: {
                gameMasterId,
                episodeId,
                status: client_1.GameStatus.ACTIVE,
                currentQuestionIndex: 0,
            },
        });
    }
    async getNextQuestion(gameSessionId, gameMasterId, targetRole) {
        console.log(`getNextQuestion called with: gameSessionId=${gameSessionId}, gameMasterId=${gameMasterId}, targetRole=${targetRole}`);
        let gameSession = await this.prisma.gameSession.findFirst({
            where: { id: gameSessionId, gameMasterId },
            include: { episode: true }
        });
        console.log('Looking for game session with:', { gameSessionId, gameMasterId });
        console.log('Found game session with gameMasterId:', gameSession);
        if (!gameSession) {
            gameSession = await this.prisma.gameSession.findFirst({
                where: { id: gameSessionId },
                include: { episode: true }
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
        const allAnswersInSession = await this.prisma.answer.findMany({
            where: { gameSessionId },
            select: { questionId: true },
            distinct: ['questionId'],
        });
        const sentQuestionIds = new Set();
        allAnswersInSession.forEach(answer => sentQuestionIds.add(answer.questionId));
        if (gameSession.currentQuestionId) {
            sentQuestionIds.add(gameSession.currentQuestionId);
        }
        const allSentQuestionIds = Array.from(sentQuestionIds);
        console.log(`Total sent question IDs in this session: ${allSentQuestionIds.length}`, allSentQuestionIds);
        let questions;
        if (gameSession.episodeId) {
            console.log('Getting questions from episode:', gameSession.episodeId);
            const whereClause = {
                episodeId: gameSession.episodeId,
                isActive: true,
                id: {
                    notIn: allSentQuestionIds.length > 0 ? allSentQuestionIds : [],
                },
            };
            if (targetRole) {
                whereClause.targetRole = targetRole;
            }
            questions = await this.prisma.question.findMany({ where: whereClause });
        }
        else {
            const whereClause = {
                isActive: true,
                id: {
                    notIn: allSentQuestionIds.length > 0 ? allSentQuestionIds : [],
                },
            };
            if (targetRole) {
                whereClause.targetRole = targetRole;
            }
            questions = await this.prisma.question.findMany({ where: whereClause });
        }
        console.log(`Found ${questions.length} unsent questions for role: ${targetRole || 'PARTICIPANT'}`);
        if (questions.length === 0) {
            console.log(`No unsent questions available for role: ${targetRole || 'PARTICIPANT'}`);
            throw new common_1.BadRequestException(`No unsent questions available for role: ${targetRole || 'PARTICIPANT'}. All questions have been sent in this session.`);
        }
        const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
        console.log('Selected random question:', randomQuestion.id, randomQuestion.question);
        await this.updateGameSessionQuestion(gameSessionId, randomQuestion.id);
        return randomQuestion;
    }
    async submitAnswer(userId, questionId, gameSessionId, selectedOption, responseTime) {
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
        const calculatedResponseTime = responseTime || 0;
        let isWinner = false;
        if (isCorrect && (user.role === 'PARTICIPANT' || user.role === 'AUDIENCE')) {
            const existingCorrectAnswers = await this.prisma.answer.findMany({
                where: {
                    questionId,
                    gameSessionId,
                    isCorrect: true,
                },
                include: { user: true },
            });
            const roleCorrectAnswers = existingCorrectAnswers.filter(answer => answer.user.role === user.role);
            isWinner = roleCorrectAnswers.length === 0;
        }
        await this.prisma.$transaction(async (tx) => {
            await tx.answer.create({
                data: {
                    userId,
                    questionId,
                    gameSessionId,
                    selectedOption,
                    isCorrect,
                    responseTime: calculatedResponseTime,
                },
            });
        });
        return {
            isCorrect,
            correctAnswer: question.correctAnswer,
            isWinner,
            responseTime: calculatedResponseTime,
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
                    user: {
                        ...answer.user,
                        score: Number(answer.user.score),
                    },
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
    async updateUserScore(userId, points) {
        await this.prisma.user.update({
            where: { id: userId },
            data: { score: { increment: points } },
        });
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
    async updateGameSessionQuestion(gameSessionId, questionId) {
        const gameSession = await this.prisma.gameSession.findUnique({
            where: { id: gameSessionId },
        });
        if (!gameSession) {
            throw new common_1.NotFoundException('Game session not found');
        }
        const existingAnswer = await this.prisma.answer.findFirst({
            where: {
                gameSessionId,
                questionId,
            },
        });
        if (!existingAnswer) {
            try {
                await this.prisma.answer.create({
                    data: {
                        userId: gameSession.gameMasterId,
                        questionId: questionId,
                        gameSessionId: gameSessionId,
                        selectedOption: -1,
                        isCorrect: false,
                        responseTime: 0,
                    },
                });
                console.log(`Created sent marker for question ${questionId} in session ${gameSessionId}`);
            }
            catch (error) {
                console.log(`Sent marker not needed - answer already exists for question ${questionId}`);
            }
        }
        await this.prisma.gameSession.update({
            where: { id: gameSessionId },
            data: {
                currentQuestionId: questionId,
                currentQuestionIndex: gameSession.currentQuestionIndex + 1,
            },
        });
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
    async updateQuestion(questionId, updateData) {
        if (!questionId || questionId.trim() === '') {
            throw new common_1.BadRequestException('Question ID is required');
        }
        try {
            return await this.prisma.question.update({
                where: { id: questionId },
                data: updateData,
            });
        }
        catch (error) {
            if (error.code === 'P2025') {
                throw new common_1.NotFoundException(`Question with ID ${questionId} not found`);
            }
            console.error(`[UPDATE] Error updating question ${questionId}:`, error);
            throw new common_1.InternalServerErrorException(error.message || 'Failed to update question');
        }
    }
    async deleteQuestion(questionId) {
        if (!questionId || questionId.trim() === '') {
            throw new common_1.BadRequestException('Question ID is required');
        }
        const question = await this.prisma.question.findUnique({
            where: { id: questionId },
        });
        if (!question) {
            throw new common_1.NotFoundException(`Question with ID ${questionId} not found`);
        }
        const answerCount = await this.prisma.answer.count({
            where: { questionId: questionId },
        });
        if (answerCount > 0) {
            throw new common_1.BadRequestException(`Cannot delete question: it has ${answerCount} associated answer(s). Please remove answers first or contact support.`);
        }
        const activeSessionCount = await this.prisma.gameSession.count({
            where: { currentQuestionId: questionId },
        });
        if (activeSessionCount > 0) {
            throw new common_1.BadRequestException(`Cannot delete question: it is currently being used in ${activeSessionCount} active game session(s).`);
        }
        try {
            const deletedQuestion = await this.prisma.$transaction(async (tx) => {
                const questionToDelete = await tx.question.findUnique({
                    where: { id: questionId },
                });
                if (!questionToDelete) {
                    throw new common_1.NotFoundException(`Question with ID ${questionId} no longer exists`);
                }
                const deleted = await tx.question.delete({
                    where: { id: questionId },
                });
                console.log(`[DELETE] Deleted question: ${deleted.id} - "${deleted.question.substring(0, 50)}..."`);
                return deleted;
            });
            return deletedQuestion;
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException || error instanceof common_1.BadRequestException) {
                throw error;
            }
            if (error.code === 'P2025') {
                throw new common_1.NotFoundException(`Question with ID ${questionId} not found`);
            }
            console.error(`[DELETE] Error deleting question ${questionId}:`, error);
            throw new common_1.InternalServerErrorException(error.message || 'Failed to delete question');
        }
    }
    async getQuestionById(questionId) {
        return this.prisma.question.findUnique({
            where: { id: questionId },
        });
    }
    async getAnswersForQuestion(questionId, gameSessionId) {
        return this.prisma.answer.findMany({
            where: {
                questionId,
                gameSessionId,
            },
            include: {
                user: true,
            },
        });
    }
};
exports.GameService = GameService;
exports.GameService = GameService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], GameService);
//# sourceMappingURL=game.service.js.map
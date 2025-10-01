import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { Question, GameSession, User } from '@prisma/client';
type UserWithNumberScore = Omit<User, 'score'> & {
    score: number;
};
type GameSessionWithNumberScore = Omit<GameSession, 'gameMaster'> & {
    gameMaster: UserWithNumberScore | null;
};
export declare class GameService {
    private prisma;
    constructor(prisma: PrismaService);
    createQuestion(createQuestionDto: CreateQuestionDto): Promise<Question>;
    getAllQuestions(): Promise<Question[]>;
    getActiveQuestions(targetRole?: string): Promise<Question[]>;
    startGame(gameMasterId: string, episodeId?: string): Promise<GameSession>;
    getNextQuestion(gameSessionId: string, gameMasterId: string, targetRole?: string): Promise<Question>;
    submitAnswer(userId: string, questionId: string, gameSessionId: string, selectedOption: number): Promise<{
        isCorrect: boolean;
        correctAnswer: number;
    }>;
    endGame(gameSessionId: string, gameMasterId: string): Promise<any>;
    getUserById(userId: string): Promise<UserWithNumberScore>;
    getGameSession(gameSessionId: string): Promise<GameSessionWithNumberScore>;
    getActiveGameSessions(): Promise<GameSessionWithNumberScore[]>;
    clearAllScores(gameMasterId: string): Promise<{
        message: string;
        clearedCount: number;
    }>;
    updateQuestion(questionId: string, updateData: {
        isActive?: boolean;
    }): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        question: string;
        options: string[];
        correctAnswer: number;
        difficulty: number;
        targetRole: import(".prisma/client").$Enums.UserRole;
        questionType: import(".prisma/client").$Enums.QuestionType;
        episodeId: string | null;
    }>;
    getQuestionById(questionId: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        question: string;
        options: string[];
        correctAnswer: number;
        difficulty: number;
        targetRole: import(".prisma/client").$Enums.UserRole;
        questionType: import(".prisma/client").$Enums.QuestionType;
        episodeId: string | null;
    }>;
    getAnswersForQuestion(questionId: string, gameSessionId: string): Promise<({
        user: {
            id: string;
            username: string;
            email: string;
            uniqueNumber: string;
            password: string;
            role: import(".prisma/client").$Enums.UserRole;
            isActive: boolean;
            score: bigint;
            createdAt: Date;
            updatedAt: Date;
        };
    } & {
        id: string;
        createdAt: Date;
        questionId: string;
        gameSessionId: string;
        selectedOption: number;
        userId: string;
        isCorrect: boolean;
        responseTime: number;
    })[]>;
}
export {};

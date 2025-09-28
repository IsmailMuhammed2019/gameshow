import { GameService } from './game.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
export declare class GameController {
    private readonly gameService;
    constructor(gameService: GameService);
    createQuestion(createQuestionDto: CreateQuestionDto): Promise<{
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
    }>;
    getAllQuestions(): Promise<{
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
    }[]>;
    getParticipantQuestions(): Promise<{
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
    }[]>;
    getAudienceQuestions(): Promise<{
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
    }[]>;
    getActiveQuestions(): Promise<{
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
    }[]>;
    debugQuestions(): Promise<{
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
    }[]>;
    updateQuestion(id: string, updateData: {
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
    }>;
    startGame(req: any): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.GameStatus;
        currentQuestionId: string | null;
        currentQuestionIndex: number;
        totalQuestions: number;
        gameMasterId: string;
    }>;
    getNextQuestion(sessionId: string, req: any, body?: {
        targetRole?: string;
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
    }>;
    submitAnswer(submitAnswerDto: SubmitAnswerDto, req: any): Promise<{
        isCorrect: boolean;
        correctAnswer: number;
    }>;
    endGame(sessionId: string, req: any): Promise<any>;
    getGameSession(sessionId: string): Promise<Omit<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.GameStatus;
        currentQuestionId: string | null;
        currentQuestionIndex: number;
        totalQuestions: number;
        gameMasterId: string;
    }, "gameMaster"> & {
        gameMaster: (Omit<{
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
        }, "score"> & {
            score: number;
        }) | null;
    }>;
    getActiveGameSessions(): Promise<(Omit<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.GameStatus;
        currentQuestionId: string | null;
        currentQuestionIndex: number;
        totalQuestions: number;
        gameMasterId: string;
    }, "gameMaster"> & {
        gameMaster: (Omit<{
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
        }, "score"> & {
            score: number;
        }) | null;
    })[]>;
    clearScores(req: any): Promise<{
        message: string;
        clearedCount: number;
    }>;
}

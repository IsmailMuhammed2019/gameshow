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
    }[]>;
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
    getNextQuestion(sessionId: string, req: any): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        question: string;
        options: string[];
        correctAnswer: number;
        difficulty: number;
    }>;
    submitAnswer(submitAnswerDto: SubmitAnswerDto, req: any): Promise<{
        isCorrect: boolean;
        correctAnswer: number;
    }>;
    endGame(sessionId: string, req: any): Promise<any>;
    getGameSession(sessionId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.GameStatus;
        currentQuestionId: string | null;
        currentQuestionIndex: number;
        totalQuestions: number;
        gameMasterId: string;
    }>;
    getActiveGameSessions(): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.GameStatus;
        currentQuestionId: string | null;
        currentQuestionIndex: number;
        totalQuestions: number;
        gameMasterId: string;
    }[]>;
}

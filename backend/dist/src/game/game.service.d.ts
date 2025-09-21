import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { Question, GameSession, User } from '@prisma/client';
export declare class GameService {
    private prisma;
    constructor(prisma: PrismaService);
    createQuestion(createQuestionDto: CreateQuestionDto): Promise<Question>;
    getAllQuestions(): Promise<Question[]>;
    getActiveQuestions(): Promise<Question[]>;
    startGame(gameMasterId: string): Promise<GameSession>;
    getNextQuestion(gameSessionId: string, gameMasterId: string): Promise<Question>;
    submitAnswer(userId: string, questionId: string, gameSessionId: string, selectedOption: number): Promise<{
        isCorrect: boolean;
        correctAnswer: number;
    }>;
    endGame(gameSessionId: string, gameMasterId: string): Promise<any>;
    getUserById(userId: string): Promise<User>;
    getGameSession(gameSessionId: string): Promise<GameSession>;
    getActiveGameSessions(): Promise<GameSession[]>;
}

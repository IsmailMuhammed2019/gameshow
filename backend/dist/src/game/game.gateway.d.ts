import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
export declare class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private gameService;
    server: Server;
    private connectedUsers;
    private questionTimer;
    private currentQuestionTimeLeft;
    private questionTimeLimit;
    constructor(gameService: GameService);
    private getTimeLimitByDifficulty;
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): Promise<void>;
    handleJoinGame(client: Socket, data: {
        userId: string;
        role: string;
        gameSessionId?: string;
    }): Promise<void>;
    private broadcastUserList;
    private startQuestionTimer;
    private stopQuestionTimer;
    private resetQuestionTimer;
    handleStartGame(client: Socket, data: {
        gameMasterId: string;
        targetRole?: string;
        episodeId?: string;
    }): Promise<{
        success: boolean;
        gameSession: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.GameStatus;
            episodeId: string | null;
            currentQuestionId: string | null;
            currentQuestionIndex: number;
            totalQuestions: number;
            gameMasterId: string;
        };
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        gameSession?: undefined;
    }>;
    handleNextQuestion(client: Socket, data: {
        gameSessionId: string;
        gameMasterId: string;
        targetRole?: string;
    }): Promise<{
        success: boolean;
        participantQuestion: any;
        audienceQuestion: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        participantQuestion?: undefined;
        audienceQuestion?: undefined;
    }>;
    handleSubmitAnswer(client: Socket, data: {
        userId: string;
        questionId: string;
        gameSessionId: string;
        selectedOption: number;
        responseTime?: number;
    }): Promise<{
        success: boolean;
        result: {
            isCorrect: boolean;
            correctAnswer: number;
            isWinner: boolean;
            responseTime: number;
        };
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        result?: undefined;
    }>;
    handleRevealAnswer(client: Socket, data: {
        questionId: string;
        gameSessionId: string;
    }): Promise<{
        success: boolean;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
    }>;
    handleEndGame(client: Socket, data: {
        gameSessionId: string;
        gameMasterId: string;
    }): Promise<{
        success: boolean;
        results: any;
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        results?: undefined;
    }>;
    handleSendSpecificQuestion(client: Socket, data: {
        gameSessionId: string;
        questionId: string;
        targetRole: 'PARTICIPANT' | 'AUDIENCE';
    }): Promise<{
        success: boolean;
        question: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            targetRole: import(".prisma/client").$Enums.UserRole;
            question: string;
            options: string[];
            correctAnswer: number;
            difficulty: number;
            questionType: import(".prisma/client").$Enums.QuestionType;
            episodeId: string | null;
        };
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        question?: undefined;
    }>;
    handleClearScores(client: Socket): Promise<{
        success: boolean;
        result: {
            message: string;
            clearedCount: number;
        };
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        result?: undefined;
    }>;
}

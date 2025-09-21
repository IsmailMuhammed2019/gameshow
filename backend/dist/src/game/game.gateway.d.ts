import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { GameService } from './game.service';
export declare class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private gameService;
    server: Server;
    private connectedUsers;
    constructor(gameService: GameService);
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): Promise<void>;
    handleJoinGame(client: Socket, data: {
        userId: string;
        role: string;
        gameSessionId?: string;
    }): Promise<void>;
    private broadcastUserList;
    handleStartGame(client: Socket, data: {
        gameMasterId: string;
    }): Promise<{
        success: boolean;
        gameSession: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            status: import(".prisma/client").$Enums.GameStatus;
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
    }): Promise<{
        success: boolean;
        question: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            question: string;
            options: string[];
            correctAnswer: number;
            difficulty: number;
        };
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        question?: undefined;
    }>;
    handleSubmitAnswer(client: Socket, data: {
        userId: string;
        questionId: string;
        gameSessionId: string;
        selectedOption: number;
    }): Promise<{
        success: boolean;
        result: {
            isCorrect: boolean;
            correctAnswer: number;
        };
        error?: undefined;
    } | {
        success: boolean;
        error: any;
        result?: undefined;
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
}

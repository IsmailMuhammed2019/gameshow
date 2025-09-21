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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const game_service_1 = require("./game.service");
let GameGateway = class GameGateway {
    constructor(gameService) {
        this.gameService = gameService;
        this.connectedUsers = new Map();
        setInterval(() => {
            this.broadcastUserList();
        }, 30000);
    }
    async handleConnection(client) {
        console.log(`Client connected: ${client.id}`);
    }
    async handleDisconnect(client) {
        console.log(`Client disconnected: ${client.id}`);
        for (const [userId, userData] of this.connectedUsers.entries()) {
            if (userData.socket.id === client.id) {
                console.log(`Removing user ${userId} from connected users`);
                this.connectedUsers.delete(userId);
                break;
            }
        }
        this.broadcastUserList();
    }
    async handleJoinGame(client, data) {
        console.log('User joining game:', data);
        this.connectedUsers.set(data.userId, {
            socket: client,
            userId: data.userId,
            role: data.role,
        });
        if (data.gameSessionId) {
            client.join(`game_${data.gameSessionId}`);
        }
        client.emit('joined_game', { success: true });
        this.broadcastUserList();
    }
    async broadcastUserList() {
        const participants = Array.from(this.connectedUsers.values())
            .filter(user => user.role === 'PARTICIPANT');
        const audience = Array.from(this.connectedUsers.values())
            .filter(user => user.role === 'AUDIENCE');
        const participantDetails = await Promise.all(participants.map(async (user) => {
            try {
                const userDetails = await this.gameService.getUserById(user.userId);
                return {
                    id: user.userId,
                    username: userDetails.username,
                    uniqueNumber: userDetails.uniqueNumber,
                    role: user.role,
                    score: Number(userDetails.score),
                };
            }
            catch (error) {
                console.error('Error getting user details:', error);
                return {
                    id: user.userId,
                    username: 'Unknown',
                    uniqueNumber: 'N/A',
                    role: user.role,
                    score: 0,
                };
            }
        }));
        const audienceDetails = await Promise.all(audience.map(async (user) => {
            try {
                const userDetails = await this.gameService.getUserById(user.userId);
                return {
                    id: user.userId,
                    username: userDetails.username,
                    uniqueNumber: userDetails.uniqueNumber,
                    role: user.role,
                    score: Number(userDetails.score),
                };
            }
            catch (error) {
                console.error('Error getting user details:', error);
                return {
                    id: user.userId,
                    username: 'Unknown',
                    uniqueNumber: 'N/A',
                    role: user.role,
                    score: 0,
                };
            }
        }));
        this.server.emit('user_list_updated', {
            participants: participantDetails,
            audience: audienceDetails,
        });
    }
    async handleStartGame(client, data) {
        try {
            console.log('Start game requested by:', data.gameMasterId);
            const gameSession = await this.gameService.startGame(data.gameMasterId);
            console.log('Game session created:', gameSession);
            client.join(`game_${gameSession.id}`);
            this.server.emit('game_started', gameSession);
            console.log('Game started event broadcasted');
            return { success: true, gameSession };
        }
        catch (error) {
            console.error('Error starting game:', error);
            client.emit('error', { message: error.message });
            return { success: false, error: error.message };
        }
    }
    async handleNextQuestion(client, data) {
        try {
            console.log('Next question requested:', data);
            const question = await this.gameService.getNextQuestion(data.gameSessionId, data.gameMasterId);
            console.log('Question retrieved:', question);
            this.server.emit('new_question', question);
            console.log('Question broadcasted to all clients');
            return { success: true, question };
        }
        catch (error) {
            console.error('Error getting next question:', error);
            client.emit('error', { message: error.message });
            return { success: false, error: error.message };
        }
    }
    async handleSubmitAnswer(client, data) {
        try {
            console.log('Answer submission received:', data);
            console.log('Calling gameService.submitAnswer...');
            const result = await this.gameService.submitAnswer(data.userId, data.questionId, data.gameSessionId, data.selectedOption);
            console.log('Answer result:', result);
            const updatedUser = await this.gameService.getUserById(data.userId);
            client.emit('answer_result', {
                isCorrect: result.isCorrect,
                correctAnswer: result.correctAnswer,
                selectedOption: data.selectedOption,
                updatedUser: {
                    ...updatedUser,
                    score: Number(updatedUser.score),
                },
            });
            const updatedGameSession = await this.gameService.getGameSession(data.gameSessionId);
            this.server.emit('game_session_updated', updatedGameSession);
            if (result.isCorrect) {
                this.server.emit('winner_announced', {
                    userId: data.userId,
                    username: updatedUser.username,
                    uniqueNumber: updatedUser.uniqueNumber,
                    role: updatedUser.role,
                });
            }
            this.broadcastUserList();
            return { success: true, result };
        }
        catch (error) {
            console.error('Error in handleSubmitAnswer:', error);
            client.emit('error', { message: error.message });
            return { success: false, error: error.message };
        }
    }
    async handleEndGame(client, data) {
        try {
            const results = await this.gameService.endGame(data.gameSessionId, data.gameMasterId);
            this.server.emit('game_ended', results);
            return { success: true, results };
        }
        catch (error) {
            client.emit('error', { message: error.message });
            return { success: false, error: error.message };
        }
    }
    async handleClearScores(client) {
        try {
            const user = this.connectedUsers.get(client.id);
            if (!user || user.role !== 'GAME_MASTER') {
                client.emit('error', { message: 'Only game masters can clear scores' });
                return { success: false, error: 'Unauthorized' };
            }
            const result = await this.gameService.clearAllScores(user.userId);
            const userDetails = await this.gameService.getUserById(user.userId);
            this.server.emit('scores_cleared', {
                message: result.message,
                clearedCount: result.clearedCount,
                clearedBy: userDetails.username,
            });
            this.broadcastUserList();
            return { success: true, result };
        }
        catch (error) {
            console.error('Error clearing scores:', error);
            client.emit('error', { message: error.message });
            return { success: false, error: error.message };
        }
    }
};
exports.GameGateway = GameGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], GameGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('join_game'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], GameGateway.prototype, "handleJoinGame", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('start_game'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], GameGateway.prototype, "handleStartGame", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('next_question'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], GameGateway.prototype, "handleNextQuestion", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('submit_answer'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], GameGateway.prototype, "handleSubmitAnswer", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('end_game'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], GameGateway.prototype, "handleEndGame", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('clear_scores'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", Promise)
], GameGateway.prototype, "handleClearScores", null);
exports.GameGateway = GameGateway = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: ['http://localhost:3000', 'https://localhost:3000'],
            credentials: true,
        },
    }),
    __metadata("design:paramtypes", [game_service_1.GameService])
], GameGateway);
//# sourceMappingURL=game.gateway.js.map
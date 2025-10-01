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
        this.questionTimer = null;
        this.currentQuestionTimeLeft = 0;
        this.questionTimeLimit = 10;
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
    startQuestionTimer() {
        this.currentQuestionTimeLeft = this.questionTimeLimit;
        this.server.emit('timer_started', {
            timeLimit: this.questionTimeLimit,
            timeLeft: this.currentQuestionTimeLeft,
        });
        this.questionTimer = setInterval(() => {
            this.currentQuestionTimeLeft--;
            this.server.emit('timer_update', {
                timeLeft: this.currentQuestionTimeLeft,
                timeLimit: this.questionTimeLimit,
            });
            if (this.currentQuestionTimeLeft <= 0) {
                this.stopQuestionTimer();
                this.server.emit('timer_expired', {
                    message: 'Time\'s up! The question has expired.',
                });
            }
        }, 1000);
    }
    stopQuestionTimer() {
        if (this.questionTimer) {
            clearInterval(this.questionTimer);
            this.questionTimer = null;
        }
        this.currentQuestionTimeLeft = 0;
    }
    resetQuestionTimer() {
        this.stopQuestionTimer();
        this.currentQuestionTimeLeft = 0;
    }
    async handleStartGame(client, data) {
        try {
            console.log('Start game requested by:', data.gameMasterId, 'targetRole:', data.targetRole, 'episodeId:', data.episodeId);
            const gameSession = await this.gameService.startGame(data.gameMasterId, data.episodeId);
            console.log('Game session created:', gameSession);
            client.join(`game_${gameSession.id}`);
            this.server.emit('game_started', gameSession);
            console.log('Game started event broadcasted');
            if (data.targetRole) {
                console.log('Getting first question for target role:', data.targetRole);
                let participantQuestion = null;
                let audienceQuestion = null;
                if (data.targetRole === 'BOTH' || data.targetRole === 'PARTICIPANT') {
                    participantQuestion = await this.gameService.getNextQuestion(gameSession.id, data.gameMasterId, 'PARTICIPANT');
                }
                if (data.targetRole === 'BOTH' || data.targetRole === 'AUDIENCE') {
                    audienceQuestion = await this.gameService.getNextQuestion(gameSession.id, data.gameMasterId, 'AUDIENCE');
                }
                console.log('First participant question:', participantQuestion);
                console.log('First audience question:', audienceQuestion);
                this.server.emit('new_question', {
                    participantQuestion,
                    audienceQuestion,
                });
                console.log('First questions broadcasted to all clients');
                this.startQuestionTimer();
            }
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
            let participantQuestion = null;
            let audienceQuestion = null;
            if (data.targetRole === 'BOTH' || data.targetRole === 'PARTICIPANT') {
                participantQuestion = await this.gameService.getNextQuestion(data.gameSessionId, data.gameMasterId, 'PARTICIPANT');
            }
            if (data.targetRole === 'BOTH' || data.targetRole === 'AUDIENCE') {
                audienceQuestion = await this.gameService.getNextQuestion(data.gameSessionId, data.gameMasterId, 'AUDIENCE');
            }
            console.log('Participant question retrieved:', participantQuestion);
            console.log('Audience question retrieved:', audienceQuestion);
            this.server.emit('new_question', {
                participantQuestion,
                audienceQuestion,
            });
            console.log('Questions broadcasted to all clients');
            this.startQuestionTimer();
            client.emit('next_question_response', {
                success: true,
                participantQuestion,
                audienceQuestion
            });
            return { success: true, participantQuestion, audienceQuestion };
        }
        catch (error) {
            console.error('Error getting next question:', error);
            client.emit('error', { message: error.message });
            client.emit('next_question_response', { success: false, error: error.message });
            return { success: false, error: error.message };
        }
    }
    async handleSubmitAnswer(client, data) {
        try {
            console.log('Answer submission received:', data);
            console.log('Calling gameService.submitAnswer...');
            const result = await this.gameService.submitAnswer(data.userId, data.questionId, data.gameSessionId, data.selectedOption, data.responseTime);
            console.log('Answer result:', result);
            const updatedUser = await this.gameService.getUserById(data.userId);
            client.emit('answer_submitted', {
                submitted: true,
                selectedOption: data.selectedOption,
                message: 'Answer submitted! Waiting for game master to reveal results...',
            });
            this.server.emit('answer_submitted_notification', {
                userId: data.userId,
                username: updatedUser.username,
                uniqueNumber: updatedUser.uniqueNumber,
                role: updatedUser.role,
                selectedOption: data.selectedOption,
                isCorrect: result.isCorrect,
                isWinner: result.isWinner,
                responseTime: result.responseTime,
                questionId: data.questionId,
                gameSessionId: data.gameSessionId,
                timestamp: new Date().toISOString(),
            });
            const updatedGameSession = await this.gameService.getGameSession(data.gameSessionId);
            this.server.emit('game_session_updated', updatedGameSession);
            this.broadcastUserList();
            return { success: true, result };
        }
        catch (error) {
            console.error('Error in handleSubmitAnswer:', error);
            client.emit('error', { message: error.message });
            return { success: false, error: error.message };
        }
    }
    async handleRevealAnswer(client, data) {
        try {
            let user = null;
            for (const [userId, userData] of this.connectedUsers.entries()) {
                if (userData.socket.id === client.id) {
                    user = userData;
                    break;
                }
            }
            if (!user || user.role !== 'GAME_MASTER') {
                client.emit('error', { message: 'Only game masters can reveal answers' });
                return { success: false, error: 'Unauthorized' };
            }
            const question = await this.gameService.getQuestionById(data.questionId);
            if (!question) {
                client.emit('error', { message: 'Question not found' });
                return { success: false, error: 'Question not found' };
            }
            const answers = await this.gameService.getAnswersForQuestion(data.questionId, data.gameSessionId);
            this.stopQuestionTimer();
            this.server.emit('answer_revealed', {
                questionId: data.questionId,
                correctAnswer: question.correctAnswer,
                correctOption: question.options[question.correctAnswer],
                answers: answers.map(answer => ({
                    userId: answer.userId,
                    selectedOption: answer.selectedOption,
                    isCorrect: answer.isCorrect,
                    username: answer.user?.username,
                    role: answer.user?.role,
                })),
            });
            const correctParticipantAnswers = answers
                .filter(answer => answer.isCorrect && answer.user?.role === 'PARTICIPANT')
                .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            if (correctParticipantAnswers.length > 0) {
                const firstWinner = correctParticipantAnswers[0];
                this.server.emit('winner_announced', {
                    userId: firstWinner.userId,
                    username: firstWinner.user?.username,
                    uniqueNumber: firstWinner.user?.uniqueNumber,
                    role: firstWinner.user?.role,
                    responseTime: firstWinner.responseTime,
                    questionId: data.questionId,
                });
            }
            this.broadcastUserList();
            return { success: true };
        }
        catch (error) {
            console.error('Error revealing answer:', error);
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
    async handleSendSpecificQuestion(client, data) {
        try {
            console.log('Sending specific question:', data);
            const question = await this.gameService.getQuestionById(data.questionId);
            if (!question) {
                client.emit('error', { message: 'Question not found' });
                return { success: false, error: 'Question not found' };
            }
            await this.gameService.getGameSession(data.gameSessionId);
            this.stopQuestionTimer();
            if (data.targetRole === 'PARTICIPANT') {
                this.server.emit('new_question', {
                    participantQuestion: question,
                    audienceQuestion: null,
                });
            }
            else if (data.targetRole === 'AUDIENCE') {
                this.server.emit('new_question', {
                    participantQuestion: null,
                    audienceQuestion: question,
                });
            }
            console.log('Question sent to', data.targetRole);
            this.startQuestionTimer();
            return { success: true, question };
        }
        catch (error) {
            console.error('Error sending specific question:', error);
            client.emit('error', { message: error.message });
            return { success: false, error: error.message };
        }
    }
    async handleClearScores(client) {
        try {
            let user = null;
            for (const [userId, userData] of this.connectedUsers.entries()) {
                if (userData.socket.id === client.id) {
                    user = userData;
                    break;
                }
            }
            if (!user || user.role !== 'GAME_MASTER') {
                console.log('Clear scores unauthorized - user:', user);
                client.emit('error', { message: 'Only game masters can clear scores' });
                return { success: false, error: 'Unauthorized' };
            }
            console.log('Clearing scores for game master:', user.userId);
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
    (0, websockets_1.SubscribeMessage)('reveal_answer'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], GameGateway.prototype, "handleRevealAnswer", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('end_game'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], GameGateway.prototype, "handleEndGame", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('send_specific_question'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], GameGateway.prototype, "handleSendSpecificQuestion", null);
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
            origin: [
                'http://localhost:3000',
                'https://localhost:3000',
                'http://94.237.53.19:3000',
                'https://94.237.53.19:3000'
            ],
            credentials: true,
        },
    }),
    __metadata("design:paramtypes", [game_service_1.GameService])
], GameGateway);
//# sourceMappingURL=game.gateway.js.map
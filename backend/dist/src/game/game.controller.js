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
exports.GameController = void 0;
const common_1 = require("@nestjs/common");
const game_service_1 = require("./game.service");
const create_question_dto_1 = require("./dto/create-question.dto");
const submit_answer_dto_1 = require("./dto/submit-answer.dto");
const jwt_auth_guard_1 = require("../auth/jwt-auth.guard");
let GameController = class GameController {
    constructor(gameService) {
        this.gameService = gameService;
    }
    createQuestion(createQuestionDto) {
        return this.gameService.createQuestion(createQuestionDto);
    }
    getAllQuestions() {
        return this.gameService.getAllQuestions();
    }
    getActiveQuestions() {
        return this.gameService.getActiveQuestions();
    }
    startGame(req) {
        return this.gameService.startGame(req.user.userId);
    }
    getNextQuestion(sessionId, req) {
        return this.gameService.getNextQuestion(sessionId, req.user.userId);
    }
    submitAnswer(submitAnswerDto, req) {
        return this.gameService.submitAnswer(req.user.userId, submitAnswerDto.questionId, submitAnswerDto.gameSessionId, submitAnswerDto.selectedOption);
    }
    endGame(sessionId, req) {
        return this.gameService.endGame(sessionId, req.user.userId);
    }
    getGameSession(sessionId) {
        return this.gameService.getGameSession(sessionId);
    }
    getActiveGameSessions() {
        return this.gameService.getActiveGameSessions();
    }
    clearScores(req) {
        return this.gameService.clearAllScores(req.user.userId);
    }
};
exports.GameController = GameController;
__decorate([
    (0, common_1.Post)('questions'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_question_dto_1.CreateQuestionDto]),
    __metadata("design:returntype", void 0)
], GameController.prototype, "createQuestion", null);
__decorate([
    (0, common_1.Get)('questions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], GameController.prototype, "getAllQuestions", null);
__decorate([
    (0, common_1.Get)('questions/active'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], GameController.prototype, "getActiveQuestions", null);
__decorate([
    (0, common_1.Post)('start'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GameController.prototype, "startGame", null);
__decorate([
    (0, common_1.Post)('sessions/:sessionId/next-question'),
    __param(0, (0, common_1.Param)('sessionId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], GameController.prototype, "getNextQuestion", null);
__decorate([
    (0, common_1.Post)('submit-answer'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [submit_answer_dto_1.SubmitAnswerDto, Object]),
    __metadata("design:returntype", void 0)
], GameController.prototype, "submitAnswer", null);
__decorate([
    (0, common_1.Post)('sessions/:sessionId/end'),
    __param(0, (0, common_1.Param)('sessionId')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], GameController.prototype, "endGame", null);
__decorate([
    (0, common_1.Get)('sessions/:sessionId'),
    __param(0, (0, common_1.Param)('sessionId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], GameController.prototype, "getGameSession", null);
__decorate([
    (0, common_1.Get)('sessions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], GameController.prototype, "getActiveGameSessions", null);
__decorate([
    (0, common_1.Post)('clear-scores'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], GameController.prototype, "clearScores", null);
exports.GameController = GameController = __decorate([
    (0, common_1.Controller)('game'),
    (0, common_1.UseGuards)(jwt_auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [game_service_1.GameService])
], GameController);
//# sourceMappingURL=game.controller.js.map
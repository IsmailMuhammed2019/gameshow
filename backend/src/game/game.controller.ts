import { Controller, Get, Post, Body, Param, UseGuards, Request, Patch } from '@nestjs/common';
import { GameService } from './game.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('game')
@UseGuards(JwtAuthGuard)
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post('questions')
  createQuestion(@Body() createQuestionDto: CreateQuestionDto) {
    return this.gameService.createQuestion(createQuestionDto);
  }

  @Get('questions')
  getAllQuestions() {
    return this.gameService.getAllQuestions();
  }

  @Get('questions/participant')
  getParticipantQuestions() {
    return this.gameService.getActiveQuestions('PARTICIPANT');
  }

  @Get('questions/audience')
  getAudienceQuestions() {
    return this.gameService.getActiveQuestions('AUDIENCE');
  }

  @Get('questions/active')
  getActiveQuestions() {
    return this.gameService.getActiveQuestions();
  }

  @Get('questions/debug')
  async debugQuestions() {
    const allQuestions = await this.gameService.getAllQuestions();
    return allQuestions;
  }

  @Patch('questions/:id')
  async updateQuestion(@Param('id') id: string, @Body() updateData: { isActive?: boolean }) {
    return this.gameService.updateQuestion(id, updateData);
  }

  @Post('start')
  startGame(@Request() req, @Body() body: { episodeId?: string } = {}) {
    return this.gameService.startGame(req.user.userId, body.episodeId);
  }

  @Post('sessions/:sessionId/next-question')
  getNextQuestion(
    @Param('sessionId') sessionId: string,
    @Request() req,
    @Body() body: { targetRole?: string } = {},
  ) {
    return this.gameService.getNextQuestion(sessionId, req.user.userId, body.targetRole);
  }

  @Post('submit-answer')
  submitAnswer(@Body() submitAnswerDto: SubmitAnswerDto, @Request() req) {
    return this.gameService.submitAnswer(
      req.user.userId,
      submitAnswerDto.questionId,
      submitAnswerDto.gameSessionId,
      submitAnswerDto.selectedOption,
    );
  }

  @Post('sessions/:sessionId/end')
  endGame(@Param('sessionId') sessionId: string, @Request() req) {
    return this.gameService.endGame(sessionId, req.user.userId);
  }

  @Get('sessions/:sessionId')
  getGameSession(@Param('sessionId') sessionId: string) {
    return this.gameService.getGameSession(sessionId);
  }

  @Get('sessions')
  getActiveGameSessions() {
    return this.gameService.getActiveGameSessions();
  }

  @Post('clear-scores')
  clearScores(@Request() req) {
    return this.gameService.clearAllScores(req.user.userId);
  }
}

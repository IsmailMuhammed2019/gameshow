import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
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

  @Get('questions/active')
  getActiveQuestions() {
    return this.gameService.getActiveQuestions();
  }

  @Post('start')
  startGame(@Request() req) {
    return this.gameService.startGame(req.user.userId);
  }

  @Post('sessions/:sessionId/next-question')
  getNextQuestion(
    @Param('sessionId') sessionId: string,
    @Request() req,
  ) {
    return this.gameService.getNextQuestion(sessionId, req.user.userId);
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

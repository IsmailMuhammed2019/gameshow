import { Controller, Get, Post, Body, Param, UseGuards, Request, Patch, Delete } from '@nestjs/common';
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

  @Delete('questions/:id')
  async deleteQuestion(@Param('id') id: string, @Request() req) {
    // Only general admin can delete questions
    if (req.user.role !== 'GENERAL_ADMIN') {
      throw new Error('Unauthorized: Only general admin can delete questions');
    }
    
    // Validate ID parameter
    if (!id || id.trim() === '') {
      throw new Error('Question ID parameter is required');
    }
    
    console.log(`[DELETE] Attempting to delete question with ID: ${id}`);
    
    try {
      const result = await this.gameService.deleteQuestion(id);
      console.log(`[DELETE] Successfully deleted question with ID: ${id}`);
      return result;
    } catch (error) {
      console.error(`[DELETE] Error deleting question ${id}:`, error);
      throw error;
    }
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

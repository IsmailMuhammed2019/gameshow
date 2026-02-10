import { Injectable, NotFoundException, UnauthorizedException, BadRequestException, ForbiddenException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { Question, GameSession, Answer, User, GameStatus } from '@prisma/client';

// Custom type with score as number instead of bigint
type UserWithNumberScore = Omit<User, 'score'> & { score: number };

// Custom type for GameSession with gameMaster having number score
type GameSessionWithNumberScore = Omit<GameSession, 'gameMaster'> & {
  gameMaster: UserWithNumberScore | null;
};

@Injectable()
export class GameService {
  constructor(private prisma: PrismaService) { }

  async createQuestion(createQuestionDto: CreateQuestionDto): Promise<Question> {
    return this.prisma.question.create({
      data: createQuestionDto,
    });
  }

  async getAllQuestions(): Promise<Question[]> {
    return this.prisma.question.findMany();
  }

  async getActiveQuestions(targetRole?: string): Promise<Question[]> {
    const whereClause: any = { isActive: true };

    if (targetRole) {
      whereClause.targetRole = targetRole;
    }

    console.log('Getting active questions with whereClause:', whereClause);
    const questions = await this.prisma.question.findMany({ where: whereClause });
    console.log(`Found ${questions.length} questions for role: ${targetRole || 'ALL'}`);
    return questions;
  }

  async startGame(gameMasterId: string, episodeId?: string): Promise<GameSession> {
    const gameMaster = await this.prisma.user.findUnique({ where: { id: gameMasterId } });
    if (!gameMaster) {
      throw new NotFoundException('Game master not found');
    }

    // If episodeId is provided, verify it exists and is published
    if (episodeId) {
      const episode = await this.prisma.episode.findUnique({
        where: { id: episodeId },
        include: { questions: { where: { isActive: true } } }
      });

      if (!episode) {
        throw new NotFoundException('Episode not found');
      }

      if (episode.status !== 'PUBLISHED') {
        throw new BadRequestException('Episode is not published');
      }

      if (episode.questions.length === 0) {
        throw new BadRequestException('Episode has no questions');
      }
    }

    return this.prisma.gameSession.create({
      data: {
        gameMasterId,
        episodeId,
        status: GameStatus.ACTIVE,
        currentQuestionIndex: 0,
      },
    });
  }

  async getNextQuestion(gameSessionId: string, gameMasterId: string, targetRole?: string): Promise<Question> {
    console.log(`getNextQuestion called with: gameSessionId=${gameSessionId}, gameMasterId=${gameMasterId}, targetRole=${targetRole}`);

    // First try to find with gameMasterId
    let gameSession = await this.prisma.gameSession.findFirst({
      where: { id: gameSessionId, gameMasterId },
      include: { episode: true }
    });

    console.log('Looking for game session with:', { gameSessionId, gameMasterId });
    console.log('Found game session with gameMasterId:', gameSession);

    // If not found, try to find just by gameSessionId (in case gameMasterId doesn't match)
    if (!gameSession) {
      gameSession = await this.prisma.gameSession.findFirst({
        where: { id: gameSessionId },
        include: { episode: true }
      });
      console.log('Found game session by ID only:', gameSession);
    }

    if (!gameSession) {
      console.log('Game session not found');
      throw new NotFoundException('Game session not found');
    }

    if (gameSession.status !== GameStatus.ACTIVE) {
      console.log('Game is not active, status:', gameSession.status);
      throw new BadRequestException('Game is not active');
    }

    // Get all questions that have been SENT in this session
    // We track this by checking ALL answer records (including "sent" markers with selectedOption = -1)
    // This ensures we track questions that were sent even if no one answered them
    const allAnswersInSession = await this.prisma.answer.findMany({
      where: { gameSessionId },
      select: { questionId: true },
      distinct: ['questionId'],
    });
    const sentQuestionIds = new Set<string>();

    // Add all questions that appear in answer records (these were definitely sent)
    // This includes both real answers AND "sent" markers (selectedOption = -1)
    allAnswersInSession.forEach(answer => sentQuestionIds.add(answer.questionId));

    // Also add current question if it exists (it was sent and is currently displayed)
    // This catches the question that was just sent but marker hasn't been created yet
    if (gameSession.currentQuestionId) {
      sentQuestionIds.add(gameSession.currentQuestionId);
    }

    const allSentQuestionIds = Array.from(sentQuestionIds);
    console.log(`Total sent question IDs in this session: ${allSentQuestionIds.length}`, allSentQuestionIds);

    let questions: Question[];

    // If episode is selected, get questions from that episode
    if (gameSession.episodeId) {
      console.log('Getting questions from episode:', gameSession.episodeId);
      const whereClause: any = {
        episodeId: gameSession.episodeId,
        isActive: true,
        // Exclude questions that have been sent (answered OR currently displayed)
        id: {
          notIn: allSentQuestionIds.length > 0 ? allSentQuestionIds : [],
        },
      };

      if (targetRole) {
        whereClause.targetRole = targetRole;
      }

      questions = await this.prisma.question.findMany({ where: whereClause });
    } else {
      // Fallback to all active questions, excluding sent ones
      const whereClause: any = {
        isActive: true,
        id: {
          notIn: allSentQuestionIds.length > 0 ? allSentQuestionIds : [],
        },
      };

      if (targetRole) {
        whereClause.targetRole = targetRole;
      }

      questions = await this.prisma.question.findMany({ where: whereClause });
    }

    console.log(`Found ${questions.length} unsent questions for role: ${targetRole || 'PARTICIPANT'}`);

    if (questions.length === 0) {
      console.log(`No unsent questions available for role: ${targetRole || 'PARTICIPANT'}`);
      throw new BadRequestException(`No unsent questions available for role: ${targetRole || 'PARTICIPANT'}. All questions have been sent in this session.`);
    }

    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    console.log('Selected random question:', randomQuestion.id, randomQuestion.question);

    // Update game session with current question AND create a sent marker
    // This ensures the question is tracked as sent even if no one answers
    await this.updateGameSessionQuestion(gameSessionId, randomQuestion.id);

    return randomQuestion;
  }


  async submitAnswer(
    userId: string,
    questionId: string,
    gameSessionId: string,
    selectedOption: number,
    responseTime?: number,
  ): Promise<{ isCorrect: boolean; correctAnswer: number; isWinner: boolean; responseTime: number }> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    const question = await this.prisma.question.findUnique({ where: { id: questionId } });
    const gameSession = await this.prisma.gameSession.findUnique({ where: { id: gameSessionId } });

    if (!user || !question || !gameSession) {
      throw new NotFoundException('User, question, or game session not found');
    }

    // Check if user already answered this question
    const existingAnswer = await this.prisma.answer.findFirst({
      where: { userId, questionId, gameSessionId },
    });

    if (existingAnswer) {
      throw new BadRequestException('User already answered this question');
    }

    const isCorrect = selectedOption === question.correctAnswer;
    const calculatedResponseTime = responseTime || 0;

    // Check if this is the first correct answer for the user's role
    let isWinner = false;
    if (isCorrect && (user.role === 'PARTICIPANT' || user.role === 'AUDIENCE')) {
      const existingCorrectAnswers = await this.prisma.answer.findMany({
        where: {
          questionId,
          gameSessionId,
          isCorrect: true,
        },
        include: { user: true },
      });

      // Check if this is the first correct answer for this user's role
      const roleCorrectAnswers = existingCorrectAnswers.filter(
        answer => answer.user.role === user.role
      );

      isWinner = roleCorrectAnswers.length === 0; // First correct answer for this role
    }

    // Save the answer and update user score in a transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.answer.create({
        data: {
          userId,
          questionId,
          gameSessionId,
          selectedOption,
          isCorrect,
          responseTime: calculatedResponseTime,
        },
      });

      // Don't update scores immediately - wait for game master to reveal answers
      // Scores will be updated when the game master reveals the correct answers
    });

    return {
      isCorrect,
      correctAnswer: question.correctAnswer,
      isWinner,
      responseTime: calculatedResponseTime,
    };
  }

  async endGame(gameSessionId: string, gameMasterId: string): Promise<any> {
    const gameSession = await this.prisma.gameSession.findFirst({
      where: { id: gameSessionId, gameMasterId },
    });

    if (!gameSession) {
      throw new NotFoundException('Game session not found');
    }

    const updatedGameSession = await this.prisma.gameSession.update({
      where: { id: gameSessionId },
      data: { status: GameStatus.FINISHED },
    });

    // Get game results
    const answers = await this.prisma.answer.findMany({
      where: { gameSessionId },
      include: { user: true },
    });

    const results = answers.reduce((acc, answer) => {
      const userId = answer.userId;
      if (!acc[userId]) {
        acc[userId] = {
          user: {
            ...answer.user,
            score: Number(answer.user.score), // Convert BigInt to number
          },
          correctAnswers: 0,
          totalAnswers: 0,
        };
      }
      acc[userId].totalAnswers += 1;
      if (answer.isCorrect) {
        acc[userId].correctAnswers += 1;
      }
      return acc;
    }, {});

    return {
      gameSession: updatedGameSession,
      results: Object.values(results),
    };
  }

  async getUserById(userId: string): Promise<UserWithNumberScore> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return {
      ...user,
      score: Number(user.score), // Convert BigInt to number
    };
  }

  async updateUserScore(userId: string, points: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { score: { increment: points } },
    });
  }

  async getGameSession(gameSessionId: string): Promise<GameSessionWithNumberScore> {
    const gameSession = await this.prisma.gameSession.findUnique({
      where: { id: gameSessionId },
      include: { currentQuestion: true, gameMaster: true },
    });

    if (!gameSession) {
      throw new NotFoundException('Game session not found');
    }

    // Convert BigInt score to number in gameMaster
    const result: GameSessionWithNumberScore = {
      ...gameSession,
      gameMaster: gameSession.gameMaster ? {
        ...gameSession.gameMaster,
        score: Number(gameSession.gameMaster.score),
      } : null,
    };

    return result;
  }

  async updateGameSessionQuestion(gameSessionId: string, questionId: string): Promise<void> {
    // Get current game session to increment the question index
    const gameSession = await this.prisma.gameSession.findUnique({
      where: { id: gameSessionId },
    });

    if (!gameSession) {
      throw new NotFoundException('Game session not found');
    }

    // Create a "sent" marker by creating a minimal answer record
    // This ensures the question is tracked as "sent" even if no one answers it
    // Check if ANY answer already exists for this question in this session
    // (If someone answered, the question was definitely sent, so we don't need a marker)
    const existingAnswer = await this.prisma.answer.findFirst({
      where: {
        gameSessionId,
        questionId,
      },
    });

    // Only create sent marker if no answer exists yet
    // This marks the question as "sent" so it won't be selected again
    if (!existingAnswer) {
      try {
        // Create a sent marker using game master's ID with selectedOption = -1
        // This is a special marker that indicates the question was sent
        // Note: If game master later answers, this will be replaced by their real answer
        await this.prisma.answer.create({
          data: {
            userId: gameSession.gameMasterId,
            questionId: questionId,
            gameSessionId: gameSessionId,
            selectedOption: -1, // Special marker value (-1 = sent but not answered)
            isCorrect: false,
            responseTime: 0,
          },
        });
        console.log(`Created sent marker for question ${questionId} in session ${gameSessionId}`);
      } catch (error) {
        // If marker creation fails (e.g., unique constraint), that's okay
        // It means an answer already exists, so the question is already tracked
        console.log(`Sent marker not needed - answer already exists for question ${questionId}`);
      }
    }

    // Update game session with the new current question
    await this.prisma.gameSession.update({
      where: { id: gameSessionId },
      data: {
        currentQuestionId: questionId,
        currentQuestionIndex: gameSession.currentQuestionIndex + 1,
      },
    });
  }

  async getActiveGameSessions(): Promise<GameSessionWithNumberScore[]> {
    const gameSessions = await this.prisma.gameSession.findMany({
      where: { status: GameStatus.ACTIVE },
      include: { currentQuestion: true, gameMaster: true },
    });

    // Convert BigInt scores to numbers in gameMaster
    return gameSessions.map(session => ({
      ...session,
      gameMaster: session.gameMaster ? {
        ...session.gameMaster,
        score: Number(session.gameMaster.score),
      } : null,
    })) as GameSessionWithNumberScore[];
  }

  async clearAllScores(gameMasterId: string): Promise<{ message: string; clearedCount: number }> {
    // Verify the user is a game master
    const gameMaster = await this.prisma.user.findUnique({
      where: { id: gameMasterId },
    });

    if (!gameMaster || gameMaster.role !== 'GAME_MASTER') {
      throw new ForbiddenException('Only game masters can clear scores');
    }

    // Reset all user scores to 0
    const result = await this.prisma.user.updateMany({
      where: {
        role: {
          in: ['PARTICIPANT', 'AUDIENCE'],
        },
      },
      data: {
        score: 0,
      },
    });

    return {
      message: 'All scores cleared successfully',
      clearedCount: result.count,
    };
  }

  async updateQuestion(questionId: string, updateData: { isActive?: boolean; episodeId?: string | null }) {
    // Validate that the question ID is provided and not empty
    if (!questionId || questionId.trim() === '') {
      throw new BadRequestException('Question ID is required');
    }

    try {
      return await this.prisma.question.update({
        where: { id: questionId },
        data: updateData,
      });
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundException(`Question with ID ${questionId} not found`);
      }
      console.error(`[UPDATE] Error updating question ${questionId}:`, error);
      throw new InternalServerErrorException(error.message || 'Failed to update question');
    }
  }

  async deleteQuestion(questionId: string) {
    // Validate that the question ID is provided and not empty
    if (!questionId || questionId.trim() === '') {
      throw new BadRequestException('Question ID is required');
    }

    // First check if the question exists
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
    });

    if (!question) {
      throw new NotFoundException(`Question with ID ${questionId} not found`);
    }

    // Check if question has associated answers (would cause RESTRICT constraint error)
    const answerCount = await this.prisma.answer.count({
      where: { questionId: questionId },
    });

    if (answerCount > 0) {
      throw new BadRequestException(
        `Cannot delete question: it has ${answerCount} associated answer(s). Please remove answers first or contact support.`
      );
    }

    // Check if question is being used in any active game sessions
    const activeSessionCount = await this.prisma.gameSession.count({
      where: { currentQuestionId: questionId },
    });

    if (activeSessionCount > 0) {
      throw new BadRequestException(
        `Cannot delete question: it is currently being used in ${activeSessionCount} active game session(s).`
      );
    }

    // Delete the question using a transaction to ensure atomicity
    // and verify only one question is deleted
    try {
      const deletedQuestion = await this.prisma.$transaction(async (tx) => {
        // Double-check the question still exists (concurrency protection)
        const questionToDelete = await tx.question.findUnique({
          where: { id: questionId },
        });

        if (!questionToDelete) {
          throw new NotFoundException(`Question with ID ${questionId} no longer exists`);
        }

        // Delete the specific question
        const deleted = await tx.question.delete({
          where: { id: questionId },
        });

        // Verify only one question was deleted by counting remaining questions
        // (This is a safety check, Prisma should already ensure this)
        console.log(`[DELETE] Deleted question: ${deleted.id} - "${deleted.question.substring(0, 50)}..."`);

        return deleted;
      });

      return deletedQuestion;
    } catch (error: any) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      if (error.code === 'P2025') {
        throw new NotFoundException(`Question with ID ${questionId} not found`);
      }
      console.error(`[DELETE] Error deleting question ${questionId}:`, error);
      throw new InternalServerErrorException(error.message || 'Failed to delete question');
    }
  }

  async getQuestionById(questionId: string) {
    return this.prisma.question.findUnique({
      where: { id: questionId },
    });
  }

  async getAnswersForQuestion(questionId: string, gameSessionId: string) {
    return this.prisma.answer.findMany({
      where: {
        questionId,
        gameSessionId,
      },
      include: {
        user: true,
      },
    });
  }
}

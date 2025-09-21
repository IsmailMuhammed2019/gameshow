import { Injectable, NotFoundException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { Question, GameSession, Answer, User, GameStatus } from '@prisma/client';

@Injectable()
export class GameService {
  constructor(private prisma: PrismaService) {}

  async createQuestion(createQuestionDto: CreateQuestionDto): Promise<Question> {
    return this.prisma.question.create({
      data: createQuestionDto,
    });
  }

  async getAllQuestions(): Promise<Question[]> {
    return this.prisma.question.findMany();
  }

  async getActiveQuestions(): Promise<Question[]> {
    return this.prisma.question.findMany({ where: { isActive: true } });
  }

  async startGame(gameMasterId: string): Promise<GameSession> {
    const gameMaster = await this.prisma.user.findUnique({ where: { id: gameMasterId } });
    if (!gameMaster) {
      throw new NotFoundException('Game master not found');
    }

    return this.prisma.gameSession.create({
      data: {
        gameMasterId,
        status: GameStatus.ACTIVE,
        currentQuestionIndex: 0,
      },
    });
  }

  async getNextQuestion(gameSessionId: string, gameMasterId: string): Promise<Question> {
    const gameSession = await this.prisma.gameSession.findFirst({
      where: { id: gameSessionId, gameMasterId },
    });

    if (!gameSession) {
      throw new NotFoundException('Game session not found');
    }

    if (gameSession.status !== GameStatus.ACTIVE) {
      throw new BadRequestException('Game is not active');
    }

    // Get a random active question
    const questions = await this.getActiveQuestions();
    if (questions.length === 0) {
      throw new BadRequestException('No active questions available');
    }

    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    
    // Update game session with current question
    await this.prisma.gameSession.update({
      where: { id: gameSessionId },
      data: {
        currentQuestionId: randomQuestion.id,
        currentQuestionIndex: gameSession.currentQuestionIndex + 1,
      },
    });

    return randomQuestion;
  }

  async submitAnswer(
    userId: string,
    questionId: string,
    gameSessionId: string,
    selectedOption: number,
  ): Promise<{ isCorrect: boolean; correctAnswer: number }> {
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
    const responseTime = 0; // Response time in milliseconds (0 for now, can be improved later)

    // Save the answer and update user score in a transaction
    await this.prisma.$transaction(async (tx) => {
      await tx.answer.create({
        data: {
          userId,
          questionId,
          gameSessionId,
          selectedOption,
          isCorrect,
          responseTime,
        },
      });

      // Update user score if correct
      if (isCorrect) {
        await tx.user.update({
          where: { id: userId },
          data: { score: { increment: 1 } },
        });
      }
    });

    return {
      isCorrect,
      correctAnswer: question.correctAnswer,
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
          user: answer.user,
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

  async getUserById(userId: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async getGameSession(gameSessionId: string): Promise<GameSession> {
    const gameSession = await this.prisma.gameSession.findUnique({
      where: { id: gameSessionId },
      include: { currentQuestion: true, gameMaster: true },
    });

    if (!gameSession) {
      throw new NotFoundException('Game session not found');
    }

    return gameSession;
  }

  async getActiveGameSessions(): Promise<GameSession[]> {
    return this.prisma.gameSession.findMany({
      where: { status: GameStatus.ACTIVE },
      include: { currentQuestion: true, gameMaster: true },
    });
  }
}

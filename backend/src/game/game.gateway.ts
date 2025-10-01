import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { GameService } from './game.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@WebSocketGateway({
  cors: {
    origin: [
      'http://localhost:3000', 
      'https://localhost:3000',
      'http://94.237.53.19:3000',
      'https://94.237.53.19:3000'
    ],
    credentials: true,
  },
})
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, { socket: Socket; userId: string; role: string }>();
  private questionTimer: NodeJS.Timeout | null = null;
  private currentQuestionTimeLeft: number = 0;
  private questionTimeLimit: number = 10; // Default time, will be set based on difficulty

  constructor(private gameService: GameService) {
    // Broadcast user list every 30 seconds to keep it updated
    setInterval(() => {
      this.broadcastUserList();
    }, 30000);
  }

  /**
   * Calculate timer duration based on question difficulty
   * Difficulty 1-3: Easy (10-15 seconds)
   * Difficulty 4-7: Medium (15-25 seconds) 
   * Difficulty 8-11: Hard (25-35 seconds)
   * Difficulty 12-15: Expert (35-45 seconds)
   */
  private getTimeLimitByDifficulty(difficulty: number): number {
    if (difficulty <= 3) {
      return 10 + (difficulty - 1) * 2; // 10, 12, 14 seconds
    } else if (difficulty <= 7) {
      return 15 + (difficulty - 4) * 2.5; // 15, 17.5, 20, 22.5 seconds
    } else if (difficulty <= 11) {
      return 25 + (difficulty - 8) * 2.5; // 25, 27.5, 30, 32.5 seconds
    } else {
      return 35 + (difficulty - 12) * 3.33; // 35, 38.33, 41.66, 45 seconds
    }
  }

  async handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    // Remove user from connected users
    for (const [userId, userData] of this.connectedUsers.entries()) {
      if (userData.socket.id === client.id) {
        console.log(`Removing user ${userId} from connected users`);
        this.connectedUsers.delete(userId);
        break;
      }
    }
    
    // Broadcast updated user list
    this.broadcastUserList();
  }

  @SubscribeMessage('join_game')
  async handleJoinGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; role: string; gameSessionId?: string },
  ) {
    console.log('User joining game:', data);
    
    this.connectedUsers.set(data.userId, {
      socket: client,
      userId: data.userId,
      role: data.role,
    });

    // Join user to role-specific room for targeted question distribution
    client.join(`role_${data.role}`);
    console.log(`User ${data.userId} joined role room: role_${data.role}`);

    if (data.gameSessionId) {
      client.join(`game_${data.gameSessionId}`);
    }

    client.emit('joined_game', { success: true });
    
    // Broadcast updated user list to all connected users
    this.broadcastUserList();
  }

  private async broadcastUserList() {
    const participants = Array.from(this.connectedUsers.values())
      .filter(user => user.role === 'PARTICIPANT');
    
    const audience = Array.from(this.connectedUsers.values())
      .filter(user => user.role === 'AUDIENCE');

    // Get user details for participants
    const participantDetails = await Promise.all(
      participants.map(async (user) => {
        try {
          const userDetails = await this.gameService.getUserById(user.userId);
          return {
            id: user.userId,
            username: userDetails.username,
            uniqueNumber: userDetails.uniqueNumber,
            role: user.role,
            score: Number(userDetails.score),
          };
        } catch (error) {
          console.error('Error getting user details:', error);
          return {
            id: user.userId,
            username: 'Unknown',
            uniqueNumber: 'N/A',
            role: user.role,
            score: 0,
          };
        }
      })
    );

    // Get user details for audience
    const audienceDetails = await Promise.all(
      audience.map(async (user) => {
        try {
          const userDetails = await this.gameService.getUserById(user.userId);
          return {
            id: user.userId,
            username: userDetails.username,
            uniqueNumber: userDetails.uniqueNumber,
            role: user.role,
            score: Number(userDetails.score),
          };
        } catch (error) {
          console.error('Error getting user details:', error);
          return {
            id: user.userId,
            username: 'Unknown',
            uniqueNumber: 'N/A',
            role: user.role,
            score: 0,
          };
        }
      })
    );

    this.server.emit('user_list_updated', {
      participants: participantDetails,
      audience: audienceDetails,
    });
  }

  private startQuestionTimer(difficulty?: number) {
    // Set time limit based on difficulty if provided, otherwise use default
    if (difficulty) {
      this.questionTimeLimit = Math.round(this.getTimeLimitByDifficulty(difficulty));
    }
    
    this.currentQuestionTimeLeft = this.questionTimeLimit;
    
    this.server.emit('timer_started', {
      timeLimit: this.questionTimeLimit,
      timeLeft: this.currentQuestionTimeLeft,
      difficulty: difficulty,
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

  private stopQuestionTimer() {
    if (this.questionTimer) {
      clearInterval(this.questionTimer);
      this.questionTimer = null;
    }
    this.currentQuestionTimeLeft = 0;
  }

  private resetQuestionTimer() {
    this.stopQuestionTimer();
    this.currentQuestionTimeLeft = 0;
  }

  @SubscribeMessage('start_game')
  async handleStartGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameMasterId: string; targetRole?: string; episodeId?: string },
  ) {
    try {
      console.log('Start game requested by:', data.gameMasterId, 'targetRole:', data.targetRole, 'episodeId:', data.episodeId);
      const gameSession = await this.gameService.startGame(data.gameMasterId, data.episodeId);
      console.log('Game session created:', gameSession);
      
      // Join the game master to the game room
      client.join(`game_${gameSession.id}`);
      
      // Emit to all connected users (broadcast to everyone)
      this.server.emit('game_started', gameSession);
      console.log('Game started event broadcasted');
      
      // Automatically get the first question based on target role
      if (data.targetRole) {
        console.log('Getting first question for target role:', data.targetRole);
        
        // Get questions based on target role
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

        // Send questions to appropriate roles
        if (participantQuestion) {
          this.server.to('role_PARTICIPANT').emit('new_question', {
            participantQuestion,
            audienceQuestion: null,
          });
          console.log('Participant question sent to participants');
        }
        
        if (audienceQuestion) {
          this.server.to('role_AUDIENCE').emit('new_question', {
            participantQuestion: null,
            audienceQuestion,
          });
          console.log('Audience question sent to audience');
        }

        // Also send to Game Master so they can see the questions
        client.emit('new_question', {
          participantQuestion,
          audienceQuestion,
        });
        
        // Start the timer for the first question (use participant question difficulty if available)
        const timerDifficulty = participantQuestion?.difficulty || 5; // Default to medium difficulty
        this.startQuestionTimer(timerDifficulty);
      }
      
      return { success: true, gameSession };
    } catch (error) {
      console.error('Error starting game:', error);
      client.emit('error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('next_question')
  async handleNextQuestion(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameSessionId: string; gameMasterId: string; targetRole?: string },
  ) {
    try {
      console.log('Next question requested:', data);
      
      // Get questions based on target role
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
      
      // Send questions to appropriate roles
      if (participantQuestion) {
        this.server.to('role_PARTICIPANT').emit('new_question', {
          participantQuestion,
          audienceQuestion: null,
        });
        console.log('Participant question sent to participants');
      }
      
      if (audienceQuestion) {
        this.server.to('role_AUDIENCE').emit('new_question', {
          participantQuestion: null,
          audienceQuestion,
        });
        console.log('Audience question sent to audience');
      }

      // Also send to Game Master so they can see the questions
      client.emit('new_question', {
        participantQuestion,
        audienceQuestion,
      });
      
      // Start the timer for the new question (use participant question difficulty if available)
      const timerDifficulty = participantQuestion?.difficulty || 5; // Default to medium difficulty
      this.startQuestionTimer(timerDifficulty);
      
      // Send acknowledgment back to the game master
      client.emit('next_question_response', { 
        success: true, 
        participantQuestion, 
        audienceQuestion 
      });
      
      return { success: true, participantQuestion, audienceQuestion };
    } catch (error) {
      console.error('Error getting next question:', error);
      client.emit('error', { message: error.message });
      client.emit('next_question_response', { success: false, error: error.message });
      return { success: false, error: error.message };
    }
  }


  @SubscribeMessage('submit_answer')
  async handleSubmitAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; questionId: string; gameSessionId: string; selectedOption: number; responseTime?: number },
  ) {
    try {
      console.log('Answer submission received:', data);
      console.log('Calling gameService.submitAnswer...');
      const result = await this.gameService.submitAnswer(
        data.userId,
        data.questionId,
        data.gameSessionId,
        data.selectedOption,
        data.responseTime,
      );
      console.log('Answer result:', result);

      // Get updated user information after score update
      const updatedUser = await this.gameService.getUserById(data.userId);

      // Store the answer result but don't reveal it yet
      // The game master will control when to reveal answers
      client.emit('answer_submitted', {
        submitted: true,
        selectedOption: data.selectedOption,
        // Don't send isCorrect or isWinner - keep it secret until reveal
        message: 'Answer submitted! Waiting for game master to reveal results...',
      });

      // Notify game master that an answer was submitted
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

      // Don't announce winner immediately - wait for game master to reveal
      // Winner will be announced when the game master clicks "Reveal Answer"
      // if (result.isWinner && updatedUser.role === 'PARTICIPANT') {
      //   this.server.emit('winner_announced', {
      //     userId: data.userId,
      //     username: updatedUser.username,
      //     uniqueNumber: updatedUser.uniqueNumber,
      //     role: updatedUser.role,
      //     responseTime: result.responseTime,
      //     questionId: data.questionId,
      //   });
      // }

      // Update game session state after answer submission
      const updatedGameSession = await this.gameService.getGameSession(data.gameSessionId);
      this.server.emit('game_session_updated', updatedGameSession);

      // Update user list to reflect score changes
      this.broadcastUserList();

      return { success: true, result };
    } catch (error) {
      console.error('Error in handleSubmitAnswer:', error);
      client.emit('error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('reveal_answer')
  async handleRevealAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { questionId: string; gameSessionId: string },
  ) {
    try {
      // Find the user by client ID in the connected users map
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

      // Get the question details
      const question = await this.gameService.getQuestionById(data.questionId);
      if (!question) {
        client.emit('error', { message: 'Question not found' });
        return { success: false, error: 'Question not found' };
      }

      // Get all answers for this question
      const answers = await this.gameService.getAnswersForQuestion(data.questionId, data.gameSessionId);

      // Stop the timer when answers are revealed
      this.stopQuestionTimer();
      
      // Broadcast the correct answer and results to all users
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

      // Announce only the FIRST winner (first correct answer for participants)
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

      // Broadcast updated user list to refresh leaderboards with new scores
      this.broadcastUserList();

      return { success: true };
    } catch (error) {
      console.error('Error revealing answer:', error);
      client.emit('error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('end_game')
  async handleEndGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameSessionId: string; gameMasterId: string },
  ) {
    try {
      const results = await this.gameService.endGame(data.gameSessionId, data.gameMasterId);
      this.server.emit('game_ended', results);
      return { success: true, results };
    } catch (error) {
      client.emit('error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('send_specific_question')
  async handleSendSpecificQuestion(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameSessionId: string; questionId: string; targetRole: 'PARTICIPANT' | 'AUDIENCE' },
  ) {
    try {
      console.log('Sending specific question:', data);
      
      // Get the question
      const question = await this.gameService.getQuestionById(data.questionId);
      if (!question) {
        client.emit('error', { message: 'Question not found' });
        return { success: false, error: 'Question not found' };
      }

      // Update game session with current question
      await this.gameService.getGameSession(data.gameSessionId);

      // Stop any existing timer
      this.stopQuestionTimer();

      // Send question only to the target role
      if (data.targetRole === 'PARTICIPANT') {
        // Send only to participants
        this.server.to('role_PARTICIPANT').emit('new_question', {
          participantQuestion: question,
          audienceQuestion: null,
        });
        // Also send to Game Master
        client.emit('new_question', {
          participantQuestion: question,
          audienceQuestion: null,
        });
      } else if (data.targetRole === 'AUDIENCE') {
        // Send only to audience
        this.server.to('role_AUDIENCE').emit('new_question', {
          participantQuestion: null,
          audienceQuestion: question,
        });
        // Also send to Game Master
        client.emit('new_question', {
          participantQuestion: null,
          audienceQuestion: question,
        });
      }

      console.log('Question sent to', data.targetRole);

      // Start the timer for the question with difficulty-based timing
      this.startQuestionTimer(question.difficulty);

      return { success: true, question };
    } catch (error) {
      console.error('Error sending specific question:', error);
      client.emit('error', { message: error.message });
      return { success: false, error: error.message };
    }
  }

  @SubscribeMessage('clear_scores')
  async handleClearScores(@ConnectedSocket() client: Socket) {
    try {
      // Find the user by client ID in the connected users map
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
      // Clear all scores using the game service
      const result = await this.gameService.clearAllScores(user.userId);
      
      // Get user details for the broadcast
      const userDetails = await this.gameService.getUserById(user.userId);
      
      // Broadcast to all connected users that scores have been cleared
      this.server.emit('scores_cleared', {
        message: result.message,
        clearedCount: result.clearedCount,
        clearedBy: userDetails.username,
      });

      // Update the user list to reflect the cleared scores
      this.broadcastUserList();

      return { success: true, result };
    } catch (error) {
      console.error('Error clearing scores:', error);
      client.emit('error', { message: error.message });
      return { success: false, error: error.message };
    }
  }
}

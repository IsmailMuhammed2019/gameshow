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

  constructor(private gameService: GameService) {
    // Broadcast user list every 30 seconds to keep it updated
    setInterval(() => {
      this.broadcastUserList();
    }, 30000);
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

  @SubscribeMessage('start_game')
  async handleStartGame(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { gameMasterId: string; targetRole?: string },
  ) {
    try {
      console.log('Start game requested by:', data.gameMasterId, 'targetRole:', data.targetRole);
      const gameSession = await this.gameService.startGame(data.gameMasterId);
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

        // Send the first question to all clients
        this.server.emit('new_question', {
          participantQuestion,
          audienceQuestion,
        });
        console.log('First questions broadcasted to all clients');
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
      
      // Send different questions to different user roles
      this.server.emit('new_question', {
        participantQuestion,
        audienceQuestion,
      });
      console.log('Questions broadcasted to all clients');
      
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
    @MessageBody() data: { userId: string; questionId: string; gameSessionId: string; selectedOption: number },
  ) {
    try {
      console.log('Answer submission received:', data);
      console.log('Calling gameService.submitAnswer...');
      const result = await this.gameService.submitAnswer(
        data.userId,
        data.questionId,
        data.gameSessionId,
        data.selectedOption,
      );
      console.log('Answer result:', result);

      // Get updated user information after score update
      const updatedUser = await this.gameService.getUserById(data.userId);

      // Store the answer result but don't reveal it yet
      // The game master will control when to reveal answers
      client.emit('answer_submitted', {
        submitted: true,
        selectedOption: data.selectedOption,
        message: 'Answer submitted! Waiting for game master to reveal results...',
      });

      // Update game session state after answer submission
      const updatedGameSession = await this.gameService.getGameSession(data.gameSessionId);
      this.server.emit('game_session_updated', updatedGameSession);

      // Don't announce winners immediately - wait for game master to reveal answers
      // Winners will be announced when the game master reveals the answer

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

      // Announce winners for correct answers (only for participants)
      const correctAnswers = answers.filter(answer => answer.isCorrect && answer.user?.role === 'PARTICIPANT');
      for (const correctAnswer of correctAnswers) {
        this.server.emit('winner_announced', {
          userId: correctAnswer.userId,
          username: correctAnswer.user?.username,
          uniqueNumber: correctAnswer.user?.uniqueNumber,
          role: correctAnswer.user?.role,
        });
      }

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

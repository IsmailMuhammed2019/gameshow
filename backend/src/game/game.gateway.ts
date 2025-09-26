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
    origin: ['http://localhost:3000', 'https://localhost:3000'],
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
      
      return { success: true, participantQuestion, audienceQuestion };
    } catch (error) {
      console.error('Error getting next question:', error);
      client.emit('error', { message: error.message });
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

      // Emit result to the user who answered with updated user info
      client.emit('answer_result', {
        isCorrect: result.isCorrect,
        correctAnswer: result.correctAnswer,
        selectedOption: data.selectedOption,
        updatedUser: {
          ...updatedUser,
          score: Number(updatedUser.score),
        },
      });

      // Update game session state after answer submission
      const updatedGameSession = await this.gameService.getGameSession(data.gameSessionId);
      this.server.emit('game_session_updated', updatedGameSession);

      // If correct and user is a participant, show winner to all participants and game master
      if (result.isCorrect && updatedUser.role === 'PARTICIPANT') {
        this.server.emit('winner_announced', {
          userId: data.userId,
          username: updatedUser.username,
          uniqueNumber: updatedUser.uniqueNumber,
          role: updatedUser.role,
        });
      }

      // Update user list to reflect score changes
      this.broadcastUserList();

      return { success: true, result };
    } catch (error) {
      console.error('Error in handleSubmitAnswer:', error);
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
      // Get the user from the connected users map
      const user = this.connectedUsers.get(client.id);
      if (!user || user.role !== 'GAME_MASTER') {
        client.emit('error', { message: 'Only game masters can clear scores' });
        return { success: false, error: 'Unauthorized' };
      }

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

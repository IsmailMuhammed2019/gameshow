'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Play, Pause, Square, Users, Trophy, Settings } from 'lucide-react';
import io from 'socket.io-client';

export default function GameMasterPage() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const {
    gameSession,
    currentQuestion,
    winners,
    participants,
    audience,
    setGameSession,
    setCurrentQuestion,
    addWinner,
    clearWinners,
    setParticipants,
    setAudience,
    resetGame
  } = useGameStore();
  
  const [socket, setSocket] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  
  // Use refs to avoid dependency issues
  const socketRef = useRef<any>(null);
  const userRef = useRef(user);
  const gameSessionRef = useRef(gameSession);

  // Update refs when values change
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    gameSessionRef.current = gameSession;
  }, [gameSession]);

  const nextQuestion = useCallback(async () => {
    setIsLoadingQuestion(true);
    const currentSocket = socketRef.current;
    const currentGameSession = gameSessionRef.current;
    const currentUser = userRef.current;

    console.log('Next question clicked - socket:', !!currentSocket, 'gameSession:', !!currentGameSession, 'user:', !!currentUser);

    if (currentSocket && currentGameSession && currentUser?.id) {
      console.log('Requesting next question for session:', currentGameSession.id);
      currentSocket.emit('next_question', {
        gameSessionId: currentGameSession.id,
        gameMasterId: currentUser.id,
      });
    } else {
      console.error('Cannot get next question: socket, gameSession, or user not available');
      setIsLoadingQuestion(false);
    }
  }, []);

  const startGame = useCallback(async () => {
    const currentSocket = socketRef.current;
    const currentUser = userRef.current;

    if (currentSocket && currentUser?.id) {
      console.log('Starting game with gameMasterId:', currentUser.id);
      currentSocket.emit('start_game', { gameMasterId: currentUser.id });
    } else {
      console.error('Cannot start game: socket or user not available');
    }
  }, []);

  const endGame = useCallback(async () => {
    const currentSocket = socketRef.current;
    const currentGameSession = gameSessionRef.current;
    const currentUser = userRef.current;

    if (currentSocket && currentGameSession) {
      currentSocket.emit('end_game', {
        gameSessionId: currentGameSession.id,
        gameMasterId: currentUser?.id,
      });
    }
  }, []);

  const handleLogout = useCallback(() => {
    logout();
    router.push('/');
  }, [logout, router]);

  // Initialize socket connection only once
  useEffect(() => {
    if (!user || user.role !== 'GAME_MASTER') {
      router.push('/');
      return;
    }

    // Add a small delay to ensure backend is ready
    const connectSocket = () => {
      console.log('Attempting to connect to WebSocket...');
      
      // Initialize socket connection
      const newSocket = io(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', {
        transports: ['polling', 'websocket'],
        timeout: 10000,
        forceNew: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });
    
      setSocket(newSocket);
      socketRef.current = newSocket;

      newSocket.on('connect', () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        newSocket.emit('join_game', {
          userId: user.id,
          role: user.role,
        });
      });

      newSocket.on('disconnect', () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
      });

      newSocket.on('connect_error', (error) => {
        console.error('WebSocket connection error:', error);
        setIsConnected(false);
      });

      newSocket.on('game_started', (session: any) => {
        console.log('Game started event received:', session);
        setGameSession(session);
        // Automatically get the first question when game starts
        setTimeout(() => {
          // Use the socket directly instead of the nextQuestion function
          if (newSocket && session) {
            console.log('Requesting next question for session:', session.id);
            newSocket.emit('next_question', {
              gameSessionId: session.id,
              gameMasterId: user?.id,
            });
          }
        }, 1000);
      });

      newSocket.on('new_question', (question: any) => {
        console.log('New question received:', question);
        setCurrentQuestion(question);
        setIsLoadingQuestion(false);
      });

      newSocket.on('winner_announced', (winner: any) => {
        addWinner(winner);
        setShowWinnerModal(true);
      });

      newSocket.on('game_ended', (results: any) => {
        console.log('Game ended:', results);
      });

      newSocket.on('error', (error: any) => {
        console.error('WebSocket error:', error);
      });

             newSocket.on('user_list_updated', (data: any) => {
               console.log('User list updated:', data);
               setParticipants(data.participants || []);
               setAudience(data.audience || []);
             });

             newSocket.on('game_session_updated', (session: any) => {
               console.log('Game session updated:', session);
               setGameSession(session);
             });

      newSocket.on('answer_result', (result: any) => {
        console.log('Answer result received in Game Master:', result);
        // This helps track when participants answer
      });

      return newSocket;
    };

    // Connect with a small delay
    const timeoutId = setTimeout(() => {
      connectSocket();
    }, 1000);

    return () => {
      clearTimeout(timeoutId);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, []); // Empty dependency array - only run once

  if (!user || user.role !== 'GAME_MASTER') {
    return null;
  }

  return (
    <div className="min-h-screen p-4">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <img
            src="/bantefun.jpg"
            alt="Logo"
            className="w-12 h-12 rounded-full border-2 border-white"
          />
          <div>
            <h1 className="text-2xl font-bold text-white">Game Master</h1>
            <p className="text-white/80">Welcome, {user.username}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-white text-sm">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          <Button variant="outline" onClick={handleLogout} className="ml-4">
            Logout
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Controls */}
        <Card className="game-master-screen">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Game Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="orange"
                onClick={startGame}
                disabled={!isConnected || gameSession?.status === 'ACTIVE'}
                className="w-full"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Game
              </Button>
              <Button
                variant="teal-blue"
                onClick={nextQuestion}
                disabled={!isConnected || !gameSession || gameSession.status !== 'ACTIVE' || isLoadingQuestion}
                className="w-full"
                title={`Connected: ${isConnected}, GameSession: ${!!gameSession}, Status: ${gameSession?.status}, Loading: ${isLoadingQuestion}`}
              >
                {isLoadingQuestion ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Loading...
                  </>
                ) : (
                  'Next Question'
                )}
              </Button>
            </div>
            <Button
              variant="dark-red"
              onClick={endGame}
              disabled={!isConnected || !gameSession}
              className="w-full"
            >
              <Square className="w-4 h-4 mr-2" />
              End Game
            </Button>
          </CardContent>
        </Card>

        {/* Current Question */}
        <Card className="question-card">
          <CardHeader>
            <CardTitle className="text-orange-600">Current Question</CardTitle>
          </CardHeader>
            <CardContent>
              {isLoadingQuestion ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500 mx-auto mb-4"></div>
                  <p className="text-gray-500">Loading question...</p>
                </div>
              ) : currentQuestion ? (
                <div>
                  <p className="text-lg font-medium mb-4">{currentQuestion.question}</p>
                  <div className="space-y-2">
                    {currentQuestion.options.map((option, index) => (
                      <div 
                        key={index}
                        className={`p-3 rounded-lg border-2 ${
                          index === currentQuestion.correctAnswer 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-gray-200'
                        }`}
                      >
                        <span className="font-medium text-orange-600">
                          {String.fromCharCode(65 + index)}.
                        </span>{' '}
                        {option}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">
                  No question active. Start the game to begin!
                </p>
              )}
            </CardContent>
        </Card>

        {/* Participants & Audience */}
        <Card className="question-card">
          <CardHeader>
            <CardTitle className="text-orange-600 flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Players
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-orange-600 mb-2">Participants ({participants.length})</h4>
                <div className="space-y-1">
                  {participants.map((participant) => (
                    <div key={participant.id} className="flex justify-between items-center p-2 bg-orange-50 rounded">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{participant.username}</span>
                      <span className="text-xs text-orange-600">#{participant.uniqueNumber}</span>
                      </div>
                      <span className="text-sm font-bold text-orange-700">
                        Score: {participant.score || 0}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium text-teal-blue-600 mb-2">Audience ({audience.length})</h4>
                <div className="space-y-1">
                  {audience.map((member) => (
                    <div key={member.id} className="flex justify-between items-center p-2 bg-teal-blue-50 rounded">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium">{member.username}</span>
                      <span className="text-xs text-teal-blue-600">#{member.uniqueNumber}</span>
                      </div>
                      <span className="text-xs text-teal-blue-500">Audience</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Winner Modal */}
      <Dialog open={showWinnerModal} onOpenChange={setShowWinnerModal}>
        <DialogContent className="winner-modal">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl text-orange-800">
              🎉 Winner! 🎉
            </DialogTitle>
            <DialogDescription className="text-center">
              {winners.length > 0 && (
                <div className="mt-4">
                  <p className="text-lg font-bold text-orange-700">
                    {winners[winners.length - 1].username}
                  </p>
                  <p className="text-orange-600">
                    #{winners[winners.length - 1].uniqueNumber}
                  </p>
                </div>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-center mt-4">
            <Button
              variant="orange"
              onClick={() => setShowWinnerModal(false)}
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
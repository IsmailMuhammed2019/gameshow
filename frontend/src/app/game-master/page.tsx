'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Play, Pause, Square, Users, Trophy, Settings, LogOut, RotateCcw, Eye } from 'lucide-react';
import io from 'socket.io-client';
import api from '@/lib/api';
import Leaderboard from '@/components/Leaderboard';

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
  const [targetRole, setTargetRole] = useState<'PARTICIPANT' | 'AUDIENCE' | 'BOTH'>('BOTH');
  const [answerNotifications, setAnswerNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [timeLimit, setTimeLimit] = useState<number>(10);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [episodes, setEpisodes] = useState<any[]>([]);
  const [selectedEpisode, setSelectedEpisode] = useState<string>('');

  const clearNotifications = () => {
    setAnswerNotifications([]);
    setShowNotifications(false);
  };

  const fetchEpisodes = async () => {
    try {
      const response = await api.get('/episodes');
      setEpisodes(response.data);
    } catch (error) {
      console.error('Error fetching episodes:', error);
    }
  };
  
  // Use refs to avoid dependency issues
  const socketRef = useRef<any>(null);
  const userRef = useRef(user);
  const gameSessionRef = useRef(gameSession);
  const currentQuestionRef = useRef(currentQuestion);

  // Update refs when values change
  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    gameSessionRef.current = gameSession;
  }, [gameSession]);

  useEffect(() => {
    currentQuestionRef.current = currentQuestion;
  }, [currentQuestion]);

  // Fetch episodes on component mount
  useEffect(() => {
    if (user && user.role === 'GAME_MASTER') {
      fetchEpisodes();
    }
  }, [user]);

  const nextQuestion = useCallback(async () => {
    setIsLoadingQuestion(true);
    const currentSocket = socketRef.current;
    const currentGameSession = gameSessionRef.current;
    const currentUser = userRef.current;

    console.log('Next question clicked - socket:', !!currentSocket, 'gameSession:', !!currentGameSession, 'user:', !!currentUser);

    if (currentSocket && currentGameSession && currentUser?.id) {
      console.log('Requesting next question for session:', currentGameSession.id, 'target role:', targetRole);
      currentSocket.emit('next_question', {
        gameSessionId: currentGameSession.id,
        gameMasterId: currentUser.id,
        targetRole: targetRole,
      });
    } else {
      console.error('Cannot get next question: socket, gameSession, or user not available');
      setIsLoadingQuestion(false);
    }
  }, [targetRole]);

  const startGame = useCallback(async () => {
    const currentSocket = socketRef.current;
    const currentUser = userRef.current;

    if (currentSocket && currentUser?.id) {
      console.log('Starting game with gameMasterId:', currentUser.id, 'targetRole:', targetRole, 'episodeId:', selectedEpisode);
      currentSocket.emit('start_game', { 
        gameMasterId: currentUser.id,
        targetRole: targetRole,
        episodeId: selectedEpisode || undefined
      });
    } else {
      console.error('Cannot start game: socket or user not available');
    }
  }, [targetRole, selectedEpisode]);

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

  const clearScores = useCallback(async () => {
    try {
      console.log('Clearing scores...');
      const currentSocket = socketRef.current;
      if (currentSocket) {
        currentSocket.emit('clear_scores');
        console.log('Clear scores event emitted');
      }
    } catch (error) {
      console.error('Error clearing scores:', error);
    }
  }, []);

  const revealAnswer = useCallback(async () => {
    try {
      console.log('Revealing answer...');
      const currentSocket = socketRef.current;
      const currentGameSession = gameSessionRef.current;
      const currentQuestionData = currentQuestionRef.current;
      
      if (currentSocket && currentGameSession && currentQuestionData) {
        currentSocket.emit('reveal_answer', {
          questionId: currentQuestionData.id,
          gameSessionId: currentGameSession.id,
        });
        console.log('Reveal answer event emitted');
      }
    } catch (error) {
      console.error('Error revealing answer:', error);
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
      const newSocket = io('http://94.237.53.19:3001', {
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
        console.log('Game session set:', session);
        console.log('Game session status:', session?.status);
        // Note: First question is now automatically provided by the backend when starting the game
      });

      newSocket.on('new_question', (questionData: any) => {
        console.log('New question received:', questionData);
        // Game Master sees the appropriate question based on target role
        let question = null;
        if (targetRole === 'PARTICIPANT' && questionData.participantQuestion) {
          question = questionData.participantQuestion;
        } else if (targetRole === 'AUDIENCE' && questionData.audienceQuestion) {
          question = questionData.audienceQuestion;
        } else if (targetRole === 'BOTH') {
          // For both, show participant question by default
          question = questionData.participantQuestion || questionData.audienceQuestion;
        } else {
          // Fallback to any available question
          question = questionData.participantQuestion || questionData.audienceQuestion || questionData;
        }
        setCurrentQuestion(question);
        setIsLoadingQuestion(false);
      });

      newSocket.on('winner_announced', (winner: any) => {
        addWinner(winner);
        setShowWinnerModal(true);
        // Auto-dismiss modal after 3 seconds
        setTimeout(() => {
          setShowWinnerModal(false);
        }, 3000);
      });

      newSocket.on('game_ended', (results: any) => {
        console.log('Game ended:', results);
      });

      newSocket.on('error', (error: any) => {
        console.error('WebSocket error:', error);
        alert(`Error: ${error.message}`);
        setIsLoadingQuestion(false);
      });

      // Add acknowledgment for next_question
      newSocket.on('next_question_response', (response: any) => {
        console.log('Next question response:', response);
        if (response.success) {
          console.log('Next question successful');
        } else {
          console.error('Next question failed:', response.error);
          alert(`Failed to get next question: ${response.error}`);
        }
        setIsLoadingQuestion(false);
      });

             newSocket.on('user_list_updated', (data: any) => {
               console.log('User list updated:', data);
               setParticipants(data.participants || []);
               setAudience(data.audience || []);
             });

             newSocket.on('game_session_updated', (session: any) => {
               console.log('Game session updated:', session);
               setGameSession(session);
               console.log('Updated game session status:', session?.status);
             });

      newSocket.on('answer_result', (result: any) => {
        console.log('Answer result received in Game Master:', result);
        // This helps track when participants answer
      });

      newSocket.on('answer_submitted_notification', (notification: any) => {
        console.log('Answer submitted notification:', notification);
        setAnswerNotifications(prev => [...prev, notification]);
        setShowNotifications(true);
        
        // Auto-hide notification after 5 seconds
        setTimeout(() => {
          setShowNotifications(false);
        }, 5000);
      });

      newSocket.on('scores_cleared', (data: any) => {
        console.log('Scores cleared:', data);
        // Show notification or update UI as needed
        alert(`Scores cleared! ${data.clearedCount} players reset to 0 points.`);
             });

      newSocket.on('timer_started', (timerData: any) => {
        console.log('Timer started:', timerData);
        setTimeLimit(timerData.timeLimit);
        setTimeLeft(timerData.timeLeft);
        setTimerActive(true);
      });

      newSocket.on('timer_update', (timerData: any) => {
        setTimeLeft(timerData.timeLeft);
      });

      newSocket.on('timer_expired', (data: any) => {
        console.log('Timer expired:', data);
        setTimerActive(false);
        setTimeLeft(0);
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
  }, [targetRole]); // Include targetRole to update question handling

  if (!user || user.role !== 'GAME_MASTER') {
    return null;
  }

  return (
    <div className="min-h-screen game-master-screen p-4">
      {/* TV Show Header */}
      <div className="game-show-header p-6 mb-8 rounded-b-3xl">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <div className="relative">
          <img
            src="/logo.png"
            alt="Logo"
                className="w-48 h-24 shadow-2xl"
          />
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
            </div>
          <div>
              <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
                🎮 GAME MASTER CONTROL
              </h1>
              <p className="text-xl text-orange-300 font-medium">
                Welcome, {user.username} • #{user.uniqueNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            {/* Notification Counter */}
            {answerNotifications.length > 0 && (
              <div className="flex items-center space-x-2 bg-orange-500/20 px-3 py-2 rounded-full border border-orange-400">
                <span className="text-orange-300 font-bold">
                  🔔 {answerNotifications.length} Answer{answerNotifications.length !== 1 ? 's' : ''}
                </span>
                <button
                  onClick={clearNotifications}
                  className="text-orange-300 hover:text-white text-sm"
                >
                  ✕
                </button>
              </div>
            )}
            
            <div className="flex items-center space-x-3 bg-black/30 px-4 py-2 rounded-full">
              <div className={`w-4 h-4 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-white font-medium">
                {isConnected ? 'LIVE' : 'OFFLINE'}
              </span>
        </div>
            <Button 
              variant="outline" 
              onClick={handleLogout} 
              className="bg-red-600/20 border-red-500 text-white hover:bg-red-600/30"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Exit Studio
          </Button>
          </div>
        </div>
      </div>

      {/* Answer Notifications */}
      {showNotifications && answerNotifications.length > 0 && (
        <div className="fixed top-20 right-4 z-50 space-y-2 max-w-sm">
          {answerNotifications.slice(-3).map((notification, index) => (
            <div
              key={`${notification.userId}-${notification.timestamp}`}
              className="bg-green-500 text-white p-4 rounded-lg shadow-lg border-l-4 border-green-400 animate-slide-in-right"
            >
              <div className="flex items-center space-x-3">
                <div className="text-2xl">
                  {notification.role === 'PARTICIPANT' ? '👥' : '👀'}
                </div>
                <div>
                  <p className="font-bold text-lg">
                    {notification.username} #{notification.uniqueNumber}
                  </p>
                  <p className="text-sm opacity-90">
                    Answered: {String.fromCharCode(65 + notification.selectedOption)}
                  </p>
                  <p className="text-xs opacity-75">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Game Controls */}
        <Card className="control-panel">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-white mb-2">
              🎛️ CONTROL PANEL
            </CardTitle>
            <CardDescription className="text-orange-300">
              Master the game flow
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Episode Selection */}
            <div className="space-y-3">
              <label className="text-white font-medium">Select Episode:</label>
              <select
                value={selectedEpisode}
                onChange={(e) => setSelectedEpisode(e.target.value)}
                className="w-full p-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:border-orange-500 focus:outline-none"
              >
                <option value="">🎲 Random Questions (No Episode)</option>
                {episodes.filter(ep => ep.status === 'PUBLISHED').map((episode) => (
                  <option key={episode.id} value={episode.id}>
                    📺 {episode.title} ({episode._count?.questions || 0} questions)
                  </option>
                ))}
              </select>
              {selectedEpisode && (
                <div className="text-xs text-orange-300 bg-orange-500/10 p-2 rounded">
                  ℹ️ Questions will be selected from this episode
                </div>
              )}
            </div>

            {/* Role Selection */}
            <div className="space-y-3">
              <label className="text-white font-medium">Target Role:</label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setTargetRole('PARTICIPANT')}
                  className={`p-2 rounded-lg text-sm font-medium transition-all ${
                    targetRole === 'PARTICIPANT'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  👥 Participants
                </button>
                <button
                  onClick={() => setTargetRole('AUDIENCE')}
                  className={`p-2 rounded-lg text-sm font-medium transition-all ${
                    targetRole === 'AUDIENCE'
                      ? 'bg-teal-500 text-white'
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  👀 Audience
                </button>
                <button
                  onClick={() => setTargetRole('BOTH')}
                  className={`p-2 rounded-lg text-sm font-medium transition-all ${
                    targetRole === 'BOTH'
                      ? 'bg-purple-500 text-white'
                      : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                  }`}
                >
                  🌟 Both
                </button>
              </div>
            </div>
            
            {/* Timer Display */}
            {timerActive && (
              <div className="mb-6 p-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg border-2 border-white/20">
                <div className="flex items-center justify-center space-x-3">
                  <div className="text-3xl">⏰</div>
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${timeLeft <= 10 ? 'text-red-300 animate-pulse' : 'text-white'}`}>
                      {timeLeft}
                    </div>
                    <div className="text-sm text-white/80">seconds left</div>
                  </div>
                  <div className="w-16 h-2 bg-white/20 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-white transition-all duration-1000 ease-linear"
                      style={{ width: `${(timeLeft / timeLimit) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              <Button
                variant="orange"
                onClick={startGame}
                disabled={!isConnected || gameSession?.status === 'active'}
                className="w-full h-16 text-lg font-bold bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 shadow-lg"
              >
                <Play className="w-6 h-6 mr-3" />
                🚀 START GAME
              </Button>
              <Button
                variant="teal-blue"
                onClick={nextQuestion}
                disabled={isLoadingQuestion}
                className="w-full h-16 text-lg font-bold bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 shadow-lg"
                title={`Debug: Connected=${isConnected}, GameSession=${!!gameSession}, Status=${gameSession?.status}, Loading=${isLoadingQuestion}, TargetRole=${targetRole}`}
              >
                {isLoadingQuestion ? (
                  <>
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                    LOADING...
                  </>
                ) : (
                  <>
                    <Settings className="w-6 h-6 mr-3" />
                    📝 NEXT QUESTION
                  </>
                )}
              </Button>
            </div>
            <Button
              variant="teal-blue"
              onClick={revealAnswer}
              disabled={!isConnected || !gameSession || !currentQuestion}
              className="w-full h-16 text-lg font-bold bg-gradient-to-r from-teal-500 to-light-blue-500 hover:from-teal-600 hover:to-light-blue-600 shadow-lg"
            >
              <Eye className="w-6 h-6 mr-3" />
              👁️ REVEAL ANSWER
            </Button>
            <Button
              variant="dark-red"
              onClick={endGame}
              disabled={!isConnected || !gameSession}
              className="w-full h-16 text-lg font-bold bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 shadow-lg"
            >
              <Square className="w-6 h-6 mr-3" />
              🏁 END GAME
            </Button>
            <Button
              variant="outline"
              onClick={clearScores}
              disabled={!isConnected}
              className="w-full h-16 text-lg font-bold bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white border-0 shadow-lg"
            >
              <RotateCcw className="w-6 h-6 mr-3" />
              🔄 CLEAR SCORES
            </Button>
          </CardContent>
        </Card>

        {/* Current Question */}
        <Card className="question-display">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-white mb-2">
              📺 LIVE QUESTION
            </CardTitle>
            <CardDescription className="text-orange-300">
              Question {gameSession?.currentQuestionIndex || 0}
            </CardDescription>
          </CardHeader>
          <CardContent className="relative z-10">
              {isLoadingQuestion ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-orange-500 mx-auto mb-6"></div>
                <p className="text-xl text-orange-300 font-medium">Loading question...</p>
                </div>
              ) : currentQuestion ? (
                <div>
                <div className="bg-black/30 p-6 rounded-xl mb-6">
                  <p className="text-xl font-bold text-white leading-relaxed">
                    {currentQuestion.question || 'No question available'}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {currentQuestion.options && currentQuestion.options.map((option, index) => (
                      <div 
                        key={index}
                      className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                        index === (currentQuestion.correctAnswer || -1)
                          ? 'border-green-400 bg-green-500/20 text-green-300' 
                          : 'border-orange-400/50 bg-orange-500/10 text-orange-200'
                      }`}
                    >
                      <span className="font-bold text-2xl text-orange-400 mr-3">
                        {String.fromCharCode(65 + index)}
                      </span>
                      <span className="text-lg font-medium">{option}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎮</div>
                {gameSession?.status === 'active' ? (
                  <>
                    <div className="text-6xl mb-4">🎮</div>
                    <p className="text-xl text-orange-300 font-medium">
                      Game is LIVE!
                    </p>
                    <p className="text-orange-400 mt-2">
                      Click "NEXT QUESTION" to get the first question
                    </p>
                    <div className="mt-4 p-3 bg-green-100 rounded-lg border border-green-200">
                      <p className="text-green-800 font-medium">🟢 Game Active</p>
                      <p className="text-sm text-green-600">Players are ready to answer!</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="text-6xl mb-4">🎯</div>
                    <p className="text-xl text-orange-300 font-medium">
                      Ready to start the game!
                    </p>
                    <p className="text-orange-400 mt-2">
                      Click "START GAME" to begin
                    </p>
                    <div className="mt-4 p-3 bg-blue-100 rounded-lg border border-blue-200">
                      <p className="text-blue-800 font-medium">🎛️ Game Master Control</p>
                      <p className="text-sm text-blue-600">You control the entire game flow!</p>
                    </div>
                  </>
                )}
              </div>
              )}
            </CardContent>
        </Card>

        {/* Participants & Audience */}
        <Card className="player-list">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-gray-800 mb-2">
              👥 LIVE AUDIENCE
            </CardTitle>
            <CardDescription className="text-gray-600">
              {participants.length + audience.length} total viewers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-orange-600 flex items-center">
                    🎮 PLAYERS ({participants.length})
                  </h4>
                  <div className="bg-orange-100 px-3 py-1 rounded-full">
                    <span className="text-sm font-bold text-orange-700">ACTIVE</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {participants.map((participant) => (
                    <div key={participant.id} className="player-item p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold">
                            {participant.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-gray-800">{participant.username}</span>
                            <p className="text-sm text-orange-600">#{participant.uniqueNumber}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-orange-600">
                            {participant.score || 0}
                          </div>
                          <p className="text-xs text-gray-500">POINTS</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-bold text-blue-600 flex items-center">
                    👀 SPECTATORS ({audience.length})
                  </h4>
                  <div className="bg-blue-100 px-3 py-1 rounded-full">
                    <span className="text-sm font-bold text-blue-700">WATCHING</span>
                  </div>
                </div>
                <div className="space-y-3">
                  {audience.map((member) => (
                    <div key={member.id} className="player-item p-4">
                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                            {member.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="font-bold text-gray-800">{member.username}</span>
                            <p className="text-sm text-blue-600">#{member.uniqueNumber}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold text-blue-600">
                            SPECTATOR
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Winners */}
        <Card className="game-show-card">
          <CardHeader className="text-center">
            <CardTitle className="text-xl font-bold text-gray-800">
              🏆 RECENT WINNERS
            </CardTitle>
            <CardDescription className="text-gray-600">
              Latest correct answers
            </CardDescription>
          </CardHeader>
          <CardContent>
            {winners.length > 0 ? (
              <div className="space-y-3">
                {winners.slice(-5).map((winner, index) => (
                  <div key={index} className="player-item p-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center text-white font-bold">
                        🏆
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{winner.username}</p>
                        <p className="text-sm text-orange-600">#{winner.uniqueNumber}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🎯</div>
                <p className="text-gray-500 font-medium">No winners yet</p>
                <p className="text-sm text-gray-400">Players will appear here when they answer correctly!</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Leaderboard 
          participants={participants} 
          showTop={10}
          className="lg:col-span-3"
        />
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
                <span className="mt-4 block">
                  <span className="text-lg font-bold text-orange-700 block">
                    {winners[winners.length - 1].username}
                  </span>
                  <span className="text-orange-600 block">
                    #{winners[winners.length - 1].uniqueNumber}
                  </span>
                </span>
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
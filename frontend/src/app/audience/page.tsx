'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LogOut, Trophy, Users, Eye, Gamepad2 } from 'lucide-react';
import io from 'socket.io-client';
import Leaderboard from '@/components/Leaderboard';
import ConnectionStatus from '@/components/ConnectionStatus';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export default function AudiencePage() {
  const router = useRouter();
  const { user, logout, switchRole, setUser } = useAuthStore();
  const {
    gameSession,
    currentQuestion,
    winners,
    participants,
    audience,
    setGameSession,
    setCurrentQuestion,
    addWinner,
    setParticipants,
    setAudience,
  } = useGameStore();

  const [socket, setSocket] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [answerResult, setAnswerResult] = useState<any>(null);
  const [audienceWinners, setAudienceWinners] = useState<any[]>([]);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [timeLimit, setTimeLimit] = useState<number>(10);
  const [timerActive, setTimerActive] = useState<boolean>(false);
  const [currentDifficulty, setCurrentDifficulty] = useState<number>(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  const [scoreAnimation, setScoreAnimation] = useState(false);
  const prevScoreRef = useRef<number>(user?.score || 0);
  const networkStatus = useNetworkStatus();
  // Removed screen overlay functionality

  useEffect(() => {
    if (!user || user.role !== 'AUDIENCE') {
      router.push('/');
      return;
    }

    // Initialize socket connection
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';
    const newSocket = io(wsUrl, {
      transports: ['polling', 'websocket'],
      timeout: 20000,
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 3000,
      reconnectionDelayMax: 15000,
      autoConnect: true,
      upgrade: true,
      rememberUpgrade: false,
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setIsReconnecting(false);
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
      setIsReconnecting(true);
    });

    newSocket.on('error', (error: any) => {
      console.error('WebSocket error:', error);
      setIsAnswering(false);
    });

    newSocket.on('reconnect', () => {
      console.log('WebSocket reconnected');
      setIsReconnecting(false);
    });

    newSocket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`WebSocket reconnection attempt ${attemptNumber}`);
      setIsReconnecting(true);
    });

    newSocket.on('game_started', (session: any) => {
      setGameSession(session);
    });

    newSocket.on('new_question', (questionData: any) => {
      console.log('New question received:', questionData);
      // For audience, use the audience question
      const question = questionData.audienceQuestion || questionData;
      setCurrentQuestion(question);
      // Reset answer state for new question
      setSelectedOption(null);
      setAnswerResult(null);
      setIsAnswering(false);
      setHasAnswered(false);
      // Clear any hanging states
      setTimerActive(false);
      setTimeLeft(0);
    });

    newSocket.on('timer_started', (timerData: any) => {
      console.log('Timer started:', timerData);
      setTimeLimit(timerData.timeLimit);
      setTimeLeft(timerData.timeLeft);
      setTimerActive(true);
      setCurrentDifficulty(timerData.difficulty || 0);
    });

    newSocket.on('timer_update', (timerData: any) => {
      setTimeLeft(timerData.timeLeft);
    });

    newSocket.on('timer_expired', (data: any) => {
      console.log('Timer expired:', data);
      setTimerActive(false);
      setTimeLeft(0);
    });

    newSocket.on('winner_announced', (winner: any) => {
      console.log('Winner announced:', winner);
      console.log('Winner role:', winner.role);
      // Only show modal for audience winners
      if (winner.role === 'AUDIENCE') {
        console.log('Adding audience winner to store');
        addWinner(winner);
        // Store the current winner for the modal
        setAudienceWinners(prev => [...prev, winner]);
        setShowWinnerModal(true);
        // Auto-dismiss modal after 5 seconds
        setTimeout(() => {
          setShowWinnerModal(false);
        }, 5000);
      }
    });

    newSocket.on('audience_winner', (winner: any) => {
      setAudienceWinners(prev => [...prev, winner]);
    });

    newSocket.on('answer_submitted', (result: any) => {
      console.log('Answer submitted event received:', result);
      setAnswerResult({
        submitted: true,
        message: 'Answer submitted! Waiting for game master to reveal results...',
        selectedOption: result.selectedOption,
        isCorrect: undefined, // Don't show correct/incorrect yet
        correctAnswer: undefined, // Don't show correct answer yet
      });
      setIsAnswering(false);
      setHasAnswered(true);
    });

    newSocket.on('answer_revealed', (result: any) => {
      console.log('Answer revealed event received:', result);
      // Find the user's answer in the revealed results
      const userAnswer = result.answers.find((answer: any) => answer.userId === user.id);
      if (userAnswer) {
        console.log('User answer found:', userAnswer);
        setAnswerResult({
          isCorrect: userAnswer.isCorrect,
          correctAnswer: result.correctAnswer,
          selectedOption: userAnswer.selectedOption,
          submitted: true,
        });

        // Don't update score here - wait for user_list_updated event
        // which will have the correct score from backend (2 points for first, 1 for others)
        // Just trigger animation if answer is correct
        if (userAnswer.isCorrect && user) {
          // Trigger score animation - actual score will come from user_list_updated
          setScoreAnimation(true);
          setTimeout(() => setScoreAnimation(false), 1000);
        }
      } else {
        // Even if user didn't answer, show the correct answer
        setAnswerResult({
          isCorrect: false,
          correctAnswer: result.correctAnswer,
          selectedOption: null,
          submitted: false,
        });
      }
    });

    newSocket.on('user_list_updated', (data: any) => {
      console.log('========== AUDIENCE USER LIST UPDATE ==========');
      console.log('Full data received:', JSON.stringify(data, null, 2));
      console.log('Audience count:', data.audience?.length || 0);
      console.log('Participants count:', data.participants?.length || 0);
      console.log('Audience data with scores:', data.audience?.map((a: any) => ({
        username: a.username,
        score: a.score,
        scoreType: typeof a.score,
        role: a.role
      })));
      console.log('Participants data with scores:', data.participants?.map((p: any) => ({
        username: p.username,
        score: p.score,
        scoreType: typeof p.score,
        role: p.role
      })));
      // Update audience list
      setAudience(data.audience || []);
      setParticipants(data.participants || []);

      // Update current user's score from the updated list
      if (user?.id) {
        const updatedUserData = [...(data.participants || []), ...(data.audience || [])].find(
          (u: any) => u.id === user.id
        );
        if (updatedUserData && updatedUserData.score !== undefined) {
          const newScore = updatedUserData.score;
          const oldScore = prevScoreRef.current;

          // Trigger animation if score increased
          if (newScore > oldScore) {
            setScoreAnimation(true);
            setTimeout(() => setScoreAnimation(false), 1000);
          }

          setUser({
            ...user,
            score: newScore,
          });
          prevScoreRef.current = newScore;
        }
      }

      console.log('Updated store - audience:', data.audience || []);
      console.log('===============================================');
    });

    return () => {
      newSocket.close();
    };
  }, [user?.id, user?.role]);

  const submitAnswer = async (optionIndex: number) => {
    if (!socket || !currentQuestion || !gameSession || isAnswering) {
      return;
    }

    setIsAnswering(true);
    setSelectedOption(optionIndex);

    socket.emit('submit_answer', {
      userId: user?.id,
      questionId: currentQuestion.id,
      gameSessionId: gameSession.id,
      selectedOption: optionIndex,
    });
  };

  const handleLogout = () => {
    if (socket) {
      socket.disconnect();
    }
    logout();
    router.push('/');
  };

  const handleSwitchRole = async () => {
    if (!confirm('Switch to Participant mode? You will be able to answer questions and compete for prizes.')) {
      return;
    }

    try {
      // Disconnect WebSocket before switching roles
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }

      // Switch role
      await switchRole('PARTICIPANT');

      // Redirect to participant page
      router.push('/participant');
    } catch (error: any) {
      console.error('Error switching role:', error);
      alert(error.response?.data?.message || error.message || 'Failed to switch role');
    }
  };

  if (!user || user.role !== 'AUDIENCE') {
    return null;
  }

  const handleRetryConnection = () => {
    if (socket) {
      socket.disconnect();
      socket.connect();
    }
  };

  return (
    <div className="min-h-screen p-4 audience-screen">
      <ConnectionStatus
        isConnected={isConnected}
        isReconnecting={isReconnecting}
        onRetry={handleRetryConnection}
      />
      {/* Header - Compact on Mobile */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-3 md:mb-6 gap-2 md:gap-4">
        <div className="flex items-center space-x-2 md:space-x-4 flex-1 min-w-0">
          <img
            src="/logo.png"
            alt="Logo"
            className="w-20 h-10 md:w-48 md:h-24 flex-shrink-0 hidden sm:block"
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-base md:text-2xl font-bold text-white flex items-center">
              <Eye className="w-4 h-4 md:w-6 md:h-6 mr-2 text-teal-400 flex-shrink-0" />
              <span className="truncate">Audience Portal</span>
            </h1>
            <p className="text-white/80 text-xs md:text-base truncate">{user.username} (#{user.uniqueNumber})</p>
          </div>
        </div>
        <div className="flex items-center flex-wrap gap-1.5 md:gap-2 w-full md:w-auto">
          <div className="flex items-center space-x-1.5 md:space-x-2 bg-black/30 px-2 md:px-3 py-1 md:py-2 rounded-full flex-shrink-0">
            <div className={`w-2.5 h-2.5 md:w-3 md:h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-white text-xs md:text-sm whitespace-nowrap">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          <Button
            variant="outline"
            onClick={handleSwitchRole}
            className="bg-orange-600/20 border-orange-500 text-white hover:bg-orange-600/30 hover:text-white hover:border-orange-400 transition-all duration-200 text-xs md:text-sm px-2 md:px-4 py-1 md:py-2 flex-shrink-0"
            title="Switch to Participant mode"
          >
            <Gamepad2 className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
            <span className="font-medium hidden sm:inline">Switch to Participant</span>
            <span className="font-medium sm:hidden">Switch</span>
          </Button>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white hover:border-white/40 transition-all duration-200 text-xs md:text-sm px-2 md:px-4 py-1 md:py-2 flex-shrink-0"
          >
            <LogOut className="w-3 h-3 md:w-4 md:h-4 md:mr-2" />
            <span className="font-medium hidden sm:inline">Logout</span>
            <span className="font-medium sm:hidden">Exit</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Left Sidebar - Stats - Hidden on mobile, shown on desktop */}
        <div className="lg:col-span-1 space-y-4 md:space-y-6 hidden lg:block">
          {/* Your Score */}
          <Card className="score-display bg-gradient-to-br from-teal-500 to-blue-600 border-2 border-teal-300">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-white mb-2">
                🏆 YOUR SCORE
              </CardTitle>
              <CardDescription className="text-teal-100">
                Current points earned
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center relative">
              <div className={`text-6xl font-bold text-white mb-4 transition-all duration-500 ${scoreAnimation ? 'scale-125 text-yellow-300 animate-pulse' : ''
                }`}>
                {user.score || 0}
              </div>
              {scoreAnimation && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-4xl text-green-400 font-bold animate-bounce">+1</span>
                </div>
              )}
              <p className="text-teal-100 font-medium">POINTS</p>
              <div className="mt-4 p-3 bg-white/20 rounded-lg backdrop-blur-sm border border-white/30">
                <p className="text-sm text-white/80">Audience ID</p>
                <p className="text-2xl font-bold text-yellow-300">#{user.uniqueNumber}</p>
              </div>
            </CardContent>
          </Card>

          {/* Audience Stats */}
          <Card className="bg-gradient-to-br from-teal-500/80 to-blue-600/80 border-2 border-teal-300">
            <CardHeader className="text-center">
              <CardTitle className="text-xl font-bold text-white mb-2">
                👥 AUDIENCE
              </CardTitle>
              <CardDescription className="text-teal-100">
                Competing for Points & Prizes
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm border border-white/30">
                <div className="flex justify-between items-center">
                  <span className="text-white/90 text-sm">Total Audience</span>
                  <span className="text-white font-bold text-lg">{audience.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Audience Winners */}
          <Card className="game-show-card">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-800 text-center">
                🏆 RECENT WINNERS
              </CardTitle>
              <CardDescription className="text-gray-600 text-center text-sm">
                Top audience answers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {winners.filter(w => w.role === 'AUDIENCE').length > 0 ? (
                <div className="space-y-3">
                  {winners.filter(w => w.role === 'AUDIENCE').slice(-3).map((winner, index) => (
                    <div key={index} className="player-item p-3 bg-gradient-to-r from-teal-50 to-blue-50 border border-teal-300 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-gradient-to-r from-teal-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold shadow">
                            🏆
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 text-sm">{winner.username}</p>
                            <p className="text-xs text-teal-600">#{winner.uniqueNumber}</p>
                          </div>
                        </div>
                        {winner.responseTime !== undefined && winner.responseTime > 0 && (
                          <div className="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-bold">
                            ⏱️ {(winner.responseTime / 1000).toFixed(1)}s
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <div className="text-3xl mb-2">🎯</div>
                  <p className="text-gray-500 text-sm font-medium">No winners yet</p>
                  <p className="text-xs text-gray-400">Be first!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Center - Current Question - Full width on mobile, 2 cols on desktop */}
        <div className="lg:col-span-2 col-span-1">
          {/* Mobile Score Display - Visible on mobile only */}
          <Card className="lg:hidden mb-4 bg-gradient-to-br from-teal-500 to-blue-600 border-2 border-teal-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white/80 text-xs mb-1">Your Score</p>
                  <p className={`text-3xl font-bold text-white transition-all duration-500 ${scoreAnimation ? 'scale-125 text-yellow-300 animate-pulse' : ''
                    }`}>
                    {user.score || 0}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-white/80 text-xs mb-1">ID</p>
                  <p className="text-xl font-bold text-yellow-300">#{user.uniqueNumber}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="question-display">
            <CardHeader className="text-center">
              <CardTitle className="text-xl md:text-2xl font-bold text-white mb-2">
                📺 YOUR QUESTION
              </CardTitle>
              {gameSession && (
                <CardDescription className="text-orange-300 text-sm md:text-base">
                  Question {gameSession.currentQuestionIndex} • Difficulty: {currentQuestion?.difficulty || 'N/A'}
                </CardDescription>
              )}

              {/* Timer Display */}
              {timerActive && (
                <div className="mt-4 p-4 bg-gradient-to-r from-red-500 to-orange-500 rounded-lg border-2 border-white/20">
                  <div className="flex items-center justify-center space-x-3">
                    <div className="text-3xl">⏰</div>
                    <div className="text-center">
                      <div className={`text-4xl font-bold ${timeLeft <= 10 ? 'text-red-300 animate-pulse' : 'text-white'}`}>
                        {timeLeft}
                      </div>
                      <div className="text-sm text-white/80">seconds left</div>
                      {currentDifficulty > 0 && (
                        <div className="text-xs text-white/70 mt-1">
                          Difficulty: {currentDifficulty} | Time: {timeLimit}s
                        </div>
                      )}
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
            </CardHeader>
            <CardContent className="relative z-10">
              {currentQuestion ? (
                <div>
                  <div className="bg-black/30 p-8 rounded-xl mb-8">
                    <p className="text-2xl font-bold text-white leading-relaxed text-center">{currentQuestion.question}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {currentQuestion.options && currentQuestion.options.map((option, index) => {
                      const isSelected = selectedOption === index;
                      // Only show correct/incorrect AFTER answer is revealed (isCorrect is defined)
                      const isRevealed = answerResult?.isCorrect !== undefined;
                      const isCorrect = isRevealed && answerResult?.correctAnswer === index;
                      const isIncorrect = isRevealed && answerResult?.selectedOption === index && !answerResult?.isCorrect;

                      return (
                        <button
                          key={index}
                          onClick={() => submitAnswer(index)}
                          disabled={isAnswering || hasAnswered}
                          className={`option-button p-6 rounded-2xl text-left text-lg font-semibold transition-all duration-300 transform hover:scale-105 flex items-start ${isRevealed && isCorrect
                            ? 'border-4 border-green-400 bg-green-100 text-green-800 shadow-green-glow'
                            : isRevealed && isIncorrect
                              ? 'border-4 border-red-400 bg-red-100 text-red-800'
                              : isSelected && !isRevealed
                                ? 'border-4 border-teal-400 bg-teal-100 text-teal-800'
                                : 'border-4 border-white/30 bg-white/10 text-white hover:border-teal-400 hover:bg-white/20'
                            } ${(isAnswering || hasAnswered) ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                        >
                          <span className="inline-block w-10 h-10 bg-teal-400 text-white rounded-full flex items-center justify-center mr-3 font-bold text-xl flex-shrink-0">
                            {String.fromCharCode(65 + index)}
                          </span>
                          <span className="break-words whitespace-normal flex-1">{option}</span>
                          {isRevealed && isCorrect && <span className="ml-2 text-2xl flex-shrink-0">✅</span>}
                          {isRevealed && isIncorrect && <span className="ml-2 text-2xl flex-shrink-0">❌</span>}
                        </button>
                      );
                    })}
                  </div>

                  {answerResult && (
                    <div className={`mt-6 p-6 rounded-lg text-center ${answerResult.isCorrect !== undefined
                      ? answerResult.isCorrect
                        ? 'bg-green-100 border-2 border-green-300'
                        : 'bg-red-100 border-2 border-red-300'
                      : 'bg-blue-100 border-2 border-blue-300'
                      }`}>
                      {answerResult.isCorrect !== undefined ? (
                        <>
                          <div className="text-6xl mb-4">
                            {answerResult.isCorrect ? '🎉' : '❌'}
                          </div>
                          <p className={`text-2xl font-bold ${answerResult.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                            {answerResult.isCorrect ? '🎊 EXCELLENT! 🎊' : '❌ Not Quite Right'}
                          </p>
                          {!answerResult.isCorrect && answerResult.correctAnswer !== undefined && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-600">
                                The correct answer was: <span className="font-bold text-lg">{String.fromCharCode(65 + answerResult.correctAnswer)}</span>
                              </p>
                              <p className="text-xs text-gray-500 mt-1">Keep participating!</p>
                            </div>
                          )}
                          {answerResult.isCorrect && (
                            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
                              <p className="text-sm text-green-700 font-medium">
                                🎉 Great job! You earned a point for that correct answer!
                              </p>
                            </div>
                          )}
                        </>
                      ) : (
                        <>
                          <div className="text-4xl mb-4">⏳</div>
                          <p className="text-xl font-bold text-blue-700">
                            {answerResult.message || 'Answer submitted! Waiting for game master to reveal results...'}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Eye className="w-16 h-16 text-white/50 mx-auto mb-4" />
                  <p className="text-xl text-white/90">Waiting for the game to start...</p>
                  <p className="text-white/60 mt-2">Get ready to answer!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Sidebar - Leaderboard - Hidden on mobile, shown on desktop */}
        <div className="lg:col-span-1 hidden lg:block">
          {(() => {
            console.log('========== AUDIENCE LEADERBOARD DATA ==========');
            console.log('Audience count:', audience.length);
            console.log('Full audience data:', JSON.stringify(audience, null, 2));
            console.log('Audience scores:', audience.map(a => ({
              username: a.username,
              score: a.score,
              scoreType: typeof a.score,
              role: a.role
            })));
            console.log('===========================================');
            return null;
          })()}
          <Leaderboard
            participants={audience}
            role="AUDIENCE"
            title="👥 Audience Leaderboard"
            currentUserId={user.id}
            showTop={999}
          />
        </div>
      </div>

      {/* Mobile Leaderboard - Visible on mobile only, hidden on desktop */}
      <div className="lg:hidden mt-4">
        <Leaderboard
          participants={audience}
          role="AUDIENCE"
          title="👥 Audience Leaderboard"
          currentUserId={user.id}
          showTop={999}
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
              {(() => {
                // Get the most recent audience winner
                const audienceWinnersList = winners.filter(w => w.role === 'AUDIENCE');
                const latestWinner = audienceWinnersList.length > 0
                  ? audienceWinnersList[audienceWinnersList.length - 1]
                  : audienceWinners.length > 0
                    ? audienceWinners[audienceWinners.length - 1]
                    : null;

                if (latestWinner) {
                  return (
                    <span className="mt-4 block">
                      <span className="text-lg font-bold text-orange-700 block">
                        {latestWinner.username}
                      </span>
                      <span className="text-orange-600 block">
                        #{latestWinner.uniqueNumber}
                      </span>
                      {latestWinner.responseTime !== undefined && latestWinner.responseTime > 0 && (
                        <span className="text-sm text-orange-500 block mt-2">
                          ⏱️ {(latestWinner.responseTime / 1000).toFixed(2)}s
                        </span>
                      )}
                      <span className="text-2xl font-bold text-orange-800 block mt-3">
                        🏆 Score: {latestWinner.score || 0}
                      </span>
                    </span>
                  );
                }
                return (
                  <span className="mt-4 block text-orange-600">
                    Congratulations to the winner!
                  </span>
                );
              })()}
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

      {/* Removed screen overlay functionality */}
    </div>
  );
}

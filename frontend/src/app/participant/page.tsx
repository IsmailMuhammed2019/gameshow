'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LogOut, Trophy, Users } from 'lucide-react';
import io from 'socket.io-client';
import Celebration from '@/components/Celebration';
import SoundEffects from '@/components/SoundEffects';

export default function ParticipantPage() {
  const router = useRouter();
  const { user, logout, setUser } = useAuthStore();
  const { 
    gameSession, 
    currentQuestion, 
    isAnswering,
    answerResult,
    winners,
    setGameSession,
    setCurrentQuestion,
    setAnswering,
    setAnswerResult,
    addWinner,
    setParticipants,
    setAudience,
  } = useGameStore();
  
  const [socket, setSocket] = useState<any>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [screenColor, setScreenColor] = useState('');
  const [showScreenOverlay, setShowScreenOverlay] = useState(false);
  const [showCelebration, setShowCelebration] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user || user.role !== 'PARTICIPANT') {
      router.push('/');
      return;
    }

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

    newSocket.on('connect', () => {
      setIsConnected(true);
      newSocket.emit('join_game', {
        userId: user.id,
        role: user.role,
      });
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('game_started', (session: any) => {
      setGameSession(session);
    });

    newSocket.on('new_question', (question: any) => {
      setCurrentQuestion(question);
      setSelectedOption(null);
      setAnswerResult(undefined as any);
      setScreenColor('');
    });

    newSocket.on('answer_result', (result: any) => {
      setAnswerResult(result);
      setAnswering(false);
      
      // Update user score if provided in the result
      if (result.updatedUser) {
        // Update the user in the auth store with new score
        const { setUser } = useAuthStore.getState();
        setUser({
          ...user,
          score: Number(result.updatedUser.score),
        });
      }
      
      // Trigger celebration animation
      setShowCelebration(result.isCorrect);
      
      // Set full screen overlay based on result
      if (result.isCorrect) {
        setScreenColor('screen-green');
        setShowScreenOverlay(true);
      } else {
        setScreenColor('screen-red');
        setShowScreenOverlay(true);
      }
      
      // Reset screen overlay after animation
      setTimeout(() => {
        setScreenColor('');
        setShowScreenOverlay(false);
      }, 2000);
    });

    newSocket.on('winner_announced', (winner: any) => {
      console.log('Winner announced:', winner);
      addWinner(winner);
      setShowWinnerModal(true);
    });

    newSocket.on('game_session_updated', (session: any) => {
      console.log('Game session updated:', session);
      setGameSession(session);
    });

    newSocket.on('user_list_updated', (data: any) => {
      console.log('User list updated:', data);
      // This helps track connected users
    });

    newSocket.on('scores_cleared', (data: any) => {
      console.log('Scores cleared:', data);
      // Update user score to 0
      setUser({
        ...user,
        score: 0,
      });
      // Show notification
      alert(`Scores have been cleared by the Game Master! Your score is now 0.`);
    });

    newSocket.on('error', (error: any) => {
      console.error('WebSocket error:', error);
    });

    return () => {
      newSocket.close();
    };
  }, [user?.id, user?.role, setUser]);

  const submitAnswer = async (optionIndex: number) => {
    console.log('Submit answer clicked:', {
      socket: !!socket,
      currentQuestion: !!currentQuestion,
      gameSession: !!gameSession,
      isAnswering,
      optionIndex,
      userId: user?.id,
      questionId: currentQuestion?.id,
      gameSessionId: gameSession?.id
    });

    if (!socket || !currentQuestion || !gameSession || isAnswering) {
      console.log('Cannot submit answer - missing requirements');
      return;
    }

    setSelectedOption(optionIndex);
    setAnswering(true);

    console.log('Emitting submit_answer event');
    socket.emit('submit_answer', {
      userId: user?.id,
      questionId: currentQuestion.id,
      gameSessionId: gameSession.id,
      selectedOption: optionIndex,
    });
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (!user || user.role !== 'PARTICIPANT') {
    return null;
  }

  return (
    <div className={`min-h-screen p-4 transition-colors duration-500 ${screenColor || 'participant-screen'}`}>
      {/* TV Show Header */}
      <div className="game-show-header p-6 mb-8 rounded-b-3xl">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-6">
            <div className="relative">
              <img 
                src="/bantefun.jpg" 
                alt="Logo" 
                className="w-16 h-16 rounded-full border-4 border-orange-500 shadow-2xl"
              />
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 drop-shadow-lg">
                🎮 PLAYER STATION
              </h1>
              <p className="text-xl text-orange-300 font-medium">
                Welcome, {user.username} • #{user.uniqueNumber}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
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
              Exit Game
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Question */}
        <div className="lg:col-span-2">
          <Card className="question-display">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-white mb-2">
                📺 YOUR QUESTION
              </CardTitle>
              {gameSession && (
                <CardDescription className="text-orange-300">
                  Question {gameSession.currentQuestionIndex} • Difficulty: {currentQuestion?.difficulty || 'N/A'}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent className="relative z-10">
              {currentQuestion ? (
                <div>
                  <div className="bg-black/30 p-8 rounded-xl mb-8">
                    <p className="text-2xl font-bold text-white leading-relaxed text-center">
                      {currentQuestion.question}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {currentQuestion.options.map((option, index) => {
                      let buttonClass = 'answer-option';
                      let isDisabled = isAnswering || answerResult !== undefined;
                      
                      if (answerResult) {
                        if (index === answerResult.selectedOption) {
                          buttonClass += answerResult.isCorrect ? ' correct' : ' incorrect';
                        } else if (index === answerResult.correctAnswer) {
                          buttonClass += ' correct';
                        }
                      }

                      return (
                        <Button
                          key={index}
                          variant="outline"
                          className={`${buttonClass} h-20 text-left justify-start p-6 text-lg font-medium ${
                            selectedOption === index ? 'ring-4 ring-orange-500 scale-105' : ''
                          }`}
                          onClick={() => submitAnswer(index)}
                          disabled={isDisabled}
                        >
                          <span className="font-bold text-3xl text-orange-600 mr-4">
                            {String.fromCharCode(65 + index)}
                          </span>
                          <span className="text-lg">{option}</span>
                        </Button>
                      );
                    })}
                  </div>
                  
                  {answerResult && (
                    <div className={`mt-6 p-6 rounded-lg text-center ${
                      answerResult.isCorrect 
                        ? 'bg-green-100 border-2 border-green-300' 
                        : 'bg-red-100 border-2 border-red-300'
                    }`}>
                      <div className="text-4xl mb-2">
                        {answerResult.isCorrect ? '🎉' : '😢'}
                      </div>
                      <p className={`text-xl font-bold ${answerResult.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                        {answerResult.isCorrect ? 'Excellent! You got it right!' : 'Oops! That\'s not correct'}
                      </p>
                      {!answerResult.isCorrect && (
                        <p className="text-sm text-gray-600 mt-2">
                          The correct answer was: <span className="font-bold">{String.fromCharCode(65 + answerResult.correctAnswer)}</span>
                        </p>
                      )}
                      {answerResult.isCorrect && (
                        <p className="text-sm text-green-600 mt-2 font-medium">
                          +1 Point! Keep it up! 🚀
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Trophy className="w-16 h-16 text-orange-500 mx-auto mb-4" />
                  <p className="text-xl text-gray-500">Waiting for the game to start...</p>
                  <p className="text-gray-400 mt-2">The game master will begin the game soon!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Game Info */}
        <div className="space-y-6">
          <Card className="score-display">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-white mb-2">
                🏆 YOUR SCORE
              </CardTitle>
              <CardDescription className="text-orange-200">
                Current points earned
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="text-6xl font-bold text-white mb-4">
                {user.score || 0}
              </div>
              <p className="text-orange-200 font-medium">POINTS</p>
            </CardContent>
          </Card>

          <Card className="game-show-card">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-800 text-center">
                📊 GAME STATUS
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700 font-medium">Status:</span>
                  <span className={`font-bold px-3 py-1 rounded-full text-sm ${
                    gameSession?.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {gameSession?.status === 'ACTIVE' ? '🟢 LIVE' : '⏸️ WAITING'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700 font-medium">Connection:</span>
                  <span className={`font-bold px-3 py-1 rounded-full text-sm ${
                    isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {isConnected ? '🟢 CONNECTED' : '🔴 DISCONNECTED'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-gray-700 font-medium">Player ID:</span>
                  <span className="font-bold text-orange-600">#{user.uniqueNumber}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="game-show-card">
            <CardHeader>
              <CardTitle className="text-xl font-bold text-gray-800 text-center">
                🏆 RECENT WINNERS
              </CardTitle>
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
                  <p className="text-sm text-gray-400">Be the first to answer correctly!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
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

      {/* Celebration Animation */}
      <Celebration 
        isCorrect={showCelebration} 
        onComplete={() => setShowCelebration(null)}
      />

      {/* Sound Effects */}
      <SoundEffects isCorrect={showCelebration} />

      {/* Full Screen Color Overlay */}
      {showScreenOverlay && (
        <div className={screenColor}></div>
      )}
    </div>
  );
}

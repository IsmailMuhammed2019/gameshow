'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { useGameStore } from '@/store/gameStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { LogOut, Trophy, Users, Eye } from 'lucide-react';
import io from 'socket.io-client';
import Leaderboard from '@/components/Leaderboard';

export default function AudiencePage() {
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
  // Removed screen overlay functionality

  useEffect(() => {
    if (!user || user.role !== 'AUDIENCE') {
      router.push('/');
      return;
    }

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

    newSocket.on('new_question', (questionData: any) => {
      // For audience, use the audience question
      const question = questionData.audienceQuestion || questionData;
      setCurrentQuestion(question);
      // Reset answer state for new question
      setSelectedOption(null);
      setAnswerResult(null);
      setIsAnswering(false);
      setHasAnswered(false);
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
      // Only show modal for audience winners
      if (winner.role === 'AUDIENCE') {
        addWinner(winner);
        setShowWinnerModal(true);
        // Auto-dismiss modal after 3 seconds
        setTimeout(() => {
          setShowWinnerModal(false);
        }, 3000);
      }
    });

    newSocket.on('audience_winner', (winner: any) => {
      setAudienceWinners(prev => [...prev, winner]);
    });

    newSocket.on('answer_submitted', (result: any) => {
      setAnswerResult({
        submitted: true,
        message: 'Answer submitted! Waiting for game master to reveal results...',
        selectedOption: result.selectedOption,
        isCorrect: undefined, // Don't show correct/incorrect yet
      });
      setIsAnswering(false);
      setHasAnswered(true);
    });

    newSocket.on('answer_revealed', (result: any) => {
      // Find the user's answer in the revealed results
      const userAnswer = result.answers.find((answer: any) => answer.userId === user.id);
      if (userAnswer) {
        setAnswerResult({
          isCorrect: userAnswer.isCorrect,
          correctAnswer: result.correctAnswer,
          selectedOption: userAnswer.selectedOption,
          submitted: true,
        });
      }
    });

    newSocket.on('user_list_updated', (data: any) => {
      console.log('User list updated:', data);
      console.log('Audience count:', data.audience?.length || 0);
      // Update audience list
      setAudience(data.audience || []);
      setParticipants(data.participants || []);
      console.log('Updated store - audience:', data.audience || []);
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
    logout();
    router.push('/');
  };

  if (!user || user.role !== 'AUDIENCE') {
    return null;
  }

  return (
    <div className="min-h-screen p-4 audience-screen">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <img 
            src="/logo.png" 
            alt="Logo" 
            className="w-48 h-24"
          />
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center">
              <Eye className="w-6 h-6 mr-2 text-teal-400" />
              Audience Portal
            </h1>
            <p className="text-white/80">Welcome, {user.username} (#{user.uniqueNumber})</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-white text-sm">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          <Button 
            variant="outline" 
            onClick={handleLogout} 
            className="ml-4 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white hover:border-white/40 transition-all duration-200"
          >
            <LogOut className="w-4 h-4 mr-2" />
            <span className="font-medium">Logout</span>
          </Button>
        </div> 
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Stats */}
        <div className="lg:col-span-1 space-y-6">
          {/* Audience Stats */}
          <Card className="bg-gradient-to-br from-teal-500 to-blue-600 border-2 border-teal-300">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-bold text-white mb-2">
                👥 AUDIENCE
              </CardTitle>
              <CardDescription className="text-teal-100">
                Watching & Participating
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-4 bg-white/20 rounded-lg backdrop-blur-sm border border-white/30">
                <p className="text-white/80 text-sm mb-1">You are</p>
                <p className="text-3xl font-bold text-white">#{user.uniqueNumber}</p>
              </div>
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

        {/* Center - Current Question */}
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
                      const isCorrect = answerResult?.correctAnswer === index;
                      const isIncorrect = answerResult?.selectedOption === index && !answerResult?.isCorrect;
                      
                      return (
                        <button
                          key={index}
                          onClick={() => submitAnswer(index)}
                          disabled={isAnswering || answerResult || hasAnswered}
                          className={`option-button p-6 rounded-2xl text-left text-lg font-semibold transition-all duration-300 transform hover:scale-105 ${
                            isCorrect
                              ? 'border-4 border-green-400 bg-green-100 text-green-800 shadow-green-glow'
                              : isIncorrect
                              ? 'border-4 border-red-400 bg-red-100 text-red-800'
                              : isSelected
                              ? 'border-4 border-teal-400 bg-teal-100 text-teal-800'
                              : 'border-4 border-white/30 bg-white/10 text-white hover:border-teal-400 hover:bg-white/20'
                          } ${(isAnswering || answerResult || hasAnswered) ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                        >
                          <span className="inline-block w-10 h-10 bg-teal-400 text-white rounded-full flex items-center justify-center mr-3 font-bold text-xl">
                            {String.fromCharCode(65 + index)}
                          </span>
                          {option}
                          {isCorrect && <span className="ml-2 text-2xl">✅</span>}
                          {isIncorrect && <span className="ml-2 text-2xl">❌</span>}
                        </button>
                      );
                    })}
                  </div>
                  
                  {answerResult && (
                    <div className={`mt-6 p-6 rounded-lg text-center ${
                      answerResult.submitted && answerResult.isCorrect !== undefined
                        ? answerResult.isCorrect
                          ? 'bg-green-100 border-2 border-green-300'
                          : 'bg-red-100 border-2 border-red-300'
                        : 'bg-blue-100 border-2 border-blue-300'
                    }`}>
                      {answerResult.submitted && answerResult.isCorrect !== undefined ? (
                        <>
                          <div className="text-6xl mb-4">
                            {answerResult.isCorrect ? '🎉' : '❌'}
                          </div>
                          <p className={`text-2xl font-bold ${answerResult.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                            {answerResult.isCorrect ? '🎊 EXCELLENT! 🎊' : '❌ Not Quite Right'}
                          </p>
                          {!answerResult.isCorrect && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                              <p className="text-sm text-gray-600">
                                The correct answer was: <span className="font-bold text-lg">{String.fromCharCode(65 + (answerResult.correctAnswer || 0))}</span>
                              </p>
                              <p className="text-xs text-gray-500 mt-1">Keep participating!</p>
                            </div>
                          )}
                          <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                            <p className="text-sm text-blue-700 font-medium">
                              👀 As an audience member, you don't earn points but can still participate!
                            </p>
                          </div>
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

        {/* Right Sidebar - Leaderboard */}
        <div className="lg:col-span-1">
          {(() => {
            console.log('Rendering audience leaderboard - Audience:', audience.length);
            console.log('Audience data:', audience);
            return null;
          })()}
          <Leaderboard 
            participants={audience}
            role="AUDIENCE"
            title="👥 Audience Leaderboard"
            currentUserId={user.id}
            showTop={10}
          />
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

      {/* Removed screen overlay functionality */}
    </div>
  );
}

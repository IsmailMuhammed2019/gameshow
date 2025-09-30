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
      addWinner(winner);
      setShowWinnerModal(true);
      // Auto-dismiss modal after 3 seconds
      setTimeout(() => {
        setShowWinnerModal(false);
      }, 3000);
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
            <p className="text-teal-300 text-sm">👥 Participate alongside the main game!</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
          <span className="text-white text-sm">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
          <Button variant="outline" onClick={handleLogout} className="ml-4 text-teal-blue-600">
            <LogOut className="w-4 h-4 mr-2 text-teal-blue-600" />
            Logout
          </Button>
        </div> 
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current Question */}
        <div className="lg:col-span-2">
          <Card className="question-card">
            <CardHeader>
              <CardTitle className="text-teal-blue-600 flex items-center">
                <Eye className="w-5 h-5 mr-2" />
                Audience Question
              </CardTitle>
              {gameSession && (
                <CardDescription>
                  {currentQuestion ? `Audience Question ${gameSession.currentQuestionIndex || 1}` : 'Waiting for audience question...'}
                </CardDescription>
              )}
              <div className="mt-2 p-2 bg-teal-50 rounded-lg border border-teal-200">
                <p className="text-sm text-teal-700 font-medium">
                  👥 This question is specifically for audience members
                </p>
              </div>
              
              {/* Timer Display */}
              {timerActive && (
                <div className="mt-4 p-4 bg-gradient-to-r from-teal-500 to-blue-500 rounded-lg border-2 border-teal-200">
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
            </CardHeader>
            <CardContent>
              {currentQuestion ? (
                <div>
                  <p className="text-xl font-medium mb-6">{currentQuestion.question}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentQuestion.options && currentQuestion.options.map((option, index) => {
                      const isSelected = selectedOption === index;
                      const isCorrect = answerResult?.correctAnswer === index;
                      const isIncorrect = answerResult?.selectedOption === index && !answerResult?.isCorrect;
                      
                      return (
                        <button
                          key={index}
                          onClick={() => submitAnswer(index)}
                          disabled={isAnswering || answerResult}
                          className={`p-4 rounded-lg border-2 text-left transition-all duration-200 ${
                            isCorrect
                              ? 'border-green-500 bg-green-100 text-green-800'
                              : isIncorrect
                              ? 'border-red-500 bg-red-100 text-red-800'
                              : isSelected
                              ? 'border-teal-blue-500 bg-teal-blue-100 text-teal-blue-800'
                              : 'border-gray-200 bg-gray-50 hover:border-teal-blue-300 hover:bg-teal-blue-50'
                          } ${isAnswering || answerResult ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          <span className="font-bold text-teal-blue-600 mr-3">
                            {String.fromCharCode(65 + index)}.
                          </span>
                          {option}
                          {isCorrect && <span className="ml-2">✅</span>}
                          {isIncorrect && <span className="ml-2">❌</span>}
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
                  <Eye className="w-16 h-16 text-teal-blue-500 mx-auto mb-4" />
                  <p className="text-xl text-gray-500">Waiting for the game to start...</p>
                  <p className="text-gray-400 mt-2">Answer questions along with participants!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Audience Sidebar */}
        <div className="space-y-6">
          {/* Audience Leaderboard */}
          <Leaderboard
            participants={audience}
            currentUserId={user.id}
            showTop={5}
            className="mb-6"
          />

          {/* Recent Audience Winners */}
          <Card className="question-card">
            <CardHeader>
              <CardTitle className="text-teal-blue-600 flex items-center">
                <Trophy className="w-5 h-5 mr-2" />
                Recent Audience Winners
              </CardTitle>
            </CardHeader>
            <CardContent>
              {audienceWinners.length > 0 ? (
                <div className="space-y-2">
                  {audienceWinners.slice(-5).map((winner, index) => (
                    <div key={index} className="p-3 bg-gradient-to-r from-teal-50 to-blue-50 rounded-lg border border-teal-200">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-teal-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-teal-700">{winner.username}</p>
                          <p className="text-sm text-teal-600">#{winner.uniqueNumber}</p>
                          <p className="text-xs text-gray-500">Audience Member</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <Users className="w-12 h-12 text-teal-500 mx-auto mb-3" />
                  <p className="text-gray-500">No audience winners yet</p>
                  <p className="text-sm text-gray-400 mt-1">Audience members don't earn points but can still participate!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audience Stats */}
          <Card className="question-card">
            <CardHeader>
              <CardTitle className="text-teal-blue-600 flex items-center">
                <Eye className="w-5 h-5 mr-2" />
                Audience Stats
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-blue-700 font-medium">Total Audience</span>
                  <span className="text-blue-800 font-bold text-lg">{audience.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-teal-50 rounded-lg">
                  <span className="text-teal-700 font-medium">Active Now</span>
                  <span className="text-teal-800 font-bold text-lg">{audience.filter(a => a.isActive).length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-green-700 font-medium">Questions Answered</span>
                  <span className="text-green-800 font-bold text-lg">
                    {audience.reduce((total, a) => total + (a.score || 0), 0)}
                  </span>
                </div>
              </div>
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

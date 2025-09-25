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
  const [answerResult, setAnswerResult] = useState<any>(null);
  const [screenColor, setScreenColor] = useState('');
  const [showScreenOverlay, setShowScreenOverlay] = useState(false);

  useEffect(() => {
    if (!user || user.role !== 'AUDIENCE') {
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

    newSocket.on('new_question', (questionData: any) => {
      // For audience, use the audience question
      const question = questionData.audienceQuestion || questionData;
      setCurrentQuestion(question);
      // Reset answer state for new question
      setSelectedOption(null);
      setAnswerResult(null);
      setIsAnswering(false);
      setScreenColor('');
      setShowScreenOverlay(false);
    });

    newSocket.on('winner_announced', (winner: any) => {
      addWinner(winner);
      setShowWinnerModal(true);
      // Auto-dismiss modal after 3 seconds
      setTimeout(() => {
        setShowWinnerModal(false);
      }, 3000);
    });

    newSocket.on('answer_result', (result: any) => {
      setAnswerResult(result);
      setIsAnswering(false);
      
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
            src="/bantefun.jpg" 
            alt="Logo" 
            className="w-12 h-12 rounded-full border-2 border-white"
          />
          <div>
            <h1 className="text-2xl font-bold text-white">Audience</h1>
            <p className="text-white/80">Welcome, {user.username} (#{user.uniqueNumber})</p>
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
                Current Question
              </CardTitle>
              {gameSession && (
                <CardDescription>
                  {currentQuestion ? `Question ${gameSession.currentQuestionIndex || 1}` : 'Waiting for question...'}
                </CardDescription>
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
                    <div className="mt-6 p-4 rounded-lg bg-gray-100">
                      <p className={`font-medium ${answerResult.isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                        {answerResult.isCorrect ? '🎉 Correct!' : '❌ Incorrect!'}
                      </p>
                      <p className="text-gray-600 mt-2">
                        The correct answer was: {String.fromCharCode(65 + answerResult.correctAnswer)}. {currentQuestion.options && currentQuestion.options[answerResult.correctAnswer]}
                      </p>
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

        {/* Recent Winners */}
        <div className="space-y-6">
          <Card className="question-card">
            <CardHeader>
              <CardTitle className="text-teal-blue-600 flex items-center">
                <Trophy className="w-5 h-5 mr-2" />
                Recent Winners
              </CardTitle>
            </CardHeader>
            <CardContent>
              {winners.length > 0 ? (
                <div className="space-y-2">
                  {winners.slice(-5).map((winner, index) => (
                    <div key={index} className="p-2 bg-yellow-50 rounded-lg">
                      <p className="font-medium text-yellow-700">{winner.username}</p>
                      <p className="text-sm text-yellow-600">#{winner.uniqueNumber}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No winners yet</p>
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

      {/* Full Screen Color Overlay */}
      {showScreenOverlay && (
        <div className={screenColor}></div>
      )}
    </div>
  );
}

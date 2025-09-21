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

    newSocket.on('new_question', (question: any) => {
      setCurrentQuestion(question);
    });

    newSocket.on('winner_announced', (winner: any) => {
      addWinner(winner);
      setShowWinnerModal(true);
    });

    return () => {
      newSocket.close();
    };
  }, [user?.id, user?.role]);

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
          <Button variant="outline" onClick={handleLogout} className="ml-4">
            <LogOut className="w-4 h-4 mr-2" />
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
                  Question {gameSession.currentQuestionIndex} of {gameSession.totalQuestions || '∞'}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {currentQuestion ? (
                <div>
                  <p className="text-xl font-medium mb-6">{currentQuestion.question}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentQuestion.options.map((option, index) => (
                      <div 
                        key={index}
                        className="p-4 rounded-lg border-2 border-gray-200 bg-gray-50"
                      >
                        <span className="font-bold text-teal-blue-600 mr-3">
                          {String.fromCharCode(65 + index)}.
                        </span>
                        {option}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Eye className="w-16 h-16 text-teal-blue-500 mx-auto mb-4" />
                  <p className="text-xl text-gray-500">Waiting for the game to start...</p>
                  <p className="text-gray-400 mt-2">Watch as participants answer questions!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Game Info */}
        <div className="space-y-6">
          <Card className="question-card">
            <CardHeader>
              <CardTitle className="text-teal-blue-600">Game Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <span className={`font-medium ${
                    gameSession?.status === 'active' ? 'text-green-600' : 'text-gray-500'
                  }`}>
                    {gameSession?.status || 'Waiting'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Participants:</span>
                  <span className="font-medium text-orange-600">{participants.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Audience:</span>
                  <span className="font-medium text-teal-blue-600">{audience.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Connection:</span>
                  <span className={`font-medium ${isConnected ? 'text-green-600' : 'text-red-600'}`}>
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="question-card">
            <CardHeader>
              <CardTitle className="text-teal-blue-600 flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Participants
              </CardTitle>
            </CardHeader>
            <CardContent>
              {participants.length > 0 ? (
                <div className="space-y-2">
                  {participants.map((participant) => (
                    <div key={participant.id} className="p-2 bg-orange-50 rounded-lg">
                      <p className="font-medium text-orange-700">{participant.username}</p>
                      <p className="text-sm text-orange-600">#{participant.uniqueNumber}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No participants yet</p>
              )}
            </CardContent>
          </Card>

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

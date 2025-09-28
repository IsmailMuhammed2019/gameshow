'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users, Gamepad2, LogOut } from 'lucide-react';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, user, logout } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated && user) {
      // Redirect based on user role
      switch (user.role) {
        case 'GAME_MASTER':
          router.push('/game-master');
          break;
        case 'PARTICIPANT':
          router.push('/participant');
          break;
        case 'AUDIENCE':
          router.push('/audience');
          break;
        default:
          router.push('/login');
      }
    }
  }, [isAuthenticated, user, router]);

  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-500 mx-auto"></div>
          <p className="mt-4 text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <img 
              src="/logo.png" 
              alt="Millionaire Game Logo" 
              className="w-48 h-24 shadow-lg"
            />
          </div>
          <h1 className="text-5xl font-bold text-white mb-4 drop-shadow-lg">
             FUN & BANTE
          </h1>
          <p className="text-xl text-white/90 drop-shadow">
          "Your go-to space for entertainment, energy, and endless banter."
          </p>
          {isAuthenticated && (
            <div className="mt-4">
              <Button 
                variant="outline" 
                className="bg-red-600/20 border-red-500 text-white hover:bg-red-600/30"
                onClick={logout}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          )}
        </div>

        {/* Role Selection Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-8 max-w-2xl mx-auto">
          <Card className="question-card hover:scale-105 transition-transform cursor-pointer"
                onClick={() => router.push('/register?role=participant')}>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Gamepad2 className="w-12 h-12 text-peach-500" />
              </div>
              <CardTitle className="text-peach-600">Participant</CardTitle>
              <CardDescription>
                Join as a player and answer questions to win!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="orange" className="w-full">
                Register as Participant
              </Button>
            </CardContent>
          </Card>

          <Card className="question-card hover:scale-105 transition-transform cursor-pointer"
                onClick={() => router.push('/register?role=audience')}>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Users className="w-12 h-12 text-teal-500" />
              </div>
              <CardTitle className="text-teal-600">Audience</CardTitle>
              <CardDescription>
                Watch the game and cheer for your favorite players!
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="teal-blue" className="w-full text-black">
                Register as Audience
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Game Master Login Section */}
        <div className="text-center mb-8">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 max-w-md mx-auto border border-white/20">
            <div className="flex justify-center mb-4">
              <Trophy className="w-12 h-12 text-dark-blue-500" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Game Master</h3>
            <p className="text-white/80 mb-4">
              Host the game and control the questions!
            </p>
            <Button 
              variant="dark-red" 
              className="w-full"
              onClick={() => router.push('/login?role=GAME_MASTER')}
            >
              Login as Game Master
            </Button>
          </div>
        </div>

        {/* Login Section */}
        <div className="text-center">
          <p className="text-white/80 mb-4">Already have an account?</p>
          <Button 
            variant="outline" 
            className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            onClick={() => router.push('/login')}
          >
            Login
          </Button>
        </div>
      </div>
    </div>
  );
}

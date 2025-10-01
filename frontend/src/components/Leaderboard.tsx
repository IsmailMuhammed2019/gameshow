'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Medal, Award, Crown } from 'lucide-react';
import { User } from '@/types';

interface LeaderboardProps {
  participants: User[];
  currentUserId?: string;
  showTop?: number;
  className?: string;
  title?: string;
  role?: 'PARTICIPANT' | 'AUDIENCE';
}

export default function Leaderboard({ 
  participants, 
  currentUserId, 
  showTop = 10, 
  className = '',
  title = 'Leaderboard',
  role = 'PARTICIPANT',
}: LeaderboardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // Filter by role if specified
  const filteredParticipants = role 
    ? participants.filter(p => p.role === role)
    : participants;
  
  // Sort by score (descending) and then by username (ascending)
  const sortedParticipants = [...filteredParticipants]
    .sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }
      return a.username.localeCompare(b.username);
    })
    .slice(0, isExpanded ? filteredParticipants.length : showTop);

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Crown className="w-5 h-5 text-yellow-500" />;
      case 1:
        return <Medal className="w-5 h-5 text-gray-400" />;
      case 2:
        return <Award className="w-5 h-5 text-amber-600" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold text-gray-600">
          {index + 1}
        </span>;
    }
  };

  const getRankColor = (index: number) => {
    switch (index) {
      case 0:
        return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
      case 1:
        return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
      case 2:
        return 'bg-gradient-to-r from-amber-400 to-amber-600 text-white';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className={`bg-white/10 backdrop-blur-sm border-white/20 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-gold-500" />
            <span>{title}</span>
          </div>
          {filteredParticipants.length > showTop && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-sm text-white/70 hover:text-white transition-colors"
            >
              {isExpanded ? 'Show Less' : `Show All (${filteredParticipants.length})`}
            </button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {role === 'AUDIENCE' && filteredParticipants.length > 0 && (
          <div className="mb-3 p-3 bg-teal-500/20 border border-teal-400/30 rounded-lg">
            <p className="text-xs text-teal-200 text-center">
              👥 Audience members participate for fun - only participants earn points!
            </p>
          </div>
        )}
        
        <div className="space-y-2">
          {sortedParticipants.length === 0 ? (
            <div className="text-center py-4 text-white/70">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-white/50" />
              <p>No {role === 'PARTICIPANT' ? 'participants' : 'audience members'} yet</p>
            </div>
          ) : (
            sortedParticipants.map((participant, index) => (
              <div
                key={participant.id}
                className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 ${
                  participant.id === currentUserId 
                    ? 'ring-2 ring-gold-400 bg-gold-500/20' 
                    : 'hover:bg-white/10'
                } ${getRankColor(index)}`}
              >
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {getRankIcon(index)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium truncate">
                        {participant.username}
                      </span>
                      {participant.id === currentUserId && (
                        <span className="text-xs bg-gold-500 text-white px-2 py-1 rounded-full">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-sm opacity-80">
                      #{participant.uniqueNumber}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {role === 'AUDIENCE' ? (
                    <>
                      <span className="text-xs">👥</span>
                      <span className="font-bold text-sm text-white/70">
                        Participating
                      </span>
                    </>
                  ) : (
                    <>
                      <Trophy className="w-4 h-4" />
                      <span className="font-bold text-lg">
                        {participant.score}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
        
        {filteredParticipants.length > 0 && (
          <div className="mt-4 pt-3 border-t border-white/20">
            <div className="flex justify-between text-sm text-white/70">
              <span>Total {role === 'PARTICIPANT' ? 'Participants' : 'Audience'}: {filteredParticipants.length}</span>
              {currentUserId && (
                <span>Your Rank: #{sortedParticipants.findIndex(p => p.id === currentUserId) + 1 || 'N/A'}</span>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import api from '@/lib/api';

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: number;
  targetRole: 'PARTICIPANT' | 'AUDIENCE';
  questionType: 'MULTIPLE_CHOICE' | 'YES_NO';
  isActive: boolean;
  episodeId?: string;
  createdAt: string;
}

interface Episode {
  id: string;
  title: string;
  description?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  targetRole: 'PARTICIPANT' | 'AUDIENCE';
  isForBothRoles: boolean;
  isActive: boolean;
  createdAt: string;
  questions: Question[];
  _count: {
    questions: number;
  };
}

interface User {
  id: string;
  username: string;
  email: string;
  role: 'PARTICIPANT' | 'AUDIENCE' | 'GAME_MASTER' | 'GENERAL_ADMIN';
  uniqueNumber: string;
  isActive: boolean;
  score: number;
  createdAt: string;
}

export default function GeneralAdminPage() {
  const { user, isAuthenticated, logout, isInitialized, initialize } = useAuthStore();
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [participantQuestions, setParticipantQuestions] = useState<Question[]>([]);
  const [audienceQuestions, setAudienceQuestions] = useState<Question[]>([]);
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'participant-episodes' | 'audience-episodes' | 'question-bank' | 'user-management'>('participant-episodes');
  const [selectedEpisode, setSelectedEpisode] = useState<Episode | null>(null);
  const [newQuestion, setNewQuestion] = useState({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    difficulty: 1,
    targetRole: 'PARTICIPANT' as 'PARTICIPANT' | 'AUDIENCE',
    questionType: 'MULTIPLE_CHOICE' as 'MULTIPLE_CHOICE' | 'YES_NO',
    episodeId: '',
  });
  const [newEpisode, setNewEpisode] = useState({
    title: '',
    description: '',
    status: 'DRAFT' as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED',
    targetRole: 'PARTICIPANT' as 'PARTICIPANT' | 'AUDIENCE',
    isForBothRoles: false,
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEpisodeDialogOpen, setIsEpisodeDialogOpen] = useState(false);
  const [isViewQuestionsOpen, setIsViewQuestionsOpen] = useState(false);
  const [episodeQuestions, setEpisodeQuestions] = useState<Question[]>([]);
  const [isLinkQuestionOpen, setIsLinkQuestionOpen] = useState(false);
  const [selectedQuestionToLink, setSelectedQuestionToLink] = useState<Question | null>(null);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [selectedUserToReset, setSelectedUserToReset] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    // Initialize the store on first load
    if (!isInitialized) {
      initialize();
      return;
    }

    if (!isAuthenticated || user?.role !== 'GENERAL_ADMIN') {
      router.push('/login');
      return;
    }
    fetchQuestions();
  }, [isAuthenticated, user, router, isInitialized, initialize]);

  const fetchQuestions = async () => {
    try {
      console.log('Fetching questions, episodes, and users...');
      const [participantResponse, audienceResponse, episodesResponse, usersResponse] = await Promise.all([
        api.get('/game/questions/participant'),
        api.get('/game/questions/audience'),
        api.get('/episodes'),
        api.get('/users')
      ]);
      
      console.log('Episodes fetched:', episodesResponse.data.length);
      console.log('Users fetched:', usersResponse.data.length);
      setParticipantQuestions(participantResponse.data);
      setAudienceQuestions(audienceResponse.data);
      setEpisodes(episodesResponse.data);
      setUsers(usersResponse.data);
      
      // Also fetch all questions for backward compatibility
      const allResponse = await api.get('/game/questions');
      setQuestions(allResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuestion = async () => {
    try {
      // Clean up the question data before sending
      const questionData = {
        ...newQuestion,
        episodeId: activeTab === 'question-bank' ? undefined : (newQuestion.episodeId || undefined), // Only link to episode if not in question bank
      };
      
      await api.post('/game/questions', questionData);
      setNewQuestion({
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        difficulty: 1,
        targetRole: 'PARTICIPANT',
        questionType: 'MULTIPLE_CHOICE',
        episodeId: activeTab === 'question-bank' ? '' : (selectedEpisode?.id || ''),
      });
      setIsDialogOpen(false);
      fetchQuestions();
    } catch (error) {
      console.error('Error creating question:', error);
      alert('Failed to create question. Please check all fields are filled correctly.');
    }
  };

  const handleCreateEpisode = async (roleOverride?: 'PARTICIPANT' | 'AUDIENCE') => {
    try {
      const episodeData = roleOverride 
        ? { ...newEpisode, targetRole: roleOverride }
        : newEpisode;
      
      await api.post('/episodes', episodeData);
      setNewEpisode({
        title: '',
        description: '',
        status: 'DRAFT',
        targetRole: 'PARTICIPANT',
        isForBothRoles: false,
      });
      setIsEpisodeDialogOpen(false);
      fetchQuestions(); // This refreshes episodes too
    } catch (error) {
      console.error('Error creating episode:', error);
      alert('Failed to create episode. Please check all required fields.');
    }
  };

  const handleUpdateEpisodeStatus = async (episodeId: string, status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED') => {
    try {
      console.log(`Updating episode ${episodeId} to status: ${status}`);
      await api.patch(`/episodes/${episodeId}`, { status });
      console.log('Episode updated successfully, refreshing data...');
      await fetchQuestions();
      alert(`Episode ${status.toLowerCase()} successfully`);
    } catch (error) {
      console.error('Error updating episode:', error);
      alert('Failed to update episode status');
    }
  };

  const handleDeleteEpisode = async (episodeId: string) => {
    // Validate episodeId before making the request
    if (!episodeId || episodeId.trim() === '') {
      alert('Error: Invalid episode ID');
      console.error('Attempted to delete episode with invalid ID:', episodeId);
      return;
    }

    const confirmMessage = 'Are you sure you want to delete this episode?\n\n' +
      'Note: Questions linked to this episode will be unlinked but NOT deleted.\n' +
      'This action cannot be undone.';

    if (confirm(confirmMessage)) {
      console.log(`[DELETE] Attempting to delete episode with ID: ${episodeId}`);

      try {
        const response = await api.delete(`/episodes/${episodeId}`);
        console.log(`[DELETE] Successfully deleted episode:`, response.data);
        alert('Episode deleted successfully. Questions linked to this episode have been unlinked.');
        // Refresh data after successful deletion
        await fetchQuestions();
      } catch (error: any) {
        console.error('[DELETE] Error deleting episode:', error);

        let errorMessage = 'Failed to delete episode';

        if (error.response) {
          const status = error.response.status;
          const data = error.response.data;

          if (status === 404) {
            errorMessage = data?.message || 'Episode not found';
          } else if (status === 400) {
            errorMessage = data?.message || 'Invalid request';
          } else if (status === 500) {
            errorMessage = data?.message || 'Server error while deleting episode';
          } else {
            errorMessage = data?.message || `Error: ${status}`;
          }
        } else if (error.request) {
          errorMessage = 'Cannot connect to server. Please check if the backend is running.';
        } else {
          errorMessage = error.message || 'An unexpected error occurred';
        }

        alert(errorMessage);
      }
    }
  };

  const handleViewEpisodeQuestions = async (episode: Episode) => {
    try {
      const response = await api.get(`/episodes/${episode.id}/questions`);
      setEpisodeQuestions(response.data);
      setSelectedEpisode(episode);
      setIsViewQuestionsOpen(true);
    } catch (error) {
      console.error('Error fetching episode questions:', error);
    }
  };

  const toggleQuestionStatus = async (questionId: string, isActive: boolean) => {
    try {
      await api.patch(`/game/questions/${questionId}`, { isActive: !isActive });
      fetchQuestions();
    } catch (error) {
      console.error('Error updating question:', error);
      alert('Failed to update question status');
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    // Validate questionId before making the request
    if (!questionId || questionId.trim() === '') {
      alert('Error: Invalid question ID');
      console.error('Attempted to delete question with invalid ID:', questionId);
      return;
    }

    console.log(`[DELETE] Attempting to delete question with ID: ${questionId}`);
    
    try {
      const response = await api.delete(`/game/questions/${questionId}`);
      console.log(`[DELETE] Successfully deleted question:`, response.data);
      alert('Question deleted successfully');
      // Refresh questions after successful deletion
      await fetchQuestions();
    } catch (error: any) {
      console.error('[DELETE] Error deleting question:', error);
      
      let errorMessage = 'Failed to delete question';
      
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === 404) {
          errorMessage = data?.message || 'Question not found';
        } else if (status === 400) {
          errorMessage = data?.message || 'Invalid request';
        } else if (status === 500) {
          errorMessage = data?.message || 'Server error while deleting question';
        } else {
          errorMessage = data?.message || `Error: ${status}`;
        }
      } else if (error.request) {
        errorMessage = 'Cannot connect to server. Please check if the backend is running.';
      } else {
        errorMessage = error.message || 'An unexpected error occurred';
      }
      
      alert(errorMessage);
    }
  };

  const handleLinkQuestionToEpisode = async (questionId: string, episodeId: string) => {
    try {
      await api.patch(`/game/questions/${questionId}`, { episodeId });
      fetchQuestions();
      alert('Question linked to episode successfully');
      setIsLinkQuestionOpen(false);
    } catch (error) {
      console.error('Error linking question:', error);
      alert('Failed to link question to episode');
    }
  };

  const handleResetPassword = async (userId: string, newPassword: string) => {
    try {
      await api.patch(`/users/${userId}/reset-password`, { newPassword });
      alert('Password reset successfully');
      setIsResetPasswordOpen(false);
      setNewPassword('');
      setSelectedUserToReset(null);
    } catch (error) {
      console.error('Error resetting password:', error);
      alert('Failed to reset password');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-blue-500 via-light-blue-500 to-teal-500 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8 bg-gradient-to-r from-blue-600 to-teal-600 rounded-xl p-6 shadow-2xl">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">🎮 Game Management Portal</h1>
            <p className="text-blue-100 text-lg">Create and manage role-specific episodes</p>
          </div>
          <div className="flex gap-4">
            <Button
              onClick={() => router.push('/')}
              variant="outline"
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
            >
              Home
            </Button>
            <Button
              onClick={logout}
              variant="outline"
              className="bg-peach-500/20 text-white border-peach-500/30 hover:bg-peach-500/30"
            >
              Logout
            </Button>
          </div>
        </div>

        {/* Question Creation Dialog (Opened from Episode Cards) */}
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent className="bg-white max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Question</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Question</label>
                  <Input
                    value={newQuestion.question}
                    onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                    placeholder="Enter question..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Options</label>
                  {newQuestion.questionType === 'YES_NO' ? (
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <span className="w-8 text-sm font-medium">A:</span>
                        <Input value="Yes" disabled className="bg-gray-100" />
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="w-8 text-sm font-medium">B:</span>
                        <Input value="No" disabled className="bg-gray-100" />
                      </div>
                    </div>
                  ) : (
                    newQuestion.options.map((option, index) => (
                      <Input
                        key={index}
                        value={option}
                        onChange={(e) => {
                          const newOptions = [...newQuestion.options];
                          newOptions[index] = e.target.value;
                          setNewQuestion({ ...newQuestion, options: newOptions });
                        }}
                        placeholder={`Option ${index + 1}`}
                        className="mb-2"
                      />
                    ))
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Correct Answer {newQuestion.questionType === 'YES_NO' ? '(0=Yes, 1=No)' : '(0-3)'}
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max={newQuestion.questionType === 'YES_NO' ? '1' : '3'}
                    value={newQuestion.correctAnswer}
                    onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Difficulty (1-10)</label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    value={newQuestion.difficulty}
                    onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: parseInt(e.target.value) })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Episode *</label>
                  <select
                    value={newQuestion.episodeId}
                    onChange={(e) => {
                      const episodeId = e.target.value;
                      const selectedEp = episodes.find(ep => ep.id === episodeId);
                      setNewQuestion({ 
                        ...newQuestion, 
                        episodeId: episodeId,
                        targetRole: selectedEp?.targetRole || 'PARTICIPANT' // Inherit from episode
                      });
                    }}
                    className="w-full p-2 border rounded"
                    required
                  >
                    <option value="">-- Select an Episode --</option>
                    {episodes.map((episode) => (
                      <option key={episode.id} value={episode.id}>
                        {episode.targetRole === 'PARTICIPANT' ? '🎯' : '👥'} {episode.title} ({episode.status})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Question will inherit the target role from the selected episode
                  </p>
                </div>
                {newQuestion.episodeId && (
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800">
                      <strong>Target Role:</strong> {newQuestion.targetRole === 'PARTICIPANT' ? '🎯 Participant' : '👥 Audience'}
                      <span className="text-xs text-blue-600 ml-2">(Inherited from episode)</span>
                    </p>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium mb-2">Question Type</label>
                  <select
                    value={newQuestion.questionType}
                    onChange={(e) => {
                      const questionType = e.target.value as 'MULTIPLE_CHOICE' | 'YES_NO';
                      setNewQuestion({ 
                        ...newQuestion, 
                        questionType,
                        // For YES_NO questions, set options to Yes/No and correctAnswer to 0 or 1
                        options: questionType === 'YES_NO' ? ['Yes', 'No'] : ['', '', '', ''],
                        correctAnswer: questionType === 'YES_NO' ? 0 : newQuestion.correctAnswer
                      });
                    }}
                    className="w-full p-2 border rounded"
                  >
                    <option value="MULTIPLE_CHOICE">Multiple Choice (A, B, C, D)</option>
                    <option value="YES_NO">Yes/No Question</option>
                  </select>
                </div>
                <Button onClick={handleCreateQuestion} className="w-full bg-teal-500 hover:bg-teal-600">
                  Create Question
                </Button>
              </div>
            </DialogContent>
          </Dialog>

        {/* Header Section */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-2xl p-8 border-4 border-blue-500">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-3xl font-bold text-gray-800">📋 Episode Management</h2>
              <div className="text-sm bg-gradient-to-r from-blue-500 to-teal-500 text-white px-4 py-2 rounded-full font-semibold">
                Episodes: {episodes.length} | Questions: {participantQuestions.length + audienceQuestions.length}
              </div>
            </div>
            <p className="text-gray-600 text-base mb-6">
              Create role-specific episodes and add questions to them. Each episode is designed for either participants or audience.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 border-2 border-blue-400 rounded-lg p-4 shadow-lg">
                <div className="font-bold text-blue-800 mb-2 text-lg">🎯 Participant Episodes</div>
                <div className="text-blue-600 font-medium">For competitive players • Harder questions • Difficulty 6-10</div>
              </div>
              <div className="bg-gradient-to-br from-teal-50 to-teal-100 border-2 border-teal-400 rounded-lg p-4 shadow-lg">
                <div className="font-bold text-teal-800 mb-2 text-lg">👥 Audience Episodes</div>
                <div className="text-teal-600 font-medium">For spectators • Easier questions • Difficulty 1-5</div>
              </div>
            </div>
        </div>

          <div className="flex space-x-3 bg-white rounded-lg p-2 mt-6 shadow-xl">
            <button
              onClick={() => setActiveTab('participant-episodes')}
              className={`flex-1 py-4 px-6 rounded-lg text-base font-bold transition-all ${
                activeTab === 'participant-episodes'
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg transform scale-105'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              🎯 Participant Episodes ({episodes.filter(e => e.targetRole === 'PARTICIPANT').length})
            </button>
            <button
              onClick={() => setActiveTab('audience-episodes')}
              className={`flex-1 py-4 px-6 rounded-lg text-base font-bold transition-all ${
                activeTab === 'audience-episodes'
                  ? 'bg-gradient-to-r from-teal-500 to-teal-600 text-white shadow-lg transform scale-105'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              👥 Audience Episodes ({episodes.filter(e => e.targetRole === 'AUDIENCE').length})
            </button>
            <button
              onClick={() => setActiveTab('question-bank')}
              className={`flex-1 py-4 px-6 rounded-lg text-base font-bold transition-all ${
                activeTab === 'question-bank'
                  ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white shadow-lg transform scale-105'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              📚 Question Bank ({questions.length})
            </button>
            <button
              onClick={() => setActiveTab('user-management')}
              className={`flex-1 py-4 px-6 rounded-lg text-base font-bold transition-all ${
                activeTab === 'user-management'
                  ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-lg transform scale-105'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              👥 User Management ({users.length})
            </button>
          </div>
        </div>

        {/* Participant Episodes Section */}
        {activeTab === 'participant-episodes' && (
          <>
            <div className="mb-6">
              <Dialog open={isEpisodeDialogOpen} onOpenChange={setIsEpisodeDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gold-500 hover:bg-gold-600 text-white">
                    Create New Participant Episode
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white">
                  <DialogHeader>
                    <DialogTitle>Create New Participant Episode</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Episode Title</label>
                      <Input
                        value={newEpisode.title}
                        onChange={(e) => setNewEpisode({ ...newEpisode, title: e.target.value })}
                        placeholder="e.g., Science Masters Round 1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Description</label>
                      <Input
                        value={newEpisode.description}
                        onChange={(e) => setNewEpisode({ ...newEpisode, description: e.target.value })}
                        placeholder="Challenging questions for competitive players"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Target Role</label>
                      <div className="space-y-3">
                        <div className="w-full p-3 bg-blue-50 border border-blue-200 rounded">
                          <strong className="text-blue-800">🎯 Participant</strong>
                          <p className="text-xs text-blue-600 mt-1">All questions in this episode will be for participants</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="isForBothRoles"
                            checked={newEpisode.isForBothRoles}
                            onChange={(e) => setNewEpisode({ ...newEpisode, isForBothRoles: e.target.checked })}
                            className="rounded"
                          />
                          <label htmlFor="isForBothRoles" className="text-sm font-medium text-gray-700">
                            Also make this episode available for audience members
                          </label>
                        </div>
                        {newEpisode.isForBothRoles && (
                          <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                            ✅ This episode will be available for both participants and audience
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Status</label>
                      <select
                        value={newEpisode.status}
                        onChange={(e) => setNewEpisode({ ...newEpisode, status: e.target.value as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' })}
                        className="w-full p-2 border rounded"
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="PUBLISHED">Published</option>
                        <option value="ARCHIVED">Archived</option>
                      </select>
                    </div>
                    <Button 
                      onClick={() => handleCreateEpisode('PARTICIPANT')} 
                      className="w-full bg-blue-500 hover:bg-blue-600"
                    >
                      Create Participant Episode
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="mb-6 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-6 shadow-xl">
              <h2 className="text-3xl font-bold text-white mb-2">🎯 Participant Episodes</h2>
              <p className="text-blue-100 text-lg">Episodes with harder questions for competitive players</p>
            </div>

            {episodes.filter(e => e.targetRole === 'PARTICIPANT').length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-white rounded-xl p-10 max-w-lg mx-auto shadow-2xl border-4 border-blue-300">
                  <div className="text-7xl mb-4">🎯</div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">
                    No Participant Episodes Yet
                  </h3>
                  <p className="text-gray-600 mb-6 text-lg">
                    Create your first participant episode with competitive, challenging questions.
                  </p>
                  <Button
                    onClick={() => {
                      setNewEpisode({
                        title: '',
                        description: '',
                        status: 'DRAFT',
                        targetRole: 'PARTICIPANT',
                        isForBothRoles: false,
                      });
                      setIsEpisodeDialogOpen(true);
                    }}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold text-lg px-8 py-3 shadow-lg"
                  >
                    ➕ Create First Participant Episode
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-6">
                {episodes.filter(e => e.targetRole === 'PARTICIPANT').map((episode) => (
                <Card key={episode.id} className="p-6 bg-white shadow-xl border-2 border-blue-200 hover:border-blue-400 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-2xl font-bold text-gray-800">{episode.title}</h3>
                        <div className="flex space-x-2">
                          <span className={`px-3 py-2 rounded-full text-sm font-bold shadow-md ${
                            episode.targetRole === 'PARTICIPANT' 
                              ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
                              : 'bg-gradient-to-r from-teal-500 to-teal-600 text-white'
                          }`}>
                            {episode.targetRole === 'PARTICIPANT' ? '🎯 Participant' : '👥 Audience'}
                          </span>
                          {episode.isForBothRoles && (
                            <span className="px-3 py-2 rounded-full text-sm font-bold shadow-md bg-gradient-to-r from-green-500 to-green-600 text-white">
                              🔄 Both Roles
                            </span>
                          )}
                          <span className={`px-3 py-2 rounded-full text-sm font-bold shadow-md ${
                            episode.status === 'PUBLISHED' 
                              ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' 
                              : episode.status === 'DRAFT'
                              ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white'
                              : 'bg-gradient-to-r from-gray-500 to-gray-600 text-white'
                          }`}>
                            {episode.status}
                          </span>
                        </div>
                      </div>
                      {episode.description && (
                        <p className="text-gray-700 mb-3 text-base">{episode.description}</p>
                      )}
                      <div className="flex gap-4 text-base text-gray-700 font-medium">
                        <span className="bg-blue-50 px-3 py-1 rounded-full">📝 Questions: {episode._count.questions}</span>
                        <span className="bg-gray-100 px-3 py-1 rounded-full">📅 {new Date(episode.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setSelectedEpisode(episode);
                          setNewQuestion({
                            question: '',
                            options: ['', '', '', ''],
                            correctAnswer: 0,
                            difficulty: 1,
                            targetRole: episode.targetRole, // Inherit from episode
                            questionType: 'MULTIPLE_CHOICE',
                            episodeId: episode.id,
                          });
                          setIsDialogOpen(true);
                        }}

                        size="sm"
                        className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold shadow-lg"
                      >
                        ➕ Add Question
                      </Button>
                      <Button
                        onClick={() => handleViewEpisodeQuestions(episode)}
                        size="sm"
                        className="bg-white border-2 border-blue-300 text-blue-700 hover:bg-blue-50 font-semibold shadow-md"
                      >
                        👁️ View ({episode._count.questions})
                      </Button>
                      <Button
                        onClick={() => handleUpdateEpisodeStatus(episode.id, episode.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED')}
                        size="sm"
                        className={episode.status === 'PUBLISHED' 
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold shadow-lg' 
                          : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold shadow-lg'}
                      >
                        {episode.status === 'PUBLISHED' ? '📤 Unpublish' : '✅ Publish'}
                      </Button>
                      <Button
                        onClick={() => handleDeleteEpisode(episode.id)}
                        size="sm"
                        className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold shadow-lg"
                      >
                        🗑️ Delete
                      </Button>
                    </div>
                  </div>
                </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* Audience Episodes Section */}
        {activeTab === 'audience-episodes' && (
          <>
            <div className="mb-6">
              <Dialog open={isEpisodeDialogOpen} onOpenChange={setIsEpisodeDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gold-500 hover:bg-gold-600 text-white">
                    Create New Audience Episode
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white">
                  <DialogHeader>
                    <DialogTitle>Create New Audience Episode</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Episode Title</label>
                      <Input
                        value={newEpisode.title}
                        onChange={(e) => setNewEpisode({ ...newEpisode, title: e.target.value })}
                        placeholder="e.g., Fun Trivia Round 1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Description</label>
                      <Input
                        value={newEpisode.description}
                        onChange={(e) => setNewEpisode({ ...newEpisode, description: e.target.value })}
                        placeholder="Easy questions for audience engagement"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Target Role</label>
                      <div className="space-y-3">
                        <div className="w-full p-3 bg-teal-50 border border-teal-200 rounded">
                          <strong className="text-teal-800">👥 Audience</strong>
                          <p className="text-xs text-teal-600 mt-1">All questions in this episode will be for audience members</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="isForBothRolesAudience"
                            checked={newEpisode.isForBothRoles}
                            onChange={(e) => setNewEpisode({ ...newEpisode, isForBothRoles: e.target.checked })}
                            className="rounded"
                          />
                          <label htmlFor="isForBothRolesAudience" className="text-sm font-medium text-gray-700">
                            Also make this episode available for participants
                          </label>
                        </div>
                        {newEpisode.isForBothRoles && (
                          <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
                            ✅ This episode will be available for both participants and audience
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Status</label>
                      <select
                        value={newEpisode.status}
                        onChange={(e) => setNewEpisode({ ...newEpisode, status: e.target.value as 'DRAFT' | 'PUBLISHED' | 'ARCHIVED' })}
                        className="w-full p-2 border rounded"
                      >
                        <option value="DRAFT">Draft</option>
                        <option value="PUBLISHED">Published</option>
                        <option value="ARCHIVED">Archived</option>
                      </select>
                    </div>
                    <Button 
                      onClick={() => handleCreateEpisode('AUDIENCE')} 
                      className="w-full bg-teal-500 hover:bg-teal-600"
                    >
                      Create Audience Episode
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="mb-6 bg-gradient-to-r from-teal-600 to-teal-700 rounded-xl p-6 shadow-xl">
              <h2 className="text-3xl font-bold text-white mb-2">👥 Audience Episodes</h2>
              <p className="text-teal-100 text-lg">Episodes with easier questions for audience engagement</p>
            </div>

            {episodes.filter(e => e.targetRole === 'AUDIENCE').length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-white rounded-xl p-10 max-w-lg mx-auto shadow-2xl border-4 border-teal-300">
                  <div className="text-7xl mb-4">👥</div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">
                    No Audience Episodes Yet
                  </h3>
                  <p className="text-gray-600 mb-6 text-lg">
                    Create your first audience episode with easy, engaging questions.
                  </p>
                  <Button
                    onClick={() => {
                      setNewEpisode({
                        title: '',
                        description: '',
                        status: 'DRAFT',
                        targetRole: 'AUDIENCE',
                        isForBothRoles: false,
                      });
                      setIsEpisodeDialogOpen(true);
                    }}
                    className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-bold text-lg px-8 py-3 shadow-lg"
                  >
                    ➕ Create First Audience Episode
                  </Button>
                </div>
              </div>
            ) : (
            <div className="grid gap-6">
                {episodes.filter(e => e.targetRole === 'AUDIENCE').map((episode) => (
                <Card key={episode.id} className="p-6 bg-white shadow-xl border-2 border-teal-200 hover:border-teal-400 transition-all">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="text-lg font-semibold">{episode.title}</h3>
                        <div className="flex space-x-2">
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                            👥 Audience
                          </span>
                          {episode.isForBothRoles && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              🔄 Both Roles
                            </span>
                          )}
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            episode.status === 'PUBLISHED' 
                              ? 'bg-green-100 text-green-800' 
                              : episode.status === 'DRAFT'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {episode.status}
                          </span>
                        </div>
                      </div>
                      {episode.description && (
                        <p className="text-gray-600 mb-2">{episode.description}</p>
                      )}
                      <div className="flex gap-4 text-sm text-gray-600">
                        <span>Questions: {episode._count.questions}</span>
                        <span>Created: {new Date(episode.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setSelectedEpisode(episode);
                          setNewQuestion({
                            question: '',
                            options: ['', '', '', ''],
                            correctAnswer: 0,
                            difficulty: 1,
                            targetRole: episode.targetRole,
                            questionType: 'MULTIPLE_CHOICE',
                            episodeId: episode.id,
                          });
                          setIsDialogOpen(true);
                        }}

                        size="sm"
                        className="bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 text-white font-bold shadow-lg"
                      >
                        ➕ Add Question
                      </Button>
                      <Button
                        onClick={() => handleViewEpisodeQuestions(episode)}
                        size="sm"
                        className="bg-white border-2 border-teal-300 text-teal-700 hover:bg-teal-50 font-semibold shadow-md"
                      >
                        👁️ View ({episode._count.questions})
                      </Button>
                      <Button
                        onClick={() => handleUpdateEpisodeStatus(episode.id, episode.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED')}
                        size="sm"
                        className={episode.status === 'PUBLISHED' 
                          ? 'bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold shadow-lg' 
                          : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold shadow-lg'}
                      >
                        {episode.status === 'PUBLISHED' ? '📤 Unpublish' : '✅ Publish'}
                      </Button>
                      <Button
                        onClick={() => handleDeleteEpisode(episode.id)}
                        size="sm"
                        className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white font-bold shadow-lg"
                      >
                        🗑️ Delete
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
            )}
          </>
        )}

        {/* Question Bank Section */}
        {activeTab === 'question-bank' && (
          <>
            <div className="mb-6">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-purple-500 hover:bg-purple-600 text-white">
                    Create New Question
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-white max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Create New Question</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Question</label>
                      <Input
                        value={newQuestion.question}
                        onChange={(e) => setNewQuestion({ ...newQuestion, question: e.target.value })}
                        placeholder="Enter question..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Options</label>
                      {newQuestion.questionType === 'YES_NO' ? (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <span className="w-8 text-sm font-medium">A:</span>
                            <Input value="Yes" disabled className="bg-gray-100" />
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="w-8 text-sm font-medium">B:</span>
                            <Input value="No" disabled className="bg-gray-100" />
                          </div>
                        </div>
                      ) : (
                        newQuestion.options.map((option, index) => (
                          <Input
                            key={index}
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...newQuestion.options];
                              newOptions[index] = e.target.value;
                              setNewQuestion({ ...newQuestion, options: newOptions });
                            }}
                            placeholder={`Option ${index + 1}`}
                            className="mb-2"
                          />
                        ))
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Correct Answer {newQuestion.questionType === 'YES_NO' ? '(0=Yes, 1=No)' : '(0-3)'}
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max={newQuestion.questionType === 'YES_NO' ? '1' : '3'}
                        value={newQuestion.correctAnswer}
                        onChange={(e) => setNewQuestion({ ...newQuestion, correctAnswer: parseInt(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Difficulty (1-10)</label>
                      <Input
                        type="number"
                        min="1"
                        max="10"
                        value={newQuestion.difficulty}
                        onChange={(e) => setNewQuestion({ ...newQuestion, difficulty: parseInt(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Target Role</label>
                      <select
                        value={newQuestion.targetRole}
                        onChange={(e) => setNewQuestion({ ...newQuestion, targetRole: e.target.value as 'PARTICIPANT' | 'AUDIENCE' })}
                        className="w-full p-2 border rounded"
                      >
                        <option value="PARTICIPANT">🎯 Participant</option>
                        <option value="AUDIENCE">👥 Audience</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Question Type</label>
                      <select
                        value={newQuestion.questionType}
                        onChange={(e) => {
                          const questionType = e.target.value as 'MULTIPLE_CHOICE' | 'YES_NO';
                          setNewQuestion({ 
                            ...newQuestion, 
                            questionType,
                            options: questionType === 'YES_NO' ? ['Yes', 'No'] : ['', '', '', ''],
                            correctAnswer: questionType === 'YES_NO' ? 0 : newQuestion.correctAnswer
                          });
                        }}
                        className="w-full p-2 border rounded"
                      >
                        <option value="MULTIPLE_CHOICE">Multiple Choice (A, B, C, D)</option>
                        <option value="YES_NO">Yes/No Question</option>
                      </select>
                    </div>
                    <Button onClick={handleCreateQuestion} className="w-full bg-purple-500 hover:bg-purple-600">
                      Create Question
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="mb-6 bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl p-6 shadow-xl">
              <h2 className="text-3xl font-bold text-white mb-2">📚 Question Bank</h2>
              <p className="text-purple-100 text-lg">Manage all questions independently of episodes</p>
            </div>

            {questions.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-white rounded-xl p-10 max-w-lg mx-auto shadow-2xl border-4 border-purple-300">
                  <div className="text-7xl mb-4">📚</div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">
                    No Questions Yet
                  </h3>
                  <p className="text-gray-600 mb-6 text-lg">
                    Create your first question to start building your question bank.
                  </p>
                  <Button
                    onClick={() => setIsDialogOpen(true)}
                    className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-bold text-lg px-8 py-3 shadow-lg"
                  >
                    ➕ Create First Question
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-6">
                {questions.map((question, index) => (
                  <Card key={question.id} className="p-6 bg-white shadow-xl border-2 border-purple-200 hover:border-purple-400 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xl font-bold text-gray-800">Q{index + 1}. {question.question}</h3>
                          <div className="flex space-x-2">
                            <span className={`px-3 py-2 rounded-full text-sm font-bold shadow-md ${
                              question.targetRole === 'PARTICIPANT' 
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' 
                                : 'bg-gradient-to-r from-teal-500 to-teal-600 text-white'
                            }`}>
                              {question.targetRole === 'PARTICIPANT' ? '🎯 Participant' : '👥 Audience'}
                            </span>
                            <span className={`px-3 py-2 rounded-full text-sm font-bold shadow-md ${
                              question.questionType === 'YES_NO' 
                                ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white' 
                                : 'bg-gradient-to-r from-green-500 to-green-600 text-white'
                            }`}>
                              {question.questionType === 'YES_NO' ? 'Yes/No' : 'Multiple Choice'}
                            </span>
                            <span className={`px-3 py-2 rounded-full text-sm font-bold shadow-md ${
                              question.isActive 
                                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' 
                                : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                            }`}>
                              {question.isActive ? '✅ Active' : '❌ Inactive'}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          {question.options.map((option, idx) => (
                            <div
                              key={idx}
                              className={`p-3 rounded text-sm ${
                                idx === question.correctAnswer
                                  ? 'bg-green-100 text-green-800 border border-green-300 font-medium'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {String.fromCharCode(65 + idx)}. {option}
                              {idx === question.correctAnswer && ' ✓'}
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-4 text-sm text-gray-600">
                          <span className="bg-purple-50 px-3 py-1 rounded-full">Difficulty: {question.difficulty}/10</span>
                          <span className="bg-gray-100 px-3 py-1 rounded-full">Created: {new Date(question.createdAt).toLocaleDateString()}</span>
                          {question.episodeId && (
                            <span className="bg-blue-50 px-3 py-1 rounded-full">Linked to Episode</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!question.episodeId && (
                          <Button
                            onClick={() => {
                              setSelectedQuestionToLink(question);
                              setIsLinkQuestionOpen(true);
                            }}
                            variant="outline"
                            size="sm"
                            className="bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100"
                          >
                            Link to Episode
                          </Button>
                        )}
                        <Button
                          onClick={() => toggleQuestionStatus(question.id, question.isActive)}
                          variant={question.isActive ? 'destructive' : 'default'}
                          size="sm"
                        >
                          {question.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this question?')) {
                              handleDeleteQuestion(question.id);
                            }
                          }}
                          variant="destructive"
                          size="sm"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* User Management Section */}
        {activeTab === 'user-management' && (
          <>
            <div className="mb-6 bg-gradient-to-r from-orange-600 to-orange-700 rounded-xl p-6 shadow-xl">
              <h2 className="text-3xl font-bold text-white mb-2">👥 User Management</h2>
              <p className="text-orange-100 text-lg">Manage users and reset passwords</p>
            </div>

            {users.length === 0 ? (
              <div className="text-center py-12">
                <div className="bg-white rounded-xl p-10 max-w-lg mx-auto shadow-2xl border-4 border-orange-300">
                  <div className="text-7xl mb-4">👥</div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">
                    No Users Found
                  </h3>
                  <p className="text-gray-600 mb-6 text-lg">
                    No users are currently registered in the system.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-6">
                {users.map((user) => (
                  <Card key={user.id} className="p-6 bg-white shadow-xl border-2 border-orange-200 hover:border-orange-400 transition-all">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xl font-bold text-gray-800">{user.username}</h3>
                          <div className="flex space-x-2">
                            <span className={`px-3 py-2 rounded-full text-sm font-bold shadow-md ${
                              user.role === 'GENERAL_ADMIN' 
                                ? 'bg-gradient-to-r from-red-500 to-red-600 text-white' 
                                : user.role === 'GAME_MASTER'
                                ? 'bg-gradient-to-r from-purple-500 to-purple-600 text-white'
                                : user.role === 'PARTICIPANT'
                                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
                                : 'bg-gradient-to-r from-teal-500 to-teal-600 text-white'
                            }`}>
                              {user.role === 'GENERAL_ADMIN' ? '🔑 Admin' : 
                               user.role === 'GAME_MASTER' ? '🎮 Game Master' :
                               user.role === 'PARTICIPANT' ? '🎯 Participant' : '👥 Audience'}
                            </span>
                            <span className={`px-3 py-2 rounded-full text-sm font-bold shadow-md ${
                              user.isActive 
                                ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' 
                                : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
                            }`}>
                              {user.isActive ? '✅ Active' : '❌ Inactive'}
                            </span>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Email</p>
                            <p className="font-medium text-gray-800">{user.email}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Unique Number</p>
                            <p className="font-medium text-gray-800">{user.uniqueNumber}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Score</p>
                            <p className="font-medium text-gray-800">{user.score}</p>
                          </div>
                          <div>
                            <p className="text-sm text-gray-600 mb-1">Joined</p>
                            <p className="font-medium text-gray-800">{new Date(user.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => {
                            setSelectedUserToReset(user);
                            setIsResetPasswordOpen(true);
                          }}
                          variant="outline"
                          size="sm"
                          className="bg-orange-50 text-orange-700 border-orange-300 hover:bg-orange-100"
                        >
                          Reset Password
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}

        {/* View Episode Questions Modal */}
        <Dialog open={isViewQuestionsOpen} onOpenChange={setIsViewQuestionsOpen}>
          <DialogContent className="bg-white max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedEpisode?.title} - Questions ({episodeQuestions.length})
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {episodeQuestions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No questions in this episode yet.</p>
                  <Button
                    onClick={() => {
                      setIsViewQuestionsOpen(false);
                      setNewQuestion(prev => ({
                        ...prev,
                        episodeId: selectedEpisode?.id || ''
                      }));
                      setIsDialogOpen(true);
                    }}
                    className="mt-4 bg-blue-500 hover:bg-blue-600"
                  >
                    + Add First Question
                  </Button>
            </div>
              ) : (
                episodeQuestions.map((question, index) => (
                  <Card key={question.id} className="p-4">
                    <div className="flex justify-between items-start">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-bold text-gray-700">Q{index + 1}.</span>
                          <h4 className="font-semibold">{question.question}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            question.questionType === 'YES_NO' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {question.questionType === 'YES_NO' ? 'Yes/No' : 'Multiple Choice'}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            question.targetRole === 'PARTICIPANT' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-orange-100 text-orange-800'
                          }`}>
                            {question.targetRole === 'PARTICIPANT' ? '🎯 Participant' : '👥 Audience'}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {question.options.map((option, idx) => (
                            <div
                              key={idx}
                              className={`p-2 rounded text-sm ${
                                idx === question.correctAnswer
                                  ? 'bg-green-100 text-green-800 border border-green-300 font-medium'
                                  : 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {String.fromCharCode(65 + idx)}. {option}
                          </div>
                        ))}
                      </div>
                        <div className="mt-2 text-xs text-gray-500">
                          Difficulty: {question.difficulty} | Status: {question.isActive ? '✅ Active' : '❌ Inactive'}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => toggleQuestionStatus(question.id, question.isActive)}
                          variant={question.isActive ? 'destructive' : 'default'}
                          size="sm"
                        >
                          {question.isActive ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this question?')) {
                              handleDeleteQuestion(question.id);
                            }
                          }}
                          variant="destructive"
                          size="sm"
                        >
                          Delete
                        </Button>
                      </div>
                  </div>
                </Card>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Link Question to Episode Modal */}
        <Dialog open={isLinkQuestionOpen} onOpenChange={setIsLinkQuestionOpen}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle>Link Question to Episode</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedQuestionToLink && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">Question:</h4>
                  <p className="text-gray-700">{selectedQuestionToLink.question}</p>
                  <div className="mt-2 flex gap-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      selectedQuestionToLink.targetRole === 'PARTICIPANT' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-teal-100 text-teal-800'
                    }`}>
                      {selectedQuestionToLink.targetRole === 'PARTICIPANT' ? '🎯 Participant' : '👥 Audience'}
                    </span>
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      Difficulty: {selectedQuestionToLink.difficulty}/10
                    </span>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2">Select Episode</label>
                <select
                  onChange={(e) => {
                    if (e.target.value && selectedQuestionToLink) {
                      handleLinkQuestionToEpisode(selectedQuestionToLink.id, e.target.value);
                    }
                  }}
                  className="w-full p-2 border rounded"
                >
                  <option value="">-- Select an Episode --</option>
                  {episodes.map((episode) => (
                    <option key={episode.id} value={episode.id}>
                      {episode.targetRole === 'PARTICIPANT' ? '🎯' : '👥'} {episode.title} ({episode.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Reset Password Modal */}
        <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
          <DialogContent className="bg-white">
            <DialogHeader>
              <DialogTitle>Reset Password</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {selectedUserToReset && (
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-semibold mb-2">User Details:</h4>
                  <p className="text-gray-700"><strong>Username:</strong> {selectedUserToReset.username}</p>
                  <p className="text-gray-700"><strong>Email:</strong> {selectedUserToReset.email}</p>
                  <p className="text-gray-700"><strong>Role:</strong> {selectedUserToReset.role}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-2">New Password</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password..."
                  className="w-full"
                />
                <p className="text-xs text-gray-500 mt-1">
                  The user will need to use this new password to log in.
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (selectedUserToReset && newPassword.trim()) {
                      handleResetPassword(selectedUserToReset.id, newPassword);
                    } else {
                      alert('Please enter a new password');
                    }
                  }}
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                >
                  Reset Password
                </Button>
                <Button
                  onClick={() => {
                    setIsResetPasswordOpen(false);
                    setNewPassword('');
                    setSelectedUserToReset(null);
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

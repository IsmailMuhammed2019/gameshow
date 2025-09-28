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
  createdAt: string;
}

export default function GeneralAdminPage() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [participantQuestions, setParticipantQuestions] = useState<Question[]>([]);
  const [audienceQuestions, setAudienceQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'participant' | 'audience'>('participant');
  const [newQuestion, setNewQuestion] = useState({
    question: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    difficulty: 1,
    targetRole: 'PARTICIPANT' as 'PARTICIPANT' | 'AUDIENCE',
    questionType: 'MULTIPLE_CHOICE' as 'MULTIPLE_CHOICE' | 'YES_NO',
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || user?.role !== 'GENERAL_ADMIN') {
      router.push('/login');
      return;
    }
    fetchQuestions();
  }, [isAuthenticated, user, router]);

  const fetchQuestions = async () => {
    try {
      const [participantResponse, audienceResponse] = await Promise.all([
        api.get('/game/questions/participant'),
        api.get('/game/questions/audience')
      ]);
      
      setParticipantQuestions(participantResponse.data);
      setAudienceQuestions(audienceResponse.data);
      
      // Also fetch all questions for backward compatibility
      const allResponse = await api.get('/game/questions');
      setQuestions(allResponse.data);
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuestion = async () => {
    try {
      await api.post('/game/questions', newQuestion);
      setNewQuestion({
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        difficulty: 1,
        targetRole: 'PARTICIPANT',
        questionType: 'MULTIPLE_CHOICE',
      });
      setIsDialogOpen(false);
      fetchQuestions();
    } catch (error) {
      console.error('Error creating question:', error);
    }
  };

  const toggleQuestionStatus = async (questionId: string, isActive: boolean) => {
    try {
      await api.patch(`/game/questions/${questionId}`, { isActive: !isActive });
      fetchQuestions();
    } catch (error) {
      console.error('Error updating question:', error);
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
    <div className="min-h-screen bg-gradient-to-br from-dark-blue-500 via-light-blue-500 to-teal-500">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">Question Management</h1>
            <p className="text-light-blue-100">Manage questions for the game</p>
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

        <div className="mb-6">
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-gold-500 hover:bg-gold-600 text-white"
                onClick={() => {
                  // Set the target role based on active tab
                  setNewQuestion(prev => ({
                    ...prev,
                    targetRole: activeTab === 'participant' ? 'PARTICIPANT' : 'AUDIENCE'
                  }));
                }}
              >
                Add New {activeTab === 'participant' ? 'Participant' : 'Audience'} Question
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white">
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
                  <div className="w-full p-3 bg-gray-100 border rounded text-gray-700">
                    {newQuestion.targetRole === 'PARTICIPANT' ? '🎯 Participant' : '👥 Audience'}
                    <span className="text-sm text-gray-500 ml-2">(Auto-selected based on current tab)</span>
                  </div>
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
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="flex space-x-1 bg-white/10 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('participant')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                activeTab === 'participant'
                  ? 'bg-gold-500 text-white shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              🎯 Participant Questions ({participantQuestions.length})
            </button>
            <button
              onClick={() => setActiveTab('audience')}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                activeTab === 'audience'
                  ? 'bg-gold-500 text-white shadow-md'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              👥 Audience Questions ({audienceQuestions.length})
            </button>
          </div>
        </div>

        {/* Section Header */}
        <div className="mb-4">
          <h2 className="text-2xl font-bold text-white mb-2">
            {activeTab === 'participant' ? '🎯 Participant Questions' : '👥 Audience Questions'}
          </h2>
          <p className="text-white/80">
            {activeTab === 'participant' 
              ? 'Questions specifically designed for game participants'
              : 'Questions designed for audience members to answer'
            }
          </p>
        </div>

        <div className="grid gap-6">
          {(activeTab === 'participant' ? participantQuestions : audienceQuestions).map((question) => (
            <Card key={question.id} className="p-6 bg-white/90 backdrop-blur-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-semibold">{question.question}</h3>
                    <div className="flex space-x-2">
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
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    {question.options.map((option, index) => (
                      <div
                        key={index}
                        className={`p-2 rounded ${
                          index === question.correctAnswer
                            ? 'bg-green-100 text-green-800 border border-green-300'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {String.fromCharCode(65 + index)}. {option}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>Difficulty: {question.difficulty}</span>
                    <span>Role: {question.targetRole}</span>
                    <span>Status: {question.isActive ? 'Active' : 'Inactive'}</span>
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
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

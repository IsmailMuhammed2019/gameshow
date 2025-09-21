export interface User {
  id: string;
  username: string;
  email: string;
  role: 'PARTICIPANT' | 'AUDIENCE' | 'GAME_MASTER';
  uniqueNumber: string;
  isActive: boolean;
  score: number;
  createdAt: string;
}

export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  difficulty: number;
  isActive: boolean;
  createdAt: string;
}

export interface GameSession {
  id: string;
  status: 'waiting' | 'active' | 'paused' | 'finished';
  currentQuestionId?: string;
  currentQuestionIndex: number;
  totalQuestions: number;
  gameMasterId: string;
  gameMaster?: User;
  currentQuestion?: Question;
  createdAt: string;
}

export interface Answer {
  id: string;
  userId: string;
  questionId: string;
  gameSessionId: string;
  selectedOption: number;
  isCorrect: boolean;
  responseTime: number;
  user?: User;
  question?: Question;
  gameSession?: GameSession;
  createdAt: string;
}

export interface Winner {
  userId: string;
  username: string;
  uniqueNumber: string;
  role: string;
}

export interface GameState {
  currentQuestion?: Question;
  gameSession?: GameSession;
  isConnected: boolean;
  isAnswering: boolean;
  answerResult?: {
    isCorrect: boolean;
    correctAnswer: number;
    selectedOption: number;
  };
  winners: Winner[];
  participants: User[];
  audience: User[];
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

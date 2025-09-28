import { create } from 'zustand';
import { GameState, Question, GameSession, Winner, User } from '@/types';

interface GameStore extends GameState {
  setCurrentQuestion: (question: Question) => void;
  setGameSession: (session: GameSession) => void;
  setConnectionStatus: (isConnected: boolean) => void;
  setAnswering: (isAnswering: boolean) => void;
  setAnswerResult: (result: { isCorrect?: boolean; correctAnswer?: number; selectedOption?: number; submitted?: boolean; message?: string } | undefined) => void;
  addWinner: (winner: Winner) => void;
  clearWinners: () => void;
  setParticipants: (participants: User[]) => void;
  setAudience: (audience: User[]) => void;
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set, get) => ({
  currentQuestion: undefined,
  gameSession: undefined,
  isConnected: false,
  isAnswering: false,
  answerResult: undefined,
  winners: [],
  participants: [],
  audience: [],

  setCurrentQuestion: (question: Question) => {
    set({ currentQuestion: question });
  },

  setGameSession: (session: GameSession) => {
    set({ gameSession: session });
  },

  setConnectionStatus: (isConnected: boolean) => {
    set({ isConnected });
  },

  setAnswering: (isAnswering: boolean) => {
    set({ isAnswering });
  },

  setAnswerResult: (result: { isCorrect?: boolean; correctAnswer?: number; selectedOption?: number; submitted?: boolean; message?: string } | undefined) => {
    set({ answerResult: result });
  },

  addWinner: (winner: Winner) => {
    set((state) => ({
      winners: [...state.winners, winner],
    }));
  },

  clearWinners: () => {
    set({ winners: [] });
  },

  setParticipants: (participants: User[]) => {
    set({ participants });
  },

  setAudience: (audience: User[]) => {
    set({ audience });
  },

  resetGame: () => {
    set({
      currentQuestion: undefined,
      gameSession: undefined,
      isAnswering: false,
      answerResult: undefined,
      winners: [],
    });
  },
}));

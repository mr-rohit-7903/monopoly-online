import { create } from 'zustand';
import { GameSession, Player } from '../types/game';
import {
  createGameSession,
  joinGameByCode,
  subscribeToGame,
  subscribeToPlayers,
  subscribeToProperties,
  setGameBanker,
  startGameSession,
} from '../services/firebase/gameService';
import { PropertyState } from '../types/property';
import { storage } from '../services/storageHelper';

const GAME_STORAGE_KEY = '@monopoly_saved_game_id';

interface GameStoreState {
  currentGame: GameSession | null;
  players: Player[];
  properties: Record<string, PropertyState>;
  isLoading: boolean;
  error: string | null;

  // Unsubscribe callbacks
  unsubGame: (() => void) | null;
  unsubPlayers: (() => void) | null;
  unsubProperties: (() => void) | null;

  // Actions
  createGame: (params: { userId: string; name: string; avatar: string; color: string }) => Promise<string>;
  joinGame: (params: { code: string; userId: string; name: string; avatar: string; color: string }) => Promise<string>;
  subscribeToSession: (gameId: string) => void;
  restoreSavedSession: () => void;
  leaveGame: () => void;
  unsubscribeFromSession: () => void;
  assignBanker: (newBankerId: string) => Promise<void>;
  startGame: () => Promise<void>;
  clearError: () => void;
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  currentGame: null,
  players: [],
  properties: {},
  isLoading: false,
  error: null,

  unsubGame: null,
  unsubPlayers: null,
  unsubProperties: null,

  clearError: () => set({ error: null }),

  createGame: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const { gameId } = await createGameSession({
        hostUserId: params.userId,
        hostName: params.name,
        hostAvatar: params.avatar,
        hostColor: params.color,
      });
      storage.setItem(GAME_STORAGE_KEY, gameId);
      get().subscribeToSession(gameId);
      set({ isLoading: false });
      return gameId;
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'Failed to create game.' });
      throw err;
    }
  },

  joinGame: async (params) => {
    set({ isLoading: true, error: null });
    try {
      const gameId = await joinGameByCode(params.code, {
        userId: params.userId,
        name: params.name,
        avatar: params.avatar,
        color: params.color,
      });
      storage.setItem(GAME_STORAGE_KEY, gameId);
      get().subscribeToSession(gameId);
      set({ isLoading: false });
      return gameId;
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || 'Failed to join game.' });
      throw err;
    }
  },

  subscribeToSession: (gameId: string) => {
    get().unsubscribeFromSession();
    storage.setItem(GAME_STORAGE_KEY, gameId);

    const unsubGame = subscribeToGame(gameId, (game) => {
      set({ currentGame: game });
    });

    const unsubPlayers = subscribeToPlayers(gameId, (playersList) => {
      set({ players: playersList });
    });

    const unsubProperties = subscribeToProperties(gameId, (propsMap) => {
      set({ properties: propsMap });
    });

    set({ unsubGame, unsubPlayers, unsubProperties });
  },

  restoreSavedSession: () => {
    const savedGameId = storage.getItem(GAME_STORAGE_KEY);
    if (savedGameId && !get().currentGame) {
      get().subscribeToSession(savedGameId);
    }
  },

  leaveGame: () => {
    storage.removeItem(GAME_STORAGE_KEY);
    get().unsubscribeFromSession();
  },

  unsubscribeFromSession: () => {
    const { unsubGame, unsubPlayers, unsubProperties } = get();
    if (unsubGame) unsubGame();
    if (unsubPlayers) unsubPlayers();
    if (unsubProperties) unsubProperties();
    set({
      unsubGame: null,
      unsubPlayers: null,
      unsubProperties: null,
      currentGame: null,
      players: [],
      properties: {},
    });
  },

  assignBanker: async (newBankerId: string) => {
    const game = get().currentGame;
    if (!game) return;
    try {
      await setGameBanker(game.id, newBankerId);
    } catch (err: any) {
      set({ error: err?.message || 'Failed to assign banker.' });
    }
  },

  startGame: async () => {
    const game = get().currentGame;
    if (!game) return;
    try {
      await startGameSession(game.id);
    } catch (err: any) {
      set({ error: err?.message || 'Failed to start game.' });
    }
  },
}));

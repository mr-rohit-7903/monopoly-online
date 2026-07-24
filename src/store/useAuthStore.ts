import { create } from 'zustand';
import { loginAnonymously } from '../services/firebase/auth';
import { storage } from '../services/storageHelper';

const STORAGE_KEYS = {
  USER_ID: '@monopoly_user_id',
  USER_NAME: '@monopoly_user_name',
  USER_AVATAR: '@monopoly_user_avatar',
  USER_COLOR: '@monopoly_user_color',
};

interface AuthState {
  userId: string | null;
  userName: string;
  userAvatar: string;
  userColor: string;
  isAuthenticating: boolean;
  setUserName: (name: string) => void;
  setUserAvatar: (avatar: string) => void;
  setUserColor: (color: string) => void;
  initAuth: () => Promise<string>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  userId: storage.getItem(STORAGE_KEYS.USER_ID),
  userName: storage.getItem(STORAGE_KEYS.USER_NAME) || '',
  userAvatar: storage.getItem(STORAGE_KEYS.USER_AVATAR) || '🎩',
  userColor: storage.getItem(STORAGE_KEYS.USER_COLOR) || '#3B82F6',
  isAuthenticating: false,

  setUserName: (name: string) => {
    storage.setItem(STORAGE_KEYS.USER_NAME, name);
    set({ userName: name });
  },

  setUserAvatar: (avatar: string) => {
    storage.setItem(STORAGE_KEYS.USER_AVATAR, avatar);
    set({ userAvatar: avatar });
  },

  setUserColor: (color: string) => {
    storage.setItem(STORAGE_KEYS.USER_COLOR, color);
    set({ userColor: color });
  },

  initAuth: async () => {
    // 1. Check existing in-memory state
    const currentId = get().userId;
    if (currentId) return currentId;

    // 2. Check persistent storage (preserves identity across browser refreshes)
    const storedId = storage.getItem(STORAGE_KEYS.USER_ID);
    if (storedId) {
      set({ userId: storedId });
      return storedId;
    }

    // 3. Fallback: Create new anonymous user if no stored identity exists
    set({ isAuthenticating: true });
    try {
      const uid = await loginAnonymously();
      storage.setItem(STORAGE_KEYS.USER_ID, uid);
      set({ userId: uid, isAuthenticating: false });
      return uid;
    } catch (err) {
      set({ isAuthenticating: false });
      throw err;
    }
  },
}));

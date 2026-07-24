import { create } from 'zustand';
import { storage } from '../services/storageHelper';

export type ThemeMode = 'dark' | 'light';

export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primaryLight: string;
  gold: string;
  sky: string;
  emerald: string;
  crimson: string;
  purple: string;
  background: string;
  surface: string;
  surfaceLight: string;
  surfaceBorder: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  bankDeposit: string;
  bankWithdraw: string;
  cardBackground: string;
}

export const DARK_COLORS: ThemeColors = {
  primary: '#5588ff',      // (85,136,255)
  primaryDark: '#3366ff',  // (51,102,255)
  primaryLight: '#77aaff', // (119,170,255)
  gold: '#99ccff',         // Accent Highlight (153,204,255)
  sky: '#bbeeff',          // Soft Ice Highlight (187,238,255)
  emerald: '#10B981',
  crimson: '#EF4444',
  purple: '#77aaff',

  background: '#0F172A',   // Slate 900
  surface: '#1E293B',      // Slate 800
  surfaceLight: '#334155',  // Slate 700
  surfaceBorder: '#475569',

  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  bankDeposit: '#10B981',
  bankWithdraw: '#EF4444',
  cardBackground: '#1E293B',
};

export const LIGHT_COLORS: ThemeColors = {
  primary: '#3366ff',      // Deep Royal Blue
  primaryDark: '#1d4ed8',
  primaryLight: '#5588ff',
  gold: '#0284C7',         // Deep Sky Accent
  sky: '#77aaff',
  emerald: '#059669',
  crimson: '#DC2626',
  purple: '#3366ff',

  background: '#F8FAFC',   // Slate 50
  surface: '#FFFFFF',      // Pure White Card
  surfaceLight: '#E2E8F0',  // Slate 200
  surfaceBorder: '#CBD5E1',// Slate 300

  textPrimary: '#0F172A',  // Slate 900
  textSecondary: '#334155',// Slate 700
  textMuted: '#64748B',    // Slate 500

  bankDeposit: '#059669',
  bankWithdraw: '#DC2626',
  cardBackground: '#FFFFFF',
};

interface ThemeState {
  themeMode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const STORAGE_KEY = '@monopoly_theme_mode';

const initialMode = (storage.getItem(STORAGE_KEY) as ThemeMode) || 'dark';

export const useThemeStore = create<ThemeState>((set, get) => ({
  themeMode: initialMode,
  colors: initialMode === 'light' ? LIGHT_COLORS : DARK_COLORS,

  toggleTheme: () => {
    const nextMode = get().themeMode === 'dark' ? 'light' : 'dark';
    storage.setItem(STORAGE_KEY, nextMode);
    set({
      themeMode: nextMode,
      colors: nextMode === 'light' ? LIGHT_COLORS : DARK_COLORS,
    });
  },

  setTheme: (mode: ThemeMode) => {
    storage.setItem(STORAGE_KEY, mode);
    set({
      themeMode: mode,
      colors: mode === 'light' ? LIGHT_COLORS : DARK_COLORS,
    });
  },
}));

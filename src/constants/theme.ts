export const COLORS = {
  // Brand / Primary Palette (User Theme)
  primary: '#5588ff',      // (85,136,255)
  primaryDark: '#3366ff',  // (51,102,255)
  primaryLight: '#77aaff', // (119,170,255)

  // Accent Colors & Highlights
  gold: '#99ccff',         // (153,204,255) Accent Highlight
  sky: '#bbeeff',          // (187,238,255) Soft Ice Highlight
  emerald: '#10B981',
  crimson: '#EF4444',
  purple: '#77aaff',

  // Dark Theme Surfaces
  background: '#0F172A', // Slate 900
  surface: '#1E293B',    // Slate 800
  surfaceLight: '#334155',// Slate 700
  surfaceBorder: '#475569',

  // Text Colors
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',

  // Banking status colors
  bankDeposit: '#22C55E',
  bankWithdraw: '#EF4444',
  cardBackground: '#1E293B',
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const RADIUS = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const PLAYER_COLORS = [
  '#EF4444', // Red
  '#3B82F6', // Blue
  '#10B981', // Green
  '#EAB308', // Yellow
  '#EC4899', // Pink
];

export const PLAYER_AVATARS = [
  'rohit', 'Ayush', 'Sumit', 'Baibhab', 'Himanshu'
];

export const AVATAR_MAP: Record<string, any> = {
  rohit: require('../public/avatar/rohit.jpg'),
  Ayush: require('../public/avatar/Ayush.jpeg'),
  Sumit: require('../public/avatar/Sumit.jpeg'),
  Baibhab: require('../public/avatar/Baibhab.jpeg'),
  Himanshu: require('../public/avatar/Himanshu.jpeg'),
};

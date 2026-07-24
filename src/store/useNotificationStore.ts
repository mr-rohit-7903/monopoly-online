import { create } from 'zustand';
import { AppNotification } from '../types/notification';

interface NotificationState {
  activeToast: AppNotification | null;
  notificationHistory: AppNotification[];
  showToast: (notification: AppNotification) => void;
  hideToast: () => void;
  setHistory: (list: AppNotification[]) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  activeToast: null,
  notificationHistory: [],

  showToast: (notification) => set({ activeToast: notification }),
  hideToast: () => set({ activeToast: null }),
  setHistory: (list) => set({ notificationHistory: list }),
}));

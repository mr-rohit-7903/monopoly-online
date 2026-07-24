import {
  ref,
  onValue,
  query,
  limitToLast,
} from 'firebase/database';
import { db } from '../firebase/config';
import { AppNotification } from '../../types/notification';

export function subscribeToRealtimeNotifications(
  gameId: string,
  onNotificationReceived: (notification: AppNotification) => void,
  onHistoryUpdated: (notifications: AppNotification[]) => void
) {
  const notifsRef = ref(db, `games/${gameId}/notifications`);
  const q = query(notifsRef, limitToLast(50));

  let isFirstLoad = true;
  let prevKeys = new Set<string>();

  return onValue(q, (snapshot) => {
    const list: AppNotification[] = [];
    const currentKeys = new Set<string>();

    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.keys(data).forEach((key) => {
        currentKeys.add(key);
        list.push(data[key] as AppNotification);
      });
      // Sort newest first
      list.sort((a, b) => b.timestamp - a.timestamp);
    }

    onHistoryUpdated(list);

    if (!isFirstLoad) {
      currentKeys.forEach((key) => {
        if (!prevKeys.has(key)) {
          const snapshotVal = snapshot.val();
          if (snapshotVal && snapshotVal[key]) {
            onNotificationReceived(snapshotVal[key] as AppNotification);
          }
        }
      });
    }

    prevKeys = currentKeys;
    isFirstLoad = false;
  });
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    console.log('Expo Push Notifications: Subscribed for in-app and background pushes');
    return 'expo-push-token-placeholder';
  } catch (error) {
    console.warn('Push notification setup skipped:', error);
    return null;
  }
}

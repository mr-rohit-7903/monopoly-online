import React, { useEffect } from 'react';
import { LogBox, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { COLORS } from '../src/constants/theme';
import { NotificationToast } from '../src/components/notifications/NotificationToast';
import { useGameStore } from '../src/store/useGameStore';
import { useNotificationStore } from '../src/store/useNotificationStore';
import { subscribeToRealtimeNotifications } from '../src/services/notifications/notificationService';

import { useAuthStore } from '../src/store/useAuthStore';

if (Platform.OS === 'web') {
  LogBox.ignoreAllLogs();
}

export default function RootLayout() {
  const { initAuth } = useAuthStore();
  const { currentGame, restoreSavedSession } = useGameStore();
  const { showToast, setHistory } = useNotificationStore();

  // Restore auth identity & saved game session on refresh / mount
  useEffect(() => {
    initAuth()
      .then(() => {
        restoreSavedSession();
      })
      .catch((err) => console.error('Auth initialization error:', err));
  }, []);

  useEffect(() => {
    if (currentGame?.id) {
      const unsubscribe = subscribeToRealtimeNotifications(
        currentGame.id,
        (newNotif) => {
          showToast(newNotif);
        },
        (historyList) => {
          setHistory(historyList);
        }
      );
      return () => unsubscribe();
    }
  }, [currentGame?.id]);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={COLORS.background} />
      <NotificationToast />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: COLORS.surface,
          },
          headerTintColor: COLORS.textPrimary,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          contentStyle: {
            backgroundColor: COLORS.background,
          },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="create"
          options={{
            title: 'Create New Game',
          }}
        />
        <Stack.Screen
          name="join"
          options={{
            title: 'Join Game',
          }}
        />
        <Stack.Screen
          name="lobby"
          options={{
            title: 'Game Lobby',
            headerBackVisible: false,
          }}
        />
        <Stack.Screen
          name="(game)"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}

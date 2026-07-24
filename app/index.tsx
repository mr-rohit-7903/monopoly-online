import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING, RADIUS } from '../src/constants/theme';
import { useAuthStore } from '../src/store/useAuthStore';

import { useGameStore } from '../src/store/useGameStore';

export default function HomeScreen() {
  const router = useRouter();
  const { initAuth, userId, isAuthenticating } = useAuthStore();
  const { currentGame, leaveGame } = useGameStore();

  useEffect(() => {
    initAuth().catch((err) => console.error('Auth initialization error:', err));
  }, []);

  // Auto-reconnect if user refreshes while in an active game or lobby
  useEffect(() => {
    if (currentGame?.status === 'active') {
      router.replace('/(game)/dashboard');
    } else if (currentGame?.status === 'lobby') {
      router.replace('/lobby');
    }
  }, [currentGame?.status]);

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.badge}>Companion Banking</Text>
          <Text style={styles.title}>MONOPOLY</Text>
          <Text style={styles.subtitle}>International Edition Digital Bank</Text>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroEmoji}>🏦 💵 🎲</Text>
          <Text style={styles.heroTitle}>No More Paper Money!</Text>
          <Text style={styles.heroText}>
            Real-time digital ledger, live property management, automated rent doubling, custom duty, chance cards, and instant transaction notifications for your board game night.
          </Text>
        </View>

        <View style={styles.actionsContainer}>
          {currentGame ? (
            <Pressable
              style={({ pressed }) => [
                styles.rejoinButton,
                pressed && styles.buttonPressed,
              ]}
              onPress={() =>
                router.push(currentGame.status === 'active' ? '/(game)/dashboard' : '/lobby')
              }
            >
              <Text style={styles.rejoinButtonText}>
                ⚡ Rejoin Active Game ({currentGame.code})
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.push('/create')}
          >
            <Text style={styles.primaryButtonText}>👑 Create New Game</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => router.push('/join')}
          >
            <Text style={styles.secondaryButtonText}>🎮 Join Game with Code</Text>
          </Pressable>
        </View>

        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>
            {isAuthenticating
              ? 'Connecting securely to Firebase...'
              : userId
              ? `Ready • Session ID: ${userId.substring(0, 8)}...`
              : 'Initializing session...'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.lg,
    justifyContent: 'space-between',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginTop: SPACING.md,
  },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.gold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: SPACING.xs,
  },
  title: {
    fontSize: 38,
    fontWeight: '900',
    color: COLORS.textPrimary,
    letterSpacing: 3,
  },
  subtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  heroCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.xl,
    marginVertical: SPACING.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  heroEmoji: {
    fontSize: 42,
    marginBottom: SPACING.md,
  },
  heroTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  heroText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  actionsContainer: {
    gap: SPACING.md,
  },
  rejoinButton: {
    backgroundColor: COLORS.emerald,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    elevation: 4,
  },
  rejoinButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  secondaryButton: {
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  secondaryButtonText: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  statusContainer: {
    alignItems: 'center',
    marginVertical: SPACING.md,
  },
  statusText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
});

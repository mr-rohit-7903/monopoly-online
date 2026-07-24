import React, { useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING } from '../src/constants/theme';
import { Button } from '../src/components/ui/Button';
import { PlayerBadge } from '../src/components/ui/PlayerBadge';
import { useAuthStore } from '../src/store/useAuthStore';
import { useGameStore } from '../src/store/useGameStore';
import { useThemeStore } from '../src/store/useThemeStore';

export default function LobbyScreen() {
  const router = useRouter();
  const { userId } = useAuthStore();
  const { currentGame, players, assignBanker, startGame, isLoading } = useGameStore();
  const { colors } = useThemeStore();

  const isHost = currentGame?.hostId === userId;

  useEffect(() => {
    // Redirect to active game dashboard when host starts game
    if (currentGame?.status === 'active') {
      router.replace('/(game)/dashboard');
    }
  }, [currentGame?.status]);

  if (!currentGame) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.centerContainer}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading game session...</Text>
          <Button
            title="Return Home"
            variant="secondary"
            style={{ marginTop: SPACING.md }}
            onPress={() => router.replace('/')}
          />
        </View>
      </SafeAreaView>
    );
  }

  const handleStartGame = async () => {
    if (!currentGame.bankerId) {
      Alert.alert('Assign Banker', 'Please assign a Banker before starting the game session.');
      return;
    }
    try {
      await startGame();
    } catch (err: any) {
      Alert.alert('Start Error', err?.message || 'Failed to start game session.');
    }
  };

  const handleAssignBanker = (playerId: string, playerName: string) => {
    Alert.alert(
      'Assign Banker Role',
      `Make ${playerName} the Banker for this game session?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => assignBanker(playerId),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Room Code Card */}
        <View style={styles.codeCard}>
          <Text style={styles.codeSubtitle}>Share Room Code with Players</Text>
          <Text style={styles.codeText}>{currentGame.code}</Text>
          <Text style={styles.codeInstruction}>Players can join using this code from their device</Text>
        </View>

        {/* Realtime Players Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Connected Players ({players.length})</Text>
          <Text style={styles.sectionSubtitle}>Starting Cash: $25,000</Text>
        </View>

        <View style={styles.playersList}>
          {players.map((player) => (
            <PlayerBadge
              key={player.id}
              player={player}
              isCurrentPlayer={player.id === userId}
              showBankerToggle={isHost}
              onToggleBanker={() => handleAssignBanker(player.id, player.name)}
            />
          ))}
        </View>

        {/* Host Controls */}
        <View style={styles.footer}>
          {isHost ? (
            <Button
              title="Start Game Now"
              size="lg"
              variant="gold"
              loading={isLoading}
              onPress={handleStartGame}
            />
          ) : (
            <View style={styles.waitingNotice}>
              <Text style={styles.waitingText}>
                Waiting for host to start the game session...
              </Text>
            </View>
          )}

          <Button
            title="Leave Lobby"
            variant="ghost"
            style={{ marginTop: SPACING.md }}
            onPress={() => router.replace('/')}
          />
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 16,
  },
  scrollContent: {
    padding: SPACING.lg,
  },
  codeCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: SPACING.xl,
  },
  codeSubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  codeText: {
    fontSize: 40,
    fontWeight: '900',
    color: COLORS.gold,
    letterSpacing: 6,
    marginVertical: SPACING.xs,
  },
  codeInstruction: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.emerald,
    fontWeight: '600',
  },
  playersList: {
    gap: SPACING.xs,
  },
  footer: {
    marginTop: SPACING.xxl,
  },
  waitingNotice: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  waitingText: {
    color: COLORS.gold,
    fontWeight: '600',
    fontSize: 14,
  },
});

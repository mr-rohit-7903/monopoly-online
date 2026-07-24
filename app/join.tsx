import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING } from '../src/constants/theme';
import { Input } from '../src/components/ui/Input';
import { Button } from '../src/components/ui/Button';
import { AvatarPicker } from '../src/components/ui/AvatarPicker';
import { useAuthStore } from '../src/store/useAuthStore';
import { useGameStore } from '../src/store/useGameStore';
import { useThemeStore } from '../src/store/useThemeStore';

export default function JoinGameScreen() {
  const router = useRouter();
  const { userId, initAuth } = useAuthStore();
  const { joinGame, isLoading, error } = useGameStore();
  const { colors } = useThemeStore();

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('P2');
  const [color, setColor] = useState('#77aaff');

  const handleJoin = async () => {
    if (!code.trim()) {
      Alert.alert('Required Field', 'Please enter the 6-character room code.');
      return;
    }

    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter your player name.');
      return;
    }

    try {
      const activeUserId = userId || (await initAuth());
      await joinGame({
        userId: activeUserId,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        avatar,
        color,
      });
      router.replace('/lobby');
    } catch (err: any) {
      Alert.alert('Join Failed', err?.message || 'Invalid game code or room full.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Join Existing Room</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Enter room code to connect to live game ledger</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Input
            label="Game Room Code"
            placeholder="e.g., MONO88"
            value={code}
            onChangeText={(val) => setCode(val.toUpperCase())}
            maxLength={6}
            autoCapitalize="characters"
            style={styles.codeInput}
          />

          <Input
            label="Your Player Name"
            placeholder="e.g., Sarah"
            value={name}
            onChangeText={setName}
            maxLength={20}
          />

          <AvatarPicker
            selectedAvatar={avatar}
            selectedColor={color}
            onSelectAvatar={setAvatar}
            onSelectColor={setColor}
          />
        </View>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Button
            title="Join Room"
            size="lg"
            loading={isLoading}
            onPress={handleJoin}
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
  scrollContent: {
    padding: SPACING.lg,
  },
  header: {
    marginBottom: SPACING.lg,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  codeInput: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 4,
    textAlign: 'center',
    color: COLORS.gold,
  },
  errorBox: {
    backgroundColor: COLORS.crimson + '22',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.crimson,
  },
  errorText: {
    color: COLORS.crimson,
    fontSize: 14,
  },
  footer: {
    marginTop: SPACING.xl,
  },
});

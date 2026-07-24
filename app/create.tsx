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

export default function CreateGameScreen() {
  const router = useRouter();
  const { userId, initAuth } = useAuthStore();
  const { createGame, isLoading, error } = useGameStore();

  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState('🎩');
  const [color, setColor] = useState('#EF4444');

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter your player name.');
      return;
    }

    try {
      const activeUserId = userId || (await initAuth());
      await createGame({
        userId: activeUserId,
        name: name.trim(),
        avatar,
        color,
      });
      router.replace('/lobby');
    } catch (err: any) {
      Alert.alert('Error Creating Game', err?.message || 'Could not create game session.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Host a New Game</Text>
          <Text style={styles.subtitle}>
            Set up your host profile and generate a room code for your players.
          </Text>
        </View>

        <View style={styles.card}>
          <Input
            label="Your Player Name"
            placeholder="e.g., Banker Alex"
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
            title="Create Game Session"
            icon="👑"
            size="lg"
            loading={isLoading}
            onPress={handleCreate}
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

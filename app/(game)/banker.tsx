import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Alert, Pressable, TextInput } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useGameStore } from '../../src/store/useGameStore';
import { depositFromBank, collectToBank } from '../../src/services/firebase/transactionService';
import { useThemeStore } from '../../src/store/useThemeStore';

export default function BankerPanelScreen() {
  const { userId } = useAuthStore();
  const { currentGame, players } = useGameStore();
  const { colors } = useThemeStore();

  const [targetPlayerId, setTargetPlayerId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('Banker Adjustment');
  const [loading, setLoading] = useState<boolean>(false);

  const isBanker = currentGame?.bankerId === userId;

  if (!isBanker) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <Text style={[styles.restrictedText, { color: colors.textPrimary }]}>Restricted Screen</Text>
        <Text style={[styles.restrictedSub, { color: colors.textSecondary }]}>Only the designated Banker can access this control panel.</Text>
      </View>
    );
  }

  const handleGrantMoney = async () => {
    if (!targetPlayerId) {
      Alert.alert('Select Player', 'Please select a player to receive the bank grant.');
      return;
    }
    const val = parseInt(amount, 10);
    if (!val || val <= 0) {
      Alert.alert('Invalid Amount', 'Enter a valid amount.');
      return;
    }

    setLoading(true);
    try {
      await depositFromBank({
        gameId: currentGame.id,
        receiverId: targetPlayerId,
        amount: val,
        reason: `Banker Grant: ${reason}`,
        icon: 'BANK',
      });
      setAmount('');
      Alert.alert('Success', `Granted $${val.toLocaleString()} from Bank.`);
    } catch (err: any) {
      Alert.alert('Error', err?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFinePlayer = async () => {
    if (!targetPlayerId) {
      Alert.alert('Select Player', 'Please select a player to fine.');
      return;
    }
    const val = parseInt(amount, 10);
    if (!val || val <= 0) {
      Alert.alert('Invalid Amount', 'Enter a valid amount.');
      return;
    }

    setLoading(true);
    try {
      await collectToBank({
        gameId: currentGame.id,
        senderId: targetPlayerId,
        amount: val,
        reason: `Banker Penalty: ${reason}`,
        icon: 'FINE',
      });
      setAmount('');
      Alert.alert('Success', `Fined player $${val.toLocaleString()} to Bank.`);
    } catch (err: any) {
      Alert.alert('Error', err?.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
    >
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>Banker Direct Override</Text>
        <Text style={[styles.cardSub, { color: colors.textSecondary }]}>Issue bank funds or fine players directly as official Banker</Text>

        <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>Select Player</Text>
        <View style={styles.playerPickerRow}>
          {players.map((p) => {
            const isSelected = targetPlayerId === p.id;
            return (
              <Pressable
                key={p.id}
                style={[
                  styles.playerChip,
                  { backgroundColor: isSelected ? colors.primary : colors.surfaceLight },
                ]}
                onPress={() => setTargetPlayerId(p.id)}
              >
                <Text style={[styles.playerChipText, { color: isSelected ? '#FFF' : colors.textPrimary }]}>
                  {p.avatar} {p.name}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <TextInput
          style={[styles.input, { backgroundColor: colors.background, borderColor: colors.surfaceBorder, color: colors.textPrimary }]}
          placeholder="Amount (e.g. 5000)"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />

        <TextInput
          style={[styles.input, { backgroundColor: colors.background, borderColor: colors.surfaceBorder, color: colors.textPrimary }]}
          placeholder="Reason (e.g. Special Grant / Fine)"
          placeholderTextColor={colors.textMuted}
          value={reason}
          onChangeText={setReason}
        />

        <View style={styles.btnRow}>
          <Button
            title="Grant Money"
            variant="emerald"
            size="md"
            loading={loading}
            onPress={handleGrantMoney}
            style={{ flex: 1 }}
          />
          <Button
            title="Collect Fine"
            variant="danger"
            size="md"
            loading={loading}
            onPress={handleFinePlayer}
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </ScrollView>
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
  restrictedText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.crimson,
  },
  restrictedSub: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  banner: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.gold,
    marginBottom: SPACING.md,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: COLORS.gold,
  },
  bannerSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  cardSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    marginTop: 2,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  playerPickerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  playerChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
  },
  playerChipText: {
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    fontSize: 14,
    marginBottom: SPACING.md,
  },
  btnRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  label: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  playersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
});

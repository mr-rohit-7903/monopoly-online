import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Alert } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useGameStore } from '../../src/store/useGameStore';
import { depositFromBank, collectToBank } from '../../src/services/firebase/transactionService';

export default function BankerPanelScreen() {
  const { userId } = useAuthStore();
  const { currentGame, players } = useGameStore();

  const [targetPlayerId, setTargetPlayerId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('Banker Adjustment');
  const [loading, setLoading] = useState<boolean>(false);

  const isBanker = currentGame?.bankerId === userId;

  if (!isBanker) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.restrictedText}>🔒 Restricted Screen</Text>
        <Text style={styles.restrictedSub}>Only the designated Banker can access this control panel.</Text>
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
        icon: '👑',
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
        icon: '⚠️',
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
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.banner}>
        <Text style={styles.bannerTitle}>🏦 Banker Control Panel</Text>
        <Text style={styles.bannerSub}>
          As the Banker, you have administrative authority to grant funds, charge fines, and manage game assets.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Adjust Player Funds</Text>

        <Text style={styles.label}>Select Target Player</Text>
        <View style={styles.playersRow}>
          {players.map((p) => {
            const isSelected = targetPlayerId === p.id;
            return (
              <Button
                key={p.id}
                title={`${p.avatar} ${p.name}`}
                variant={isSelected ? 'gold' : 'secondary'}
                size="sm"
                onPress={() => setTargetPlayerId(p.id)}
              />
            );
          })}
        </View>

        <Input
          label="Amount ($)"
          placeholder="0"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
        />

        <Input
          label="Reason / Note"
          placeholder="e.g. Auction Winner, Error Adjustment"
          value={reason}
          onChangeText={setReason}
        />

        <View style={styles.buttonGroup}>
          <Button
            title="Grant Funds"
            icon="💵"
            variant="emerald"
            loading={loading}
            onPress={handleGrantMoney}
            style={{ flex: 1 }}
          />
          <Button
            title="Charge Fine"
            icon="⚠️"
            variant="danger"
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

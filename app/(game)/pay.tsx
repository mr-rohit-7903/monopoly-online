import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Alert, Pressable } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { Input } from '../../src/components/ui/Input';
import { CardDrawerModal } from '../../src/components/banking/CardDrawerModal';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useGameStore } from '../../src/store/useGameStore';
import { soundEngine } from '../../src/services/sound/soundService';
import { payPlayerToPlayer, collectToBank } from '../../src/services/firebase/transactionService';

import { TradeModal } from '../../src/components/trading/TradeModal';

export default function PayTerminalScreen() {
  const { userId } = useAuthStore();
  const { currentGame, players, properties } = useGameStore();

  const [selectedRecipientId, setSelectedRecipientId] = useState<string>('BANK');
  const [amount, setAmount] = useState<string>('');
  const [reason, setReason] = useState<string>('Rent');
  const [loading, setLoading] = useState<boolean>(false);
  const [cardModalVisible, setCardModalVisible] = useState<boolean>(false);
  const [tradeModalVisible, setTradeModalVisible] = useState<boolean>(false);

  const currentPlayer = players.find((p) => p.id === userId) || players[0];

  if (!currentGame || !currentPlayer) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading payment terminal...</Text>
      </View>
    );
  }

  const recipients = [
    { id: 'BANK', name: '🏦 Bank', color: COLORS.emerald },
    ...players.filter((p) => p.id !== currentPlayer.id).map((p) => ({
      id: p.id,
      name: `${p.avatar} ${p.name}`,
      color: p.color,
    })),
  ];

  const handleExecute = async () => {
    const numAmount = parseInt(amount.replace(/[^0-9]/g, ''), 10);
    if (!numAmount || numAmount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount.');
      return;
    }

    if (numAmount > currentPlayer.balance) {
      Alert.alert('Insufficient Balance', `You have $${currentPlayer.balance.toLocaleString()} available.`);
      return;
    }

    setLoading(true);
    try {
      if (selectedRecipientId === 'BANK') {
        await collectToBank({
          gameId: currentGame.id,
          senderId: currentPlayer.id,
          amount: numAmount,
          reason: reason.trim() || 'Bank Collection',
          icon: '🏦',
        });
      } else {
        await payPlayerToPlayer({
          gameId: currentGame.id,
          senderId: currentPlayer.id,
          receiverId: selectedRecipientId,
          amount: numAmount,
          reason: reason.trim() || 'Rent',
          category: 'p2p',
          icon: '💸',
        });
      }
      soundEngine.playCashSound();
      setAmount('');
      Alert.alert('Success', `Payment of $${numAmount.toLocaleString()} completed!`);
    } catch (err: any) {
      Alert.alert('Payment Error', err?.message || 'Transaction failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      <View style={styles.topActionsRow}>
        <Button
          title="🎴 Draw Chance Card"
          variant="gold"
          size="md"
          onPress={() => setCardModalVisible(true)}
          style={{ flex: 1 }}
        />
        <Button
          title="🤝 Trade & Swap"
          variant="secondary"
          size="md"
          onPress={() => setTradeModalVisible(true)}
          style={{ flex: 1 }}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Payment Terminal</Text>
        <Text style={styles.cardSub}>Transfer digital funds to Bank or any player</Text>

        <Text style={styles.sectionLabel}>Select Recipient</Text>
        <View style={styles.recipientsContainer}>
          {recipients.map((rec) => {
            const isSelected = selectedRecipientId === rec.id;
            return (
              <Pressable
                key={rec.id}
                style={[
                  styles.recChip,
                  isSelected && styles.recSelected,
                  isSelected && { borderColor: rec.color },
                ]}
                onPress={() => setSelectedRecipientId(rec.id)}
              >
                <Text style={styles.recText}>{rec.name}</Text>
              </Pressable>
            );
          })}
        </View>

        <Input
          label="Payment Amount ($)"
          placeholder="0"
          keyboardType="numeric"
          value={amount}
          onChangeText={setAmount}
          style={styles.amountInput}
        />

        <Input
          label="Reason / Details"
          placeholder="e.g. Rent for Italy, Fine, Trade"
          value={reason}
          onChangeText={setReason}
        />

        <View style={styles.balanceSummary}>
          <Text style={styles.balanceText}>Your Balance:</Text>
          <Text style={styles.balanceNum}>${currentPlayer.balance.toLocaleString()}</Text>
        </View>

        <Button
          title={`Pay $${amount ? parseInt(amount, 10).toLocaleString() : '0'}`}
          icon="💸"
          size="lg"
          variant="gold"
          loading={loading}
          onPress={handleExecute}
        />
      </View>

      <CardDrawerModal
        visible={cardModalVisible}
        onClose={() => setCardModalVisible(false)}
        gameId={currentGame.id}
        currentPlayer={currentPlayer}
      />

      <TradeModal
        visible={tradeModalVisible}
        onClose={() => setTradeModalVisible(false)}
        gameId={currentGame.id}
        currentPlayer={currentPlayer}
        players={players}
        properties={properties}
      />
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
  },
  loadingText: {
    color: COLORS.textSecondary,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  topActionsRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  cardSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  recipientsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  recChip: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.surfaceBorder,
  },
  recSelected: {
    backgroundColor: COLORS.surfaceBorder,
  },
  recText: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: 14,
  },
  amountInput: {
    fontSize: 26,
    fontWeight: '900',
    color: COLORS.emerald,
  },
  balanceSummary: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginVertical: SPACING.md,
  },
  balanceText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  balanceNum: {
    color: COLORS.emerald,
    fontSize: 18,
    fontWeight: '800',
  },
});

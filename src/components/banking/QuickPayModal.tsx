import React, { useState } from 'react';
import { StyleSheet, Text, View, Modal, Pressable, ScrollView, Alert } from 'react-native';
import { Player } from '../../types/game';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { PlayerAvatar } from '../ui/PlayerAvatar';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface QuickPayModalProps {
  visible: boolean;
  onClose: () => void;
  currentPlayer: Player;
  players: Player[];
  onExecutePayment: (receiverId: string, amount: number, reason: string) => Promise<void>;
}

const PRESET_AMOUNTS = [100, 200, 500, 1000, 1500, 2000, 2500, 5000];

export const QuickPayModal: React.FC<QuickPayModalProps> = ({
  visible,
  onClose,
  currentPlayer,
  players,
  onExecutePayment,
}) => {
  const [selectedReceiverId, setSelectedReceiverId] = useState<string>('BANK');
  const [amountText, setAmountText] = useState<string>('');
  const [reason, setReason] = useState<string>('Rent');
  const [loading, setLoading] = useState<boolean>(false);

  const availableReceivers = [
    { id: 'BANK', name: 'Bank', avatar: 'BANK', color: COLORS.emerald },
    ...players.filter((p) => p.id !== currentPlayer.id).map((p) => ({
      id: p.id,
      name: p.name,
      avatar: p.avatar,
      color: p.color,
    })),
  ];

  const handlePay = async () => {
    const amount = parseInt(amountText.replace(/[^0-9]/g, ''), 10);
    if (!amount || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount to pay.');
      return;
    }

    if (amount > currentPlayer.balance) {
      Alert.alert(
        'Insufficient Balance',
        `You have $${currentPlayer.balance.toLocaleString()} but are trying to pay $${amount.toLocaleString()}.`
      );
      return;
    }

    setLoading(true);
    try {
      await onExecutePayment(selectedReceiverId, amount, reason.trim() || 'Payment');
      setAmountText('');
      setLoading(false);
      onClose();
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Payment Failed', err?.message || 'Transaction could not be processed.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <View style={styles.header}>
            <Text style={styles.title}>Send Payment</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeText}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
            <Text style={styles.label}>Select Recipient</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recipientRow}>
              {availableReceivers.map((rec) => {
                const isSelected = selectedReceiverId === rec.id;
                return (
                  <Pressable
                    key={rec.id}
                    style={[
                      styles.recipientChip,
                      isSelected && styles.recipientSelected,
                      isSelected && { borderColor: rec.color },
                    ]}
                    onPress={() => setSelectedReceiverId(rec.id)}
                  >
                    <PlayerAvatar avatar={rec.avatar} size={32} borderRadius={RADIUS.sm} />
                    <Text style={styles.recipientName}>{rec.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Input
              label="Amount ($)"
              placeholder="0"
              keyboardType="numeric"
              value={amountText}
              onChangeText={setAmountText}
              style={styles.amountInput}
            />

            <Text style={styles.label}>Quick Presets</Text>
            <View style={styles.presetsGrid}>
              {PRESET_AMOUNTS.map((val) => (
                <Pressable
                  key={val}
                  style={styles.presetChip}
                  onPress={() => setAmountText(val.toString())}
                >
                  <Text style={styles.presetText}>+${val.toLocaleString()}</Text>
                </Pressable>
              ))}
            </View>

            <Input
              label="Payment Reason"
              placeholder="e.g. Rent, Trade, Duty, Fine"
              value={reason}
              onChangeText={setReason}
            />

            <View style={styles.balanceInfo}>
              <Text style={styles.balanceLabel}>Your Current Balance:</Text>
              <Text style={styles.balanceVal}>${currentPlayer.balance.toLocaleString()}</Text>
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Button
              title={`Confirm Pay $${amountText ? parseInt(amountText, 10).toLocaleString() : '0'}`}
              variant="emerald"
              size="lg"
              loading={loading}
              onPress={handlePay}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: COLORS.surface,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    maxHeight: '90%',
    padding: SPACING.lg,
    borderTopWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  closeBtn: {
    padding: SPACING.xs,
  },
  closeText: {
    color: COLORS.textMuted,
    fontSize: 20,
    fontWeight: 'bold',
  },
  body: {
    marginVertical: SPACING.sm,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  recipientRow: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  recipientChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    borderColor: COLORS.surfaceBorder,
    gap: SPACING.xs,
  },
  recipientSelected: {
    backgroundColor: COLORS.surfaceBorder,
  },
  recipientAvatar: {
    fontSize: 18,
  },
  recipientName: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  amountInput: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.emerald,
  },
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  presetChip: {
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  presetText: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: '700',
  },
  balanceInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginVertical: SPACING.sm,
  },
  balanceLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  balanceVal: {
    color: COLORS.emerald,
    fontSize: 16,
    fontWeight: '800',
  },
  footer: {
    marginTop: SPACING.md,
  },
});

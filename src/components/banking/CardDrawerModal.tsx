import React, { useState } from 'react';
import { StyleSheet, Text, View, Modal, Pressable, ScrollView, Alert, TextInput } from 'react-native';
import { CHANCE_CARDS, COMMUNITY_CHEST_CARDS } from '../../constants/cardsRegistry';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { Button } from '../ui/Button';
import { GameCard } from '../../types/cards';
import { Player } from '../../types/game';
import { soundEngine } from '../../services/sound/soundService';
import {
  collectToBank,
  depositFromBank,
  executeMultiCollect,
} from '../../services/firebase/transactionService';

import { useThemeStore } from '../../store/useThemeStore';

interface CardDrawerModalProps {
  visible: boolean;
  onClose: () => void;
  gameId: string;
  currentPlayer: Player;
}

export const CardDrawerModal: React.FC<CardDrawerModalProps> = ({
  visible,
  onClose,
  gameId,
  currentPlayer,
}) => {
  const { colors } = useThemeStore();
  const [deckType, setDeckType] = useState<'chance' | 'uno'>('chance');
  const [numberInput, setNumberInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const cards = deckType === 'chance' ? CHANCE_CARDS : COMMUNITY_CHEST_CARDS;
  const numValue = parseInt(numberInput.trim(), 10);
  const selectedCard: GameCard | null =
    !isNaN(numValue) ? cards.find((c) => c.diceNumber === numValue) || null : null;

  const handleSelectNumber = (num: number) => {
    soundEngine.playDiceSound();
    setNumberInput(num.toString());
  };

  const handleExecuteCard = async () => {
    if (!selectedCard) return;

    if (selectedCard.action === 'pay_bank' && selectedCard.amount) {
      if (currentPlayer.balance < selectedCard.amount) {
        Alert.alert(
          'Insufficient Balance!',
          `You have $${currentPlayer.balance.toLocaleString()} available but need $${selectedCard.amount.toLocaleString()} to pay for card "${selectedCard.title}".`
        );
        return;
      }
    }

    setLoading(true);
    try {
      if (selectedCard.action === 'pay_bank' && selectedCard.amount) {
        await collectToBank({
          gameId,
          senderId: currentPlayer.id,
          amount: selectedCard.amount,
          reason: `Card (${deckType.toUpperCase()} #${selectedCard.diceNumber}): ${selectedCard.title}`,
          icon: 'CARD',
        });
      } else if (selectedCard.action === 'receive_bank' && selectedCard.amount) {
        await depositFromBank({
          gameId,
          receiverId: currentPlayer.id,
          amount: selectedCard.amount,
          reason: `Card (${deckType.toUpperCase()} #${selectedCard.diceNumber}): ${selectedCard.title}`,
          icon: 'CARD',
        });
      } else if (selectedCard.action === 'collect_all' && selectedCard.amount) {
        await executeMultiCollect({
          gameId,
          receiverId: currentPlayer.id,
          amountPerPlayer: selectedCard.amount,
          reason: `Card (${deckType.toUpperCase()} #${selectedCard.diceNumber}): ${selectedCard.title}`,
          icon: 'PARTY',
        });
      } else if (selectedCard.action === 'go_to_jail') {
        Alert.alert('Go to Jail!', 'Sent directly to Jail. Do not pass GO, do not collect salary.');
      } else {
        Alert.alert('Card Action Executed', selectedCard.effectText);
      }

      setLoading(false);
      setNumberInput('');
      onClose();
    } catch (err: any) {
      setLoading(false);
      const isInsuff = err?.message?.toLowerCase().includes('insufficient');
      Alert.alert(
        isInsuff ? 'Insufficient Balance!' : 'Card Error',
        err?.message || 'Could not execute card effect.'
      );
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Draw Card (Chance & Uno)</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={[styles.closeText, { color: colors.textMuted }]}>✕</Text>
            </Pressable>
          </View>

          {/* STEP 1: Select Deck (Chance vs Uno) */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>1. Select Deck Type</Text>
          <View style={styles.deckToggle}>
            <Pressable
              style={[styles.deckBtn, deckType === 'chance' && styles.deckActive]}
              onPress={() => setDeckType('chance')}
            >
              <Text style={[styles.deckBtnText, deckType === 'chance' && styles.deckTextActive]}>
                Chance
              </Text>
            </Pressable>
            <Pressable
              style={[styles.deckBtn, deckType === 'uno' && styles.deckActive]}
              onPress={() => setDeckType('uno')}
            >
              <Text style={[styles.deckBtnText, deckType === 'uno' && styles.deckTextActive]}>
                Uno
              </Text>
            </Pressable>
          </View>

          {/* STEP 2: Write / Enter Card Number */}
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>2. Write Card Number (2 - 12)</Text>
          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.background,
                color: colors.textPrimary,
                borderColor: colors.surfaceBorder,
              },
            ]}
            placeholder="Type card number (e.g. 7)"
            placeholderTextColor={colors.textMuted}
            keyboardType="number-pad"
            maxLength={2}
            value={numberInput}
            onChangeText={setNumberInput}
          />

          {/* Quick Select Number Chips */}
          <View style={styles.quickChipsRow}>
            {[2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => {
              const isSelected = numValue === n;
              return (
                <Pressable
                  key={n}
                  style={[
                    styles.numChip,
                    { backgroundColor: colors.background, borderColor: colors.surfaceBorder },
                    isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => handleSelectNumber(n)}
                >
                  <Text style={[styles.numChipText, { color: isSelected ? '#FFFFFF' : colors.textPrimary }]}>
                    #{n}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {/* Preview Selected Card */}
          {selectedCard ? (
            <View style={[styles.selectedCardBox, { backgroundColor: colors.background, borderColor: colors.surfaceBorder }]}>
              <View style={styles.cardHeaderRow}>
                <Text style={[styles.cardHeaderTitle, { color: colors.textPrimary }]}>{selectedCard.title}</Text>
                <View style={[styles.cardBadge, { backgroundColor: colors.gold + '22', borderColor: colors.gold }]}>
                  <Text style={[styles.cardBadgeText, { color: colors.gold }]}>Card #{selectedCard.diceNumber}</Text>
                </View>
              </View>

              <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>{selectedCard.description}</Text>

              <View style={[styles.effectBadge, { backgroundColor: colors.emerald + '15', borderColor: colors.emerald }]}>
                <Text style={[styles.effectText, { color: colors.emerald }]}>Effect: {selectedCard.effectText}</Text>
              </View>

              <Button
                title="Execute Card Effect"
                variant="emerald"
                size="lg"
                loading={loading}
                onPress={handleExecuteCard}
                style={{ marginTop: SPACING.md }}
              />
            </View>
          ) : numberInput.trim().length > 0 ? (
            <View style={[styles.emptyBox, { borderColor: colors.surfaceBorder }]}>
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No card found for number #{numberInput}. Enter a number between 2 and 12.
              </Text>
            </View>
          ) : null}
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
    padding: SPACING.lg,
    maxHeight: '90%',
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
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginTop: SPACING.xs,
  },
  deckToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.md,
    padding: 4,
    marginBottom: SPACING.md,
  },
  deckBtn: {
    flex: 1,
    paddingVertical: SPACING.xs + 4,
    alignItems: 'center',
    borderRadius: RADIUS.sm,
  },
  deckActive: {
    backgroundColor: COLORS.primary,
  },
  deckBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textSecondary,
  },
  deckTextActive: {
    color: '#FFFFFF',
  },
  input: {
    height: 48,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  quickChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: SPACING.md,
  },
  numChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  numChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  selectedCardBox: {
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    marginTop: SPACING.xs,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  cardHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
  },
  cardBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  cardBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  cardDesc: {
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  effectBadge: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
    borderWidth: 1,
  },
  effectText: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyBox: {
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: SPACING.xs,
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});

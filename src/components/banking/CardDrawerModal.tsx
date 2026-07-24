import React, { useState } from 'react';
import { StyleSheet, Text, View, Modal, Pressable, ScrollView, Alert } from 'react-native';
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
  const [deckType, setDeckType] = useState<'chance' | 'community_chest'>('chance');
  const [selectedCard, setSelectedCard] = useState<GameCard | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const cards = deckType === 'chance' ? CHANCE_CARDS : COMMUNITY_CHEST_CARDS;

  const handleDrawRandom = () => {
    soundEngine.playDiceSound();
    const randomIndex = Math.floor(Math.random() * cards.length);
    setSelectedCard(cards[randomIndex]);
  };

  const handleExecuteCard = async () => {
    if (!selectedCard) return;

    setLoading(true);
    try {
      if (selectedCard.action === 'pay_bank' && selectedCard.amount) {
        await collectToBank({
          gameId,
          senderId: currentPlayer.id,
          amount: selectedCard.amount,
          reason: `Card: ${selectedCard.title}`,
          icon: 'CARD',
        });
      } else if (selectedCard.action === 'receive_bank' && selectedCard.amount) {
        await depositFromBank({
          gameId,
          receiverId: currentPlayer.id,
          amount: selectedCard.amount,
          reason: `Card: ${selectedCard.title}`,
          icon: 'CARD',
        });
      } else if (selectedCard.action === 'collect_all' && selectedCard.amount) {
        await executeMultiCollect({
          gameId,
          receiverId: currentPlayer.id,
          amountPerPlayer: selectedCard.amount,
          reason: `Card: ${selectedCard.title}`,
          icon: 'PARTY',
        });
      } else if (selectedCard.action === 'go_to_jail') {
        Alert.alert('Go to Jail!', 'Sent directly to Jail. Do not pass GO, do not collect salary.');
      } else {
        Alert.alert('Card Action Executed', selectedCard.effectText);
      }

      setLoading(false);
      setSelectedCard(null);
      onClose();
    } catch (err: any) {
      setLoading(false);
      Alert.alert('Card Error', err?.message || 'Could not execute card effect.');
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Chance & Community Chest</Text>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={[styles.closeText, { color: colors.textMuted }]}>✕</Text>
            </Pressable>
          </View>

          {/* Deck selector */}
          <View style={styles.deckToggle}>
            <Pressable
              style={[styles.deckBtn, deckType === 'chance' && styles.deckActive]}
              onPress={() => {
                setDeckType('chance');
                setSelectedCard(null);
              }}
            >
              <Text style={[styles.deckBtnText, deckType === 'chance' && styles.deckTextActive]}>
                Chance Deck
              </Text>
            </Pressable>
            <Pressable
              style={[styles.deckBtn, deckType === 'community_chest' && styles.deckActive]}
              onPress={() => {
                setDeckType('community_chest');
                setSelectedCard(null);
              }}
            >
              <Text style={[styles.deckBtnText, deckType === 'community_chest' && styles.deckTextActive]}>
                Community Chest
              </Text>
            </Pressable>
          </View>

          <Button
            title="Draw Card by Dice Roll"
            variant="gold"
            size="md"
            onPress={handleDrawRandom}
            style={{ marginBottom: SPACING.md }}
          />

          {/* Card Grid / List */}
          <ScrollView style={styles.cardsList} horizontal showsHorizontalScrollIndicator={false}>
            {cards.map((c) => {
              const isSelected = selectedCard?.id === c.id;
              return (
                <Pressable
                  key={c.id}
                  style={[styles.cardChip, isSelected && styles.cardChipSelected]}
                  onPress={() => setSelectedCard(c)}
                >
                  <Text style={styles.diceBadge}>Dice #{c.diceNumber}</Text>
                  <Text style={styles.cardChipTitle}>{c.title}</Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Selected Card View */}
          {selectedCard && (
            <View style={styles.selectedCardBox}>
              <Text style={styles.cardHeaderTitle}>{selectedCard.title}</Text>
              <Text style={styles.cardDesc}>{selectedCard.description}</Text>
              <View style={styles.effectBadge}>
                <Text style={styles.effectText}>Effect: {selectedCard.effectText}</Text>
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
          )}
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
    maxHeight: '85%',
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
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  deckTextActive: {
    color: '#FFFFFF',
  },
  cardsList: {
    maxHeight: 90,
    marginBottom: SPACING.md,
  },
  cardChip: {
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginRight: SPACING.sm,
    width: 140,
    borderWidth: 2,
    borderColor: COLORS.surfaceBorder,
  },
  cardChipSelected: {
    borderColor: COLORS.gold,
    backgroundColor: COLORS.surfaceBorder,
  },
  diceBadge: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.gold,
    textTransform: 'uppercase',
  },
  cardChipTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginTop: 4,
  },
  selectedCardBox: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  cardHeaderTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  cardDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  effectBadge: {
    backgroundColor: COLORS.gold + '22',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginTop: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.gold,
  },
  effectText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.gold,
  },
});

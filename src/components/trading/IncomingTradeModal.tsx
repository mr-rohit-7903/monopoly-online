import React, { useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView,
  Modal, Alert,
} from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { Button } from '../ui/Button';
import { TradeProposal } from '../../types/trade';
import { BOARD_PROPERTIES, GROUP_COLORS } from '../../constants/boardRegistry';
import { acceptTradeProposal, rejectTradeProposal } from '../../services/firebase/tradeService';
import { soundEngine } from '../../services/sound/soundService';

interface IncomingTradeModalProps {
  visible: boolean;
  trade: TradeProposal | null;
  gameId: string;
  currentPlayerId: string;
  onClose: () => void;
}

export function IncomingTradeModal({
  visible,
  trade,
  gameId,
  currentPlayerId,
  onClose,
}: IncomingTradeModalProps) {
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!visible || !trade) return null;

  const senderPropIds = trade.senderPropertyIds || [];
  const receiverPropIds = trade.receiverPropertyIds || [];

  const senderPropNames = senderPropIds
    .map((id) => BOARD_PROPERTIES.find((b) => b.id === id))
    .filter(Boolean);

  const receiverPropNames = receiverPropIds
    .map((id) => BOARD_PROPERTIES.find((b) => b.id === id))
    .filter(Boolean);

  const handleAccept = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await acceptTradeProposal(gameId, trade.id, currentPlayerId);
      soundEngine.playCashSound();
      onClose();
      Alert.alert('Trade Accepted!', `Assets and cash have been exchanged with ${trade.senderName}!`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to accept trade proposal.');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      await rejectTradeProposal(gameId, trade.id, currentPlayerId);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to reject trade proposal.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>

          {/* Modal Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Trade Proposal Received</Text>
              <Text style={styles.subtitle}>{trade.senderName} proposed a deal with you</Text>
            </View>
          </View>

          <ScrollView style={styles.scrollBody} contentContainerStyle={{ padding: SPACING.md }}>

            {/* YOU RECEIVE */}
            <View style={styles.dealBoxPositive}>
              <Text style={styles.boxTitle}>YOU RECEIVE (From {trade.senderName})</Text>

              {trade.senderCash > 0 && (
                <Text style={styles.cashText}>+${trade.senderCash.toLocaleString()}</Text>
              )}

              {senderPropNames.length > 0 ? (
                <View style={styles.propList}>
                  {senderPropNames.map((deed) => {
                    if (!deed) return null;
                    const groupColor = GROUP_COLORS[deed.group] || COLORS.primary;
                    return (
                      <View key={deed.id} style={[styles.deedPill, { borderLeftColor: groupColor }]}>
                        <Text style={styles.deedName}>{deed.name}</Text>
                        <Text style={styles.deedValue}>${deed.purchasePrice}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : trade.senderCash === 0 ? (
                <Text style={styles.emptyText}>No assets offered</Text>
              ) : null}
            </View>

            {/* YOU GIVE */}
            <View style={styles.dealBoxNegative}>
              <Text style={styles.boxTitle}>YOU GIVE (To {trade.senderName})</Text>

              {trade.receiverCash > 0 && (
                <Text style={styles.cashTextRed}>-${trade.receiverCash.toLocaleString()}</Text>
              )}

              {receiverPropNames.length > 0 ? (
                <View style={styles.propList}>
                  {receiverPropNames.map((deed) => {
                    if (!deed) return null;
                    const groupColor = GROUP_COLORS[deed.group] || COLORS.primary;
                    return (
                      <View key={deed.id} style={[styles.deedPill, { borderLeftColor: groupColor }]}>
                        <Text style={styles.deedName}>{deed.name}</Text>
                        <Text style={styles.deedValue}>${deed.purchasePrice}</Text>
                      </View>
                    );
                  })}
                </View>
              ) : trade.receiverCash === 0 ? (
                <Text style={styles.emptyText}>No assets requested</Text>
              ) : null}
            </View>

            {errorMsg && (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>[WARNING] {errorMsg}</Text>
              </View>
            )}

          </ScrollView>

          {/* Footer Buttons */}
          <View style={styles.footer}>
            <Button
              title="Decline Deal"
              variant="danger"
              loading={loading}
              onPress={handleReject}
            />
            <Button
              title="Accept Trade Deal"
              variant="emerald"
              loading={loading}
              onPress={handleAccept}
            />
          </View>

        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  container: {
    width: '100%',
    maxWidth: 440,
    maxHeight: '90%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: COLORS.gold + '22',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gold + '44',
  },
  headerEmoji: {
    fontSize: 28,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.gold,
    fontWeight: '600',
  },
  scrollBody: {
    maxHeight: 380,
  },
  dealBoxPositive: {
    backgroundColor: COLORS.emerald + '15',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.emerald + '44',
  },
  dealBoxNegative: {
    backgroundColor: COLORS.crimson + '15',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.crimson + '44',
  },
  boxTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  cashText: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.emerald,
    marginBottom: SPACING.xs,
  },
  cashTextRed: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.crimson,
    marginBottom: SPACING.xs,
  },
  emptyText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  propList: {
    gap: 6,
    marginTop: 4,
  },
  deedPill: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    borderRadius: RADIUS.sm,
    borderLeftWidth: 4,
  },
  deedName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  deedValue: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  errorBox: {
    backgroundColor: COLORS.crimson + '22',
    borderColor: COLORS.crimson + '66',
    borderWidth: 1,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  errorText: {
    color: COLORS.crimson,
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
    backgroundColor: COLORS.surface,
  },
});

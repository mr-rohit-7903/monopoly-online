import React, { useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView,
  Modal, Pressable, ActivityIndicator, Alert, ImageBackground,
} from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Player } from '../../types/game';
import { PropertyState } from '../../types/property';
import { BOARD_PROPERTIES, GROUP_COLORS } from '../../constants/boardRegistry';
import { createTradeProposal } from '../../services/firebase/tradeService';
import { soundEngine } from '../../services/sound/soundService';
import { useThemeStore } from '../../store/useThemeStore';
import { getTextureForGroup } from '../../constants/textures';

interface TradeModalProps {
  visible: boolean;
  onClose: () => void;
  gameId: string;
  currentPlayer: Player;
  players: Player[];
  properties: Record<string, PropertyState>;
  preselectedPartnerId?: string;
  preselectedPropertyId?: string;
}

export function TradeModal({
  visible,
  onClose,
  gameId,
  currentPlayer,
  players,
  properties,
  preselectedPartnerId,
  preselectedPropertyId,
}: TradeModalProps) {
  const { colors } = useThemeStore();
  const otherPlayers = players.filter((p) => p.id !== currentPlayer.id);

  const [selectedPartnerId, setSelectedPartnerId] = useState<string>(
    preselectedPartnerId || (otherPlayers[0]?.id || '')
  );
  const [offerCash, setOfferCash] = useState<string>('0');
  const [requestCash, setRequestCash] = useState<string>('0');
  const [selectedOfferPropIds, setSelectedOfferPropIds] = useState<string[]>([]);
  const [selectedRequestPropIds, setSelectedRequestPropIds] = useState<string[]>(
    preselectedPropertyId ? [preselectedPropertyId] : []
  );

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const partnerPlayer = otherPlayers.find((p) => p.id === selectedPartnerId) || otherPlayers[0];

  // Eligible unbuilt properties owned by currentPlayer
  const myEligibleProps = Object.values(properties).filter((p) => {
    if (!p.ownerId || p.ownerId !== currentPlayer.id) return false;
    // Buildings rule: Cannot trade properties with houses or hotels
    if ((p.houses || 0) > 0 || p.hotel) return false;
    return true;
  });

  // Eligible unbuilt properties owned by partnerPlayer
  const partnerEligibleProps = partnerPlayer
    ? Object.values(properties).filter((p) => {
        if (!p.ownerId || p.ownerId !== partnerPlayer.id) return false;
        if ((p.houses || 0) > 0 || p.hotel) return false;
        return true;
      })
    : [];

  const toggleOfferProp = (id: string) => {
    setSelectedOfferPropIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const toggleRequestProp = (id: string) => {
    setSelectedRequestPropIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleProposeTrade = async () => {
    if (!partnerPlayer) {
      setErrorMsg('Please select a player to trade with.');
      return;
    }

    const numOfferCash = parseInt(offerCash.replace(/[^0-9]/g, ''), 10) || 0;
    const numRequestCash = parseInt(requestCash.replace(/[^0-9]/g, ''), 10) || 0;

    if (numOfferCash > currentPlayer.balance) {
      Alert.alert(
        'Insufficient Balance!',
        `You offered $${numOfferCash.toLocaleString()} cash in trade, but your balance is only $${currentPlayer.balance.toLocaleString()}.`
      );
      setErrorMsg(`You offered $${numOfferCash.toLocaleString()} but only have $${currentPlayer.balance.toLocaleString()}.`);
      return;
    }

    if (numOfferCash === 0 && numRequestCash === 0 && selectedOfferPropIds.length === 0 && selectedRequestPropIds.length === 0) {
      setErrorMsg('Trade offer cannot be completely empty.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);

    try {
      await createTradeProposal({
        gameId,
        senderId: currentPlayer.id,
        senderName: currentPlayer.name,
        senderAvatar: currentPlayer.avatar || 'P1',
        receiverId: partnerPlayer.id,
        receiverName: partnerPlayer.name,
        receiverAvatar: partnerPlayer.avatar || 'P2',
        senderCash: numOfferCash,
        senderPropertyIds: selectedOfferPropIds,
        receiverCash: numRequestCash,
        receiverPropertyIds: selectedRequestPropIds,
      });

      soundEngine.playCashSound();
      onClose();
      Alert.alert('Trade Proposed!', `Trade deal sent to ${partnerPlayer.name}. They will be notified to review & accept.`);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Failed to send trade proposal.');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>

          {/* Modal Header */}
          <View style={[styles.header, { borderBottomColor: colors.surfaceBorder }]}>
            <View style={styles.titleRow}>
              <View>
                <Text style={[styles.title, { color: colors.textPrimary }]}>Propose Trade & Swap</Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Negotiate cash and unbuilt deeds with any player</Text>
              </View>
            </View>
            <Pressable onPress={onClose} style={styles.closeBtn}>
              <Text style={[styles.closeText, { color: colors.textMuted }]}>✕</Text>
            </Pressable>
          </View>

          <ScrollView style={styles.scrollBody} contentContainerStyle={{ padding: SPACING.md }}>

            {/* Select Partner Player */}
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>1. Select Trading Partner</Text>
            <View style={styles.partnerRow}>
              {otherPlayers.map((p) => {
                const isSelected = selectedPartnerId === p.id;
                return (
                  <Pressable
                    key={p.id}
                    style={[
                      styles.partnerChip,
                      { backgroundColor: isSelected ? colors.surfaceBorder : colors.background, borderColor: colors.surfaceBorder },
                      isSelected && { borderColor: p.color },
                    ]}
                    onPress={() => {
                      setSelectedPartnerId(p.id);
                      setSelectedRequestPropIds([]);
                    }}
                  >
                    <Text style={[styles.partnerEmoji, { color: colors.textPrimary }]}>{p.avatar}</Text>
                    <Text style={[styles.partnerName, { color: colors.textPrimary }]}>{p.name}</Text>
                  </Pressable>
                );
              })}
            </View>

            {partnerPlayer ? (
              <>
                {/* ─── OFFER SECTION (You Give) ─── */}
                <View style={[styles.tradeBox, { backgroundColor: colors.background, borderColor: colors.surfaceBorder }]}>
                  <Text style={[styles.boxTitle, { color: colors.textPrimary }]}>YOU GIVE ({currentPlayer.name})</Text>

                  <Input
                    label="Offer Cash ($)"
                    placeholder="0"
                    keyboardType="numeric"
                    value={offerCash}
                    onChangeText={setOfferCash}
                    style={styles.amountInput}
                  />

                  <Text style={[styles.subLabel, { color: colors.textMuted }]}>Select Unbuilt Deeds to Offer:</Text>
                  {myEligibleProps.length === 0 ? (
                    <Text style={[styles.noPropsText, { color: colors.textMuted }]}>No unbuilt properties available to trade</Text>
                  ) : (
                    <View style={styles.deedGrid}>
                      {myEligibleProps.map((p) => {
                        const deed = BOARD_PROPERTIES.find((b) => b.id === p.propertyId);
                        if (!deed) return null;
                        const isChecked = selectedOfferPropIds.includes(deed.id);
                        const groupColor = GROUP_COLORS[deed.group] || colors.primary;
                        const textureSource = getTextureForGroup(deed.group);

                        return (
                          <Pressable
                            key={deed.id}
                            style={[
                              styles.deedChip,
                              { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, borderLeftColor: groupColor },
                              isChecked && { backgroundColor: colors.emerald + '22', borderColor: colors.emerald },
                            ]}
                            onPress={() => toggleOfferProp(deed.id)}
                          >
                            <ImageBackground
                              source={textureSource}
                              style={styles.chipTextureBg}
                              imageStyle={{ borderRadius: RADIUS.sm, opacity: 0.35 }}
                            >
                              <Text style={[styles.deedChipText, { color: colors.textPrimary }]}>
                                {isChecked ? '[SELECTED] ' : ''}{deed.name} (${deed.purchasePrice})
                              </Text>
                            </ImageBackground>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* ─── REQUEST SECTION (You Receive) ─── */}
                <View style={[styles.tradeBox, { backgroundColor: colors.background, borderColor: colors.surfaceBorder }]}>
                  <Text style={[styles.boxTitle, { color: colors.textPrimary }]}>YOU RECEIVE (From {partnerPlayer.name})</Text>

                  <Input
                    label="Request Cash ($)"
                    placeholder="0"
                    keyboardType="numeric"
                    value={requestCash}
                    onChangeText={setRequestCash}
                    style={styles.amountInput}
                  />

                  <Text style={[styles.subLabel, { color: colors.textMuted }]}>Select Unbuilt Deeds to Request from {partnerPlayer.name}:</Text>
                  {partnerEligibleProps.length === 0 ? (
                    <Text style={[styles.noPropsText, { color: colors.textMuted }]}>{partnerPlayer.name} has no unbuilt properties available to trade</Text>
                  ) : (
                    <View style={styles.deedGrid}>
                      {partnerEligibleProps.map((p) => {
                        const deed = BOARD_PROPERTIES.find((b) => b.id === p.propertyId);
                        if (!deed) return null;
                        const isChecked = selectedRequestPropIds.includes(deed.id);
                        const groupColor = GROUP_COLORS[deed.group] || colors.primary;
                        const textureSource = getTextureForGroup(deed.group);

                        return (
                          <Pressable
                            key={deed.id}
                            style={[
                              styles.deedChip,
                              { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, borderLeftColor: groupColor },
                              isChecked && { backgroundColor: colors.emerald + '22', borderColor: colors.emerald },
                            ]}
                            onPress={() => toggleRequestProp(deed.id)}
                          >
                            <ImageBackground
                              source={textureSource}
                              style={styles.chipTextureBg}
                              imageStyle={{ borderRadius: RADIUS.sm, opacity: 0.35 }}
                            >
                              <Text style={[styles.deedChipText, { color: colors.textPrimary }]}>
                                {isChecked ? '[SELECTED] ' : ''}{deed.name} (${deed.purchasePrice})
                              </Text>
                            </ImageBackground>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* Error Banner */}
                {errorMsg && (
                  <View style={[styles.errorBox, { backgroundColor: colors.crimson + '22', borderColor: colors.crimson + '66' }]}>
                    <Text style={[styles.errorText, { color: colors.crimson }]}>{errorMsg}</Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={styles.noPropsText}>No other players in game to trade with.</Text>
            )}

          </ScrollView>

          {/* Footer Buttons */}
          <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.surfaceBorder }]}>
            <Button title="Cancel" variant="ghost" onPress={onClose} />
            <Button
              title="Send Trade Proposal"
              variant="emerald"
              size="md"
              loading={loading}
              disabled={!partnerPlayer}
              onPress={handleProposeTrade}
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
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  container: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '90%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
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
    fontSize: 11,
    color: COLORS.textMuted,
  },
  closeBtn: {
    padding: 6,
  },
  closeText: {
    color: COLORS.textMuted,
    fontSize: 18,
    fontWeight: '800',
  },
  scrollBody: {
    maxHeight: 450,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  partnerRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.xs,
    marginBottom: SPACING.md,
  },
  partnerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    borderColor: COLORS.surfaceBorder,
    gap: 6,
  },
  partnerSelected: {
    backgroundColor: COLORS.surfaceBorder,
  },
  partnerEmoji: {
    fontSize: 14,
  },
  partnerName: {
    color: COLORS.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  tradeBox: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  boxTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  amountInput: {
    fontSize: 18,
    fontWeight: '800',
  },
  subLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  noPropsText: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },
  deedGrid: {
    gap: 6,
  },
  deedChip: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.sm,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    overflow: 'hidden',
  },
  chipTextureBg: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.sm,
  },
  deedChipChecked: {
    backgroundColor: COLORS.emerald + '22',
    borderColor: COLORS.emerald,
  },
  deedChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  errorBox: {
    backgroundColor: COLORS.crimson + '22',
    borderColor: COLORS.crimson + '66',
    borderWidth: 1,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
  },
  errorText: {
    color: COLORS.crimson,
    fontSize: 12,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
    backgroundColor: COLORS.surface,
  },
});

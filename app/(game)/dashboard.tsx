import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, Pressable, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, RADIUS, SPACING } from '../../src/constants/theme';
import { Button } from '../../src/components/ui/Button';
import { QuickPayModal } from '../../src/components/banking/QuickPayModal';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useGameStore } from '../../src/store/useGameStore';
import {
  depositFromBank,
  payPlayerToPlayer,
  collectToBank,
  executeMultiCollect,
  executeMultiPay,
} from '../../src/services/firebase/transactionService';
import { calculateCustomDuty, calculateTravellingDuty } from '../../src/services/engine/taxEngine';
import { soundEngine } from '../../src/services/sound/soundService';

interface DutyModalData {
  type: 'custom' | 'travelling';
  title: string;
  subtitle: string;
  icon: string;
  amount: number;
  countryCount: number;
}

export default function DashboardScreen() {
  const { userId } = useAuthStore();
  const { currentGame, players, properties } = useGameStore();

  const [payModalVisible, setPayModalVisible] = useState(false);
  const [activeDutyModal, setActiveDutyModal] = useState<DutyModalData | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [topBanner, setTopBanner] = useState<string | null>(null);

  const currentPlayer = players.find((p) => p.id === userId) || players[0];

  if (!currentGame || !currentPlayer) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.loadingText}>Loading banking ledger...</Text>
      </View>
    );
  }

  const showBanner = (msg: string) => {
    setTopBanner(msg);
    setTimeout(() => {
      setTopBanner(null);
    }, 4000);
  };

  // Calculate player's owned properties for tax calculations (using truthy ownerId check)
  const myProperties = Object.values(properties).filter(
    (p) => !!p.ownerId && p.ownerId === currentPlayer.id
  );

  // Pass GO salary handler ($1,500)
  const handlePassGO = async () => {
    setActionLoading(true);
    try {
      await depositFromBank({
        gameId: currentGame.id,
        receiverId: currentPlayer.id,
        amount: 1500,
        reason: 'GO Salary',
        icon: '🏦',
      });
      soundEngine.playCashSound();
      showBanner('🎉 Collected $1,500 GO Salary from Bank!');
    } catch (err: any) {
      showBanner(`⚠️ ${err?.message || 'Could not collect GO salary.'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Party House handler ($200 from each player)
  const handlePartyHouse = async () => {
    setActionLoading(true);
    try {
      await executeMultiCollect({
        gameId: currentGame.id,
        receiverId: currentPlayer.id,
        amountPerPlayer: 200,
        reason: 'Party House',
        icon: '🎉',
      });
      soundEngine.playCashSound();
      showBanner('🎉 Collected $200 Party House contribution from each player!');
    } catch (err: any) {
      showBanner(`⚠️ ${err?.message || 'Could not collect Party House payments.'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Resorts handler ($200 to each player)
  const handleResorts = async () => {
    setActionLoading(true);
    try {
      await executeMultiPay({
        gameId: currentGame.id,
        senderId: currentPlayer.id,
        amountPerPlayer: 200,
        reason: 'Resorts Vacation Expenses',
        icon: '🏖️',
      });
      showBanner('🏖️ Paid $200 Resort expenses to each player.');
    } catch (err: any) {
      showBanner(`⚠️ ${err?.message || 'Could not execute Resorts payment.'}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Custom Duty handler ($100 per owned country property site)
  const handleCustomDuty = () => {
    const { amount, countryCount } = calculateCustomDuty(myProperties);
    if (countryCount === 0 || amount <= 0) {
      showBanner('⚠️ You do not own any country sites subject to Custom Duty.');
      return;
    }

    setActiveDutyModal({
      type: 'custom',
      title: 'Custom Duty Payment',
      subtitle: `Pay $100 per country site to the Bank (${countryCount} site${countryCount > 1 ? 's' : ''} owned).`,
      icon: '🏛️',
      amount,
      countryCount,
    });
  };

  // Travelling Duty handler ($50 per owned country property site)
  const handleTravellingDuty = () => {
    const { amount, countryCount } = calculateTravellingDuty(myProperties);
    if (countryCount === 0 || amount <= 0) {
      showBanner('⚠️ You do not own any country sites subject to Travelling Duty.');
      return;
    }

    setActiveDutyModal({
      type: 'travelling',
      title: 'Travelling Duty Payment',
      subtitle: `Pay $50 per country site to the Bank (${countryCount} site${countryCount > 1 ? 's' : ''} owned).`,
      icon: '✈️',
      amount,
      countryCount,
    });
  };

  // Confirm Duty payment inside Modal
  const handleConfirmDutyPayment = async () => {
    if (!activeDutyModal) return;
    setActionLoading(true);
    try {
      await collectToBank({
        gameId: currentGame.id,
        senderId: currentPlayer.id,
        amount: activeDutyModal.amount,
        reason: `${activeDutyModal.title} (${activeDutyModal.countryCount} sites)`,
        icon: activeDutyModal.icon,
      });
      soundEngine.playCashSound();
      showBanner(`🎉 Paid $${activeDutyModal.amount.toLocaleString()} ${activeDutyModal.title} to Bank!`);
      setActiveDutyModal(null);
    } catch (err: any) {
      showBanner(`⚠️ Payment failed: ${err?.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Send Payment submit handler
  const handleSendPaymentSubmit = async (receiverId: string, amount: number, reason: string) => {
    if (receiverId === 'BANK') {
      await collectToBank({
        gameId: currentGame.id,
        senderId: currentPlayer.id,
        amount,
        reason,
        icon: '🏦',
      });
    } else {
      await payPlayerToPlayer({
        gameId: currentGame.id,
        senderId: currentPlayer.id,
        receiverId,
        amount,
        reason,
        category: 'p2p',
        icon: '💸',
      });
    }
    soundEngine.playCashSound();
    showBanner(`🎉 Payment of $${amount.toLocaleString()} completed!`);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
      {/* Top Banner Feedback */}
      {topBanner && (
        <View style={styles.topBanner}>
          <Text style={styles.topBannerText}>{topBanner}</Text>
        </View>
      )}

      {/* Main Player Ledger Card */}
      <View style={styles.heroLedger}>
        <View style={styles.playerHeader}>
          <View style={styles.playerAvatarBg}>
            <Text style={styles.avatarText}>{currentPlayer.avatar}</Text>
          </View>
          <View>
            <Text style={styles.welcomeText}>Logged in as</Text>
            <Text style={styles.playerName}>{currentPlayer.name}</Text>
          </View>
        </View>

        <View style={styles.balanceContainer}>
          <Text style={styles.balanceLabel}>Current Cash Balance</Text>
          <Text style={styles.balanceAmount}>${currentPlayer.balance.toLocaleString()}</Text>
        </View>

        {/* Pass GO Button */}
        <Button
          title="🏦 Pass GO — Collect $1,500 Salary"
          variant="gold"
          size="lg"
          loading={actionLoading}
          onPress={handlePassGO}
          style={styles.goButton}
        />
      </View>

      {/* Banking Quick Actions Grid */}
      <Text style={styles.sectionTitle}>Banking & Quick Actions</Text>
      <View style={styles.actionGrid}>
        <Pressable style={styles.gridCard} onPress={() => setPayModalVisible(true)}>
          <Text style={styles.gridEmoji}>💸</Text>
          <Text style={styles.gridTitle}>Send Money</Text>
          <Text style={styles.gridSubtitle}>Pay Bank or Player</Text>
        </Pressable>

        <Pressable style={styles.gridCard} onPress={handlePartyHouse}>
          <Text style={styles.gridEmoji}>🎉</Text>
          <Text style={styles.gridTitle}>Party House</Text>
          <Text style={styles.gridSubtitle}>+$200 from each player</Text>
        </Pressable>

        <Pressable style={styles.gridCard} onPress={handleResorts}>
          <Text style={styles.gridEmoji}>🏖️</Text>
          <Text style={styles.gridTitle}>Resorts</Text>
          <Text style={styles.gridSubtitle}>-$200 to each player</Text>
        </Pressable>

        <Pressable style={styles.gridCard} onPress={handleCustomDuty}>
          <Text style={styles.gridEmoji}>🏛️</Text>
          <Text style={styles.gridTitle}>Custom Duty</Text>
          <Text style={styles.gridSubtitle}>$100 / country site</Text>
        </Pressable>

        <Pressable style={styles.gridCard} onPress={handleTravellingDuty}>
          <Text style={styles.gridEmoji}>✈️</Text>
          <Text style={styles.gridTitle}>Travelling Duty</Text>
          <Text style={styles.gridSubtitle}>$50 / country site</Text>
        </Pressable>
      </View>

      {/* Synchronized Player Leaderboard */}
      <Text style={[styles.sectionTitle, { marginTop: SPACING.xl }]}>Live Player Balances</Text>
      <View style={styles.leaderboardCard}>
        {players
          .slice()
          .sort((a, b) => b.balance - a.balance)
          .map((p, idx) => {
            const isMe = p.id === userId;
            return (
              <View key={p.id} style={[styles.leaderItem, isMe && styles.leaderItemMe]}>
                <View style={styles.rankCol}>
                  <Text style={styles.rankText}>#{idx + 1}</Text>
                  <Text style={styles.pAvatar}>{p.avatar}</Text>
                  <Text style={styles.pName}>
                    {p.name} {isMe ? '(You)' : ''}
                  </Text>
                </View>

                <Text style={styles.pBalance}>${p.balance.toLocaleString()}</Text>
              </View>
            );
          })}
      </View>

      {/* Quick Pay Modal */}
      <QuickPayModal
        visible={payModalVisible}
        onClose={() => setPayModalVisible(false)}
        currentPlayer={currentPlayer}
        players={players}
        onExecutePayment={handleSendPaymentSubmit}
      />

      {/* Custom Duty & Travelling Duty Confirmation Modal */}
      {activeDutyModal && (
        <Modal animationType="fade" transparent visible={!!activeDutyModal} onRequestClose={() => setActiveDutyModal(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.dutyHeader}>
                <Text style={styles.dutyEmoji}>{activeDutyModal.icon}</Text>
                <View>
                  <Text style={styles.dutyTitle}>{activeDutyModal.title}</Text>
                  <Text style={styles.dutySub}>{activeDutyModal.subtitle}</Text>
                </View>
              </View>

              <View style={styles.dutyBody}>
                <View style={styles.dutyRow}>
                  <Text style={styles.dutyLabel}>Country Sites Owned</Text>
                  <Text style={styles.dutyVal}>{activeDutyModal.countryCount} site(s)</Text>
                </View>

                <View style={styles.dutyRow}>
                  <Text style={styles.dutyLabel}>Rate per Country Site</Text>
                  <Text style={styles.dutyVal}>
                    ${activeDutyModal.type === 'custom' ? '100' : '50'}
                  </Text>
                </View>

                <View style={styles.dutyDivider} />

                <View style={styles.dutyRow}>
                  <Text style={styles.dutyLabelBold}>Total Duty Payable</Text>
                  <Text style={styles.dutyAmount}>-${activeDutyModal.amount.toLocaleString()}</Text>
                </View>

                <View style={styles.dutyRow}>
                  <Text style={styles.dutyLabel}>Your Current Cash</Text>
                  <Text style={styles.dutyVal}>${currentPlayer.balance.toLocaleString()}</Text>
                </View>

                <View style={styles.dutyRow}>
                  <Text style={styles.dutyLabel}>Cash After Payment</Text>
                  <Text style={[
                    styles.dutyValBold,
                    currentPlayer.balance < activeDutyModal.amount && styles.errorText
                  ]}>
                    ${(currentPlayer.balance - activeDutyModal.amount).toLocaleString()}
                  </Text>
                </View>

                {currentPlayer.balance < activeDutyModal.amount && (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>
                      ⚠️ Insufficient Funds! You need $${activeDutyModal.amount.toLocaleString()} but only have $${currentPlayer.balance.toLocaleString()}.
                    </Text>
                  </View>
                )}
              </View>

              <View style={styles.dutyFooter}>
                <Pressable style={styles.cancelBtn} onPress={() => setActiveDutyModal(null)} disabled={actionLoading}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </Pressable>
                <Button
                  title="Confirm Duty Payment"
                  variant="gold"
                  loading={actionLoading}
                  disabled={currentPlayer.balance < activeDutyModal.amount}
                  onPress={handleConfirmDutyPayment}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    padding: SPACING.md,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  topBanner: {
    backgroundColor: COLORS.surfaceLight,
    borderColor: COLORS.gold + '66',
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  topBannerText: {
    color: COLORS.gold,
    fontWeight: '800',
    fontSize: 13,
  },
  heroLedger: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  playerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  playerAvatarBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 22,
  },
  welcomeText: {
    fontSize: 11,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
  },
  playerName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  balanceContainer: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    marginVertical: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '900',
    color: COLORS.emerald,
  },
  goButton: {
    marginTop: SPACING.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  gridCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  gridEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  gridSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  leaderboardCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    gap: SPACING.xs,
  },
  leaderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.xs + 2,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.sm,
  },
  leaderItemMe: {
    backgroundColor: COLORS.surfaceLight,
  },
  rankCol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rankText: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.gold,
    width: 24,
  },
  pAvatar: {
    fontSize: 16,
  },
  pName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  pBalance: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.emerald,
  },

  // Duty Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  modalContent: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  dutyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    padding: SPACING.md,
    backgroundColor: COLORS.surfaceLight,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  dutyEmoji: {
    fontSize: 32,
  },
  dutyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  dutySub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  dutyBody: {
    padding: SPACING.md,
    gap: SPACING.xs,
  },
  dutyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dutyLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  dutyLabelBold: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  dutyVal: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  dutyValBold: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.emerald,
  },
  dutyAmount: {
    fontSize: 18,
    fontWeight: '900',
    color: COLORS.crimson,
  },
  dutyDivider: {
    height: 1,
    backgroundColor: COLORS.surfaceBorder,
    marginVertical: SPACING.xs,
  },
  errorBox: {
    marginTop: SPACING.sm,
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
  dutyFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
    backgroundColor: COLORS.surface,
  },
  cancelBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  cancelText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});

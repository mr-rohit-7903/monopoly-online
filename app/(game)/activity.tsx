import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView,
  TextInput, Pressable, ActivityIndicator,
} from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../src/constants/theme';
import { useGameStore } from '../../src/store/useGameStore';
import { useNotificationStore } from '../../src/store/useNotificationStore';
import { subscribeToTransactions } from '../../src/services/firebase/transactionService';
import { Transaction, TransactionCategory } from '../../src/types/transaction';
import { AppNotification } from '../../src/types/notification';

type FilterType = 'all' | 'p2p' | 'property' | 'building' | 'mortgage' | 'banker';

export default function HistoryLogsScreen() {
  const { currentGame } = useGameStore();
  const { notificationHistory } = useNotificationStore();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Real-time subscription to Firebase transactions node
  useEffect(() => {
    if (!currentGame?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = subscribeToTransactions(currentGame.id, (txList) => {
      setTransactions(txList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentGame?.id]);

  // Combine or fallback to notification history if transactions list is empty
  const logEntries: (Transaction | AppNotification)[] =
    transactions.length > 0 ? transactions : notificationHistory;

  // Compute summary stats
  const totalVolume = transactions.reduce((acc, t) => acc + (t.amount || 0), 0);

  // Filter logs by search query & category filter
  const filteredLogs = logEntries.filter((item) => {
    // Search query filter
    const query = searchQuery.trim().toLowerCase();
    if (query.length > 0) {
      const matchSender = ('senderName' in item ? item.senderName : '')?.toLowerCase().includes(query);
      const matchReceiver = ('receiverName' in item ? item.receiverName : '')?.toLowerCase().includes(query);
      const matchReason = (item.reason || ('message' in item ? item.message : '') || '')?.toLowerCase().includes(query);
      const matchProp = ('propertyName' in item ? item.propertyName || '' : '')?.toLowerCase().includes(query);
      if (!matchSender && !matchReceiver && !matchReason && !matchProp) {
        return false;
      }
    }

    // Category tab filter
    if (activeFilter === 'all') return true;

    const cat = 'category' in item ? item.category : item.type;

    if (activeFilter === 'p2p') {
      return cat === 'p2p' || cat === 'rent' || cat === 'multi_collect' || cat === 'multi_pay';
    }
    if (activeFilter === 'property') {
      return cat === 'property_buy' || cat === 'property_sell' || cat === 'property';
    }
    if (activeFilter === 'building') {
      return (
        cat === 'house_build' ||
        cat === 'hotel_build' ||
        cat === 'house_sell' ||
        cat === 'hotel_sell'
      );
    }
    if (activeFilter === 'mortgage') {
      return cat === 'mortgage' || cat === 'unmortgage' || cat === 'bank_collect' || cat === 'tax';
    }
    if (activeFilter === 'banker') {
      return cat === 'banker_action' || cat === 'bank_deposit' || cat === 'salary';
    }

    return true;
  });

  return (
    <View style={styles.container}>

      {/* Top Header Summary Card */}
      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={styles.statLabel}>Total Transactions</Text>
            <Text style={styles.statNum}>{logEntries.length}</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statCol}>
            <Text style={styles.statLabel}>Volume Traded</Text>
            <Text style={styles.statNumGold}>${totalVolume.toLocaleString()}</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statCol}>
            <Text style={styles.statLabel}>Sync Status</Text>
            <View style={styles.syncBadge}>
              <View style={styles.syncDot} />
              <Text style={styles.syncText}>Live DB</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Search Input Bar */}
      <View style={styles.searchContainer}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by player, property, or action..."
          placeholderTextColor={COLORS.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Text style={styles.clearSearchText}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Filter Chips Bar */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {[
            { id: 'all', label: 'All Logs' },
            { id: 'p2p', label: '💸 Payments & Rent' },
            { id: 'property', label: '🏠 Property Deeds' },
            { id: 'building', label: '🏡 Houses & Hotels' },
            { id: 'mortgage', label: '🏦 Mortgages & Taxes' },
            { id: 'banker', label: '👑 Banker Actions' },
          ].map((btn) => {
            const isSelected = activeFilter === btn.id;
            return (
              <Pressable
                key={btn.id}
                style={[styles.filterChip, isSelected && styles.filterSelected]}
                onPress={() => setActiveFilter(btn.id as FilterType)}
              >
                <Text style={[styles.filterText, isSelected && styles.filterTextSelected]}>
                  {btn.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* History Log Items List */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {loading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator color={COLORS.gold} size="large" />
            <Text style={styles.emptyText}>Syncing live history logs...</Text>
          </View>
        ) : filteredLogs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>📜</Text>
            <Text style={styles.emptyTitle}>
              {searchQuery.length > 0 ? 'No Matching Logs Found' : 'No History Logs Recorded Yet'}
            </Text>
            <Text style={styles.emptyText}>
              {searchQuery.length > 0
                ? `No transactions matched "${searchQuery}". Try clearing your search.`
                : 'All game transactions, property buys, house builds, mortgages, and rent payments will be recorded here in real time.'}
            </Text>

            {searchQuery.length > 0 && (
              <Pressable style={styles.resetBtn} onPress={() => setSearchQuery('')}>
                <Text style={styles.resetBtnText}>Clear Search Filter</Text>
              </Pressable>
            )}
          </View>
        ) : (
          filteredLogs.map((log) => (
            <HistoryLogCard key={log.id} item={log} />
          ))
        )}
      </ScrollView>
    </View>
  );
}

function HistoryLogCard({ item }: { item: Transaction | AppNotification }) {
  const isTransaction = 'category' in item;
  const timestamp = item.timestamp || Date.now();

  const formatTime = (ts: number) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getCategoryMeta = (): { label: string; color: string; icon: string } => {
    if (isTransaction) {
      const tx = item as Transaction;
      switch (tx.category) {
        case 'property_buy':
          return { label: 'BUY PROPERTY', color: COLORS.emerald, icon: '🏠' };
        case 'house_build':
          return { label: 'HOUSE BUILT', color: COLORS.gold, icon: '🏡' };
        case 'hotel_build':
          return { label: 'HOTEL BUILT', color: COLORS.gold, icon: '🏨' };
        case 'house_sell':
          return { label: 'HOUSE SOLD', color: '#F97316', icon: '🏷️' };
        case 'hotel_sell':
          return { label: 'HOTEL SOLD', color: '#F97316', icon: '🏷️' };
        case 'mortgage':
          return { label: 'MORTGAGED', color: COLORS.crimson, icon: '🏦' };
        case 'unmortgage':
          return { label: 'UNMORTGAGED', color: COLORS.emerald, icon: '✅' };
        case 'bank_deposit':
          return { label: 'BANK PAYOUT', color: COLORS.emerald, icon: '💵' };
        case 'bank_collect':
          return { label: 'BANK FINE', color: COLORS.crimson, icon: '🏛️' };
        case 'multi_collect':
          return { label: 'PARTY HOUSE', color: '#A855F7', icon: '🎉' };
        case 'multi_pay':
          return { label: 'RESORTS EXPENSE', color: '#EC4899', icon: '🏖️' };
        case 'p2p':
          return { label: 'RENT / P2P', color: COLORS.primary, icon: '💸' };
        default:
          return { label: 'TRANSACTION', color: COLORS.primary, icon: '📌' };
      }
    } else {
      const notif = item as AppNotification;
      return {
        label: notif.type.toUpperCase(),
        color: COLORS.primary,
        icon: notif.icon || '📌',
      };
    }
  };

  const meta = getCategoryMeta();
  const senderName = 'senderName' in item ? item.senderName : '';
  const receiverName = 'receiverName' in item ? item.receiverName : '';
  const reason = item.reason || ('message' in item ? item.message : '');

  return (
    <View style={styles.logCard}>
      {/* Top Header Row */}
      <View style={styles.logHeaderRow}>
        <View style={[styles.catBadge, { backgroundColor: meta.color + '22', borderColor: meta.color + '55' }]}>
          <Text style={styles.catIcon}>{meta.icon}</Text>
          <Text style={[styles.catLabel, { color: meta.color }]}>{meta.label}</Text>
        </View>

        <Text style={styles.logTime}>{formatTime(timestamp)}</Text>
      </View>

      {/* Main Flow & Reason */}
      <View style={styles.logBodyRow}>
        <View style={styles.flowCol}>
          {senderName && receiverName ? (
            <View style={styles.flowRow}>
              <Text style={styles.senderText}>{senderName}</Text>

            </View>
          ) : null}

          <Text style={styles.reasonText}>{reason}</Text>

          {'propertyName' in item && item.propertyName && (
            <View style={styles.propPill}>
              <Text style={styles.propPillText}>📍 {item.propertyName}</Text>
            </View>
          )}
        </View>

        {/* Amount */}
        {item.amount ? (
          <View style={styles.amountCol}>
            <Text style={[
              styles.amountText,
              senderName === 'BANK' || meta.label.includes('SOLD') || meta.label.includes('MORTGAGED')
                ? styles.positiveText
                : styles.neutralText,
            ]}>
              ${item.amount.toLocaleString()}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  statsCard: {
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statCol: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
    marginBottom: 2,
  },
  statNum: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  statNumGold: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.gold,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: COLORS.surfaceBorder,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: COLORS.emerald + '22',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.full,
    marginTop: 2,
  },
  syncDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.emerald,
  },
  syncText: {
    fontSize: 11,
    fontWeight: '800',
    color: COLORS.emerald,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    marginHorizontal: SPACING.md,
    marginTop: SPACING.md,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: SPACING.xs,
  },
  searchInput: {
    flex: 1,
    height: 42,
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  clearSearchText: {
    color: COLORS.textMuted,
    fontSize: 16,
    fontWeight: '800',
    padding: 4,
  },
  filterRow: {
    paddingVertical: SPACING.sm,
  },
  filterScroll: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.xs,
  },
  filterChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surfaceLight,
  },
  filterSelected: {
    backgroundColor: COLORS.gold,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  filterTextSelected: {
    color: '#000000',
  },
  scrollContent: {
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.xxl,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: SPACING.sm,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    lineHeight: 18,
  },
  resetBtn: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  resetBtnText: {
    color: COLORS.gold,
    fontSize: 13,
    fontWeight: '700',
  },
  logCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  logHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  catBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    gap: 4,
  },
  catIcon: {
    fontSize: 12,
  },
  catLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  logTime: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  logBodyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  flowCol: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  flowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 2,
  },
  senderText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  arrowText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  receiverText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gold,
  },
  reasonText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  propPill: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  propPillText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amountText: {
    fontSize: 16,
    fontWeight: '800',
  },
  positiveText: {
    color: COLORS.emerald,
  },
  neutralText: {
    color: COLORS.gold,
  },
});

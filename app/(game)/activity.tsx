import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, ScrollView,
  TextInput, Pressable, ActivityIndicator,
} from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../src/constants/theme';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useGameStore } from '../../src/store/useGameStore';
import { subscribeToTransactions } from '../../src/services/firebase/transactionService';
import { Transaction } from '../../src/types/transaction';
import { AppNotification } from '../../src/types/notification';

type FilterType = 'all' | 'p2p' | 'property' | 'building' | 'mortgage' | 'banker';

import { useThemeStore } from '../../src/store/useThemeStore';

export default function HistoryLogsScreen() {
  const { userId } = useAuthStore();
  const { currentGame, players } = useGameStore();
  const { colors } = useThemeStore();

  const [logs, setLogs] = useState<(Transaction | AppNotification)[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  useEffect(() => {
    if (!currentGame?.id) return;
    setLoading(true);

    const unsubscribe = subscribeToTransactions(currentGame.id, (txList) => {
      setLogs(txList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentGame?.id]);

  if (!currentGame) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Loading history log ledger...</Text>
      </View>
    );
  }

  // Filter logs by category and search term
  const filteredLogs = logs.filter((item) => {
    const isTx = 'category' in item;
    const category = isTx ? (item as Transaction).category : (item as AppNotification).type;

    // Filter tab condition
    if (activeFilter === 'p2p' && category !== 'p2p') return false;
    if (activeFilter === 'property' && category !== 'property_buy') return false;
    if (activeFilter === 'building' && category !== 'house_build' && category !== 'hotel_build' && category !== 'house_sell' && category !== 'hotel_sell') return false;
    if (activeFilter === 'mortgage' && category !== 'mortgage' && category !== 'unmortgage' && category !== 'bank_collect') return false;
    if (activeFilter === 'banker' && category !== 'bank_deposit' && category !== 'bank_collect') return false;

    // Search query condition
    if (searchQuery.trim().length > 0) {
      const q = searchQuery.toLowerCase();
      const sender = (isTx ? (item as Transaction).senderName : (item as AppNotification).senderName || '').toLowerCase();
      const receiver = (isTx ? (item as Transaction).receiverName : (item as AppNotification).receiverName || '').toLowerCase();
      const reason = (isTx ? (item as Transaction).reason : (item as AppNotification).message || '').toLowerCase();
      const propName = (isTx ? (item as Transaction).propertyName || '' : '').toLowerCase();

      return sender.includes(q) || receiver.includes(q) || reason.includes(q) || propName.includes(q);
    }

    return true;
  });

  // Calculate volume summary stats
  const totalVolume = logs.reduce((sum, item) => {
    return sum + ('amount' in item ? (item as Transaction).amount || 0 : 0);
  }, 0);

  return (
    <View style={styles.container}>

      {/* Stats Summary Bar */}
      <View style={[styles.statsBar, { backgroundColor: colors.surface, borderBottomColor: colors.surfaceBorder }]}>
        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total Transactions</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{logs.length}</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.surfaceBorder }]} />
        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Funds Moved</Text>
          <Text style={[styles.statValue, { color: colors.emerald }]}>
            ${totalVolume.toLocaleString()}
          </Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.surfaceBorder }]} />
        <View style={styles.statBox}>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Active Players</Text>
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>{players.length}</Text>
        </View>
      </View>

      {/* Search Input Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <TextInput
          style={[styles.searchInput, { color: colors.textPrimary }]}
          placeholder="Search by player, property, or action..."
          placeholderTextColor={colors.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery('')}>
            <Text style={[styles.clearSearchText, { color: colors.textMuted }]}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Filter Chips Bar */}
      <View style={styles.filterRow}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {[
            { id: 'all', label: 'All Logs' },
            { id: 'p2p', label: 'Payments & Rent' },
            { id: 'property', label: 'Property Deeds' },
            { id: 'building', label: 'Houses & Hotels' },
            { id: 'mortgage', label: 'Mortgages & Taxes' },
            { id: 'banker', label: 'Banker Actions' },
          ].map((btn) => {
            const isSelected = activeFilter === btn.id;
            return (
              <Pressable
                key={btn.id}
                style={[
                  styles.filterChip, 
                  { backgroundColor: isSelected ? colors.primary : colors.surface, borderColor: colors.surfaceBorder },
                  isSelected && styles.filterSelected
                ]}
                onPress={() => setActiveFilter(btn.id as FilterType)}
              >
                <Text style={[styles.filterText, { color: isSelected ? '#FFF' : colors.textSecondary }]}>
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
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Syncing live history logs...</Text>
          </View>
        ) : filteredLogs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              {searchQuery.length > 0 ? 'No Matching Logs Found' : 'No History Logs Recorded Yet'}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
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
  const { colors } = useThemeStore();
  const isTransaction = 'category' in item;
  const timestamp = item.timestamp || Date.now();

  const formatTime = (ts: number) => {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getCategoryMeta = (): { label: string; color: string; tag: string } => {
    if (isTransaction) {
      const tx = item as Transaction;
      switch (tx.category) {
        case 'property_buy':
          return { label: 'BUY PROPERTY', color: colors.emerald, tag: 'BUY' };
        case 'house_build':
          return { label: 'HOUSE BUILT', color: colors.gold, tag: 'BUILD' };
        case 'hotel_build':
          return { label: 'HOTEL BUILT', color: colors.gold, tag: 'HOTEL' };
        case 'house_sell':
          return { label: 'HOUSE SOLD', color: '#F97316', tag: 'SELL' };
        case 'hotel_sell':
          return { label: 'HOTEL SOLD', color: '#F97316', tag: 'SELL' };
        case 'mortgage':
          return { label: 'MORTGAGED', color: colors.crimson, tag: 'MORTGAGE' };
        case 'unmortgage':
          return { label: 'UNMORTGAGED', color: colors.emerald, tag: 'ACTIVE' };
        case 'bank_deposit':
          return { label: 'BANK PAYOUT', color: colors.emerald, tag: 'PAYOUT' };
        case 'bank_collect':
          return { label: 'BANK FINE', color: colors.crimson, tag: 'FINE' };
        case 'multi_collect':
          return { label: 'PARTY HOUSE', color: '#A855F7', tag: 'PARTY' };
        case 'multi_pay':
          return { label: 'RESORTS EXPENSE', color: '#EC4899', tag: 'RESORT' };
        case 'p2p':
        default:
          return { label: 'PAYMENT / RENT', color: colors.primary, tag: 'RENT' };
      }
    } else {
      const notif = item as AppNotification;
      return {
        label: notif.type.toUpperCase(),
        color: colors.primary,
        tag: 'NOTIF',
      };
    }
  };

  const meta = getCategoryMeta();

  if (isTransaction) {
    const tx = item as Transaction;
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, borderLeftColor: meta.color }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.categoryBadge, { backgroundColor: meta.color + '22', borderColor: meta.color }]}>
              <Text style={[styles.badgeText, { color: meta.color }]}>{meta.label}</Text>
            </View>
          </View>
          <Text style={[styles.timeText, { color: colors.textMuted }]}>{formatTime(timestamp)}</Text>
        </View>

        <View style={styles.cardBody}>
          <Text style={[styles.partyText, { color: colors.textSecondary }]}>
            <Text style={[styles.boldText, { color: colors.textPrimary }]}>{tx.senderName || 'Bank'}</Text> → <Text style={[styles.boldText, { color: colors.textPrimary }]}>{tx.receiverName || 'Bank'}</Text>
          </Text>

          <Text style={[styles.reasonText, { color: colors.textPrimary }]}>{tx.reason}</Text>

          {tx.propertyName && (
            <View style={[styles.propPill, { backgroundColor: colors.surfaceLight }]}>
              <Text style={[styles.propPillText, { color: colors.textPrimary }]}>{tx.propertyName}</Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <Text style={[styles.amountLabel, { color: colors.textMuted }]}>Total Amount:</Text>
          <Text style={[styles.amountValue, { color: meta.color }]}>
            ${(tx.amount || 0).toLocaleString()}
          </Text>
        </View>
      </View>
    );
  } else {
    const notif = item as AppNotification;
    return (
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, borderLeftColor: colors.primary }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.categoryBadge, { backgroundColor: colors.primary + '22', borderColor: colors.primary }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>{notif.title}</Text>
          </View>
          <Text style={[styles.timeText, { color: colors.textMuted }]}>{formatTime(timestamp)}</Text>
        </View>

        <View style={styles.cardBody}>
          <Text style={[styles.reasonText, { color: colors.textPrimary }]}>{notif.message}</Text>
        </View>
      </View>
    );
  }
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
    gap: SPACING.md,
  },
  statsBar: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statBox: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: COLORS.surfaceBorder,
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
  searchInput: {
    flex: 1,
    height: 42,
    color: COLORS.textPrimary,
    fontSize: 13,
  },
  clearSearchText: {
    color: COLORS.textMuted,
    fontSize: 16,
    fontWeight: '800',
    padding: 4,
  },
  filterRow: {
    marginVertical: SPACING.sm,
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
    gap: SPACING.md,
  },
  emptyContainer: {
    padding: SPACING.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginTop: SPACING.md,
    marginBottom: SPACING.xs,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 18,
  },
  resetBtn: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  resetBtnText: {
    color: COLORS.gold,
    fontSize: 12,
    fontWeight: '700',
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderLeftWidth: 5,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  timeText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  cardBody: {
    marginVertical: SPACING.xs,
  },
  partyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  boldText: {
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  reasonText: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  propPill: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.surfaceLight,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 6,
  },
  propPillText: {
    fontSize: 11,
    color: COLORS.gold,
    fontWeight: '700',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SPACING.xs,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
  },
  amountLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '900',
  },
});

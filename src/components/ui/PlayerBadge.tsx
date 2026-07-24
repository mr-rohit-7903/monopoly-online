import React from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import { Player } from '../../types/game';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

interface PlayerBadgeProps {
  player: Player;
  isCurrentPlayer?: boolean;
  onPress?: () => void;
  showBankerToggle?: boolean;
  onToggleBanker?: () => void;
}

export const PlayerBadge: React.FC<PlayerBadgeProps> = ({
  player,
  isCurrentPlayer = false,
  onPress,
  showBankerToggle = false,
  onToggleBanker,
}) => {
  return (
    <Pressable
      style={[
        styles.card,
        { borderLeftColor: player.color },
        isCurrentPlayer && styles.highlightCard,
      ]}
      onPress={onPress}
      disabled={!onPress}
    >
      <View style={styles.leftSection}>
        <View style={[styles.avatarCircle, { backgroundColor: player.color + '33' }]}>
          <Text style={styles.avatarEmoji}>{player.avatar}</Text>
        </View>
        <View>
          <View style={styles.nameRow}>
            <Text style={styles.playerName}>{player.name}</Text>
            {isCurrentPlayer && <Text style={styles.youTag}> (YOU)</Text>}
          </View>
          <View style={styles.badgeRow}>
            {player.isHost && (
              <View style={styles.hostBadge}>
                <Text style={styles.badgeText}>Host</Text>
              </View>
            )}
            {player.isBanker && (
              <View style={styles.bankerBadge}>
                <Text style={styles.badgeText}>Banker</Text>
              </View>
            )}
            {player.inJail && (
              <View style={styles.jailBadge}>
                <Text style={styles.badgeText}>In Jail</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.rightSection}>
        <Text style={styles.balance}>${player.balance.toLocaleString()}</Text>
        {showBankerToggle && !player.isBanker && onToggleBanker && (
          <Pressable style={styles.makeBankerBtn} onPress={onToggleBanker}>
            <Text style={styles.makeBankerText}>Make Banker</Text>
          </Pressable>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.surface,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    marginVertical: SPACING.xs,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  highlightCard: {
    backgroundColor: COLORS.surfaceLight,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEmoji: {
    fontSize: 22,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playerName: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  youTag: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.primaryLight,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: SPACING.xs,
    marginTop: SPACING.xs - 2,
  },
  hostBadge: {
    backgroundColor: COLORS.gold + '33',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  bankerBadge: {
    backgroundColor: COLORS.emerald + '33',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  jailBadge: {
    backgroundColor: COLORS.crimson + '33',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: COLORS.textPrimary,
  },
  rightSection: {
    alignItems: 'flex-end',
  },
  balance: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.emerald,
  },
  makeBankerBtn: {
    marginTop: SPACING.xs,
    backgroundColor: COLORS.surfaceBorder,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  makeBankerText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});

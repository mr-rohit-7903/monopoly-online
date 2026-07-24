import React from 'react';
import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { COLORS, PLAYER_AVATARS, PLAYER_COLORS, RADIUS, SPACING } from '../../constants/theme';
import { PlayerAvatar } from './PlayerAvatar';

interface AvatarPickerProps {
  selectedAvatar: string;
  selectedColor: string;
  onSelectAvatar: (avatar: string) => void;
  onSelectColor: (color: string) => void;
}

export const AvatarPicker: React.FC<AvatarPickerProps> = ({
  selectedAvatar,
  selectedColor,
  onSelectAvatar,
  onSelectColor,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Choose Avatar Token</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {PLAYER_AVATARS.map((avatar) => {
          const isSelected = selectedAvatar === avatar;
          return (
            <Pressable
              key={avatar}
              style={[
                styles.avatarBubble,
                isSelected && styles.avatarSelected,
                isSelected && { borderColor: selectedColor },
              ]}
              onPress={() => onSelectAvatar(avatar)}
            >
              <PlayerAvatar avatar={avatar} size={42} borderRadius={RADIUS.md} />
            </Pressable>
          );
        })}
      </ScrollView>

      <Text style={[styles.sectionLabel, { marginTop: SPACING.md }]}>Choose Color Theme</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {PLAYER_COLORS.map((color) => {
          const isSelected = selectedColor === color;
          return (
            <Pressable
              key={color}
              style={[
                styles.colorDot,
                { backgroundColor: color },
                isSelected && styles.colorSelected,
              ]}
              onPress={() => onSelectColor(color)}
            />
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: SPACING.sm,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
  },
  row: {
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  avatarBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.surfaceBorder,
  },
  avatarSelected: {
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 3,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  colorDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorSelected: {
    borderColor: '#FFFFFF',
    transform: [{ scale: 1.15 }],
  },
});

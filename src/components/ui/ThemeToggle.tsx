import React from 'react';
import { StyleSheet, Text, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '../../store/useThemeStore';
import { RADIUS, SPACING } from '../../constants/theme';

interface ThemeToggleProps {
  showLabel?: boolean;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ showLabel = false }) => {
  const { themeMode, colors, toggleTheme } = useThemeStore();
  const isDark = themeMode === 'dark';

  return (
    <Pressable
      style={[
        styles.container,
        {
          backgroundColor: colors.surfaceLight,
          borderColor: colors.surfaceBorder,
        },
      ]}
      onPress={toggleTheme}
    >
      <Ionicons
        name={isDark ? 'sunny-outline' : 'moon-outline'}
        size={18}
        color={isDark ? colors.gold : colors.primary}
      />
      {showLabel && (
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          {isDark ? 'Light Mode' : 'Dark Mode'}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: SPACING.xs + 2,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
  },
});

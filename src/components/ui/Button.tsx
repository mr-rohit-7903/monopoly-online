import React from 'react';
import { StyleSheet, Text, Pressable, ActivityIndicator, ViewStyle, TextStyle } from 'react-native';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'danger' | 'gold' | 'ghost' | 'emerald';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: string;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const getBackgroundColor = () => {
    if (disabled) return COLORS.surfaceLight;
    switch (variant) {
      case 'secondary':
        return COLORS.surface;
      case 'danger':
        return COLORS.crimson;
      case 'gold':
        return COLORS.gold;
      case 'emerald':
        return COLORS.emerald;
      case 'ghost':
        return 'transparent';
      case 'primary':
      default:
        return COLORS.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return COLORS.textMuted;
    if (variant === 'ghost') return COLORS.primaryLight;
    if (variant === 'secondary') return COLORS.textPrimary;
    return '#FFFFFF';
  };

  const getPadding = () => {
    switch (size) {
      case 'sm':
        return { paddingVertical: SPACING.xs, paddingHorizontal: SPACING.md };
      case 'lg':
        return { paddingVertical: SPACING.md, paddingHorizontal: SPACING.xl };
      case 'md':
      default:
        return { paddingVertical: SPACING.sm + 4, paddingHorizontal: SPACING.lg };
    }
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: getBackgroundColor() },
        getPadding(),
        variant === 'secondary' && styles.secondaryBorder,
        pressed && !disabled && styles.pressed,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
          {icon ? `${icon}  ` : ''}{title}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  secondaryBorder: {
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
  },
});

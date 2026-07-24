import React, { useEffect } from 'react';
import { StyleSheet, Text, View, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useNotificationStore } from '../../store/useNotificationStore';
import { COLORS, RADIUS, SPACING } from '../../constants/theme';
import { soundEngine } from '../../services/sound/soundService';
import { useThemeStore } from '../../store/useThemeStore';

export const NotificationToast: React.FC = () => {
  const { activeToast, hideToast } = useNotificationStore();
  const { colors } = useThemeStore();
  const translateY = useSharedValue(-120);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (activeToast) {
      soundEngine.playAlertSound();
      translateY.value = withSpring(0, { damping: 15, stiffness: 120 });
      opacity.value = withTiming(1, { duration: 250 });

      const timer = setTimeout(() => {
        translateY.value = withTiming(-120, { duration: 300 });
        opacity.value = withTiming(0, { duration: 300 }, () => {
          hideToast();
        });
      }, 3500);

      return () => clearTimeout(timer);
    } else {
      translateY.value = -120;
      opacity.value = 0;
    }
  }, [activeToast]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  if (!activeToast) return null;

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Pressable
        style={[
          styles.toastCard,
          { backgroundColor: colors.surface, borderColor: colors.gold },
        ]}
        onPress={hideToast}
      >
        <View style={styles.content}>
          <Text style={styles.title}>{activeToast.title}</Text>
          <Text style={[styles.message, { color: colors.textPrimary }]} numberOfLines={2}>
            {activeToast.message}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 9999,
  },
  toastCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderWidth: 2,
    borderColor: COLORS.gold,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  content: {
    width: '100%',
  },
  title: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.gold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 3,
  },
});

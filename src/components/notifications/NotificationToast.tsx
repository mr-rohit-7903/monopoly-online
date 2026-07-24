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

export const NotificationToast: React.FC = () => {
  const { activeToast, hideToast } = useNotificationStore();
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
      <Pressable style={styles.toastCard} onPress={hideToast}>
        {activeToast.icon ? <Text style={styles.icon}>[{activeToast.icon}]</Text> : null}
        <View style={styles.content}>
          <Text style={styles.title}>{activeToast.title}</Text>
          <Text style={styles.message} numberOfLines={2}>
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
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.gold,
    elevation: 8,
    gap: SPACING.md,
  },
  icon: {
    fontSize: 26,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.gold,
    textTransform: 'uppercase',
  },
  message: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    marginTop: 2,
  },
});

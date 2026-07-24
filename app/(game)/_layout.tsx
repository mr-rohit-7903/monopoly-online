import React, { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { View } from 'react-native';
import { useGameStore } from '../../src/store/useGameStore';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useThemeStore } from '../../src/store/useThemeStore';
import { subscribeToTrades } from '../../src/services/firebase/tradeService';
import { TradeProposal } from '../../src/types/trade';
import { IncomingTradeModal } from '../../src/components/trading/IncomingTradeModal';
import { ThemeToggle } from '../../src/components/ui/ThemeToggle';

export default function GameLayout() {
  const { userId } = useAuthStore();
  const { currentGame } = useGameStore();
  const { colors } = useThemeStore();
  const isBanker = currentGame?.bankerId === userId;

  const [pendingTrade, setPendingTrade] = useState<TradeProposal | null>(null);

  // Real-time listener for incoming trade proposals targeting current user
  useEffect(() => {
    if (!currentGame?.id || !userId) return;

    const unsubscribe = subscribeToTrades(currentGame.id, (tradesList) => {
      const incoming = tradesList.find(
        (t) => t.receiverId === userId && t.status === 'pending'
      );
      setPendingTrade(incoming || null);
    });

    return () => unsubscribe();
  }, [currentGame?.id, userId]);

  return (
    <>
      <Tabs
        screenOptions={{
          headerStyle: {
            backgroundColor: colors.surface,
          },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: {
            fontWeight: 'bold',
          },
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.surfaceBorder,
            height: 60,
            paddingBottom: 8,
            paddingTop: 4,
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textMuted,
          headerRight: () => (
            <View style={{ marginRight: 12 }}>
              <ThemeToggle showLabel={false} />
            </View>
          ),
        }}
      >
        <Tabs.Screen
          name="dashboard"
          options={{
            title: 'Bank Dashboard',
            tabBarLabel: 'Dashboard',
            tabBarIcon: ({ color, size }) => <Ionicons name="wallet-outline" size={size} color={color} />,
          }}
        />

        <Tabs.Screen
          name="properties"
          options={{
            title: 'Properties & Upgrades',
            tabBarLabel: 'Properties',
            tabBarIcon: ({ color, size }) => <Ionicons name="home-outline" size={size} color={color} />,
          }}
        />

        <Tabs.Screen
          name="pay"
          options={{
            title: 'Pay & Actions',
            tabBarLabel: 'Pay / Cards',
            tabBarIcon: ({ color, size }) => <Ionicons name="cash-outline" size={size} color={color} />,
          }}
        />

        <Tabs.Screen
          name="activity"
          options={{
            title: 'Transaction History Logs',
            tabBarLabel: 'History Logs',
            tabBarIcon: ({ color, size }) => <Ionicons name="receipt-outline" size={size} color={color} />,
          }}
        />

        <Tabs.Screen
          name="banker"
          options={{
            title: 'Banker Control Panel',
            tabBarLabel: 'Banker',
            href: isBanker ? '/banker' : null,
            tabBarIcon: ({ color, size }) => <Ionicons name="key-outline" size={size} color={color} />,
          }}
        />
      </Tabs>

      {/* Global Incoming Trade Proposal Modal */}
      {currentGame && userId && (
        <IncomingTradeModal
          visible={!!pendingTrade}
          trade={pendingTrade}
          gameId={currentGame.id}
          currentPlayerId={userId}
          onClose={() => setPendingTrade(null)}
        />
      )}
    </>
  );
}

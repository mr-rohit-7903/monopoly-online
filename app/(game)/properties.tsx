import React, { useState } from 'react';
import {
  StyleSheet, Text, View, ScrollView,
  Pressable, Platform, ActivityIndicator, Modal, ImageBackground, Alert,
} from 'react-native';
import { BOARD_PROPERTIES, GROUP_COLORS } from '../../src/constants/boardRegistry';
import { COLORS, RADIUS, SPACING } from '../../src/constants/theme';
import { getTextureForGroup } from '../../src/constants/textures';
import { Button } from '../../src/components/ui/Button';
import { useAuthStore } from '../../src/store/useAuthStore';
import { useGameStore } from '../../src/store/useGameStore';
import { calculatePropertyRent, TRANSPORT_PAIRS } from '../../src/services/engine/rentEngine';
import {
  calculateUnmortgageCost,
  validateBuildHouseOrHotel,
} from '../../src/services/engine/buildingEngine';
import {
  buyPropertyFromBank,
  buildHouseOrHotel,
  sellHouseOrHotel,
  mortgageProperty,
  unmortgageProperty,
} from '../../src/services/firebase/propertyService';
import { payPlayerToPlayer } from '../../src/services/firebase/transactionService';
import { PropertyDeed, PropertyState } from '../../src/types/property';
import { soundEngine } from '../../src/services/sound/soundService';
import { TradeModal } from '../../src/components/trading/TradeModal';

import { useThemeStore } from '../../src/store/useThemeStore';

type ActionType = 'buy' | 'build' | 'sellBuilding' | 'mortgage' | 'unmortgage' | 'payRent';

interface ModalState {
  type: ActionType;
  deed: PropertyDeed;
  pState: PropertyState;
  amount: number;
  title: string;
  subtitle: string;
  icon: string;
  isPayout?: boolean;
}

export default function PropertiesScreen() {
  const { userId } = useAuthStore();
  const { currentGame, players, properties } = useGameStore();
  const { colors } = useThemeStore();

  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [loadingPropId, setLoadingPropId] = useState<string | null>(null);

  // Custom UI Action Modal State
  const [activeModal, setActiveModal] = useState<ModalState | null>(null);
  const [modalLoading, setModalLoading] = useState<boolean>(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // Trade Modal State
  const [tradeModalVisible, setTradeModalVisible] = useState<boolean>(false);
  const [tradePartnerId, setTradePartnerId] = useState<string>('');
  const [tradePropertyId, setTradePropertyId] = useState<string>('');

  const currentPlayer = players.find((p) => p.id === userId) || players[0];

  if (!currentGame || !currentPlayer) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator color={COLORS.primary} size="large" />
        <Text style={styles.loadingText}>Loading property portfolio...</Text>
      </View>
    );
  }

  const groups = [
    { id: 'all', label: 'All' },
    { id: 'Europe A (Brown)', label: 'Europe' },
    { id: 'Asia A (Light Blue)', label: 'Asia' },
    { id: 'Americas B (Yellow)', label: 'Americas' },
    { id: 'Africa & Middle East A (Green)', label: 'Africa/ME' },
    { id: 'Transport', label: 'Transport' },
  ];

  const filteredDeeds = BOARD_PROPERTIES.filter((deed) =>
    selectedGroup === 'all' || deed.group === selectedGroup
  );

  // Open custom modal for an action
  const openActionModal = (
    type: ActionType,
    deed: PropertyDeed,
    pState: PropertyState,
    amount: number,
    rentInfo?: any
  ) => {
    setModalError(null);
    let title = '';
    let subtitle = '';
    let icon = '';
    let isPayout = false;

    if (type === 'buy') {
      title = `Buy ${deed.name}`;
      subtitle = 'Purchase unowned property deed directly from the Bank.';
      icon = '[BUY]';
    } else if (type === 'build') {
      const isHotel = pState.houses === 3;
      title = isHotel ? `Upgrade ${deed.name} to Hotel` : `Build House on ${deed.name}`;
      subtitle = isHotel
        ? 'Replace 3 Houses with a luxury Hotel to maximize rent.'
        : 'Construct a House to increase rent collection for visitors.';
      icon = isHotel ? '[HOTEL]' : '[HOUSE]';
    } else if (type === 'sellBuilding') {
      const isHotel = pState.hotel;
      title = isHotel ? `Sell Hotel on ${deed.name}` : `Sell House on ${deed.name}`;
      subtitle = `Sell building back to Bank for 50% refund (+$${amount.toLocaleString()}).`;
      icon = '[SELL]';
      isPayout = true;
    } else if (type === 'mortgage') {
      title = `Mortgage ${deed.name}`;
      subtitle = 'Receive immediate cash payout from Bank. Property collects $0 rent while mortgaged.';
      icon = '[MORTGAGE]';
      isPayout = true;
    } else if (type === 'unmortgage') {
      title = `Unmortgage ${deed.name}`;
      subtitle = 'Pay mortgage value + 10% interest to reactivate normal rent collection.';
      icon = '[ACTIVE]';
    } else if (type === 'payRent') {
      const owner = players.find((p) => p.id === pState.ownerId);
      title = `Pay Rent on ${deed.name}`;
      subtitle = `Transfer rent payment directly to ${owner?.name || 'Owner'}.`;
      icon = '[RENT]';
    }

    if (!isPayout && currentPlayer.balance < amount) {
      Alert.alert(
        'Insufficient Balance!',
        `You have $${currentPlayer.balance.toLocaleString()} available in your account, but need $${amount.toLocaleString()} for this transaction.`
      );
      return;
    }

    setActiveModal({
      type,
      deed,
      pState,
      amount,
      title,
      subtitle,
      icon,
      isPayout,
    });
  };

  // Execute modal action
  const handleConfirmAction = async () => {
    if (!activeModal) return;
    const { type, deed, pState, amount, isPayout } = activeModal;

    if (!isPayout && currentPlayer.balance < amount) {
      setModalLoading(false);
      Alert.alert(
        'Insufficient Balance!',
        `You have $${currentPlayer.balance.toLocaleString()} available in your account, but need $${amount.toLocaleString()} for this transaction.`
      );
      return;
    }

    setModalLoading(true);
    setModalError(null);
    setLoadingPropId(deed.id);

    try {
      if (type === 'buy') {
        await buyPropertyFromBank(currentGame.id, currentPlayer.id, deed.id);
        soundEngine.playCashSound();
        triggerSuccessToast(`Purchased ${deed.name} for $${amount.toLocaleString()}!`);
      } else if (type === 'build') {
        await buildHouseOrHotel(currentGame.id, currentPlayer.id, deed.id);
        soundEngine.playBuildSound();
        const actionLabel = pState.houses === 3 ? 'Hotel built' : 'House built';
        triggerSuccessToast(`${actionLabel} on ${deed.name}!`);
      } else if (type === 'sellBuilding') {
        await sellHouseOrHotel(currentGame.id, currentPlayer.id, deed.id);
        soundEngine.playCashSound();
        const actionLabel = pState.hotel ? 'Hotel sold' : 'House sold';
        triggerSuccessToast(`${actionLabel} on ${deed.name} for +$${amount.toLocaleString()} refund!`);
      } else if (type === 'mortgage') {
        await mortgageProperty(currentGame.id, currentPlayer.id, deed.id);
        soundEngine.playCashSound();
        triggerSuccessToast(`Mortgaged ${deed.name} for +$${amount.toLocaleString()}!`);
      } else if (type === 'unmortgage') {
        await unmortgageProperty(currentGame.id, currentPlayer.id, deed.id);
        soundEngine.playCashSound();
        triggerSuccessToast(`Unmortgaged ${deed.name}!`);
      } else if (type === 'payRent') {
        const owner = players.find((p) => p.id === pState.ownerId);
        await payPlayerToPlayer({
          gameId: currentGame.id,
          senderId: currentPlayer.id,
          receiverId: pState.ownerId!,
          amount,
          reason: `Rent for ${deed.name}`,
          category: 'p2p',
          propertyId: deed.id,
          propertyName: deed.name,
          icon: 'RENT',
        });
        soundEngine.playCashSound();
        triggerSuccessToast(`Paid $${amount.toLocaleString()} rent to ${owner?.name || 'Owner'}!`);
      }

      setActiveModal(null);
    } catch (err: any) {
      const isInsuff = err?.message?.toLowerCase().includes('insufficient');
      if (isInsuff) {
        Alert.alert('Insufficient Balance!', err?.message || 'You do not have enough funds.');
      }
      setModalError(err?.message || 'Transaction failed. Please try again.');
    } finally {
      setModalLoading(false);
      setLoadingPropId(null);
    }
  };

  const triggerSuccessToast = (msg: string) => {
    setSuccessBanner(msg);
    setTimeout(() => {
      setSuccessBanner(null);
    }, 4000);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Banner Alert for Instant Feedback */}
      {successBanner && (
        <View style={[styles.topSuccessBanner, { backgroundColor: colors.emerald }]}>
          <Text style={styles.topSuccessText}>{successBanner}</Text>
        </View>
      )}

      {/* Group Filter Bar */}
      <View style={[styles.filterBar, { backgroundColor: colors.surface, borderBottomColor: colors.surfaceBorder }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          {groups.map((group) => {
            const isSelected = selectedGroup === group.id;
            return (
              <Pressable
                key={group.id}
                style={[
                  styles.filterChip,
                  { backgroundColor: isSelected ? colors.primary : colors.surfaceLight }
                ]}
                onPress={() => setSelectedGroup(group.id)}
              >
                <Text style={[
                  styles.filterText,
                  { color: isSelected ? '#FFFFFF' : colors.textSecondary }
                ]}>
                  {group.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Property Cards List */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {filteredDeeds.map((deed) => {
          const pState: PropertyState = properties[deed.id] ?? {
            propertyId: deed.id,
            ownerId: '',
            houses: 0,
            hotel: false,
            isMortgaged: false,
            updatedAt: 0,
          };

          const ownerId = pState.ownerId || null;
          const owner = players.find((p) => p.id === ownerId);
          const isMyProperty = !!ownerId && ownerId === currentPlayer.id;
          const isBankOwned = !ownerId;
          const isOwnedByOther = !!ownerId && !isMyProperty;

          const ownerPropertiesList = Object.values(properties).filter(
            (p) => !!p.ownerId && p.ownerId === (isMyProperty ? currentPlayer.id : ownerId)
          );
          const rentInfo = calculatePropertyRent(deed.id, pState, ownerPropertiesList);
          const groupColor = GROUP_COLORS[deed.group] || colors.primary;
          const isLoading = loadingPropId === deed.id;

          const houseCount = Number(pState.houses || 0);
          const hasHotel = Boolean(pState.hotel);
          const hasBuildings = houseCount > 0 || hasHotel;

          // Count owned properties in this group for monopoly check
          const ownedGroupCount = ownerPropertiesList.filter((op) => {
            const bDeed = BOARD_PROPERTIES.find((bd) => bd.id === op.propertyId);
            return bDeed && bDeed.group === deed.group;
          }).length;

          // Validate build capability specific to THIS property
          const buildValidation = isMyProperty && deed.type === 'country' && !pState.isMortgaged && !hasHotel
            ? validateBuildHouseOrHotel(deed.id, ownerPropertiesList)
            : null;

          const textureSource = getTextureForGroup(deed.group);

          return (
            <View
              key={deed.id}
              style={[
                styles.deedCard,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                isMyProperty && { borderColor: colors.emerald, borderWidth: 2 },
                isOwnedByOther && pState.isMortgaged && styles.mortgagedCard,
              ]}
            >
              {/* Texture covers the ENTIRE card */}
              <ImageBackground
                source={textureSource}
                style={styles.deedCardBg}
                imageStyle={{ opacity: 0.23 }}
              >
                {/* Double Ticket Frame */}
                <View style={[styles.ticketFrame, { borderColor: groupColor }]}>
                  
                  {/* Corner Ornate Symbols */}
                  <Text style={[styles.cornerSymbol, styles.tlSymbol, { color: groupColor }]}>❖</Text>
                  <Text style={[styles.cornerSymbol, styles.trSymbol, { color: groupColor }]}>❖</Text>
                  <Text style={[styles.cornerSymbol, styles.blSymbol, { color: groupColor }]}>❖</Text>
                  <Text style={[styles.cornerSymbol, styles.brSymbol, { color: groupColor }]}>❖</Text>

                  {/* Group Banner Header */}
                  <View style={[styles.groupBanner, { backgroundColor: groupColor }]}>
                    <Text style={styles.groupBannerText}>{deed.group.toUpperCase()}</Text>
                    {owner ? (
                      <View style={styles.bannerBadgeGroup}>
                        {hasHotel ? (
                          <View style={[styles.buildingBadge, { backgroundColor: 'rgba(234, 179, 8, 0.3)', borderColor: colors.gold }]}>
                            <Text style={[styles.buildingBadgeText, { color: colors.gold }]}>HOTEL</Text>
                          </View>
                        ) : houseCount > 0 ? (
                          <View style={[styles.buildingBadge, { backgroundColor: 'rgba(16, 185, 129, 0.3)', borderColor: colors.emerald }]}>
                            <Text style={[styles.buildingBadgeText, { color: colors.emerald }]}>{houseCount} HOUSE{houseCount > 1 ? 'S' : ''}</Text>
                          </View>
                        ) : null}

                        <View style={[styles.bannerOwnerBadge, { backgroundColor: isMyProperty ? 'rgba(16, 185, 129, 0.3)' : 'rgba(0, 0, 0, 0.4)' }]}>
                          <Text style={styles.bannerOwnerText}>{isMyProperty ? 'YOU OWN THIS' : `OWNER: ${owner.name.toUpperCase()}`}</Text>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.bannerForSaleBadge}>
                        <Text style={styles.bannerForSaleText}>FOR SALE</Text>
                      </View>
                    )}
                  </View>

                  {/* Ticket Header Row: Title on Left, Price on Right */}
                  <View style={styles.ticketHeaderRow}>
                    <View style={styles.ticketTitleCol}>
                      <Text style={[styles.ticketTitle, { color: colors.textPrimary }]}>{deed.name.toUpperCase()}</Text>
                      <View style={styles.decUnderlineRow}>
                        <View style={[styles.decLine, { backgroundColor: colors.surfaceBorder }]} />
                        <Text style={[styles.decDiamond, { color: groupColor }]}>◆</Text>
                        <View style={[styles.decLine, { backgroundColor: colors.surfaceBorder }]} />
                      </View>
                    </View>

                    <View style={styles.ticketPriceCol}>
                      <View style={[styles.flourishLine, { backgroundColor: colors.surfaceBorder }]} />
                      <Text style={[styles.ticketPriceText, { color: colors.gold }]}>
                        ${deed.purchasePrice.toLocaleString()}
                      </Text>
                      <View style={[styles.flourishLine, { backgroundColor: colors.surfaceBorder }]} />
                    </View>
                  </View>

                  {/* Rent Table with Dotted Leaders */}
                  <View style={styles.rentTable}>
                    {deed.type === 'country' ? (
                      <>
                        {/* Base Rent */}
                        <View style={styles.rentLeaderRow}>
                          <Text style={[styles.rentLabel, { color: (!hasBuildings && !pState.isMortgaged) ? colors.textPrimary : colors.textSecondary }]}>
                            RENT
                          </Text>
                          <Text style={[styles.dottedLeader, { color: colors.surfaceBorder }]} numberOfLines={1}>
                            ...................................................................................................................
                          </Text>
                          <Text style={[styles.rentValueText, { color: colors.textPrimary }]}>
                            ${deed.rentBase?.toLocaleString()}
                          </Text>
                        </View>

                        {/* 1 House */}
                        {deed.rent1House ? (
                          <View style={styles.rentLeaderRow}>
                            <Text style={[styles.rentLabel, houseCount === 1 ? { color: colors.emerald, fontWeight: '900' } : { color: colors.textSecondary }]}>
                              RENT WITH 1 HOUSE
                            </Text>
                            <Text style={[styles.dottedLeader, { color: colors.surfaceBorder }]} numberOfLines={1}>
                              ...................................................................................................................
                            </Text>
                            <Text style={[styles.rentValueText, houseCount === 1 ? { color: colors.emerald, fontWeight: '900' } : { color: colors.textPrimary }]}>
                              ${deed.rent1House.toLocaleString()}
                            </Text>
                          </View>
                        ) : null}

                        {/* 2 Houses */}
                        {deed.rent2Houses ? (
                          <View style={styles.rentLeaderRow}>
                            <Text style={[styles.rentLabel, houseCount === 2 ? { color: colors.emerald, fontWeight: '900' } : { color: colors.textSecondary }]}>
                              RENT WITH 2 HOUSES
                            </Text>
                            <Text style={[styles.dottedLeader, { color: colors.surfaceBorder }]} numberOfLines={1}>
                              ...................................................................................................................
                            </Text>
                            <Text style={[styles.rentValueText, houseCount === 2 ? { color: colors.emerald, fontWeight: '900' } : { color: colors.textPrimary }]}>
                              ${deed.rent2Houses.toLocaleString()}
                            </Text>
                          </View>
                        ) : null}

                        {/* 3 Houses */}
                        {deed.rent3Houses ? (
                          <View style={styles.rentLeaderRow}>
                            <Text style={[styles.rentLabel, houseCount === 3 ? { color: colors.emerald, fontWeight: '900' } : { color: colors.textSecondary }]}>
                              RENT WITH 3 HOUSES
                            </Text>
                            <Text style={[styles.dottedLeader, { color: colors.surfaceBorder }]} numberOfLines={1}>
                              ...................................................................................................................
                            </Text>
                            <Text style={[styles.rentValueText, houseCount === 3 ? { color: colors.emerald, fontWeight: '900' } : { color: colors.textPrimary }]}>
                              ${deed.rent3Houses.toLocaleString()}
                            </Text>
                          </View>
                        ) : null}

                        {/* Hotel */}
                        {deed.rentHotel ? (
                          <View style={styles.rentLeaderRow}>
                            <Text style={[styles.rentLabel, hasHotel ? { color: colors.emerald, fontWeight: '900' } : { color: colors.textSecondary }]}>
                              RENT WITH HOTEL
                            </Text>
                            <Text style={[styles.dottedLeader, { color: colors.surfaceBorder }]} numberOfLines={1}>
                              ...................................................................................................................
                            </Text>
                            <Text style={[styles.rentValueText, hasHotel ? { color: colors.emerald, fontWeight: '900' } : { color: colors.textPrimary }]}>
                              ${deed.rentHotel.toLocaleString()}
                            </Text>
                          </View>
                        ) : null}
                      </>
                    ) : (
                      /* Transport Deed */
                      <>
                        {(() => {
                          const pairedId = TRANSPORT_PAIRS[deed.id];
                          const pairedDeed = BOARD_PROPERTIES.find((b) => b.id === pairedId);
                          const pairRent = deed.rent2Owned || deed.rentBothOwned || (deed.rentBase * 2);
                          const ownsPair = pairedId ? ownerPropertiesList.some((op) => op.propertyId === pairedId && !op.isMortgaged) : false;

                          return (
                            <>
                              <View style={styles.rentLeaderRow}>
                                <Text style={[styles.rentLabel, { color: !ownsPair ? colors.textPrimary : colors.textSecondary }]}>BASE RENT</Text>
                                <Text style={[styles.dottedLeader, { color: colors.surfaceBorder }]} numberOfLines={1}>
                                  ...................................................................................................................
                                </Text>
                                <Text style={[styles.rentValueText, { color: !ownsPair ? colors.textPrimary : colors.textSecondary }]}>
                                  ${deed.rentBase?.toLocaleString()}
                                </Text>
                              </View>
                              {pairedDeed ? (
                                <View style={styles.rentLeaderRow}>
                                  <Text style={[styles.rentLabel, ownsPair ? { color: colors.emerald, fontWeight: '900' } : { color: colors.textSecondary }]}>
                                    RENT WITH {pairedDeed.name.toUpperCase()}
                                  </Text>
                                  <Text style={[styles.dottedLeader, { color: colors.surfaceBorder }]} numberOfLines={1}>
                                    ...................................................................................................................
                                  </Text>
                                  <Text style={[styles.rentValueText, ownsPair ? { color: colors.emerald, fontWeight: '900' } : { color: colors.textPrimary }]}>
                                    ${pairRent.toLocaleString()}
                                  </Text>
                                </View>
                              ) : null}
                            </>
                          );
                        })()}
                      </>
                    )}
                  </View>

                  {/* Active Rent Breakdown / Monopoly Bonus Notice */}
                  {rentInfo.breakdown ? (
                    <Text style={[styles.breakdownText, rentInfo.hasMonopolyBonus && styles.monopolyText]}>
                      {rentInfo.breakdown.replace(/⭐/g, '[DOUBLED]')}
                    </Text>
                  ) : null}

                  {/* Center Line Divider */}
                  <View style={styles.decUnderlineRow}>
                    <View style={[styles.decLine, { backgroundColor: colors.surfaceBorder }]} />
                    <Text style={[styles.decDiamond, { color: groupColor }]}>◆</Text>
                    <View style={[styles.decLine, { backgroundColor: colors.surfaceBorder }]} />
                  </View>

                  {/* Mortgage & House Value Footer */}
                  <View style={styles.mortgageFooterRow}>
                    <Text style={[styles.mortgageFooterText, { color: colors.textSecondary }]}>
                      MORTGAGE VALUE = ${deed.mortgageValue.toLocaleString()}
                    </Text>
                    {deed.housePrice ? (
                      <Text style={[styles.mortgageFooterText, { color: colors.textSecondary }]}>
                        HOUSE COST = ${deed.housePrice.toLocaleString()}
                      </Text>
                    ) : null}
                  </View>

                  {/* Interactive Action Buttons Bar */}
                  <View style={styles.actionsRow}>

                {/* Case 1: Bank-owned → buy */}
                {isBankOwned && (
                  <Button
                    title={`Buy ($${deed.purchasePrice.toLocaleString()})`}
                    variant="emerald"
                    size="sm"
                    loading={isLoading}
                    onPress={() => openActionModal('buy', deed, pState, deed.purchasePrice)}
                  />
                )}

                {/* Case 2: You own it → manage it */}
                {isMyProperty && (
                  <>
                    {/* Build House / Hotel Button */}
                    {deed.type === 'country' && !pState.isMortgaged && !hasHotel && (
                      !buildValidation?.canBuild ? (
                        <View style={styles.buildLocked}>
                          <Text style={styles.buildLockedText}>
                            [LOCKED] {buildValidation?.reason || 'Cannot build on this property'}
                          </Text>
                        </View>
                      ) : (
                        <Button
                          title={houseCount === 3 ? 'Upgrade to Hotel' : `Build House ($${deed.housePrice?.toLocaleString()})`}
                          variant="gold"
                          size="sm"
                          loading={isLoading}
                          onPress={() => openActionModal('build', deed, pState, deed.housePrice || 0)}
                        />
                      )
                    )}

                    {/* Sell House / Hotel button (50% refund back to player) */}
                    {deed.type === 'country' && !pState.isMortgaged && hasBuildings && (
                      <Button
                        title={`Sell ${hasHotel ? 'Hotel' : 'House'} (+$${Math.floor((deed.housePrice || 0) * 0.5).toLocaleString()})`}
                        variant="emerald"
                        size="sm"
                        loading={isLoading}
                        onPress={() =>
                          openActionModal(
                            'sellBuilding',
                            deed,
                            pState,
                            Math.floor((deed.housePrice || 0) * 0.5)
                          )
                        }
                      />
                    )}

                    {/* Mortgage button: SUSPENDED if property has houses/hotels */}
                    {pState.isMortgaged ? (
                      <Button
                        title={`Unmortgage ($${calculateUnmortgageCost(deed).toLocaleString()})`}
                        variant="primary"
                        size="sm"
                        loading={isLoading}
                        onPress={() =>
                          openActionModal('unmortgage', deed, pState, calculateUnmortgageCost(deed))
                        }
                      />
                    ) : hasBuildings ? (
                      <View style={styles.mortgageSuspendedBox}>
                        <Text style={styles.mortgageSuspendedText}>
                          Mortgage Suspended (Sell {hasHotel ? 'Hotel' : 'houses'} first)
                        </Text>
                      </View>
                    ) : (
                      <Button
                        title="Mortgage"
                        variant="danger"
                        size="sm"
                        loading={isLoading}
                        onPress={() => openActionModal('mortgage', deed, pState, deed.mortgageValue)}
                      />
                    )}
                  </>
                )}

                {/* Case 3: Another player owns it → Pay Rent or Offer Trade */}
                {isOwnedByOther && !pState.isMortgaged && (
                  <>
                    <Button
                      title={`Pay Rent ($${rentInfo.finalRent.toLocaleString()})`}
                      variant="danger"
                      size="sm"
                      loading={isLoading}
                      onPress={() => openActionModal('payRent', deed, pState, rentInfo.finalRent, rentInfo)}
                    />
                    {!hasBuildings && (
                      <Button
                        title="Offer Trade"
                        variant="secondary"
                        size="sm"
                        loading={isLoading}
                        onPress={() => {
                          setTradePartnerId(pState.ownerId || '');
                          setTradePropertyId(deed.id);
                          setTradeModalVisible(true);
                        }}
                      />
                    )}
                  </>
                )}

                {/* Case 4: Another player owns it, but it's mortgaged */}
                {isOwnedByOther && pState.isMortgaged && (
                  <View style={styles.mortgagedNotice}>
                    <Text style={styles.mortgagedNoticeText}>Mortgaged — No Rent Due</Text>
                  </View>
                )}
              </View>
            </View>
          </ImageBackground>
        </View>
          );
        })}
      </ScrollView>

      {/* ─── CUSTOM ACTION CONFIRMATION MODAL ─── */}
      {activeModal && (
        <Modal
          animationType="fade"
          transparent
          visible={!!activeModal}
          onRequestClose={() => {
            if (!modalLoading) setActiveModal(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>

              {/* Modal Header */}
              <View style={[
                styles.modalHeaderStrip,
                { backgroundColor: GROUP_COLORS[activeModal.deed.group] || COLORS.primary }
              ]}>
                <Text style={styles.modalHeaderEmoji}>{activeModal.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalHeaderTag}>{activeModal.deed.group}</Text>
                  <Text style={styles.modalHeaderTitle}>{activeModal.title}</Text>
                </View>
              </View>

              <ScrollView style={styles.modalBody} contentContainerStyle={{ padding: SPACING.md }}>
                <Text style={styles.modalSubtitle}>{activeModal.subtitle}</Text>

                {/* Financial Summary Box */}
                <View style={styles.modalSummaryBox}>
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Transaction Amount</Text>
                    <Text style={[
                      styles.summaryValue,
                      activeModal.isPayout ? styles.payoutValue : styles.costValue
                    ]}>
                      {activeModal.isPayout ? '+' : '-'}${activeModal.amount.toLocaleString()}
                    </Text>
                  </View>

                  <View style={styles.summaryDivider} />

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Your Current Cash</Text>
                    <Text style={styles.summaryNum}>${currentPlayer.balance.toLocaleString()}</Text>
                  </View>

                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Cash After Transaction</Text>
                    <Text style={[
                      styles.summaryNumBold,
                      !activeModal.isPayout && currentPlayer.balance < activeModal.amount && styles.errorText
                    ]}>
                      ${(
                        activeModal.isPayout
                          ? currentPlayer.balance + activeModal.amount
                          : currentPlayer.balance - activeModal.amount
                      ).toLocaleString()}
                    </Text>
                  </View>
                </View>

                {/* Error / Warning Banner inside Modal */}
                {modalError && (
                  <View style={styles.modalErrorBox}>
                    <Text style={styles.modalErrorText}>[WARNING] {modalError}</Text>
                  </View>
                )}

                {/* Insufficient balance warning */}
                {!activeModal.isPayout && currentPlayer.balance < activeModal.amount && (
                  <View style={styles.modalErrorBox}>
                    <Text style={styles.modalErrorText}>
                      [WARNING] Insufficient Funds! You need $${activeModal.amount.toLocaleString()} but only have $${currentPlayer.balance.toLocaleString()}.
                    </Text>
                  </View>
                )}
              </ScrollView>

              {/* Modal Buttons */}
              <View style={styles.modalFooter}>
                <Pressable
                  style={styles.modalCancelBtn}
                  disabled={modalLoading}
                  onPress={() => setActiveModal(null)}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </Pressable>

                <Button
                  title={activeModal.isPayout ? 'Confirm Payout' : 'Confirm Payment'}
                  variant={activeModal.type === 'payRent' ? 'danger' : 'emerald'}
                  size="md"
                  loading={modalLoading}
                  disabled={!activeModal.isPayout && currentPlayer.balance < activeModal.amount}
                  onPress={handleConfirmAction}
                />
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Trade Modal */}
      <TradeModal
        visible={tradeModalVisible}
        onClose={() => {
          setTradeModalVisible(false);
          setTradePartnerId('');
          setTradePropertyId('');
        }}
        gameId={currentGame.id}
        currentPlayer={currentPlayer}
        players={players}
        properties={properties}
        preselectedPartnerId={tradePartnerId}
        preselectedPropertyId={tradePropertyId}
      />
    </View>
  );
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
    gap: 16,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  topSuccessBanner: {
    backgroundColor: COLORS.emerald,
    paddingVertical: 10,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topSuccessText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  filterBar: {
    backgroundColor: COLORS.surface,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
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
    backgroundColor: COLORS.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  filterTextSelected: {
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: SPACING.md,
    gap: SPACING.md,
  },
  deedCard: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: 0,
    overflow: 'hidden',
    borderLeftWidth: 5,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  myPropertyCard: {
    borderColor: COLORS.emerald,
    borderWidth: 1,
  },
  mortgagedCard: {
    opacity: 0.75,
  },
  deedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  titleCol: {
    flex: 1,
  },
  groupPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 4,
  },
  groupPillText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  deedName: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  deedCardBg: {
    flex: 1,
    padding: SPACING.xs,
  },
  ticketFrame: {
    borderWidth: 2,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 2,
    position: 'relative',
  },
  cornerSymbol: {
    position: 'absolute',
    fontSize: 12,
    lineHeight: 12,
    zIndex: 2,
  },
  tlSymbol: { top: 4, left: 5 },
  trSymbol: { top: 4, right: 5 },
  blSymbol: { bottom: 4, left: 5 },
  brSymbol: { bottom: 4, right: 5 },

  groupBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: 4,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.xs + 2,
  },
  groupBannerText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  bannerBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  buildingBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  buildingBadgeText: {
    fontSize: 9,
    fontWeight: '900',
  },
  bannerOwnerBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  bannerOwnerText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  bannerForSaleBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: RADIUS.full,
  },
  bannerForSaleText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  ticketHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs + 2,
  },
  ticketTitleCol: {
    flex: 1,
    paddingRight: SPACING.sm,
  },
  ticketTitle: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  decUnderlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 3,
  },
  decLine: {
    flex: 1,
    height: 1,
  },
  decDiamond: {
    fontSize: 8,
    marginHorizontal: 4,
  },
  ticketPriceCol: {
    alignItems: 'center',
    minWidth: 80,
  },
  flourishLine: {
    width: '100%',
    height: 1,
  },
  ticketPriceText: {
    fontSize: 22,
    fontWeight: '900',
    marginVertical: 1,
  },

  rentTable: {
    marginVertical: SPACING.xs,
    gap: 3,
  },
  rentLeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    width: '100%',
  },
  rentLabel: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  dottedLeader: {
    flex: 1,
    fontSize: 10,
    marginHorizontal: 4,
    letterSpacing: 1,
  },
  rentValueText: {
    fontSize: 12,
    fontWeight: '800',
  },

  mortgageFooterRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.md,
    marginVertical: SPACING.xs + 2,
    paddingTop: 2,
  },
  mortgageFooterText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginVertical: SPACING.xs,
    flexWrap: 'wrap',
  },
  infoLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '700',
    marginRight: 8,
  },
  rentValue: {
    color: COLORS.emerald,
    fontSize: 13,
  },
  breakdownText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontStyle: 'italic',
    marginBottom: SPACING.xs,
  },
  monopolyText: {
    color: COLORS.gold,
    fontStyle: 'normal',
    fontWeight: '700',
  },
  buildingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: SPACING.xs,
  },
  buildingLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  buildingIcons: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.gold,
  },
  buildingHint: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: SPACING.xs,
  },
  mortgagedTag: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.crimson,
  },
  noBuildings: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  actionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.sm,
  },
  mortgagedNotice: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.crimson + '22',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.crimson + '55',
  },
  mortgagedNoticeText: {
    fontSize: 12,
    color: COLORS.crimson,
    fontWeight: '700',
  },
  buildLocked: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
    backgroundColor: COLORS.surfaceLight,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderStyle: 'dashed',
  },
  buildLockedText: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '600',
  },
  mortgageSuspendedBox: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs + 2,
    backgroundColor: COLORS.crimson + '22',
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.crimson + '66',
  },
  mortgageSuspendedText: {
    fontSize: 11,
    color: COLORS.crimson,
    fontWeight: '800',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.md,
  },
  modalContent: {
    width: '100%',
    maxWidth: 440,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  },
  modalHeaderStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  modalHeaderEmoji: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  modalHeaderTag: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    opacity: 0.9,
  },
  modalHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  modalBody: {
    maxHeight: 320,
  },
  modalSubtitle: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: SPACING.md,
    lineHeight: 18,
  },
  modalSummaryBox: {
    backgroundColor: COLORS.background,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    gap: SPACING.xs,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  costValue: {
    color: COLORS.crimson,
  },
  payoutValue: {
    color: COLORS.emerald,
  },
  summaryNum: {
    fontSize: 14,
    color: COLORS.textPrimary,
    fontWeight: '600',
  },
  summaryNumBold: {
    fontSize: 15,
    color: COLORS.emerald,
    fontWeight: '800',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.surfaceBorder,
    marginVertical: SPACING.xs,
  },
  errorText: {
    color: COLORS.crimson,
  },
  modalErrorBox: {
    marginTop: SPACING.md,
    backgroundColor: COLORS.crimson + '22',
    borderColor: COLORS.crimson + '66',
    borderWidth: 1,
    padding: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  modalErrorText: {
    color: COLORS.crimson,
    fontSize: 12,
    fontWeight: '600',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: SPACING.md,
    gap: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
    backgroundColor: COLORS.surface,
  },
  modalCancelBtn: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  modalCancelText: {
    color: COLORS.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});

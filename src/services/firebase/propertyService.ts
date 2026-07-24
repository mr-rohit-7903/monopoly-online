import {
  ref,
  get,
  update,
  push,
} from 'firebase/database';
import { db } from './config';
import { BOARD_PROPERTIES } from '../../constants/boardRegistry';
import { Player } from '../../types/game';
import { PropertyState } from '../../types/property';
import { Transaction } from '../../types/transaction';
import { AppNotification } from '../../types/notification';
import {
  validateBuildHouseOrHotel,
  validateSellHouseOrHotel,
  calculateUnmortgageCost,
} from '../engine/buildingEngine';

function removeUndefined<T extends Record<string, any>>(obj: T): T {
  const clean: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      clean[key] = obj[key];
    }
  });
  return clean as T;
}

export async function buyPropertyFromBank(
  gameId: string,
  playerId: string,
  propertyId: string
): Promise<void> {
  const deed = BOARD_PROPERTIES.find((p) => p.id === propertyId);
  if (!deed) throw new Error('Property not found in board registry.');

  const playerSnap = await get(ref(db, `games/${gameId}/players/${playerId}`));
  if (!playerSnap.exists()) {
    throw new Error('Player profile not found in current game.');
  }

  const player = playerSnap.val() as Player;

  const propSnap = await get(ref(db, `games/${gameId}/properties/${propertyId}`));
  const propState: PropertyState = propSnap.exists()
    ? (propSnap.val() as PropertyState)
    : {
        propertyId,
        ownerId: '',
        houses: 0,
        hotel: false,
        isMortgaged: false,
        updatedAt: Date.now(),
      };

  // ownerId is '' (empty string) or null when bank-owned — Firebase strips null on write
  if (propState.ownerId && propState.ownerId !== '') {
    throw new Error(`Property "${deed.name}" is already owned by another player.`);
  }

  if (player.balance < deed.purchasePrice) {
    throw new Error(`Insufficient funds. You have $${player.balance.toLocaleString()} but need $${deed.purchasePrice.toLocaleString()}.`);
  }

  const updates: Record<string, any> = {};
  updates[`players/${playerId}/balance`] = player.balance - deed.purchasePrice;
  updates[`properties/${propertyId}`] = {
    propertyId,
    ownerId: playerId, // non-empty string — Firebase will store this
    houses: 0,
    hotel: false,
    isMortgaged: false,
    updatedAt: Date.now(),
  };

  const txRef = push(ref(db, `games/${gameId}/transactions`));
  const txId = txRef.key || 'tx_' + Date.now();
  const txData = removeUndefined({
    id: txId,
    gameId,
    senderId: playerId,
    senderName: player.name,
    receiverId: 'BANK',
    receiverName: 'Bank',
    amount: deed.purchasePrice,
    category: 'property_buy',
    reason: `Purchased ${deed.name}`,
    propertyId,
    propertyName: deed.name,
    timestamp: Date.now(),
  });
  updates[`transactions/${txId}`] = txData;

  const notifRef = push(ref(db, `games/${gameId}/notifications`));
  const notifId = notifRef.key || 'notif_' + Date.now();
  const notifData = removeUndefined({
    id: notifId,
    gameId,
    type: 'property',
    icon: '🏠',
    title: 'Property Purchased',
    message: `🏠 ${player.name} purchased ${deed.name} for $${deed.purchasePrice.toLocaleString()}`,
    senderId: playerId,
    senderName: player.name,
    receiverId: 'BANK',
    receiverName: 'Bank',
    amount: deed.purchasePrice,
    reason: `Purchased ${deed.name}`,
    timestamp: Date.now(),
  });
  updates[`notifications/${notifId}`] = notifData;

  await update(ref(db, `games/${gameId}`), updates);
}

export async function buildHouseOrHotel(
  gameId: string,
  playerId: string,
  propertyId: string
): Promise<void> {
  const deed = BOARD_PROPERTIES.find((p) => p.id === propertyId);
  if (!deed) throw new Error('Property not found in registry.');

  const propsSnap = await get(ref(db, `games/${gameId}/properties`));
  const ownerProps: PropertyState[] = [];
  if (propsSnap.exists()) {
    const propsMap = propsSnap.val();
    Object.values(propsMap).forEach((pObj: any) => {
      const p = pObj as PropertyState;
      if (p.ownerId === playerId) {
        ownerProps.push(p);
      }
    });
  }

  const validation = validateBuildHouseOrHotel(propertyId, ownerProps);
  if (!validation.canBuild || !validation.cost) {
    throw new Error(validation.reason || 'Cannot build on this property.');
  }

  const cost = validation.cost;

  const playerSnap = await get(ref(db, `games/${gameId}/players/${playerId}`));
  const propSnap = await get(ref(db, `games/${gameId}/properties/${propertyId}`));

  if (!playerSnap.exists() || !propSnap.exists()) {
    throw new Error('Player or Property document not found.');
  }

  const player = playerSnap.val() as Player;
  const propState = propSnap.val() as PropertyState;

  if (player.balance < cost) {
    throw new Error(`Insufficient funds. Need $${cost.toLocaleString()} to build.`);
  }

  const isHotelUpgrade = propState.houses === 3;
  const newHouses = isHotelUpgrade ? 0 : propState.houses + 1;
  const newHotel = isHotelUpgrade ? true : propState.hotel;

  const updates: Record<string, any> = {};
  updates[`players/${playerId}/balance`] = player.balance - cost;
  updates[`properties/${propertyId}/houses`] = newHouses;
  updates[`properties/${propertyId}/hotel`] = newHotel;
  updates[`properties/${propertyId}/updatedAt`] = Date.now();

  const actionText = isHotelUpgrade ? `upgraded ${deed.name} to Hotel` : `built House on ${deed.name}`;

  const txRef = push(ref(db, `games/${gameId}/transactions`));
  const txId = txRef.key || 'tx_' + Date.now();
  const txData = removeUndefined({
    id: txId,
    gameId,
    senderId: playerId,
    senderName: player.name,
    receiverId: 'BANK',
    receiverName: 'Bank',
    amount: cost,
    category: isHotelUpgrade ? 'hotel_build' : 'house_build',
    reason: actionText,
    propertyId,
    propertyName: deed.name,
    timestamp: Date.now(),
  });
  updates[`transactions/${txId}`] = txData;

  const notifRef = push(ref(db, `games/${gameId}/notifications`));
  const notifId = notifRef.key || 'notif_' + Date.now();
  const notifData = removeUndefined({
    id: notifId,
    gameId,
    type: 'property',
    icon: isHotelUpgrade ? '🏨' : '🏡',
    title: isHotelUpgrade ? 'Hotel Built' : 'House Built',
    message: `${isHotelUpgrade ? '🏨' : '🏡'} ${player.name} ${actionText} for $${cost.toLocaleString()}`,
    senderId: playerId,
    senderName: player.name,
    amount: cost,
    reason: actionText,
    timestamp: Date.now(),
  });
  updates[`notifications/${notifId}`] = notifData;

  await update(ref(db, `games/${gameId}`), updates);
}

export async function mortgageProperty(
  gameId: string,
  playerId: string,
  propertyId: string
): Promise<void> {
  const deed = BOARD_PROPERTIES.find((p) => p.id === propertyId);
  if (!deed) throw new Error('Property not found.');

  const playerSnap = await get(ref(db, `games/${gameId}/players/${playerId}`));
  const propSnap = await get(ref(db, `games/${gameId}/properties/${propertyId}`));

  if (!playerSnap.exists() || !propSnap.exists()) throw new Error('Property document not found.');

  const player = playerSnap.val() as Player;
  const propState = propSnap.val() as PropertyState;

  if (propState.ownerId !== playerId) throw new Error('You do not own this property.');
  if (propState.isMortgaged) throw new Error('Property is already mortgaged.');
  if (propState.houses > 0 || propState.hotel) {
    throw new Error('Must sell all houses and hotels in the group before mortgaging.');
  }

  const updates: Record<string, any> = {};
  updates[`players/${playerId}/balance`] = player.balance + deed.mortgageValue;
  updates[`properties/${propertyId}/isMortgaged`] = true;
  updates[`properties/${propertyId}/updatedAt`] = Date.now();

  const txRef = push(ref(db, `games/${gameId}/transactions`));
  const txId = txRef.key || 'tx_' + Date.now();
  const txData = removeUndefined({
    id: txId,
    gameId,
    senderId: 'BANK',
    senderName: 'Bank',
    receiverId: playerId,
    receiverName: player.name,
    amount: deed.mortgageValue,
    category: 'mortgage',
    reason: `Mortgaged ${deed.name}`,
    propertyId,
    propertyName: deed.name,
    timestamp: Date.now(),
  });
  updates[`transactions/${txId}`] = txData;

  const notifRef = push(ref(db, `games/${gameId}/notifications`));
  const notifId = notifRef.key || 'notif_' + Date.now();
  const notifData = removeUndefined({
    id: notifId,
    gameId,
    type: 'mortgage',
    icon: '🏦',
    title: 'Property Mortgaged',
    message: `🏦 ${player.name} mortgaged ${deed.name} for $${deed.mortgageValue.toLocaleString()}`,
    senderId: playerId,
    senderName: player.name,
    amount: deed.mortgageValue,
    reason: `Mortgaged ${deed.name}`,
    timestamp: Date.now(),
  });
  updates[`notifications/${notifId}`] = notifData;

  await update(ref(db, `games/${gameId}`), updates);
}

export async function unmortgageProperty(
  gameId: string,
  playerId: string,
  propertyId: string
): Promise<void> {
  const deed = BOARD_PROPERTIES.find((p) => p.id === propertyId);
  if (!deed) throw new Error('Property not found.');

  const cost = calculateUnmortgageCost(deed);

  const playerSnap = await get(ref(db, `games/${gameId}/players/${playerId}`));
  const propSnap = await get(ref(db, `games/${gameId}/properties/${propertyId}`));

  if (!playerSnap.exists() || !propSnap.exists()) throw new Error('Property document not found.');

  const player = playerSnap.val() as Player;
  const propState = propSnap.val() as PropertyState;

  if (propState.ownerId !== playerId) throw new Error('You do not own this property.');
  if (!propState.isMortgaged) throw new Error('Property is not mortgaged.');

  if (player.balance < cost) {
    throw new Error(`Insufficient funds. Need $${cost.toLocaleString()} (Mortgage + 10% Interest) to unmortgage.`);
  }

  const updates: Record<string, any> = {};
  updates[`players/${playerId}/balance`] = player.balance - cost;
  updates[`properties/${propertyId}/isMortgaged`] = false;
  updates[`properties/${propertyId}/updatedAt`] = Date.now();

  const txRef = push(ref(db, `games/${gameId}/transactions`));
  const txId = txRef.key || 'tx_' + Date.now();
  const txData = removeUndefined({
    id: txId,
    gameId,
    senderId: playerId,
    senderName: player.name,
    receiverId: 'BANK',
    receiverName: 'Bank',
    amount: cost,
    category: 'unmortgage',
    reason: `Unmortgaged ${deed.name} (+10% interest)`,
    propertyId,
    propertyName: deed.name,
    timestamp: Date.now(),
  });
  updates[`transactions/${txId}`] = txData;

  const notifRef = push(ref(db, `games/${gameId}/notifications`));
  const notifId = notifRef.key || 'notif_' + Date.now();
  const notifData = removeUndefined({
    id: notifId,
    gameId,
    type: 'mortgage',
    icon: '🟢',
    title: 'Property Unmortgaged',
    message: `🟢 ${player.name} unmortgaged ${deed.name} for $${cost.toLocaleString()}`,
    senderId: playerId,
    senderName: player.name,
    amount: cost,
    reason: `Unmortgaged ${deed.name}`,
    timestamp: Date.now(),
  });
  updates[`notifications/${notifId}`] = notifData;

  await update(ref(db, `games/${gameId}`), updates);
}

export async function sellHouseOrHotel(
  gameId: string,
  playerId: string,
  propertyId: string
): Promise<void> {
  const deed = BOARD_PROPERTIES.find((p) => p.id === propertyId);
  if (!deed || deed.type !== 'country') throw new Error('Property not found in registry.');

  const playerSnap = await get(ref(db, `games/${gameId}/players/${playerId}`));
  const propSnap = await get(ref(db, `games/${gameId}/properties/${propertyId}`));

  if (!playerSnap.exists() || !propSnap.exists()) {
    throw new Error('Player or Property document not found.');
  }

  const player = playerSnap.val() as Player;
  const propState = propSnap.val() as PropertyState;

  if (propState.ownerId !== playerId) {
    throw new Error('You do not own this property.');
  }

  if (propState.houses === 0 && !propState.hotel) {
    throw new Error('No houses or hotels on this property to sell.');
  }

  const housePrice = deed.housePrice || 0;
  const refundAmount = Math.floor(housePrice * 0.5); // 50% refund

  const isHotelDowngrade = propState.hotel;
  const newHouses = isHotelDowngrade ? 3 : propState.houses - 1;
  const newHotel = false;

  const updates: Record<string, any> = {};
  updates[`players/${playerId}/balance`] = player.balance + refundAmount;
  updates[`properties/${propertyId}/houses`] = newHouses;
  updates[`properties/${propertyId}/hotel`] = newHotel;
  updates[`properties/${propertyId}/updatedAt`] = Date.now();

  const actionText = isHotelDowngrade
    ? `sold Hotel on ${deed.name} (50% refund)`
    : `sold House on ${deed.name} (50% refund)`;

  const txRef = push(ref(db, `games/${gameId}/transactions`));
  const txId = txRef.key || 'tx_' + Date.now();
  const txData = removeUndefined({
    id: txId,
    gameId,
    senderId: 'BANK',
    senderName: 'Bank',
    receiverId: playerId,
    receiverName: player.name,
    amount: refundAmount,
    category: isHotelDowngrade ? 'hotel_sell' : 'house_sell',
    reason: actionText,
    propertyId,
    propertyName: deed.name,
    timestamp: Date.now(),
  });
  updates[`transactions/${txId}`] = txData;

  const notifRef = push(ref(db, `games/${gameId}/notifications`));
  const notifId = notifRef.key || 'notif_' + Date.now();
  const notifData = removeUndefined({
    id: notifId,
    gameId,
    type: 'property',
    icon: '🏷️',
    title: isHotelDowngrade ? 'Hotel Sold' : 'House Sold',
    message: `🏷️ ${player.name} ${actionText} for $${refundAmount.toLocaleString()}`,
    senderId: playerId,
    senderName: player.name,
    amount: refundAmount,
    reason: actionText,
    timestamp: Date.now(),
  });
  updates[`notifications/${notifId}`] = notifData;

  await update(ref(db, `games/${gameId}`), updates);
}

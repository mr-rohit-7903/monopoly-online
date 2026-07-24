import {
  ref,
  get,
  update,
  push,
  onValue,
} from 'firebase/database';
import { db } from './config';
import { TradeProposal } from '../../types/trade';
import { Player } from '../../types/game';
import { PropertyState } from '../../types/property';
import { BOARD_PROPERTIES } from '../../constants/boardRegistry';

function removeUndefined(obj: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      clean[key] = obj[key];
    }
  });
  return clean;
}

export async function createTradeProposal(params: {
  gameId: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar?: string;
  senderCash: number;
  senderPropertyIds: string[];
  receiverCash: number;
  receiverPropertyIds: string[];
}): Promise<string> {
  const { gameId, senderId, receiverId, senderCash, senderPropertyIds, receiverCash, receiverPropertyIds } = params;

  if (senderId === receiverId) {
    throw new Error('Cannot trade with yourself.');
  }

  if (senderCash < 0 || receiverCash < 0) {
    throw new Error('Trade amounts cannot be negative.');
  }

  if (senderCash === 0 && receiverCash === 0 && senderPropertyIds.length === 0 && receiverPropertyIds.length === 0) {
    throw new Error('Trade offer cannot be empty.');
  }

  const senderSnap = await get(ref(db, `games/${gameId}/players/${senderId}`));
  if (!senderSnap.exists()) throw new Error('Sender player not found.');
  const sender = senderSnap.val() as Player;

  if (sender.balance < senderCash) {
    throw new Error(`Insufficient funds. You offered $${senderCash.toLocaleString()} but only have $${sender.balance.toLocaleString()}.`);
  }

  // Validate sender properties (no houses or hotels allowed)
  for (const propId of senderPropertyIds) {
    const pSnap = await get(ref(db, `games/${gameId}/properties/${propId}`));
    if (!pSnap.exists()) throw new Error(`Property ${propId} not found.`);
    const pState = pSnap.val() as PropertyState;
    if (pState.ownerId !== senderId) throw new Error('You no longer own one of the offered properties.');
    if ((pState.houses || 0) > 0 || pState.hotel) {
      const deed = BOARD_PROPERTIES.find((b) => b.id === propId);
      throw new Error(`Cannot trade "${deed?.name || propId}" while it has houses or hotels built on it.`);
    }
  }

  // Validate receiver properties
  for (const propId of receiverPropertyIds) {
    const pSnap = await get(ref(db, `games/${gameId}/properties/${propId}`));
    if (!pSnap.exists()) throw new Error(`Property ${propId} not found.`);
    const pState = pSnap.val() as PropertyState;
    if (pState.ownerId !== receiverId) throw new Error('Target player no longer owns one of the requested properties.');
    if ((pState.houses || 0) > 0 || pState.hotel) {
      const deed = BOARD_PROPERTIES.find((b) => b.id === propId);
      throw new Error(`Cannot request "${deed?.name || propId}" while it has houses or hotels built on it.`);
    }
  }

  const tradeRef = push(ref(db, `games/${gameId}/trades`));
  const tradeId = tradeRef.key || 'trade_' + Date.now();

  const tradeData: TradeProposal = {
    id: tradeId,
    gameId,
    senderId,
    senderName: params.senderName,
    senderAvatar: params.senderAvatar || '🎩',
    receiverId,
    receiverName: params.receiverName,
    receiverAvatar: params.receiverAvatar || '🎩',
    senderCash,
    senderPropertyIds,
    receiverCash,
    receiverPropertyIds,
    status: 'pending',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  const updates: Record<string, any> = {};
  updates[`trades/${tradeId}`] = removeUndefined(tradeData);

  // Send Notification to Receiver
  const notifRef = push(ref(db, `games/${gameId}/notifications`));
  const notifId = notifRef.key || 'notif_' + Date.now();
  const notifData = removeUndefined({
    id: notifId,
    gameId,
    type: 'trade',
    icon: '🤝',
    title: 'Trade Proposal Received',
    message: `🤝 ${params.senderName} proposed a trade deal to ${params.receiverName}!`,
    senderId,
    senderName: params.senderName,
    receiverId,
    receiverName: params.receiverName,
    timestamp: Date.now(),
  });
  updates[`notifications/${notifId}`] = notifData;

  await update(ref(db, `games/${gameId}`), updates);
  return tradeId;
}

export async function acceptTradeProposal(gameId: string, tradeId: string, acceptingPlayerId: string): Promise<void> {
  const tradeSnap = await get(ref(db, `games/${gameId}/trades/${tradeId}`));
  if (!tradeSnap.exists()) throw new Error('Trade proposal no longer exists.');
  const trade = tradeSnap.val() as TradeProposal;

  if (trade.status !== 'pending') {
    throw new Error(`Trade deal is already ${trade.status}.`);
  }

  if (trade.receiverId !== acceptingPlayerId) {
    throw new Error('Only the recipient of this trade can accept it.');
  }

  // Fetch players
  const senderSnap = await get(ref(db, `games/${gameId}/players/${trade.senderId}`));
  const receiverSnap = await get(ref(db, `games/${gameId}/players/${trade.receiverId}`));

  if (!senderSnap.exists() || !receiverSnap.exists()) {
    throw new Error('Trade players no longer exist in this game.');
  }

  const sender = senderSnap.val() as Player;
  const receiver = receiverSnap.val() as Player;

  if (sender.balance < trade.senderCash) {
    throw new Error(`${sender.name} no longer has sufficient cash ($${trade.senderCash.toLocaleString()}) to fulfill this trade.`);
  }

  if (receiver.balance < trade.receiverCash) {
    throw new Error(`You have insufficient cash ($${trade.receiverCash.toLocaleString()}) to fulfill this trade.`);
  }

  const senderPropIds = trade.senderPropertyIds || [];
  const receiverPropIds = trade.receiverPropertyIds || [];

  // Validate sender properties
  for (const propId of senderPropIds) {
    const pSnap = await get(ref(db, `games/${gameId}/properties/${propId}`));
    const pState = pSnap.exists() ? (pSnap.val() as PropertyState) : null;
    if (!pState || pState.ownerId !== trade.senderId) {
      throw new Error(`${sender.name} no longer owns all offered properties.`);
    }
    if ((pState.houses || 0) > 0 || pState.hotel) {
      throw new Error(`Offered property has buildings and cannot be traded.`);
    }
  }

  // Validate receiver properties
  for (const propId of receiverPropIds) {
    const pSnap = await get(ref(db, `games/${gameId}/properties/${propId}`));
    const pState = pSnap.exists() ? (pSnap.val() as PropertyState) : null;
    if (!pState || pState.ownerId !== trade.receiverId) {
      throw new Error(`You no longer own all requested properties.`);
    }
    if ((pState.houses || 0) > 0 || pState.hotel) {
      throw new Error(`Requested property has buildings and cannot be traded.`);
    }
  }

  const updates: Record<string, any> = {};

  // Balances exchange
  const newSenderBalance = sender.balance - trade.senderCash + trade.receiverCash;
  const newReceiverBalance = receiver.balance - trade.receiverCash + trade.senderCash;

  updates[`players/${trade.senderId}/balance`] = newSenderBalance;
  updates[`players/${trade.receiverId}/balance`] = newReceiverBalance;

  // Property ownership exchange
  for (const propId of senderPropIds) {
    updates[`properties/${propId}/ownerId`] = trade.receiverId;
    updates[`properties/${propId}/updatedAt`] = Date.now();
  }

  for (const propId of receiverPropIds) {
    updates[`properties/${propId}/ownerId`] = trade.senderId;
    updates[`properties/${propId}/updatedAt`] = Date.now();
  }

  updates[`trades/${tradeId}/status`] = 'accepted';
  updates[`trades/${tradeId}/updatedAt`] = Date.now();

  // Create Transaction Record
  const txRef = push(ref(db, `games/${gameId}/transactions`));
  const txId = txRef.key || 'tx_' + Date.now();

  const senderPropNames = senderPropIds
    .map((id) => BOARD_PROPERTIES.find((b) => b.id === id)?.name)
    .filter(Boolean)
    .join(', ');
  const receiverPropNames = receiverPropIds
    .map((id) => BOARD_PROPERTIES.find((b) => b.id === id)?.name)
    .filter(Boolean)
    .join(', ');

  const summaryReason = `Trade Completed: ${sender.name} & ${receiver.name} swapped assets.`;

  const txData = removeUndefined({
    id: txId,
    gameId,
    senderId: trade.senderId,
    senderName: sender.name,
    receiverId: trade.receiverId,
    receiverName: receiver.name,
    amount: trade.senderCash || trade.receiverCash || 0,
    category: 'trade',
    reason: summaryReason,
    timestamp: Date.now(),
  });
  updates[`transactions/${txId}`] = txData;

  // Create Notification
  const notifRef = push(ref(db, `games/${gameId}/notifications`));
  const notifId = notifRef.key || 'notif_' + Date.now();
  const notifData = removeUndefined({
    id: notifId,
    gameId,
    type: 'trade',
    icon: '🤝',
    title: 'Trade Completed!',
    message: `🤝 ${sender.name} and ${receiver.name} agreed on a trade deal!`,
    senderId: trade.senderId,
    senderName: sender.name,
    receiverId: trade.receiverId,
    receiverName: receiver.name,
    timestamp: Date.now(),
  });
  updates[`notifications/${notifId}`] = notifData;

  await update(ref(db, `games/${gameId}`), updates);
}

export async function rejectTradeProposal(gameId: string, tradeId: string, rejectingPlayerId: string): Promise<void> {
  const tradeSnap = await get(ref(db, `games/${gameId}/trades/${tradeId}`));
  if (!tradeSnap.exists()) return;
  const trade = tradeSnap.val() as TradeProposal;

  const updates: Record<string, any> = {};
  updates[`trades/${tradeId}/status`] = 'rejected';
  updates[`trades/${tradeId}/updatedAt`] = Date.now();

  const notifRef = push(ref(db, `games/${gameId}/notifications`));
  const notifId = notifRef.key || 'notif_' + Date.now();
  const notifData = removeUndefined({
    id: notifId,
    gameId,
    type: 'trade',
    icon: '❌',
    title: 'Trade Rejected',
    message: `❌ ${trade.receiverName} declined the trade proposal from ${trade.senderName}.`,
    senderId: rejectingPlayerId,
    senderName: trade.receiverName,
    receiverId: trade.senderId,
    receiverName: trade.senderName,
    timestamp: Date.now(),
  });
  updates[`notifications/${notifId}`] = notifData;

  await update(ref(db, `games/${gameId}`), updates);
}

export function subscribeToTrades(
  gameId: string,
  onUpdate: (trades: TradeProposal[]) => void
) {
  const tradesRef = ref(db, `games/${gameId}/trades`);
  return onValue(tradesRef, (snapshot) => {
    const list: TradeProposal[] = [];
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.keys(data).forEach((key) => {
        list.push(data[key] as TradeProposal);
      });
      list.sort((a, b) => b.createdAt - a.createdAt);
    }
    onUpdate(list);
  });
}

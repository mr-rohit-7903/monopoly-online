import {
  ref,
  get,
  update,
  push,
  onValue,
  query,
  limitToLast,
} from 'firebase/database';
import { db } from './config';
import { Player } from '../../types/game';
import { Transaction, TransactionCategory } from '../../types/transaction';
import { AppNotification, NotificationType } from '../../types/notification';

export interface ExecutePaymentParams {
  gameId: string;
  senderId: string;
  receiverId: string;
  amount: number;
  reason: string;
  category: TransactionCategory;
  propertyId?: string;
  propertyName?: string;
  notificationType?: NotificationType;
  icon?: string;
}

function removeUndefined<T extends Record<string, any>>(obj: T): T {
  const clean: Record<string, any> = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== undefined) {
      clean[key] = obj[key];
    }
  });
  return clean as T;
}

// 1. Direct Player-to-Player payment
export async function payPlayerToPlayer(params: ExecutePaymentParams): Promise<void> {
  const { gameId, senderId, receiverId, amount, reason, category, propertyId, propertyName, icon = 'PAY' } = params;
  if (amount <= 0) throw new Error('Transaction amount must be greater than $0.');

  const senderSnap = await get(ref(db, `games/${gameId}/players/${senderId}`));
  const receiverSnap = await get(ref(db, `games/${gameId}/players/${receiverId}`));

  if (!senderSnap.exists() || !receiverSnap.exists()) {
    throw new Error('Player profile not found in current game.');
  }

  const sender = senderSnap.val() as Player;
  const receiver = receiverSnap.val() as Player;

  if (sender.balance < amount) {
    throw new Error(`Insufficient balance! You have $${sender.balance.toLocaleString()} but need $${amount.toLocaleString()}.`);
  }

  const updates: Record<string, any> = {};
  updates[`players/${senderId}/balance`] = sender.balance - amount;
  updates[`players/${receiverId}/balance`] = receiver.balance + amount;

  const txRef = push(ref(db, `games/${gameId}/transactions`));
  const txId = txRef.key || 'tx_' + Date.now();
  const txData = removeUndefined({
    id: txId,
    gameId,
    senderId,
    senderName: sender.name,
    receiverId,
    receiverName: receiver.name,
    amount,
    category,
    reason,
    propertyId,
    propertyName,
    timestamp: Date.now(),
  });
  updates[`transactions/${txId}`] = txData;

  const notifRef = push(ref(db, `games/${gameId}/notifications`));
  const notifId = notifRef.key || 'notif_' + Date.now();
  const notifData = removeUndefined({
    id: notifId,
    gameId,
    type: 'rent' as NotificationType,
    icon,
    title: `${sender.name} paid ${receiver.name}`,
    message: `${sender.name} paid ${receiver.name} $${amount.toLocaleString()} (${reason})`,
    senderId,
    senderName: sender.name,
    receiverId,
    receiverName: receiver.name,
    amount,
    reason,
    timestamp: Date.now(),
  });
  updates[`notifications/${notifId}`] = notifData;

  await update(ref(db, `games/${gameId}`), updates);
}

// 2. Bank Deposit (Bank pays player e.g. GO Salary, Card Payout)
export async function depositFromBank(params: {
  gameId: string;
  receiverId: string;
  amount: number;
  reason: string;
  category?: TransactionCategory;
  icon?: string;
}): Promise<void> {
  const { gameId, receiverId, amount, reason, category = 'bank_deposit', icon = 'BANK' } = params;
  if (amount <= 0) throw new Error('Deposit amount must be greater than $0.');

  const receiverSnap = await get(ref(db, `games/${gameId}/players/${receiverId}`));
  if (!receiverSnap.exists()) {
    throw new Error('Player profile not found.');
  }

  const receiver = receiverSnap.val() as Player;
  const updates: Record<string, any> = {};
  updates[`players/${receiverId}/balance`] = receiver.balance + amount;

  const txRef = push(ref(db, `games/${gameId}/transactions`));
  const txId = txRef.key || 'tx_' + Date.now();
  const txData = removeUndefined({
    id: txId,
    gameId,
    senderId: 'BANK',
    senderName: 'Bank',
    receiverId,
    receiverName: receiver.name,
    amount,
    category,
    reason,
    timestamp: Date.now(),
  });
  updates[`transactions/${txId}`] = txData;

  const notifRef = push(ref(db, `games/${gameId}/notifications`));
  const notifId = notifRef.key || 'notif_' + Date.now();
  const notifData = removeUndefined({
    id: notifId,
    gameId,
    type: 'salary' as NotificationType,
    icon,
    title: `Bank paid ${receiver.name}`,
    message: `Bank paid ${receiver.name} $${amount.toLocaleString()} (${reason})`,
    senderId: 'BANK',
    senderName: 'Bank',
    receiverId,
    receiverName: receiver.name,
    amount,
    reason,
    timestamp: Date.now(),
  });
  updates[`notifications/${notifId}`] = notifData;

  await update(ref(db, `games/${gameId}`), updates);
}

// 3. Collect to Bank (Player pays bank e.g. Property buy, taxes, fines)
export async function collectToBank(params: {
  gameId: string;
  senderId: string;
  amount: number;
  reason: string;
  category?: TransactionCategory;
  propertyId?: string;
  propertyName?: string;
  icon?: string;
}): Promise<void> {
  const { gameId, senderId, amount, reason, category = 'bank_collect', propertyId, propertyName, icon = 'BANK' } = params;
  if (amount <= 0) throw new Error('Payment amount must be greater than $0.');

  const senderSnap = await get(ref(db, `games/${gameId}/players/${senderId}`));
  if (!senderSnap.exists()) {
    throw new Error('Player document not found.');
  }

  const sender = senderSnap.val() as Player;
  if (sender.balance < amount) {
    throw new Error(`Insufficient funds to pay Bank. You have $${sender.balance.toLocaleString()} but need $${amount.toLocaleString()}.`);
  }

  const updates: Record<string, any> = {};
  updates[`players/${senderId}/balance`] = sender.balance - amount;

  const txRef = push(ref(db, `games/${gameId}/transactions`));
  const txId = txRef.key || 'tx_' + Date.now();
  const txData = removeUndefined({
    id: txId,
    gameId,
    senderId,
    senderName: sender.name,
    receiverId: 'BANK',
    receiverName: 'Bank',
    amount,
    category,
    reason,
    propertyId,
    propertyName,
    timestamp: Date.now(),
  });
  updates[`transactions/${txId}`] = txData;

  const notifRef = push(ref(db, `games/${gameId}/notifications`));
  const notifId = notifRef.key || 'notif_' + Date.now();
  const notifData = removeUndefined({
    id: notifId,
    gameId,
    type: 'tax' as NotificationType,
    icon,
    title: `${sender.name} paid Bank`,
    message: `${sender.name} paid Bank $${amount.toLocaleString()} (${reason})`,
    senderId,
    senderName: sender.name,
    receiverId: 'BANK',
    receiverName: 'Bank',
    amount,
    reason,
    timestamp: Date.now(),
  });
  updates[`notifications/${notifId}`] = notifData;

  await update(ref(db, `games/${gameId}`), updates);
}

// 4. Multi-Collect (Collect from EVERY player e.g. Party House $200)
export async function executeMultiCollect(params: {
  gameId: string;
  receiverId: string;
  amountPerPlayer: number;
  reason: string;
  icon?: string;
}): Promise<void> {
  const { gameId, receiverId, amountPerPlayer, reason, icon = 'PARTY' } = params;

  const playersSnap = await get(ref(db, `games/${gameId}/players`));
  if (!playersSnap.exists()) return;

  const playersMap = playersSnap.val() as Record<string, Player>;
  const receiver = playersMap[receiverId];
  if (!receiver) throw new Error('Receiver player not found.');

  const updates: Record<string, any> = {};
  let totalCollected = 0;

  Object.keys(playersMap).forEach((pId) => {
    if (pId !== receiverId) {
      const p = playersMap[pId];
      const newBal = Math.max(0, p.balance - amountPerPlayer);
      updates[`players/${pId}/balance`] = newBal;
      totalCollected += amountPerPlayer;
    }
  });

  updates[`players/${receiverId}/balance`] = receiver.balance + totalCollected;

  const txRef = push(ref(db, `games/${gameId}/transactions`));
  const txId = txRef.key || 'tx_' + Date.now();
  const txData = removeUndefined({
    id: txId,
    gameId,
    senderId: 'ALL',
    senderName: 'All Players',
    receiverId,
    receiverName: receiver.name,
    amount: totalCollected,
    category: 'multi_collect' as TransactionCategory,
    reason,
    timestamp: Date.now(),
  });
  updates[`transactions/${txId}`] = txData;

  const notifRef = push(ref(db, `games/${gameId}/notifications`));
  const notifId = notifRef.key || 'notif_' + Date.now();
  const notifData = removeUndefined({
    id: notifId,
    gameId,
    type: 'party' as NotificationType,
    icon,
    title: `${reason}`,
    message: `${receiver.name} collected $${amountPerPlayer.toLocaleString()} from each player ($${totalCollected.toLocaleString()} total)`,
    senderId: 'ALL',
    senderName: 'All Players',
    receiverId,
    receiverName: receiver.name,
    amount: totalCollected,
    reason,
    timestamp: Date.now(),
  });
  updates[`notifications/${notifId}`] = notifData;

  await update(ref(db, `games/${gameId}`), updates);
}

// 5. Multi-Pay (Pay EVERY player e.g. Resorts $200)
export async function executeMultiPay(params: {
  gameId: string;
  senderId: string;
  amountPerPlayer: number;
  reason: string;
  icon?: string;
}): Promise<void> {
  const { gameId, senderId, amountPerPlayer, reason, icon = 'RESORT' } = params;

  const playersSnap = await get(ref(db, `games/${gameId}/players`));
  if (!playersSnap.exists()) return;

  const playersMap = playersSnap.val() as Record<string, Player>;
  const sender = playersMap[senderId];
  if (!sender) throw new Error('Sender player not found.');

  const otherPlayerIds = Object.keys(playersMap).filter((id) => id !== senderId);
  const totalToPay = amountPerPlayer * otherPlayerIds.length;

  if (sender.balance < totalToPay) {
    throw new Error(`Insufficient funds for Resorts payment! Need $${totalToPay.toLocaleString()} but have $${sender.balance.toLocaleString()}.`);
  }

  const updates: Record<string, any> = {};
  updates[`players/${senderId}/balance`] = sender.balance - totalToPay;

  otherPlayerIds.forEach((pId) => {
    const p = playersMap[pId];
    updates[`players/${pId}/balance`] = p.balance + amountPerPlayer;
  });

  const txRef = push(ref(db, `games/${gameId}/transactions`));
  const txId = txRef.key || 'tx_' + Date.now();
  const txData = removeUndefined({
    id: txId,
    gameId,
    senderId,
    senderName: sender.name,
    receiverId: 'ALL',
    receiverName: 'All Players',
    amount: totalToPay,
    category: 'multi_pay' as TransactionCategory,
    reason,
    timestamp: Date.now(),
  });
  updates[`transactions/${txId}`] = txData;

  const notifRef = push(ref(db, `games/${gameId}/notifications`));
  const notifId = notifRef.key || 'notif_' + Date.now();
  const notifData = removeUndefined({
    id: notifId,
    gameId,
    type: 'party' as NotificationType,
    icon,
    title: `${reason}`,
    message: `${sender.name} paid $${amountPerPlayer.toLocaleString()} to each player for vacation expenses`,
    senderId,
    senderName: sender.name,
    receiverId: 'ALL',
    receiverName: 'All Players',
    amount: totalToPay,
    reason,
    timestamp: Date.now(),
  });
  updates[`notifications/${notifId}`] = notifData;

  await update(ref(db, `games/${gameId}`), updates);
}

export function subscribeToTransactions(
  gameId: string,
  onUpdate: (transactions: Transaction[]) => void
) {
  const txRef = ref(db, `games/${gameId}/transactions`);
  const q = query(txRef, limitToLast(150));
  return onValue(q, (snapshot) => {
    const list: Transaction[] = [];
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.keys(data).forEach((key) => {
        list.push(data[key] as Transaction);
      });
      list.sort((a, b) => b.timestamp - a.timestamp);
    }
    onUpdate(list);
  });
}

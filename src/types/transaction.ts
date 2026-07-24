export type TransactionCategory =
  | 'p2p'
  | 'bank_deposit'
  | 'bank_collect'
  | 'multi_collect'
  | 'multi_pay'
  | 'property_buy'
  | 'property_sell'
  | 'mortgage'
  | 'unmortgage'
  | 'house_build'
  | 'hotel_build'
  | 'house_sell'
  | 'hotel_sell'
  | 'trade'
  | 'banker_action';

export interface Transaction {
  id: string;
  gameId: string;
  senderId: string; // 'BANK' or playerId
  senderName: string;
  receiverId: string; // 'BANK' | 'ALL' | playerId
  receiverName: string;
  amount: number;
  category: TransactionCategory;
  reason: string;
  propertyId?: string;
  propertyName?: string;
  timestamp: number;
}

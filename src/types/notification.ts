export type NotificationType =
  | 'rent'
  | 'salary'
  | 'property'
  | 'mortgage'
  | 'party'
  | 'jail'
  | 'tax'
  | 'card'
  | 'banker'
  | 'trade'
  | 'info';

export interface AppNotification {
  id: string;
  gameId: string;
  type: NotificationType;
  icon: string;
  title: string;
  message: string;
  senderId?: string;
  senderName?: string;
  receiverId?: string;
  receiverName?: string;
  amount?: number;
  reason?: string;
  timestamp: number;
}

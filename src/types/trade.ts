export type TradeStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export interface TradeProposal {
  id: string;
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
  status: TradeStatus;
  createdAt: number;
  updatedAt: number;
}

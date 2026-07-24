export type CardType = 'chance' | 'community_chest';

export type CardAction =
  | 'pay_bank'
  | 'receive_bank'
  | 'collect_all'
  | 'pay_all'
  | 'go_to_jail'
  | 'general_repairs'
  | 'passport';

export interface GameCard {
  id: string;
  type: CardType;
  diceNumber: number;
  title: string;
  description: string;
  effectText: string;
  action: CardAction;
  amount?: number;
  perHouse?: number;
  perHotel?: number;
}

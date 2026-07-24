export type GameStatus = 'lobby' | 'active' | 'completed' | 'cancelled';

export interface Player {
  id: string;
  name: string;
  avatar: string;
  color: string;
  balance: number;
  isBanker: boolean;
  isHost: boolean;
  inJail: boolean;
  jailTurns: number;
  bankrupt: boolean;
  joinedAt: number;
}

export interface GameSettings {
  startingCash: number;
  goSalary: number;
  maxHousesPerProperty: number;
  hotelRequirementHouses: number;
}

export interface GameSession {
  id: string;
  code: string;
  status: GameStatus;
  hostId: string;
  bankerId: string;
  createdAt: number;
  updatedAt: number;
  settings: GameSettings;
}

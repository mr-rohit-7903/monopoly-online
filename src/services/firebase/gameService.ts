import {
  ref,
  set,
  get,
  update,
  onValue,
  query,
  orderByChild,
  equalTo,
} from 'firebase/database';
import { db } from './config';
import { GameSession, Player } from '../../types/game';
import { BOARD_PROPERTIES } from '../../constants/boardRegistry';
import { PropertyState } from '../../types/property';

// Helper to generate a clean 6-character uppercase room code
export function generateGameCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export interface CreateGameParams {
  hostUserId: string;
  hostName: string;
  hostAvatar: string;
  hostColor: string;
}

export async function createGameSession(params: CreateGameParams): Promise<{ gameId: string; code: string }> {
  const { hostUserId, hostName, hostAvatar, hostColor } = params;
  const gameId = 'game_' + Math.random().toString(36).substring(2, 10);
  const code = generateGameCode();

  const gameData: GameSession = {
    id: gameId,
    code,
    status: 'lobby',
    hostId: hostUserId,
    bankerId: hostUserId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    settings: {
      startingCash: 25000,
      goSalary: 1500,
      maxHousesPerProperty: 3,
      hotelRequirementHouses: 3,
    },
  };

  const hostPlayer: Player = {
    id: hostUserId,
    name: hostName,
    avatar: hostAvatar,
    color: hostColor,
    balance: 25000,
    isBanker: true,
    isHost: true,
    inJail: false,
    jailTurns: 0,
    bankrupt: false,
    joinedAt: Date.now(),
  };

  // Set game metadata and host player in Realtime Database
  await set(ref(db, `games/${gameId}`), gameData);
  await set(ref(db, `games/${gameId}/players/${hostUserId}`), hostPlayer);

  return { gameId, code };
}

export async function joinGameByCode(
  code: string,
  userParams: { userId: string; name: string; avatar: string; color: string }
): Promise<string> {
  const cleanCode = code.trim().toUpperCase();

  let matchedGameId: string | null = null;
  let gameData: GameSession | null = null;

  try {
    const codeQuery = query(ref(db, 'games'), orderByChild('code'), equalTo(cleanCode));
    const querySnap = await get(codeQuery);
    if (querySnap.exists()) {
      const val = querySnap.val();
      matchedGameId = Object.keys(val)[0];
      gameData = val[matchedGameId];
    }
  } catch (err) {
    console.warn('Realtime Database indexed query fallback:', err);
  }

  if (!matchedGameId || !gameData) {
    const gamesSnap = await get(ref(db, 'games'));
    if (gamesSnap.exists()) {
      const allGames = gamesSnap.val() as Record<string, GameSession>;
      const foundId = Object.keys(allGames).find(
        (gId) => allGames[gId]?.code === cleanCode
      );
      if (foundId) {
        matchedGameId = foundId;
        gameData = allGames[foundId];
      }
    }
  }

  if (!matchedGameId || !gameData) {
    throw new Error(`Game code "${cleanCode}" not found. Please check the code and try again.`);
  }

  if (gameData.status === 'completed' || gameData.status === 'cancelled') {
    throw new Error('This game session has already ended.');
  }

  // Check if player already joined
  const playerSnap = await get(ref(db, `games/${matchedGameId}/players/${userParams.userId}`));
  if (!playerSnap.exists()) {
    const newPlayer: Player = {
      id: userParams.userId,
      name: userParams.name,
      avatar: userParams.avatar,
      color: userParams.color,
      balance: 25000,
      isBanker: false,
      isHost: false,
      inJail: false,
      jailTurns: 0,
      bankrupt: false,
      joinedAt: Date.now(),
    };
    await set(ref(db, `games/${matchedGameId}/players/${userParams.userId}`), newPlayer);
  }

  return matchedGameId;
}

export async function setGameBanker(gameId: string, newBankerId: string): Promise<void> {
  const updates: Record<string, any> = {};
  updates[`bankerId`] = newBankerId;
  updates[`updatedAt`] = Date.now();

  const playersSnap = await get(ref(db, `games/${gameId}/players`));
  if (playersSnap.exists()) {
    const playersMap = playersSnap.val();
    Object.keys(playersMap).forEach((pId) => {
      updates[`players/${pId}/isBanker`] = pId === newBankerId;
    });
  }

  await update(ref(db, `games/${gameId}`), updates);
}

export async function startGameSession(gameId: string): Promise<void> {
  const updates: Record<string, any> = {};
  updates[`status`] = 'active';
  updates[`updatedAt`] = Date.now();

  // Initialize all properties as unowned
  BOARD_PROPERTIES.forEach((prop) => {
    updates[`properties/${prop.id}`] = {
      propertyId: prop.id,
      ownerId: '',       // empty string = bank owned (Firebase strips null fields)
      houses: 0,
      hotel: false,
      isMortgaged: false,
      updatedAt: Date.now(),
    };
  });

  await update(ref(db, `games/${gameId}`), updates);
}

export function subscribeToGame(gameId: string, onUpdate: (game: GameSession | null) => void) {
  // Subscribe to the game metadata only (not the whole tree including players/properties/notifications)
  // We pass the whole snapshot but the store only uses top-level GameSession fields
  const gameRef = ref(db, `games/${gameId}`);
  return onValue(gameRef, (snapshot) => {
    if (snapshot.exists()) {
      const val = snapshot.val();
      // Extract only game session metadata — strip out sub-collections
      const session: GameSession = {
        id: val.id,
        code: val.code,
        status: val.status,
        hostId: val.hostId,
        bankerId: val.bankerId,
        createdAt: val.createdAt,
        updatedAt: val.updatedAt,
        settings: val.settings,
      };
      onUpdate(session);
    } else {
      onUpdate(null);
    }
  });
}

export function subscribeToPlayers(gameId: string, onUpdate: (players: Player[]) => void) {
  const playersRef = ref(db, `games/${gameId}/players`);
  return onValue(playersRef, (snapshot) => {
    const players: Player[] = [];
    if (snapshot.exists()) {
      const data = snapshot.val();
      Object.values(data).forEach((pObj: any) => {
        players.push(pObj as Player);
      });
    }
    players.sort((a, b) => (a.isHost ? -1 : b.isHost ? 1 : a.joinedAt - b.joinedAt));
    onUpdate(players);
  });
}

export function subscribeToProperties(gameId: string, onUpdate: (properties: Record<string, PropertyState>) => void) {
  const propsRef = ref(db, `games/${gameId}/properties`);
  return onValue(propsRef, (snapshot) => {
    if (snapshot.exists()) {
      onUpdate(snapshot.val() as Record<string, PropertyState>);
    } else {
      onUpdate({});
    }
  });
}

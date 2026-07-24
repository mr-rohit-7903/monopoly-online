import { BOARD_PROPERTIES } from '../../constants/boardRegistry';
import { PropertyDeed, PropertyState } from '../../types/property';

export interface RentCalculationResult {
  deed: PropertyDeed;
  propertyState: PropertyState;
  finalRent: number;
  breakdown: string;
  hasMonopolyBonus: boolean;
  canBuildHouses: boolean; // true when player owns at least 3 properties in group
}

export const TRANSPORT_PAIRS: Record<string, string> = {
  waterways: 'satellite',
  satellite: 'waterways',
  railways: 'roadways',
  roadways: 'railways',
  airways: 'petroleum',
  petroleum: 'airways',
};

export function calculatePropertyRent(
  propertyId: string,
  propertyState: PropertyState,
  ownerProperties: PropertyState[]
): RentCalculationResult {
  const deed = BOARD_PROPERTIES.find((p) => p.id === propertyId);
  if (!deed) {
    throw new Error(`Property ${propertyId} not found in registry.`);
  }

  // Mortgaged properties collect $0 rent
  if (propertyState.isMortgaged) {
    return {
      deed,
      propertyState,
      finalRent: 0,
      breakdown: 'Mortgaged — $0 rent',
      hasMonopolyBonus: false,
      canBuildHouses: false,
    };
  }

  // ─── COUNTRY PROPERTIES ────────────────────────────────────────────────────
  if (deed.type === 'country') {
    // Group monopoly: Player owns 3 or more properties in the same color group
    const groupDeeds = BOARD_PROPERTIES.filter((p) => p.group === deed.group);
    const ownedInGroup = ownerProperties.filter((op) => {
      const pDeed = BOARD_PROPERTIES.find((b) => b.id === op.propertyId);
      return pDeed && pDeed.group === deed.group;
    });

    const hasMonopolyBonus = ownedInGroup.length >= 3;
    const canBuildHouses = true;

    // Hotel rent (Standard printed hotel rent — double multiplier does NOT apply)
    if (propertyState.hotel && deed.rentHotel) {
      return {
        deed,
        propertyState,
        finalRent: deed.rentHotel,
        breakdown: `Hotel Rent: $${deed.rentHotel.toLocaleString()}`,
        hasMonopolyBonus,
        canBuildHouses,
      };
    }

    // 3 Houses rent (Standard printed 3-house rent)
    if (propertyState.houses === 3 && deed.rent3Houses) {
      return {
        deed,
        propertyState,
        finalRent: deed.rent3Houses,
        breakdown: `3 Houses: $${deed.rent3Houses.toLocaleString()}`,
        hasMonopolyBonus,
        canBuildHouses,
      };
    }

    // 2 Houses rent (Standard printed 2-house rent)
    if (propertyState.houses === 2 && deed.rent2Houses) {
      return {
        deed,
        propertyState,
        finalRent: deed.rent2Houses,
        breakdown: `2 Houses: $${deed.rent2Houses.toLocaleString()}`,
        hasMonopolyBonus,
        canBuildHouses,
      };
    }

    // 1 House rent (Standard printed 1-house rent)
    if (propertyState.houses === 1 && deed.rent1House) {
      return {
        deed,
        propertyState,
        finalRent: deed.rent1House,
        breakdown: `1 House: $${deed.rent1House.toLocaleString()}`,
        hasMonopolyBonus,
        canBuildHouses,
      };
    }

    // Unimproved rent (0 houses): Owning 3+ of same color doubles the base rent
    const finalRent = hasMonopolyBonus ? deed.rentBase * 2 : deed.rentBase;
    const breakdown = hasMonopolyBonus
      ? `⭐ $${deed.rentBase} × 2 (Doubled Rent — 3+ of group owned)`
      : `Base Rent: $${deed.rentBase.toLocaleString()} (own 3 in group to double)`;

    return {
      deed,
      propertyState,
      finalRent,
      breakdown,
      hasMonopolyBonus,
      canBuildHouses,
    };
  }

  // ─── TRANSPORT PROPERTIES ──────────────────────────────────────────────────
  if (deed.type === 'transport') {
    const pairedId = TRANSPORT_PAIRS[deed.id];
    const pairedDeed = BOARD_PROPERTIES.find((b) => b.id === pairedId);

    // Check if the owner also owns the matching pair property (and it's not mortgaged)
    const ownsPair = pairedId
      ? ownerProperties.some((op) => op.propertyId === pairedId && !op.isMortgaged)
      : false;

    const pairRent = deed.rent2Owned || deed.rentBothOwned || (deed.rentBase * 2);
    const finalRent = ownsPair ? pairRent : deed.rentBase;
    const breakdown = ownsPair
      ? `⭐ Pair Owned (${deed.name} + ${pairedDeed?.name || 'Pair'}): $${finalRent.toLocaleString()}`
      : `Base Rent: $${deed.rentBase.toLocaleString()} (own ${pairedDeed?.name || 'Pair'} to increase rent to $${pairRent.toLocaleString()})`;

    return {
      deed,
      propertyState,
      finalRent,
      breakdown,
      hasMonopolyBonus: ownsPair,
      canBuildHouses: false,
    };
  }

  return {
    deed,
    propertyState,
    finalRent: deed.rentBase,
    breakdown: `Base Rent: $${deed.rentBase}`,
    hasMonopolyBonus: false,
    canBuildHouses: false,
  };
}

import { BOARD_PROPERTIES } from '../../constants/boardRegistry';
import { PropertyDeed, PropertyState } from '../../types/property';

export interface ValidationResult {
  canBuild: boolean;
  reason?: string;
  cost?: number;
}

export function validateBuildHouseOrHotel(
  propertyId: string,
  ownerProperties: PropertyState[]
): ValidationResult {
  const deed = BOARD_PROPERTIES.find((p) => p.id === propertyId);
  if (!deed || deed.type !== 'country') {
    return { canBuild: false, reason: 'Only country properties can be built on.' };
  }

  const targetState = ownerProperties.find((p) => p.propertyId === propertyId);
  if (!targetState) {
    return { canBuild: false, reason: 'You do not own this property.' };
  }

  if (targetState.isMortgaged) {
    return { canBuild: false, reason: 'Cannot build on a mortgaged property.' };
  }

  // Check if any owned property in the group is mortgaged
  const groupDeeds = BOARD_PROPERTIES.filter((p) => p.group === deed.group);
  const groupStates = ownerProperties.filter((op) =>
    groupDeeds.some((gd) => gd.id === op.propertyId)
  );

  const hasMortgagedGroupProp = groupStates.some((p) => p.isMortgaged);
  if (hasMortgagedGroupProp) {
    return { canBuild: false, reason: 'Cannot build while any owned property in the group is mortgaged.' };
  }

  // Max limit: 1 Hotel
  if (targetState.hotel) {
    return { canBuild: false, reason: 'Property already has a Hotel (maximum upgrade).' };
  }

  const housePrice = deed.housePrice || 0;

  // Build House or Upgrade to Hotel (No 3-property or even-building restriction)
  return { canBuild: true, cost: housePrice };
}

export function validateSellHouseOrHotel(
  propertyId: string,
  ownerProperties: PropertyState[]
): ValidationResult {
  const deed = BOARD_PROPERTIES.find((p) => p.id === propertyId);
  if (!deed || deed.type !== 'country') {
    return { canBuild: false, reason: 'Only country properties have houses/hotels to sell.' };
  }

  const targetState = ownerProperties.find((p) => p.propertyId === propertyId);
  if (!targetState || (targetState.houses === 0 && !targetState.hotel)) {
    return { canBuild: false, reason: 'No houses or hotels on this property to sell.' };
  }

  const housePrice = deed.housePrice || 0;
  const refundAmount = Math.floor(housePrice * 0.5); // 50% sellback

  return { canBuild: true, cost: refundAmount };
}

export function calculateUnmortgageCost(deed: PropertyDeed): number {
  return deed.mortgageValue + Math.round(deed.mortgageValue * 0.10);
}

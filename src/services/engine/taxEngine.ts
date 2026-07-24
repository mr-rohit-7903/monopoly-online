import { BOARD_PROPERTIES } from '../../constants/boardRegistry';
import { PropertyState } from '../../types/property';

export function calculateCustomDuty(ownerProperties: PropertyState[]): { amount: number; countryCount: number } {
  const countryCount = ownerProperties.filter((op) => {
    const deed = BOARD_PROPERTIES.find((b) => b.id === op.propertyId);
    return deed && deed.type === 'country';
  }).length;

  return {
    amount: countryCount * 100,
    countryCount,
  };
}

export function calculateTravellingDuty(ownerProperties: PropertyState[]): { amount: number; countryCount: number } {
  const countryCount = ownerProperties.filter((op) => {
    const deed = BOARD_PROPERTIES.find((b) => b.id === op.propertyId);
    return deed && deed.type === 'country';
  }).length;

  return {
    amount: countryCount * 50,
    countryCount,
  };
}

export function calculateGeneralRepairs(ownerProperties: PropertyState[]): {
  totalAmount: number;
  totalHouses: number;
  totalHotels: number;
} {
  let totalHouses = 0;
  let totalHotels = 0;

  ownerProperties.forEach((op) => {
    if (op.hotel) {
      totalHotels += 1;
    } else {
      totalHouses += op.houses || 0;
    }
  });

  const totalAmount = totalHouses * 50 + totalHotels * 100;

  return {
    totalAmount,
    totalHouses,
    totalHotels,
  };
}

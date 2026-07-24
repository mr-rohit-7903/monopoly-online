export type PropertyGroup =
  | 'Europe A (Brown)'
  | 'Asia A (Light Blue)'
  | 'Americas B (Yellow)'
  | 'Africa & Middle East A (Green)'
  | 'Transport';

export type PropertyType = 'country' | 'transport';

export interface PropertyDeed {
  id: string;
  name: string;
  group: PropertyGroup;
  type: PropertyType;
  purchasePrice: number;
  mortgageValue: number;
  rentBase: number;
  rent1House?: number;
  rent2Houses?: number;
  rent3Houses?: number;
  rentHotel?: number;
  housePrice?: number;
  rent2Owned?: number;
  rentBothOwned?: number;
}

export interface PropertyState {
  propertyId: string;
  ownerId: string | null; // null means Bank owned
  houses: number; // 0..3
  hotel: boolean;
  isMortgaged: boolean;
  updatedAt?: number;
}

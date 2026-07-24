export const GROUP_TEXTURES: Record<string, any> = {
  'Europe A (Brown)': require('../public/red-texture.jpg'),
  'Asia A (Light Blue)': require('../public/blue-texture.jpg'),
  'Americas B (Yellow)': require('../public/orange_texture.jpg'),
  'Africa & Middle East A (Green)': require('../public/green-texture.jpg'),
  Transport: require('../public/blue-texture.jpg'),
};

export const PROPERTY_IMAGES: Record<string, any> = {
  railways: require('../public/train_icon.png'),
  roadways: require('../public/truck_icon.png'),
  airways: require('../public/airplane_icon.png'),
};

export function getTextureForGroup(groupName: string): any {
  return GROUP_TEXTURES[groupName] || require('../public/blue-texture.jpg');
}

export function getPropertyImage(propertyId: string): any | null {
  return PROPERTY_IMAGES[propertyId] || null;
}

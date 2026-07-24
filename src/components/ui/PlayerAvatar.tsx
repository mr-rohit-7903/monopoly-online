import React from 'react';
import { Image, View, Text, StyleSheet } from 'react-native';
import { AVATAR_MAP, RADIUS } from '../../constants/theme';

interface PlayerAvatarProps {
  avatar: string;
  size?: number;
  borderRadius?: number;
  style?: any;
}

export const PlayerAvatar: React.FC<PlayerAvatarProps> = ({
  avatar,
  size = 36,
  borderRadius = RADIUS.sm,
  style,
}) => {
  const imageSource = AVATAR_MAP[avatar];

  if (imageSource) {
    return (
      <Image
        source={imageSource}
        style={[
          {
            width: size,
            height: size,
            borderRadius,
            resizeMode: 'cover',
          },
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: 'rgba(255, 255, 255, 0.15)',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Text style={{ fontSize: Math.max(10, Math.floor(size * 0.4)), fontWeight: 'bold', color: '#FFF' }}>
        {avatar?.substring(0, 2)?.toUpperCase() || '?'}
      </Text>
    </View>
  );
};

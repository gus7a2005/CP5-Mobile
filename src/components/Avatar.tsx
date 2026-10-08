import React, { useEffect, useState } from 'react';
import { Image, Pressable, type ImageSourcePropType } from 'react-native';
import { colors } from '../theme';

const DEFAULT_AVATAR: ImageSourcePropType = require('../../assets/default-avatar.png');

type Props = { uri: string; size?: number; onPress?: () => void };

// Mostra a foto; se a URL for vazia ou falhar ao carregar, mostra a imagem padrão.
export function Avatar({ uri, size = 44, onPress }: Props) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [uri]);

  const source: ImageSourcePropType = uri !== '' && !failed ? { uri } : DEFAULT_AVATAR;
  const image = (
    <Image
      source={source}
      onError={() => setFailed(true)}
      style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.surface }}
    />
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="imagebutton">
      {image}
    </Pressable>
  ) : (
    image
  );
}
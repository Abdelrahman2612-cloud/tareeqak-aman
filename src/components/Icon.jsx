import React from 'react';
import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

// أيقونات واجهة موحّدة (Ionicons) — الإيموجي باقي بس لأنواع البلاغات لأنه جزء من نظامها على الخريطة
export function Icon({ name, size = 20, color = colors.text, style }) {
  return <Ionicons name={name} size={size} color={color} style={style} />;
}

// بلاطة أيقونة: مربع مدوّر بخلفية هادية ولون ثابت — الشكل القياسي لأي أيقونة كبيرة في التطبيق
export function IconTile({ name, size = 44, iconSize = 22, color = colors.teal, bg, style }) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size * 0.3,
          backgroundColor: bg || color + '1A',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      <Ionicons name={name} size={iconSize} color={color} />
    </View>
  );
}

export default Icon;

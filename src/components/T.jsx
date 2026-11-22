import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { fontForWeight } from '../theme';

// نص عربي بخط Cairo — بديل مباشر لـ Text:
// بياخد نفس الـ props والستايل، وبيربط fontWeight بوزن الخط المناسب تلقائيًا.
export function T({ style, ...props }) {
  const flat = StyleSheet.flatten(style) || {};
  const fontFamily = flat.fontFamily || fontForWeight(flat.fontWeight);
  return (
    <Text
      {...props}
      textBreakStrategy="simple"
      style={[{ fontFamily, writingDirection: 'rtl' }, style, { fontWeight: undefined }]}
    />
  );
}

export default T;

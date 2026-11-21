import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../theme';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.navy },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: '800', fontSize: 17 },
          headerTitleAlign: 'center',
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="report" options={{ title: 'بلاغ جديد' }} />
        <Stack.Screen name="map" options={{ title: 'خريطة البلاغات' }} />
        <Stack.Screen name="track" options={{ title: 'تتبع بلاغ' }} />
        <Stack.Screen name="admin" options={{ title: 'لوحة تحكم المشرفين' }} />
      </Stack>
    </>
  );
}

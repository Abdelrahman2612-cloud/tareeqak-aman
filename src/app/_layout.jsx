import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Cairo_400Regular,
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_800ExtraBold,
  Cairo_900Black,
} from '@expo-google-fonts/cairo';
import { colors, FONTS } from '../theme';
import { AuthProvider } from '../lib/auth';

// خلّي شاشة البداية ظاهرة لحد ما الخطوط تتحمّل
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Cairo_400Regular,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Cairo_800ExtraBold,
    Cairo_900Black,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.navy },
          headerTintColor: colors.white,
          headerTitleStyle: { fontFamily: FONTS.extraBold, fontSize: 17 },
          headerTitleAlign: 'center',
          contentStyle: { backgroundColor: colors.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, gestureEnabled: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false, presentation: 'modal' }} />
        <Stack.Screen name="report" options={{ title: 'بلاغ جديد' }} />
        <Stack.Screen name="map" options={{ title: 'خريطة البلاغات' }} />
        <Stack.Screen name="trip" options={{ title: 'الرحلة الآمنة' }} />
        <Stack.Screen name="track" options={{ title: 'تتبع بلاغ' }} />
        <Stack.Screen name="admin" options={{ title: 'لوحة تحكم المشرفين' }} />
      </Stack>
    </AuthProvider>
  );
}

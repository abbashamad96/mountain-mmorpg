import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Feather, Ionicons } from "@expo/vector-icons";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Platform, View, useWindowDimensions } from "react-native";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { GameProvider } from "@/context/GameContext";
import { MultiplayerProvider } from "@/context/MultiplayerContext";

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function WebWidthCap({ children }: { children: React.ReactNode }) {
  const { width } = useWindowDimensions();
  const BREAKPOINT = 900;
  const capped = width > BREAKPOINT;
  return (
    <View style={{ flex: 1, alignItems: "center", backgroundColor: "#000" }}>
      <View style={{ width: capped ? "60%" : "100%", flex: 1 }}>
        {children}
      </View>
    </View>
  );
}

function RootLayoutNav() {
  const content = (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );

  if (Platform.OS === "web") {
    return <WebWidthCap>{content}</WebWidthCap>;
  }

  return content;
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular: "/assets/fonts/Inter_400Regular.51b6ad87261f18b6433ec52871ddfabc.ttf",
    Inter_500Medium: "/assets/fonts/Inter_500Medium.137ab18bace28dd0bd83eb3b8ed2bc54.ttf",
    Inter_600SemiBold: "/assets/fonts/Inter_600SemiBold.a5f35888d2da465de352e0dcfaf33324.ttf",
    Inter_700Bold: "/assets/fonts/Inter_700Bold.6e237de4f1f413afa2fcc45c77ac343a.ttf",
    Feather: "/assets/fonts/Feather.ca4b48e04dc1ce10bfbddb262c8b835f.ttf",
    Ionicons: "/assets/fonts/Ionicons.b4eb097d35f44ed943676fd56f6bdc51.ttf",
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <QueryClientProvider client={queryClient}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <KeyboardProvider>
              <GameProvider>
                <MultiplayerProvider>
                  <RootLayoutNav />
                </MultiplayerProvider>
              </GameProvider>
            </KeyboardProvider>
          </GestureHandlerRootView>
        </QueryClientProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

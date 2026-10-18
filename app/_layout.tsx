import { Stack } from "expo-router";
import { Platform, StatusBar } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DownloadProvider } from "../components/DownloadProvider";
import { ThemeProvider, useThemeProvider } from "../components/ThemeProvider";

function RootLayoutNav() {
  const { isDark } = useThemeProvider();

  return (
    <>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <Stack>
        <Stack.Screen name="(home)" options={{ headerShown: false }} />
        <Stack.Screen
          name="details"
          options={{
            title: "Details",
            orientation: "portrait",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="play"
          options={{
            headerShown: false,
            orientation: "portrait",
            statusBarHidden: Platform.OS === "ios" ? false : true,
          }}
        />
        <Stack.Screen
          name="tvdetails"
          options={{
            headerShown: false,
            orientation: "portrait",
            statusBarHidden: Platform.OS === "ios" ? false : true,
          }}
        ></Stack.Screen>
        <Stack.Screen name="offline-player" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <DownloadProvider>
          <RootLayoutNav />
        </DownloadProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

import { Stack } from "expo-router";
import { Platform, StatusBar } from "react-native";
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
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutNav />
    </ThemeProvider>
  );
}

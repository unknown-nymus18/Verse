import { Stack } from "expo-router";
import { StatusBar } from "react-native";
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
            headerBackTitle: "back",
            headerShown: false,
          }}
        />
        <Stack.Screen name="play" options={{ headerShown: false }} />
        <Stack.Screen
          name="tvdetails"
          options={{ headerShown: false }}
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

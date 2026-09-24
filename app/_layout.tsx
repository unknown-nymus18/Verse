import { Stack } from "expo-router";
import { StatusBar } from "react-native";
import { ThemeProvider, useThemeProvider } from "../components/ThemeProvider";

// 1. Inner component consumes the context
function RootLayoutNav() {
  const { isDark } = useThemeProvider();

  // console.log(isDark);
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
      </Stack>
    </>
  );
}

// 2. Outer component wraps the app with ThemeProvider
export default function RootLayout() {
  return (
    <ThemeProvider>
      <RootLayoutNav />
    </ThemeProvider>
  );
}

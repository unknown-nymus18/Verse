import { router, Stack } from "expo-router";
import * as Notifications from "expo-notifications";
import { Platform, StatusBar } from "react-native";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { DownloadProvider } from "../components/DownloadProvider";
import { ThemeProvider, useThemeProvider } from "../components/ThemeProvider";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function RootLayoutNav() {
  const { isDark } = useThemeProvider();

  useEffect(() => {
    function openDetails(notification: Notifications.Notification) {
      const { route, id } = notification.request.content.data ?? {};
      if (
        (route !== "details" && route !== "tvdetails") ||
        typeof id !== "string"
      ) {
        return;
      }

      router.push({
        pathname: route === "tvdetails" ? "/tvdetails" : "/details",
        params: { id },
      });
      Notifications.clearLastNotificationResponse();
    }

    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse?.notification) {
      openDetails(lastResponse.notification);
    }

    const subscription =
      Notifications.addNotificationResponseReceivedListener((response) =>
        openDetails(response.notification),
      );
    return () => subscription.remove();
  }, []);

  return (
    <>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        animated={true}
      />
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

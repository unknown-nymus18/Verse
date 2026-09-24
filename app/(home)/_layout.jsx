import { useThemeProvider } from "@/components/ThemeProvider";
import Ionicons from "@expo/vector-icons/Ionicons";
import { BlurView } from "expo-blur";
import { Tabs } from "expo-router";
import { Pressable, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const TABS_CONFIG = [
  {
    name: "index",
    label: "Home",
    icon: "home-outline",
    activeIcon: "home",
  },
  {
    name: "search",
    label: "Search",
    icon: "search-outline",
    activeIcon: "search",
  },
  {
    name: "settings",
    label: "Settings",
    icon: "settings-outline",
    activeIcon: "settings-outline",
  },
  {
    name: "library",
    label: "Library",
    icon: "bookmark-outline",
    activeIcon: "bookmark-outline",
  },
];

export default function HomeTabsLayout() {
  const { isDark } = useThemeProvider();

  // Dynamic Theme Colors
  const activeColor = isDark ? "#ffffff" : "#000000";
  const inactiveColor = isDark ? "#71717a" : "#92929b";
  const blurTint = isDark ? "prominent" : "light";
  const borderColor = isDark
    ? "rgba(255, 255, 255, 0.1)"
    : "rgba(0, 0, 0, 0.08)";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={({ navigation, state }) => (
        <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
          <BlurView
            tint={blurTint}
            intensity={80}
            style={[styles.tabBar, { borderColor }]}
          >
            {TABS_CONFIG.map((tab) => {
              const isFocused = state.routes[state.index]?.name === tab.name;

              return (
                <Pressable
                  key={tab.name}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: isFocused }}
                  onPress={() => navigation.navigate(tab.name)}
                  style={styles.tab}
                >
                  <Ionicons
                    name={isFocused ? tab.activeIcon : tab.icon}
                    size={21}
                    color={isFocused ? activeColor : inactiveColor}
                  />
                  {isFocused && (
                    <Text style={[styles.activeLabel, { color: activeColor }]}>
                      {tab.label}
                    </Text>
                  )}
                </Pressable>
              );
            })}
          </BlurView>
        </SafeAreaView>
      )}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="search" options={{ title: "Search" }} />
      <Tabs.Screen name="library" options={{ title: "Library" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
      {/* <Tabs.Screen name="more" options={{ title: "More" }} /> */}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  safeArea: { position: "absolute", left: 5, right: 5, bottom: 0 },
  tabBar: {
    height: 66,
    marginBottom: 6,
    paddingHorizontal: 7,
    paddingTop: 7,
    paddingBottom: 5,
    flexDirection: "row",
    alignItems: "stretch",
    justifyContent: "space-between",
    borderRadius: 19,
    backgroundColor: "transparent",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    overflow: "hidden",
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    borderRadius: 14,
  },
  activeLabel: { fontSize: 11, fontWeight: "600" },
});

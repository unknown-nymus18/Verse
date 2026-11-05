import { useThemeProvider } from "@/components/ThemeProvider";
import Ionicons from "@expo/vector-icons/Ionicons";
import { BlurView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Tabs, useRouter } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Single source of truth: `name` must match the file name inside this folder.
const TABS = [
  {
    name: "index",
    path: "/",
    label: "Home",
    icon: "home-outline",
    activeIcon: "home",
  },
  {
    name: "search",
    path: "/search",
    label: "Search",
    icon: "search-outline",
    activeIcon: "search",
  },
  {
    name: "library",
    path: "/library",
    label: "Library",
    icon: "bookmark-outline",
    activeIcon: "bookmark",
  },
  {
    name: "settings",
    path: "/settings",
    label: "Settings",
    icon: "settings-outline",
    activeIcon: "settings",
  },
];

const TABS_BY_NAME = Object.fromEntries(TABS.map((tab) => [tab.name, tab]));

function AppTabBar(props) {
  const { state, navigation } = props;
  const { colors } = useThemeProvider();
  const router = useRouter();

  const {
    bgColor,
    activeColor,
    inactiveColor,
    blurTint,
    tabBarBorder: borderColor,
  } = colors;

  function handlePress(route, tab, isFocused) {
    if (navigation?.emit && navigation?.navigate) {
      // Let screens react to tab presses (scroll to top, reset a nested stack...)
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });

      if (!isFocused && !event.defaultPrevented) {
        Haptics.selectionAsync();
        navigation.navigate(route.name, route.params);
      }
      return;
    }

    // Fallback if the navigator doesn't pass `navigation` to the tab bar
    if (!isFocused) {
      Haptics.selectionAsync();
      router.navigate(tab.path);
    }
  }

  const items = state.routes.map((route, index) => {
    const tab = TABS_BY_NAME[route.name];
    if (!tab) return null; // ignore routes that aren't real tabs

    const isFocused = state.index === index;

    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityLabel={tab.label}
        accessibilityState={{ selected: isFocused }}
        onPress={() => handlePress(route, tab, isFocused)}
        onLongPress={() =>
          navigation?.emit?.({ type: "tabLongPress", target: route.key })
        }
        style={({ pressed }) => [styles.tab, pressed && styles.tabPressed]}
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
  });

  if (Platform.OS === "ios") {
    return (
      <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
        <BlurView
          tint={blurTint}
          intensity={80}
          style={[styles.tabBar, { borderColor }]}
        >
          {items}
        </BlurView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} style={{ backgroundColor: bgColor }}>
      <View
        style={[
          styles.flatBar,
          { backgroundColor: bgColor, borderTopColor: borderColor },
        ]}
      >
        {items}
      </View>
    </SafeAreaView>
  );
}

export default function HomeTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        freezeOnBlur: true, // stop re-rendering tabs you're not looking at
      }}
      tabBar={(props) => <AppTabBar {...props} />}
    >
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{ title: tab.label }}
        />
      ))}
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
  flatBar: {
    padding: 10,
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    borderRadius: 14,
  },
  tabPressed: { opacity: 0.6 },
  activeLabel: { fontSize: 11, fontWeight: "600" },
});

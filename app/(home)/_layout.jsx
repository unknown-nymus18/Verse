import AppBlurView from "@/components/AppBlurView";
import { useThemeProvider } from "@/components/ThemeProvider";
import Ionicons from "@expo/vector-icons/Ionicons";
import { BlurTargetView } from "expo-blur";
import * as Haptics from "expo-haptics";
import { Tabs, useRouter } from "expo-router";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

function TabBarBridge({ state, navigation, onChange }) {
  const signature = `${state.index}:${state.routes.map((r) => r.key).join(",")}`;

  useLayoutEffect(() => {
    onChange({ state, navigation });
  }, [signature]);

  return null;
}

function AppTabBar({ state, navigation, blurTarget }) {
  const { colors } = useThemeProvider();
  const router = useRouter();

  const {
    activeColor,
    inactiveColor,
    blurTint,
    tabBarBorder: borderColor,
  } = colors;

  const [pressedIndex, setPressedIndex] = useState(null);
  const activeIndex = pressedIndex !== null ? pressedIndex : state.index;

  useEffect(() => {
    setPressedIndex(null);
  }, [state.index]);

  function handlePress(route, tab, isFocused, index) {
    if (isFocused) return;

    setPressedIndex(index);
    Haptics.selectionAsync().catch(() => {});

    if (navigation?.emit && navigation?.navigate) {
      const event = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });

      if (!event.defaultPrevented) {
        navigation.navigate(route.name, route.params);
      }
      return;
    }

    router.navigate(tab.path);
  }

  const items = state.routes.map((route, index) => {
    const tab = TABS_BY_NAME[route.name];
    if (!tab) return null;

    const isFocused = activeIndex === index;

    return (
      <Pressable
        key={route.key}
        accessibilityRole="tab"
        accessibilityLabel={tab.label}
        accessibilityState={{ selected: isFocused }}
        onPress={() => handlePress(route, tab, isFocused, index)}
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

  return (
    <SafeAreaView
      edges={["bottom"]}
      style={styles.safeArea}
      pointerEvents="box-none"
    >
      <AppBlurView
        blurTarget={blurTarget}
        intensity={60}
        style={[styles.tabBar, { borderColor }]}
      >
        {items}
      </AppBlurView>
    </SafeAreaView>
  );
}

export default function HomeTabsLayout() {
  const blurTargetRef = useRef(null);
  const [barProps, setBarProps] = useState(null);

  const renderTabBar = useCallback(
    (props) => <TabBarBridge {...props} onChange={setBarProps} />,
    [],
  );

  return (
    <View style={styles.root}>
      <BlurTargetView ref={blurTargetRef} style={styles.root}>
        <Tabs
          screenOptions={{
            headerShown: false,
            freezeOnBlur: false,
            lazy: true,
          }}
          tabBar={renderTabBar}
        >
          {TABS.map((tab) => (
            <Tabs.Screen
              key={tab.name}
              name={tab.name}
              options={{ title: tab.label }}
            />
          ))}
        </Tabs>
      </BlurTargetView>

      {barProps && <AppTabBar {...barProps} blurTarget={blurTargetRef} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
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
  tabPressed: { opacity: 0.6 },
  activeLabel: { fontSize: 11, fontWeight: "600" },
});

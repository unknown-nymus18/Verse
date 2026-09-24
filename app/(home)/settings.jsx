import { StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeProvider } from "../../components/ThemeProvider";

export default function SettingsScreen() {
  const { isDark, colorScheme, toggleTheme } = useThemeProvider();
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colorScheme.background,
        },
      ]}
    >
      <SafeAreaView edges={["top"]}>
        <View
          style={[
            styles.listTile,
            {
              borderColor: "grey",
              borderWidth: 1,
              borderRadius: 12,
            },
          ]}
        >
          <Text style={[styles.title, { color: isDark ? "white" : "black" }]}>
            Dark Mode
          </Text>
          <Switch value={isDark} onChange={toggleTheme}></Switch>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "flex-start",
  },
  listTile: {
    // flex: 1,
    flexDirection: "row",
    width: "auto",
    justifyContent: "space-between",
    alignContent: "center",
    padding: 10,
    marginHorizontal: 10,
  },
  title: {
    alignSelf: "center",
    fontSize: 16,
    fontWeight: "600",
  },
});

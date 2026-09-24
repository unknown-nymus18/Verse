import { StyleSheet, Switch, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeProvider } from "../../components/ThemeProvider";

export default function SettingsScreen() {
  const { isDark, colorScheme, toggleTheme } = useThemeProvider();
  console.log(colorScheme.textPrimary);
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
        <Switch value={isDark} onChange={toggleTheme}></Switch>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "flex-start",
    alignItems: "center",
  },
});

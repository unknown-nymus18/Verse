import { Dimensions, ScrollView, StyleSheet, View } from "react-native";
import Skeleton from "./Skeleton";
import { useThemeProvider } from "./ThemeProvider";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function HomeScreenSkeleton() {
  const { isDark } = useThemeProvider();
  const bgColor = isDark ? "#08090b" : "#ffffff";

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: bgColor }]}
      showsVerticalScrollIndicator={false}
    >
      <Skeleton
        width={SCREEN_WIDTH}
        height={500}
        borderRadius={0}
        style={styles.hero}
      />

      <View style={styles.row}>
        <Skeleton
          width={110}
          height={22}
          borderRadius={4}
          style={styles.title}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[1, 2, 3, 4].map((key) => (
            <Skeleton key={key} width={130} height={190} style={styles.card} />
          ))}
        </ScrollView>
      </View>

      <View style={styles.row}>
        <Skeleton
          width={140}
          height={22}
          borderRadius={4}
          style={styles.title}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[1, 2, 3, 4].map((key) => (
            <Skeleton key={key} width={130} height={190} style={styles.card} />
          ))}
        </ScrollView>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { marginBottom: 35 },
  row: { marginBottom: 28, paddingLeft: 16 },
  title: { marginBottom: 14 },
  card: { marginRight: 12 },
});

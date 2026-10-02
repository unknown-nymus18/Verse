import { Dimensions, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Skeleton from "./Skeleton";
import { useThemeProvider } from "./ThemeProvider";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");
const HERO_HEIGHT = SCREEN_HEIGHT * 0.4;

export default function DetailsScreenSkeleton({ isTv = false }) {
  const { isDark } = useThemeProvider();
  const bgColor = isDark ? "#08090b" : "#ffffff";

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={[styles.hero, { height: HERO_HEIGHT }]}>
        <Skeleton
          width={SCREEN_WIDTH}
          height={HERO_HEIGHT}
          borderRadius={0}
          style={StyleSheet.absoluteFill}
        />
      </View>

      <SafeAreaView style={styles.bottomSafeArea} edges={["bottom"]}>
        <ScrollView
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
        >
          <Skeleton width="72%" height={34} borderRadius={5} />
          <View style={styles.stats}>
            <Skeleton width={42} height={13} borderRadius={4} />
            <Skeleton width={74} height={13} borderRadius={4} />
            <Skeleton width={48} height={13} borderRadius={4} />
          </View>

          <View style={styles.genres}>
            <Skeleton width={72} height={27} borderRadius={14} />
            <Skeleton width={88} height={27} borderRadius={14} />
            <Skeleton width={64} height={27} borderRadius={14} />
          </View>

          <Skeleton
            width={96}
            height={19}
            borderRadius={4}
            style={styles.sectionTitle}
          />
          <View style={styles.overview}>
            <Skeleton width="100%" height={13} borderRadius={4} />
            <Skeleton width="96%" height={13} borderRadius={4} />
            <Skeleton width="78%" height={13} borderRadius={4} />
          </View>

          <Skeleton
            width={58}
            height={19}
            borderRadius={4}
            style={styles.sectionTitle}
          />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.castList}
          >
            {[1, 2, 3, 4].map((item) => (
              <View key={item} style={styles.castCard}>
                <Skeleton width={72} height={72} borderRadius={36} />
                <Skeleton width="84%" height={11} borderRadius={4} />
                <Skeleton width="64%" height={10} borderRadius={4} />
              </View>
            ))}
          </ScrollView>

          {isTv ? (
            <>
              <Skeleton
                width={76}
                height={19}
                borderRadius={4}
                style={styles.sectionTitle}
              />
              <Skeleton
                width="100%"
                height={44}
                borderRadius={10}
                style={styles.seasonPicker}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.episodeList}
              >
                {[1, 2, 3].map((item) => (
                  <View key={item} style={styles.episodeCard}>
                    <Skeleton width={200} height={112} borderRadius={0} />
                    <Skeleton width={140} height={13} borderRadius={4} />
                    <Skeleton width={82} height={11} borderRadius={4} />
                  </View>
                ))}
              </ScrollView>
            </>
          ) : (
            <>
              <Skeleton
                width={112}
                height={19}
                borderRadius={4}
                style={styles.sectionTitle}
              />
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recommendations}
              >
                {[1, 2, 3, 4].map((item) => (
                  <View key={item} style={styles.recommendation}>
                    <Skeleton width={110} height={165} />
                    <Skeleton width={94} height={12} borderRadius={4} />
                  </View>
                ))}
              </ScrollView>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  hero: { width: "100%", overflow: "hidden" },
  heroContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 22,
  },
  actions: { flexDirection: "row", alignItems: "center", gap: 12 },
  bottomSafeArea: { flex: 1 },
  bodyContent: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 32 },
  stats: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 8 },
  genres: { flexDirection: "row", gap: 8, marginTop: 14 },
  sectionTitle: { marginTop: 20, marginBottom: 10 },
  overview: { gap: 8 },
  castList: { gap: 12, paddingRight: 14 },
  castCard: { width: 90, alignItems: "center", gap: 5 },
  seasonPicker: { marginBottom: 10 },
  episodeList: { gap: 12, paddingRight: 14 },
  episodeCard: { width: 200, gap: 7, paddingBottom: 4 },
  recommendations: { gap: 12, paddingRight: 14 },
  recommendation: { width: 110, gap: 7 },
});

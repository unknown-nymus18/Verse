import { Dimensions, ScrollView, StyleSheet, View } from "react-native";
import Skeleton from "./Skeleton";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = (SCREEN_WIDTH - 44) / 3;

export default function SearchScreenSkeleton({ paddingTop, showFeatured }) {
  return (
    <ScrollView
      contentContainerStyle={[styles.content, { paddingTop }]}
      showsVerticalScrollIndicator={false}
    >
      {showFeatured && (
        <View style={styles.featured}>
          <Skeleton width={105} height={158} />
          <View style={styles.featuredDetails}>
            <Skeleton width="85%" height={22} borderRadius={4} />
            <Skeleton width="100%" height={12} borderRadius={4} />
            <Skeleton width="92%" height={12} borderRadius={4} />
            <Skeleton width="68%" height={12} borderRadius={4} />
          </View>
        </View>
      )}

      {[1, 2, 3].map((row) => (
        <View key={row} style={styles.row}>
          {[1, 2, 3].map((card) => (
            <View key={card} style={styles.card}>
              <Skeleton width={CARD_WIDTH} height={CARD_WIDTH * 1.5} />
              <Skeleton
                width="90%"
                height={14}
                borderRadius={4}
                style={styles.title}
              />
              <Skeleton width="70%" height={11} borderRadius={4} />
            </View>
          ))}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 110 },
  featured: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  featuredDetails: { flex: 1, gap: 10, paddingTop: 4 },
  row: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  card: { width: CARD_WIDTH, gap: 5 },
  title: { marginTop: 3 },
});

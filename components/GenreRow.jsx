import { memo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import MovieCard from "./Moviecard";
import { useThemeProvider } from "./ThemeProvider";

function GenreRow({ genreName = "Top-10", movies }) {
  const { isDark } = useThemeProvider();

  const textColor = isDark ? "#ffffff" : "#17181c";

  return (
    <View style={styles.genreSection}>
      <Text style={[styles.genreTitle, { color: textColor }]}>{genreName}</Text>
      <FlatList
        horizontal
        data={movies}
        keyExtractor={(item) => String(item.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.genreList}
        // Virtualization tuning: only keep a small window of off-screen
        // cards mounted, since each card renders an image.
        initialNumToRender={6}
        maxToRenderPerBatch={6}
        windowSize={5}
        removeClippedSubviews
        renderItem={({ item }) => (
          <MovieCard
            {...item}
            media_type={item.media_type ?? "movie"}
            width={120}
            style={styles.genreCard}
          />
        )}
      />
    </View>
  );
}

export default memo(GenreRow);

const styles = StyleSheet.create({
  genreSection: { marginBottom: 24 },
  genreTitle: {
    fontSize: 18,
    fontWeight: "700",
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  genreList: { paddingHorizontal: 14 },
  genreCard: { marginRight: 12 },
});

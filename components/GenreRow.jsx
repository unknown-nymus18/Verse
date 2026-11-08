import { memo } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import MovieCard from "./Moviecard";
import { useThemeProvider } from "./ThemeProvider";

function GenreRow({ genreName = "Top-10", movies }) {
  const { colors } = useThemeProvider();
  const { textColor } = colors;

  return (
    <View style={styles.genreSection}>
      {movies && (
        <Text style={[styles.genreTitle, { color: textColor }]}>
          {genreName}
        </Text>
      )}
      <FlatList
        horizontal
        data={movies}
        keyExtractor={(item) => String(item.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.genreList}
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

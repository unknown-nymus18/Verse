import { ScrollView, StyleSheet, Text, View } from "react-native";
import MovieCard from "./Moviecard";
import { useThemeProvider } from "./ThemeProvider";

export default function GenreRow({ genreName, movies }) {
  const { isDark } = useThemeProvider();

  const textColor = isDark ? "#ffffff" : "#17181c";

  return (
    <View style={styles.genreSection}>
      <Text style={[styles.genreTitle, { color: textColor }]}>{genreName}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.genreList}
      >
        {movies.map((item) => (
          <MovieCard
            key={item.id}
            {...item}
            media_type={item.media_type ?? "movie"}
            width={100}
            style={styles.genreCard}
          />
        ))}
      </ScrollView>
    </View>
  );
}

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

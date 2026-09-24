import { router } from "expo-router";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useThemeProvider } from "./ThemeProvider";

export default function GenreRow({ genreName, movies }) {
  const { isDark } = useThemeProvider();

  // Dynamic Theme Colors
  const textColor = isDark ? "#ffffff" : "#17181c";
  const metaColor = isDark ? "#a1a1aa" : "#8b8d94";
  const imageBg = isDark ? "#18181b" : "#e5e5e5";

  return (
    <View style={styles.genreSection}>
      <Text style={[styles.genreTitle, { color: textColor }]}>{genreName}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.genreList}
      >
        {movies.map((item) => (
          <Pressable
            key={item.id}
            style={styles.genreCard}
            onPress={() =>
              router.push({
                pathname: "/details",
                params: { id: String(item.id) },
              })
            }
          >
            <Image
              source={{
                uri: `https://image.tmdb.org/t/p/w342${item.poster_path}`,
              }}
              style={[styles.genreCardImage, { backgroundColor: imageBg }]}
            />
            <Text
              numberOfLines={1}
              style={[styles.genreCardTitle, { color: textColor }]}
            >
              {item.title}
            </Text>
            <Text style={[styles.genreCardMeta, { color: metaColor }]}>
              {item.vote_average?.toFixed(1)}
            </Text>
          </Pressable>
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
  genreCard: { width: 100, marginRight: 12 },
  genreCardImage: {
    width: 100,
    height: 150,
    borderRadius: 6,
  },
  genreCardTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 6,
  },
  genreCardMeta: { fontSize: 11 },
});

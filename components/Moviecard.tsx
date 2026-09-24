import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useThemeProvider } from "./ThemeProvider";

interface Props {
  adult: boolean;
  backdrop_path: string | null;
  id: number;
  title?: string;
  original_title?: string;
  name?: string;
  original_name?: string;
  overview: string;
  poster_path: string | null;
  media_type: "movie" | "tv";
  original_language: string;
  genre_ids: number[];
  popularity: number;
  release_date?: string;
  first_air_date?: string;
  softcore: boolean;
  video: boolean;
  vote_average: number;
  vote_count: number;
}

export default function MovieCard({
  adult,
  backdrop_path: backdropPath,
  id,
  title: movieTitle,
  original_title: originalTitle,
  name: tvName,
  original_name: originalName,
  overview,
  poster_path: posterPath,
  release_date: releaseDate,
  first_air_date: firstAirDate,
  media_type: mediaType,
  original_language: originalLanguage,
  genre_ids: genreIds,
  popularity,
  softcore,
  video,
  vote_average: voteAverage,
  vote_count: voteCount,
}: Props) {
  const title =
    movieTitle || tvName || originalTitle || originalName || "Untitled";
  const year = (releaseDate ?? firstAirDate)?.slice(0, 4) ?? "-";
  const type = mediaType === "tv" ? "Series" : "Movie";

  const { isDark } = useThemeProvider();

  // Dynamic Theme Colors
  const textColor = isDark ? "#ffffff" : "#111111";
  const ratingColor = isDark ? "#d4d4d8" : "#222222";
  const detailColor = isDark ? "#a1a1aa" : "#777777";
  const posterBg = isDark ? "#18181b" : "#e5e5e5";
  const placeholderBg = isDark ? "#27272a" : "#d4d4d8";

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => {
        router.push({
          pathname: "/details",
          params: {
            id: String(id),
          },
        });
      }}
    >
      {posterPath ? (
        <Image
          style={[styles.poster, { backgroundColor: posterBg }]}
          source={{
            uri: `https://image.tmdb.org/t/p/w780${posterPath}`,
          }}
        />
      ) : (
        <View style={[styles.poster, { backgroundColor: placeholderBg }]} />
      )}
      <Text numberOfLines={1} style={[styles.title, { color: textColor }]}>
        {title}
      </Text>
      <View style={styles.metadata}>
        {voteAverage != null && (
          <>
            <Ionicons name="star" size={13} color="#ffc400" />
            <Text style={[styles.rating, { color: ratingColor }]}>
              {voteAverage.toFixed(1)}
            </Text>
          </>
        )}
        <Text style={[styles.detail, { color: detailColor }]}>{year}</Text>
        <Text style={[styles.detail, { color: detailColor }]}>{type}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "31.5%",
  },
  poster: {
    width: "100%",
    aspectRatio: 2 / 3,
    borderRadius: 8,
  },
  title: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "600",
  },
  metadata: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 5,
  },
  rating: {
    fontSize: 11,
    fontWeight: "600",
  },
  detail: {
    fontSize: 11,
    marginLeft: 4,
  },
});

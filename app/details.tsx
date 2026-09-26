import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";

import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeProvider } from "../components/ThemeProvider";
import { getMovieDetails } from "../services/ApiServices";

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

function imageUrl(path: string | null | undefined, size: string) {
  return path ? `${IMAGE_BASE_URL}/${size}${path}` : null;
}

interface Genre {
  id: number;
  name: string;
}

interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

interface RecommendationItem {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  media_type?: string;
}

interface MovieDetails {
  id: number;
  title?: string;
  name?: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  vote_average: number;
  genres?: Genre[];
  credits?: { cast: CastMember[] };
  recommendations?: { results: RecommendationItem[] };
}

export default function DetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { isDark } = useThemeProvider();

  // Dynamic Theme Colors
  const bgColor = isDark ? "#08090b" : "#ffffff";
  const primaryText = isDark ? "#ffffff" : "#17181c";
  const secondaryText = isDark ? "#a1a1aa" : "#54565c";
  const subText = isDark ? "#71717a" : "#8b8d94";
  const cardBg = isDark ? "#18181b" : "#f1f1f3";
  const imagePlaceholder = isDark ? "#27272a" : "#e5e5e5";
  const listBtnBg = isDark ? "#18181b" : "#ffffff";
  const listBtnBorder = isDark ? "#27272a" : "#e1e2e5";
  const playBtnBg = isDark ? "#ffffff" : "#08090b";
  const playBtnText = isDark ? "#08090b" : "#ffffff";

  const [movie, setMovie] = useState<MovieDetails | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function getMovieData() {
    try {
      setLoading(true);
      setError(null);
      const response = await getMovieDetails(id);
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const data: MovieDetails = await response.json();
      setMovie(data);
    } catch (e) {
      console.error("Unable to load movie details", e);
      setError("Couldn't load this movie right now.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) getMovieData();
  }, [id]);

  function goToRecommendation(item: RecommendationItem) {
    router.replace({
      pathname: "/details",
      params: { id: String(item.id) },
    });
  }

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: bgColor }]}>
        <ActivityIndicator size="large" color={primaryText} />
      </View>
    );
  }

  if (error || !movie) {
    return (
      <View style={[styles.center, { backgroundColor: bgColor }]}>
        <Text style={styles.errorText}>{error ?? "Movie not found"}</Text>
        <Pressable
          style={[styles.retryButton, { backgroundColor: primaryText }]}
          onPress={getMovieData}
        >
          <Text style={[styles.retryText, { color: bgColor }]}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const displayTitle = movie.title || movie.name || "Untitled";
  const releaseDate = movie.release_date || movie.first_air_date;
  const cast = movie.credits?.cast ?? [];
  const recommendations = movie.recommendations?.results ?? [];
  const backdropUrl = imageUrl(movie.backdrop_path, "w780");

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ImageBackground
        style={[styles.poster, { backgroundColor: imagePlaceholder }]}
        imageStyle={styles.posterImage}
        resizeMode="cover"
        source={backdropUrl ? { uri: backdropUrl } : undefined}
      >
        <LinearGradient
          pointerEvents="none"
          colors={
            isDark
              ? ["rgba(8, 9, 11, 0)", "rgba(8, 9, 11, 0.65)", "#08090b"]
              : [
                  "rgba(255, 255, 255, 0)",
                  "rgba(255, 255, 255, 0.35)",
                  "#ffffff",
                ]
          }
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.fade}
        />
        <View style={styles.content}>
          <SafeAreaView edges={["top"]} style={styles.topSafeArea}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </Pressable>
          </SafeAreaView>
          <View style={styles.actions}>
            <Pressable
              style={[styles.button, { backgroundColor: playBtnBg }]}
              onPress={() => {
                router.push({
                  pathname: "/play",
                  params: {
                    id: id,
                    type: "movie",
                  },
                });
              }}
            >
              <Ionicons name="play" size={14} color={playBtnText} />
              <Text style={[styles.playText, { color: playBtnText }]}>
                Play Now
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.button,
                {
                  backgroundColor: listBtnBg,
                  borderColor: listBtnBorder,
                  borderWidth: 1,
                },
              ]}
            >
              <Ionicons name="bookmark-outline" size={17} color={primaryText} />
              <Text style={[styles.listText, { color: primaryText }]}>
                Add to List
              </Text>
            </Pressable>
          </View>
        </View>
      </ImageBackground>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: primaryText }]}>
          {displayTitle}
        </Text>

        <View style={styles.stats}>
          <Text style={[styles.statsText, { color: secondaryText }]}>
            {movie.vote_average?.toFixed(1)}/10.0
          </Text>
          {!!releaseDate && (
            <Text style={[styles.statsText, { color: secondaryText }]}>
              {releaseDate}
            </Text>
          )}
          {!!movie.runtime && (
            <Text style={[styles.statsText, { color: secondaryText }]}>
              {movie.runtime} min
            </Text>
          )}
        </View>

        {!!movie.genres?.length && (
          <View style={styles.genreRow}>
            {movie.genres.map((genre) => (
              <View
                key={genre.id}
                style={[styles.genreChip, { backgroundColor: cardBg }]}
              >
                <Text style={[styles.genreText, { color: primaryText }]}>
                  {genre.name}
                </Text>
              </View>
            ))}
          </View>
        )}

        {!!movie.overview && (
          <>
            <Text style={[styles.sectionTitle, { color: primaryText }]}>
              Overview
            </Text>
            <Text style={[styles.overview, { color: secondaryText }]}>
              {movie.overview}
            </Text>
          </>
        )}

        {!!cast.length && (
          <>
            <Text style={[styles.sectionTitle, { color: primaryText }]}>
              Cast
            </Text>
            <FlatList
              data={cast.slice(0, 15)}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => {
                const photoUrl = imageUrl(item.profile_path, "w200");
                return (
                  <View style={styles.castCard}>
                    {photoUrl ? (
                      <Image
                        source={{ uri: photoUrl }}
                        style={[
                          styles.castPhoto,
                          { backgroundColor: imagePlaceholder },
                        ]}
                      />
                    ) : (
                      <View
                        style={[
                          styles.castPhoto,
                          { backgroundColor: imagePlaceholder },
                        ]}
                      />
                    )}
                    <Text
                      style={[styles.castName, { color: primaryText }]}
                      numberOfLines={1}
                    >
                      {item.name}
                    </Text>
                    <Text
                      style={[styles.castCharacter, { color: subText }]}
                      numberOfLines={1}
                    >
                      {item.character}
                    </Text>
                  </View>
                );
              }}
            />
          </>
        )}

        {!!recommendations.length && (
          <>
            <Text style={[styles.sectionTitle, { color: primaryText }]}>
              Recommended
            </Text>
            <FlatList
              data={recommendations.slice(0, 15)}
              horizontal
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => String(item.id)}
              contentContainerStyle={styles.horizontalList}
              renderItem={({ item }) => {
                const recPosterUrl = imageUrl(item.poster_path, "w200");
                return (
                  <Pressable
                    style={styles.recCard}
                    onPress={() => goToRecommendation(item)}
                  >
                    {recPosterUrl ? (
                      <Image
                        source={{ uri: recPosterUrl }}
                        style={[
                          styles.recPoster,
                          { backgroundColor: imagePlaceholder },
                        ]}
                      />
                    ) : (
                      <View
                        style={[
                          styles.recPoster,
                          { backgroundColor: imagePlaceholder },
                        ]}
                      />
                    )}
                    <Text
                      style={[styles.recTitle, { color: primaryText }]}
                      numberOfLines={2}
                    >
                      {item.title || item.name}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  errorText: {
    color: "#c0392b",
    fontSize: 15,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 7,
  },
  retryText: {
    fontSize: 13,
    fontWeight: "700",
  },
  poster: {
    height: "40%",
    width: "100%",
    overflow: "hidden",
  },
  posterImage: {
    height: "100%",
    width: "100%",
  },
  fade: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
    height: "44%",
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 22,
    zIndex: 1,
  },
  topSafeArea: {
    width: "100%",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  button: {
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 18,
    borderRadius: 7,
  },
  playText: {
    fontSize: 13,
    fontWeight: "700",
  },
  listText: {
    fontSize: 13,
    fontWeight: "600",
  },
  body: {
    flex: 1,
    width: "100%",
  },
  bodyContent: {
    paddingHorizontal: 14,
    paddingBottom: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    marginTop: 16,
  },
  stats: {
    flexDirection: "row",
    gap: 14,
    marginTop: 6,
  },
  statsText: {
    fontSize: 13,
  },
  genreRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 14,
  },
  genreChip: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  genreText: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 18,
    marginBottom: 10,
  },
  overview: {
    fontSize: 14,
    lineHeight: 20,
  },
  horizontalList: {
    paddingRight: 14,
  },
  castCard: {
    width: 90,
    marginRight: 12,
  },
  castPhoto: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  castName: {
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
  },
  castCharacter: {
    fontSize: 11,
    textAlign: "center",
  },
  recCard: {
    width: 110,
    marginRight: 12,
  },
  recPoster: {
    width: 110,
    height: 165,
    borderRadius: 8,
  },
  recTitle: {
    fontSize: 12,
    marginTop: 6,
  },
});

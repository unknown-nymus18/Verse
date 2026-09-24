import GenreRow from "@/components/GenreRow";
import { useEffect, useState } from "react";
import { useThemeProvider } from "../../components/ThemeProvider";

import {
  ActivityIndicator,
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { getAllMovies, getGenreMovies } from "../../services/ApiServices";

import MovieCard from "@/components/Moviecard";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

const GENRES = {
  Action: 28,
  Animation: 16,
  Drama: 18,
  Fantasy: 14,
  Horrow: 27,
  Mystery: 9648,
  "Sci-Fi": 878,
};

function chunk(items, size) {
  const rows = [];
  for (let i = 0; i < items.length; i += size) {
    rows.push(items.slice(i, i + size));
  }
  return rows;
}

export default function HomeScreen() {
  const { isDark } = useThemeProvider();

  // Dynamic theme colors
  const bgColor = isDark ? "#08090b" : "#ffffff";
  const textColor = isDark ? "#ffffff" : "#08090b";
  const posterBg = isDark ? "#18181b" : "#e5e5e5";

  const [movies, setMovies] = useState([]);
  const [moviesByGenre, setMoviesByGenre] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function getData(pageToLoad = 1) {
    try {
      const response = await getAllMovies(pageToLoad);
      if (!response.ok)
        throw new Error(`Request failed with status ${response.status}`);

      const data = await response.json();
      const newMovies = data.results ?? [];

      setMovies((currentMovies) =>
        pageToLoad === 1 ? newMovies : [...currentMovies, ...newMovies],
      );
      setPage(pageToLoad);
    } catch (error) {
      console.error("Unable to load trending movies", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function getGenreData() {
    try {
      const entries = await Promise.all(
        Object.entries(GENRES).map(async ([name, id]) => {
          const res = await getGenreMovies(id);
          const data = await res.json();
          return [name, data.results ?? []];
        }),
      );
      setMoviesByGenre(Object.fromEntries(entries));
    } catch (error) {
      console.error("Unable to load genre movies", error);
    }
  }

  useEffect(() => {
    getData(1);
    getGenreData();
  }, []);

  async function onRefresh() {
    setIsRefreshing(true);
    try {
      await Promise.all([getData(1), getGenreData()]);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function loadMore() {
    if (isLoadingMore || page >= 500) return;
    setIsLoadingMore(true);
    try {
      await getData(page + 1);
    } finally {
      setIsLoadingMore(false);
    }
  }

  function handleScroll({ nativeEvent }) {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    const paddingToBottom = 200;
    const isNearBottom =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom;
    if (isNearBottom) loadMore();
  }

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: bgColor }]}>
        <ActivityIndicator size="large" color={textColor} />
      </View>
    );
  }

  const gridMovies = movies.slice(1, movies.length);
  const rows = chunk(gridMovies, 3);
  const featured = movies[0];
  const imageUrl = featured?.poster_path
    ? `https://image.tmdb.org/t/p/w780${featured.poster_path}`
    : null;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={textColor}
            colors={[textColor]}
          />
        }
      >
        {!!featured && (
          <Pressable
            style={styles.heroWrapper}
            onPress={() =>
              router.push({
                pathname: "/details",
                params: { id: String(featured.id) },
              })
            }
          >
            <ImageBackground
              style={[styles.poster, { backgroundColor: posterBg }]}
              imageStyle={styles.posterImage}
              resizeMode="cover"
              source={imageUrl ? { uri: imageUrl } : undefined}
            >
              <LinearGradient
                pointerEvents="none"
                colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0)"]}
                locations={[0, 0.5]}
                style={styles.topFade}
              />
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
            </ImageBackground>
          </Pressable>
        )}
        {Object.keys(GENRES).map((genreName) => (
          <GenreRow
            key={genreName}
            genreName={genreName}
            movies={moviesByGenre[genreName] ?? []}
          />
        ))}

        {rows.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((item, itemIndex) => (
              <MovieCard
                key={item.id ?? `${rowIndex}-${itemIndex}`}
                adult={item.adult}
                backdrop_path={item.backdrop_path}
                id={item.id}
                title={item.title}
                original_title={item.original_title}
                name={item.name}
                original_name={item.original_name}
                overview={item.overview}
                poster_path={item.poster_path}
                media_type={item.media_type}
                original_language={item.original_language}
                genre_ids={item.genre_ids}
                popularity={item.popularity}
                release_date={item.release_date}
                first_air_date={item.first_air_date}
                softcore={item.softcore}
                video={item.video}
                vote_average={item.vote_average}
                vote_count={item.vote_count}
              />
            ))}
            {row.length < 3 &&
              Array.from({ length: 3 - row.length }).map((_, i) => (
                <View key={`spacer-${i}`} style={styles.spacer} />
              ))}
          </View>
        ))}

        {isLoadingMore && (
          <View style={styles.loadingMore}>
            <ActivityIndicator color={textColor} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingMore: { paddingVertical: 20 },
  list: { paddingBottom: 90 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  spacer: { flex: 1, marginHorizontal: 6 },

  heroWrapper: { height: 500, marginBottom: 40 },
  poster: {
    height: "100%",
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
  },
  posterImage: { height: "100%", width: "100%" },
  topFade: { position: "absolute", top: 0, left: 0, right: 0, height: "50%" },
  fade: { position: "absolute", right: 0, bottom: 0, left: 0, height: "44%" },
});

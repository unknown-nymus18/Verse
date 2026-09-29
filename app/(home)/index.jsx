import GenreRow from "@/components/GenreRow";
import { useCallback, useEffect, useMemo, useState } from "react";
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

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getGenreMovies, getTrendingMovies } from "../../services/ApiServices";

import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";

const GENRES = {
  Action: 28,
  Animation: 16,
  Drama: 18,
  Fantasy: 14,
  Horror: 27,
  Mystery: 9648,
  "Sci-Fi": 878,
  "TV-Film": 10770,
  Thriller: 53,
  Western: 37,
};

// Computed once, not on every render
const GENRE_ENTRIES = Object.entries(GENRES);

export default function HomeScreen() {
  const { isDark } = useThemeProvider();
  const { top } = useSafeAreaInsets();

  // Dynamic theme colors
  const bgColor = isDark ? "#08090b" : "#ffffff";
  const textColor = isDark ? "#ffffff" : "#08090b";
  const posterBg = isDark ? "#18181b" : "#e5e5e5";

  const [movies, setMovies] = useState([]);
  const [moviesByGenre, setMoviesByGenre] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const getData = useCallback(async (isMountedRef) => {
    try {
      const response = await getTrendingMovies();
      if (!response.ok)
        throw new Error(`Request failed with status ${response.status}`);

      const data = await response.json();
      const newMovies = data.results?.slice(0, 11) ?? [];
      if (isMountedRef.current) setMovies(newMovies);
    } catch (error) {
      console.error("Unable to load trending movies", error);
    }
  }, []);

  const getGenreData = useCallback(async (isMountedRef) => {
    const requests = GENRE_ENTRIES.map(async ([name, id]) => {
      try {
        const res = await getGenreMovies(id);
        if (!res.ok)
          throw new Error(`Request failed with status ${res.status}`);
        const data = await res.json();
        return [name, data.results ?? []];
      } catch (error) {
        console.error(`Unable to load ${name} movies`, error);
        return [name, []];
      }
    });

    const results = await Promise.all(requests);
    if (isMountedRef.current) {
      setMoviesByGenre((prev) => ({ ...prev, ...Object.fromEntries(results) }));
    }
  }, []);

  useEffect(() => {
    const isMountedRef = { current: true };
    setIsLoading(true);
    Promise.allSettled([
      getData(isMountedRef),
      getGenreData(isMountedRef),
    ]).then(() => {
      if (isMountedRef.current) setIsLoading(false);
    });
    return () => {
      isMountedRef.current = false;
    };
  }, [getData, getGenreData]);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    const isMountedRef = { current: true };
    try {
      await Promise.allSettled([
        getData(isMountedRef),
        getGenreData(isMountedRef),
      ]);
    } finally {
      setIsRefreshing(false);
    }
  }, [getData, getGenreData]);

  const featured = movies[0];
  const imageUrl = featured?.poster_path
    ? `https://image.tmdb.org/t/p/w780${featured.poster_path}`
    : null;

  // Avoid creating a new array reference on every render
  const topTenMovies = useMemo(() => movies.slice(1, 11), [movies]);

  if (isLoading) {
    return (
      <View style={[styles.loading, { backgroundColor: bgColor }]}>
        <ActivityIndicator size="large" color={textColor} />
      </View>
    );
  }

  // if(!moviesByGenre.values()){
  //   retru
  // }

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor={textColor}
            colors={[bgColor]}
            progressViewOffset={top + 22}
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

        <GenreRow key="Top-10" genreName="Top 10" movies={topTenMovies} />

        {GENRE_ENTRIES.map(([genreName]) => (
          <GenreRow
            key={genreName}
            genreName={genreName}
            movies={moviesByGenre[genreName] ?? []}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { flex: 1, justifyContent: "center", alignItems: "center" },
  list: { paddingBottom: 110 },
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

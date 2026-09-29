import GenreRow from "@/components/GenreRow";
import HomeScreenSkeleton from "@/components/HomeScreenSkeleton";
import { useCallback, useEffect, useRef, useState } from "react";
import { useThemeProvider } from "../../components/ThemeProvider";

import {
  Button,
  Dimensions,
  FlatList,
  ImageBackground,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
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
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const GENRE_ENTRIES = Object.entries(GENRES);

export default function HomeScreen() {
  const { isDark } = useThemeProvider();
  const { top } = useSafeAreaInsets();

  const bgColor = isDark ? "#08090b" : "#ffffff";
  const textColor = isDark ? "#ffffff" : "#08090b";
  const posterBg = isDark ? "#18181b" : "#e5e5e5";

  const [movies, setMovies] = useState([]);
  const [moviesByGenre, setMoviesByGenre] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [activeIndex, setActiveIndex] = useState(0);

  const flatListRef = useRef(null);
  const activeIndexRef = useRef(0);

  const topTen = movies.slice(0, 10);

  const updateActiveIndex = (index) => {
    activeIndexRef.current = index;
    setActiveIndex(index);
  };

  useEffect(() => {
    if (!topTen || topTen.length === 0) return;

    const interval = setInterval(() => {
      let nextIndex = activeIndexRef.current + 1;
      if (nextIndex >= topTen.length) {
        nextIndex = 0;
      }

      updateActiveIndex(nextIndex);

      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
    }, 7000);

    return () => clearInterval(interval);
  }, [topTen.length]);

  const onMomentumScrollEnd = (event) => {
    const newIndex = Math.round(
      event.nativeEvent.contentOffset.x / SCREEN_WIDTH,
    );
    updateActiveIndex(newIndex);
  };

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

  if (isLoading) {
    return <HomeScreenSkeleton></HomeScreenSkeleton>;
  }

  if (Object.keys(moviesByGenre).length === 0) {
    return (
      <View
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
      >
        <Text style={{ color: textColor }}>No Movies were found</Text>
        <Button title="Refresh Page" onPress={onRefresh}></Button>
      </View>
    );
  }

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
            progressViewOffset={top + 22}
          />
        }
      >
        {!!topTen && topTen.length > 0 && (
          <View style={styles.carouselContainer}>
            <FlatList
              ref={flatListRef}
              horizontal
              data={topTen}
              pagingEnabled={true}
              showsHorizontalScrollIndicator={false}
              decelerationRate="fast"
              onMomentumScrollEnd={onMomentumScrollEnd}
              onScrollToIndexFailed={(info) => {
                flatListRef.current?.scrollToOffset({
                  offset: info.index * SCREEN_WIDTH,
                  animated: true,
                });
              }}
              keyExtractor={(item, index) => `${index}-${item.id}`}
              renderItem={({ item }) => {
                const imageUrl = item?.poster_path
                  ? `https://image.tmdb.org/t/p/w780${item.poster_path}`
                  : null;
                return (
                  <Pressable
                    style={styles.heroWrapper}
                    onPress={() =>
                      router.push({
                        pathname: "/details",
                        params: { id: String(item.id) },
                      })
                    }
                  >
                    <ImageBackground
                      style={[styles.poster, { backgroundColor: posterBg }]}
                      imageStyle={styles.posterImage}
                      resizeMode="cover"
                      source={imageUrl ? { uri: imageUrl } : undefined}
                    >
                      <Text>{item.tagline}</Text>
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
                            ? [
                                "rgba(8, 9, 11, 0)",
                                "rgba(8, 9, 11, 0.65)",
                                "#08090b",
                              ]
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
                );
              }}
            />

            <View style={styles.paginationContainer}>
              {topTen.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    index === activeIndex
                      ? styles.activeDot
                      : [
                          styles.inactiveDot,
                          {
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.3)"
                              : "rgba(0,0,0,0.2)",
                          },
                        ],
                  ]}
                />
              ))}
            </View>
          </View>
        )}

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
  list: { paddingBottom: 30 },
  carouselContainer: {
    position: "relative",
    marginBottom: 20,
  },
  heroWrapper: {
    width: SCREEN_WIDTH,
    height: 500,
  },
  poster: {
    height: "100%",
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
  },
  posterImage: { height: "100%", width: "100%" },
  topFade: { position: "absolute", top: 0, left: 0, right: 0, height: "50%" },
  fade: { position: "absolute", right: 0, bottom: 0, left: 0, height: "44%" },
  paginationContainer: {
    position: "absolute",
    bottom: 15,
    flexDirection: "row",
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    height: 8,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  activeDot: {
    width: 20,
    backgroundColor: "#e50914",
  },
  inactiveDot: {
    width: 8,
  },
});

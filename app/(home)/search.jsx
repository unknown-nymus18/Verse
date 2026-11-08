import AppBlurView from "@/components/AppBlurView";
import MovieCard from "@/components/Moviecard";
import SearchScreenSkeleton from "@/components/SearchScreenSkeleton";
import { useThemeProvider } from "@/components/ThemeProvider";
import { getAllMovies, searchMovies } from "@/services/ApiServices";
import Ionicons from "@expo/vector-icons/Ionicons";

import { BlurTargetView } from "expo-blur";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useThemeProvider();
  const {
    bgColor,
    textColor,
    subTextColor,
    inputBorder,
    searchBlurTint,
    scrollTopBorder,
    scrollTopBg,
  } = colors;

  const [query, setQuery] = useState("");
  const [allMovies, setAllMovies] = useState([]);
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [trendingPageNumber, setTrendingPageNumber] = useState(1);
  const [isLoadingMoreTrending, setIsLoadingMoreTrending] = useState(false);

  const [searchResultsPage, setSearchResultsPage] = useState(1);
  const [totalSearchPages, setTotalSearchPages] = useState(1);
  const [isLoadingMoreResults, setIsLoadingMoreResults] = useState(false);
  const [istrendindRefresing, setTrendingRefreshing] = useState(false);

  const [showFilter, isShowFilter] = useState();
  const [selectedFilter, selectedFiter] = useState("All");

  const [isAtTop, setAtTop] = useState(true);
  const flatListRef = useRef(null);
  const blurTargetRef = useRef(null);

  const HEADER_HEIGHT = insets.top + 62;
  const bottomPadding = Math.max(insets.bottom + 85, 120);

  const FILTEROPTIONS = ["All", "Movies"];

  async function getallMoviesData(pageNumber = 1) {
    try {
      const response = await getAllMovies(pageNumber);
      if (!response.ok)
        throw new Error(`Request failed with status ${response.status}`);

      const data = await response.json();

      const newMovies =
        pageNumber === 1
          ? (data.results ?? [])
          : [...allMovies, ...(data.results ?? [])];

      setAllMovies(newMovies);
    } catch (error) {
      console.error("Unable to load trending movies", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMoreTrending() {
    if (isLoadingMoreTrending || trendingPageNumber > 8) return;
    setIsLoadingMoreTrending(true);
    try {
      const newPageNumber = trendingPageNumber + 1;
      setTrendingPageNumber(newPageNumber);
      await getallMoviesData(newPageNumber);
    } finally {
      setIsLoadingMoreTrending(false);
    }
  }

  async function loadMoreResults() {
    const trimmed = query.trim();
    if (
      trimmed.length === 0 ||
      isLoadingMoreResults ||
      searchResultsPage >= Math.min(totalSearchPages ?? 1, 10)
    )
      return;

    setIsLoadingMoreResults(true);
    try {
      const nextPage = searchResultsPage + 1;
      const response = await searchMovies(trimmed, nextPage);
      if (!response.ok)
        throw new Error(`Request failed with status ${response.status}`);
      const data = await response.json();
      setResults((prev) => [...prev, ...(data.results ?? [])]);
      setSearchResultsPage(nextPage);
      setTotalSearchPages(data.total_pages ?? 1);
    } catch (error) {
      console.error("Unable to load more search results", error);
    } finally {
      setIsLoadingMoreResults(false);
    }
  }

  function handleScroll(loadMoreFn) {
    return ({ nativeEvent }) => {
      const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
      setAtTop(!(contentOffset.y > 100));
      const paddingToBottom = 200;
      const isNearBottom =
        layoutMeasurement.height + contentOffset.y >=
        contentSize.height - paddingToBottom;
      if (isNearBottom) loadMoreFn();
    };
  }

  function scrollToTop() {
    flatListRef.current?.scrollToOffset({
      offset: Platform.OS === "ios" ? -HEADER_HEIGHT : 0,
      animated: true,
    });
  }

  async function onTrendingRefresh() {
    setTrendingRefreshing(true);
    const newTrendingPageNumber = 1;
    setTrendingPageNumber(newTrendingPageNumber);

    try {
      await getallMoviesData(newTrendingPageNumber);
    } finally {
      setTrendingRefreshing(false);
    }
  }

  useEffect(() => {
    getallMoviesData();
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setIsSearching(false);
      setResults([]);
      setSearchResultsPage(1);
      setTotalSearchPages(1);
      return;
    }

    let isCurrent = true;
    setIsSearching(true);

    const timeout = setTimeout(async () => {
      try {
        const response = await searchMovies(trimmed, 1);
        if (!response.ok)
          throw new Error(`Request failed with status ${response.status}`);
        const data = await response.json();
        if (isCurrent) {
          setResults(data.results ?? []);
          setSearchResultsPage(1);
          setTotalSearchPages(data.total_pages ?? 1);
        }
      } catch (error) {
        console.error("Search failed", error);
        if (isCurrent) setResults([]);
      } finally {
        if (isCurrent) setIsSearching(false);
      }
    }, 400);

    return () => {
      isCurrent = false;
      clearTimeout(timeout);
    };
  }, [query]);

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <BlurTargetView
        ref={blurTargetRef}
        style={[styles.container, { backgroundColor: bgColor }]}
      >
        {isLoading || isSearching ? (
          <SearchScreenSkeleton
            paddingTop={HEADER_HEIGHT}
            showFeatured={query.trim().length > 0}
          />
        ) : query === "" ? (
          <FlatList
            onScroll={handleScroll(loadMoreTrending)}
            ref={flatListRef}
            data={allMovies}
            refreshControl={
              <RefreshControl
                refreshing={istrendindRefresing}
                onRefresh={onTrendingRefresh}
                progressViewOffset={HEADER_HEIGHT}
              />
            }
            contentInsetAdjustmentBehavior="never"
            contentInset={
              Platform.OS === "ios" ? { top: HEADER_HEIGHT } : undefined
            }
            contentOffset={
              Platform.OS === "ios" ? { x: 0, y: -HEADER_HEIGHT } : undefined
            }
            scrollIndicatorInsets={{ top: HEADER_HEIGHT }}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            contentContainerStyle={[
              styles.list,
              { paddingBottom: bottomPadding },
              Platform.OS === "android" && { paddingTop: HEADER_HEIGHT },
            ]}
            numColumns={3}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={() => {
              if (isLoadingMoreTrending)
                return <ActivityIndicator style={{ marginVertical: 16 }} />;
              return null;
            }}
            renderItem={({ item, index }) => (
              <MovieCard
                key={`${index}`}
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
            )}
            ListEmptyComponent={
              !isSearching && query.trim().length > 0 ? (
                <Text style={[styles.empty, { color: subTextColor }]}>
                  No results for "{query}"
                </Text>
              ) : null
            }
          />
        ) : (
          <FlatList
            onScroll={handleScroll(loadMoreResults)}
            data={results.slice(1)}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={[
              styles.list,
              { paddingTop: HEADER_HEIGHT, paddingBottom: bottomPadding },
            ]}
            numColumns={3}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
            ListHeaderComponentStyle={
              results.length > 0 ? { height: 300, width: "100%" } : undefined
            }
            ListHeaderComponent={() => {
              if (results.length > 0) {
                const topSearch = results[0];
                return (
                  <TouchableOpacity
                    onPress={() => {
                      const media_type = results.at(0).media_type;

                      router.push({
                        pathname:
                          media_type === "tv" ? "/tvdetails" : "/details",
                        params: {
                          id: results.at(0).id,
                          type: results.at(0).media_type,
                        },
                      });
                    }}
                    style={{
                      flex: 1,
                      flexDirection: "column",
                      marginBottom: 20,
                    }}
                  >
                    <View style={styles.topSearch}>
                      <ImageBackground
                        source={{
                          uri: `https://image.tmdb.org/t/p/w780${topSearch.poster_path}`,
                        }}
                        imageStyle={{
                          height: "100%",
                          width: "100%",
                          resizeMode: "cover",
                          borderRadius: 10,
                        }}
                        style={{ height: "100%", width: "100%", flex: 1 }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text
                          numberOfLines={2}
                          style={{
                            fontSize: 22,
                            fontWeight: "bold",
                            color: textColor,
                          }}
                        >
                          {topSearch.title ||
                            topSearch.original_title ||
                            topSearch.name}
                        </Text>
                        <Text
                          numberOfLines={5}
                          style={{
                            color: subTextColor,
                            marginTop: 6,
                            fontSize: 13,
                          }}
                        >
                          {topSearch.overview}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.stats}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {topSearch.vote_average > 0 && (
                          <>
                            <Ionicons name="star" size={13} color="#ffc400" />
                            <Text
                              style={{
                                color: textColor,
                                fontSize: 13,
                                fontWeight: "600",
                              }}
                            >
                              {topSearch.vote_average.toFixed(1)}
                            </Text>
                          </>
                        )}
                      </View>
                      <Text style={{ color: subTextColor, fontSize: 13 }}>
                        {topSearch.release_date || topSearch.first_air_date}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }
              return <View />;
            }}
            renderItem={({ item }) => (
              <MovieCard
                key={item.id}
                adult={item.adult}
                backdrop_path={item.backdrop_path}
                id={item.id}
                title={item.title}
                original_title={item.original_title}
                name={item.name}
                original_name={item.original_name}
                poster_path={item.poster_path}
                release_date={item.release_date}
                first_air_date={item.first_air_date}
                vote_average={item.vote_average}
                vote_count={item.vote_count}
                media_type={item.media_type}
              />
            )}
            ListFooterComponent={() => {
              if (isLoadingMoreResults)
                return <ActivityIndicator style={{ marginVertical: 16 }} />;
              return null;
            }}
            ListEmptyComponent={
              !isSearching && query.trim().length > 0 ? (
                <Text style={[styles.empty, { color: subTextColor }]}>
                  No results for "{query}"
                </Text>
              ) : null
            }
          />
        )}
      </BlurTargetView>

      <AppBlurView
        blurTarget={blurTargetRef}
        intensity={35}
        style={[
          styles.header,
          {
            paddingTop: insets.top,
            borderBottomColor: isDark
              ? "rgba(255, 255, 255, 0.08)"
              : "rgba(0, 0, 0, 0.08)",
          },
        ]}
      >
        <View style={styles.headerRow}>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search movies..."
            placeholderTextColor={subTextColor}
            style={[
              styles.input,
              {
                color: textColor,
                borderColor: inputBorder,
                borderWidth: 1,
              },
            ]}
            returnKeyType="search"
            clearButtonMode="always"
          />

          {!isAtTop && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Scroll to top"
              hitSlop={6}
              onPress={scrollToTop}
              style={({ pressed }) => [
                styles.scrollTopButton,
                {
                  borderColor: scrollTopBorder,
                  opacity: pressed ? 0.75 : 1,
                  transform: [{ scale: pressed ? 0.94 : 1 }],
                },
              ]}
            >
              <View
                style={[styles.scrollTopBlur, { backgroundColor: scrollTopBg }]}
              >
                <Ionicons name="arrow-up" size={22} color={textColor} />
              </View>
            </Pressable>
          )}
        </View>
      </AppBlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    overflow: "hidden",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 8,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  scrollTopButton: {
    height: 44,
    width: 44,
    marginLeft: 10,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
  },
  scrollTopBlur: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
    alignItems: "center",
    paddingHorizontal: 10,
  },
  empty: { textAlign: "center", marginTop: 24 },
  list: { paddingBottom: 120 },
  topSearch: {
    height: "50%",
    flex: 1,
    flexDirection: "row",
    marginBottom: 10,
    gap: 12,
    paddingHorizontal: 10,
  },
  stats: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "50%",
    paddingHorizontal: 10,
  },
});

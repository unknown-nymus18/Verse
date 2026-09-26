import MovieCard from "@/components/Moviecard";
import { useThemeProvider } from "@/components/ThemeProvider";
import { getAllMovies, searchMovies } from "@/services/ApiServices";
import Entypo from "@expo/vector-icons/Entypo";
import Ionicons from "@expo/vector-icons/Ionicons";

import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useThemeProvider();

  // Dynamic Theme Colors
  const bgColor = isDark ? "#08090b" : "#ffffff";
  const textColor = isDark ? "#ffffff" : "#17181c";
  const subTextColor = isDark ? "#a1a1aa" : "#8b8d94";
  const inputBg = isDark ? "#18181b" : "#f1f1f3";
  const inputBorder = isDark ? "#27272a" : "transparent";

  const [query, setQuery] = useState("");
  const [allMovies, setAllMovies] = useState("");
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [searchPageNumber, setSearchPageNumber] = useState(1);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isAtTop, setAtTop] = useState(true);
  const flatListRef = useRef(null);

  async function getallMoviesData(pageNumber = 1) {
    try {
      console.log(pageNumber);
      const response = await getAllMovies(pageNumber);
      if (!response.ok)
        throw new Error(`Request failed with status ${response.status}`);

      const data = await response.json();

      const newMovies =
        searchPageNumber === 1
          ? (data.results ?? [])
          : [...allMovies, ...(data.results ?? [])];

      setAllMovies(newMovies);
    } catch (error) {
      console.error("Unable to load trending movies", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function loadMore() {
    if (isLoadingMore || searchPageNumber > 8) return;
    setIsLoadingMore(true);
    try {
      const newPageNumber = searchPageNumber + 1;
      setSearchPageNumber(newPageNumber);
      await getallMoviesData(newPageNumber);
    } finally {
      setIsLoadingMore(false);
    }
  }

  function handleScroll({ nativeEvent }) {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    // console.log(contentOffset.)
    setAtTop(contentOffset.y > 100);
    const paddingToBottom = 200;
    const isNearBottom =
      layoutMeasurement.height + contentOffset.y >=
      contentSize.height - paddingToBottom;
    if (isNearBottom) loadMore();
  }

  function scrollToTop() {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }
  useEffect(() => {
    getallMoviesData();
    const trimmed = query.trim();
    if (trimmed.length === 0) {
      setIsSearching(false);
      setResults([]);

      return;
    }

    let isCurrent = true;
    setIsSearching(true);

    const timeout = setTimeout(async () => {
      try {
        const response = await searchMovies(trimmed);
        if (!response.ok)
          throw new Error(`Request failed with status ${response.status}`);
        const data = await response.json();
        if (isCurrent) setResults(data.results ?? []);
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

  if (isLoading) {
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size={"large"}></ActivityIndicator>
    </View>;
  }

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <SafeAreaView
        edges={["top"]}
        style={{
          position: "absolute",
          zIndex: 100,
          width: "100%",
          flexDirection: "row",
          justifyContent: "center",
          flex: 1,
          paddingHorizontal: 10,
          paddingTop: 10,
        }}
      >
        <BlurView
          style={{
            flex: 1,
            overflow: "hidden",
            borderRadius: styles.input.borderRadius,
          }}
        >
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search movies..."
            placeholderTextColor={subTextColor}
            style={[
              styles.input,
              {
                backgroundColor: "transaparent",
                color: textColor,
                borderColor: inputBorder,
                borderWidth: isDark ? 1 : 0,
              },
            ]}
            returnKeyType="search"
            clearButtonMode="always"
          />
        </BlurView>
        {isAtTop && (
          <Pressable onPress={scrollToTop}>
            <View
              style={{
                height: 40,
                width: 40,
                borderRadius: 100,
                backgroundColor: textColor,
                marginLeft: 10,
                justifyContent: "center",
                alignItems: "center",
              }}
            >
              <Entypo name="arrow-bold-up" size={30} color={bgColor} />
            </View>
          </Pressable>
        )}
      </SafeAreaView>

      {isSearching && (
        <ActivityIndicator
          style={{ marginTop: insets.top + 70 }}
          color={textColor}
        />
      )}

      {query === "" ? (
        <>
          <FlatList
            onScroll={handleScroll}
            ref={flatListRef}
            data={allMovies}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            contentContainerStyle={[
              styles.list,
              { paddingTop: insets.top + 70 },
            ]}
            numColumns={3}
            columnWrapperStyle={styles.row}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={() => {
              if (isLoadingMore) return <ActivityIndicator></ActivityIndicator>;
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
          ></FlatList>
        </>
      ) : (
        <FlatList
          data={results.slice(1)}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[styles.list, { paddingTop: insets.top + 70 }]}
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
                      pathname: media_type === "tv" ? "/tvdetails" : "/details",
                      params: {
                        id: results.at(0).id,
                        type: results.at(0).media_type,
                      },
                    });
                  }}
                  style={{ flex: 1, flexDirection: "column", marginBottom: 20 }}
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
                    </View>
                    <Text style={{ color: subTextColor, fontSize: 13 }}>
                      {topSearch.release_date}
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
          ListEmptyComponent={
            !isSearching && query.trim().length > 0 ? (
              <Text style={[styles.empty, { color: subTextColor }]}>
                No results for "{query}"
              </Text>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  input: {
    height: 44,
    borderRadius: 8,
    paddingHorizontal: 14,
    fontSize: 15,
    width: "100%",
  },
  row: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
    alignItems: "center",
    paddingHorizontal: 10,
  },
  empty: { textAlign: "center", marginTop: 24 },
  list: { paddingBottom: 110 },
  topSearch: {
    height: "50%",
    flex: 1,
    flexDirection: "row",
    // marginBottom: 16,
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

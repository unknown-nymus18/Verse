import MovieCard from "@/components/Moviecard";
import { useThemeProvider } from "@/components/ThemeProvider";
import { searchMovies } from "@/services/ApiServices";
import Ionicons from "@expo/vector-icons/Ionicons";
import { BlurView } from "expo-blur";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  StyleSheet,
  Text,
  TextInput,
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
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
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
          paddingVertical: 0,
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
            clearButtonMode="while-editing"
          />
        </BlurView>
      </SafeAreaView>

      {isSearching && (
        <ActivityIndicator
          style={{ marginTop: insets.top + 70 }}
          color={textColor}
        />
      )}

      <FlatList
        data={results.slice(1)}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={[styles.list, { paddingTop: insets.top + 70 }]}
        numColumns={3}
        columnWrapperStyle={styles.row}
        ListHeaderComponentStyle={
          results.length > 0 ? { height: 300, width: "100%" } : undefined
        }
        ListHeaderComponent={() => {
          if (results.length > 0) {
            const topSearch = results[0];
            return (
              <View
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
                      {topSearch.title}
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
                      {topSearch.vote_average}
                    </Text>
                  </View>
                  <Text style={{ color: subTextColor, fontSize: 13 }}>
                    {topSearch.release_date}
                  </Text>
                </View>
              </View>
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

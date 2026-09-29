import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeProvider } from "../../components/ThemeProvider";
import {
  getMovieDetails,
  getSavedItems,
  getTvDetails,
} from "../../services/ApiServices";

import MovieCard from "@/components/Moviecard";

export default function LibraryScreen() {
  const { isDark } = useThemeProvider();

  const [showsData, setShowsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const bgColor = isDark ? "#08090b" : "#ffffff";
  const textColor = isDark ? "#ffffff" : "#17181c";
  const subTextColor = isDark ? "#a1a1aa" : "#8b8d94";

  async function getAllSavedData() {
    setIsLoading(true);
    try {
      const saved = await getSavedItems();

      const requests = saved.map(async (show) => {
        const response =
          show.type === "tv"
            ? await getTvDetails(show.id)
            : await getMovieDetails(show.id);
        if (!response.ok) throw new Error(`${response.status}`);

        const data = await response.json();

        return { ...data, media_type: show.type };
      });

      const results = await Promise.allSettled(requests);
      const successfulShows = results
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value);

      setShowsData(successfulShows);
    } catch (e) {
      console.error("Unable to load saved items", e);
    } finally {
      setIsLoading(false);
    }
  }

  // Refetch every time this screen comes into focus, so newly saved/removed
  // items from other screens show up here without needing a full remount
  useFocusEffect(
    useCallback(() => {
      getAllSavedData();
    }, []),
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: bgColor }]}
      edges={["top"]}
    >
      {!isLoading && showsData.length === 0 ? (
        <Text
          style={{ color: subTextColor, textAlign: "center", marginTop: 40 }}
        >
          You haven't saved anything yet.
        </Text>
      ) : (
        <FlatList
          data={showsData}
          numColumns={3}
          columnWrapperStyle={styles.row}
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
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
    paddingTop: 20,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
    alignItems: "center",
    paddingHorizontal: 10,
  },
});

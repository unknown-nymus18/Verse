import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GenreRow from "../../components/GenreRow";
import { useThemeProvider } from "../../components/ThemeProvider";
import {
  getMovieDetails,
  getSavedItems,
  getTvDetails,
} from "../../services/ApiServices";

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
        // attach media_type here, before filtering, so it can never
        // get mismatched to the wrong item
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
        <GenreRow genreName="Saved Movies/ Tv" movies={showsData} />
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
});

import MovieCard from "@/components/Moviecard";
import SearchScreenSkeleton from "@/components/SearchScreenSkeleton";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeProvider } from "../../components/ThemeProvider";
import {
  getMovieDetails,
  getSavedItems,
  getTvDetails,
  removeSavedItem,
} from "../../services/ApiServices";

export default function LibraryScreen() {
  const { isDark } = useThemeProvider();

  const [showsData, setShowsData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [itemToRemove, setItemToRemove] = useState(null);

  const bgColor = isDark ? "#08090b" : "#ffffff";
  const dialogBg = isDark ? "#18181b" : "#ffffff";
  const primaryTextColor = isDark ? "#ffffff" : "#17181c";
  const subTextColor = isDark ? "#a1a1aa" : "#8b8d94";
  const dialogBorder = isDark ? "#3f3f46" : "#e4e4e7";
  const cancelBg = isDark ? "#27272a" : "#f1f1f3";

  async function loadSavedItems() {
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
      setShowsData(
        results.filter((r) => r.status === "fulfilled").map((r) => r.value),
      );
    } catch (e) {
      console.error("Unable to load saved items", e);
    }
  }

  async function loadAllData() {
    setIsLoading(true);
    await loadSavedItems();
    setIsLoading(false);
  }

  async function removeFromLibrary(item) {
    const type = item.media_type || "movie";
    const updatedSavedItems = await removeSavedItem(item.id, type);
    const isStillSaved = updatedSavedItems.some(
      (saved) => saved.id === String(item.id) && saved.type === type,
    );

    if (!isStillSaved) {
      setShowsData((current) =>
        current.filter(
          (saved) =>
            !(saved.id === item.id && saved.media_type === item.media_type),
        ),
      );
    }
  }

  async function confirmRemoveFromLibrary() {
    if (!itemToRemove) return;
    await removeFromLibrary(itemToRemove);
    setItemToRemove(null);
  }

  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, []),
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: bgColor }]}
      edges={["top"]}
    >
      {isLoading ? (
        <SearchScreenSkeleton></SearchScreenSkeleton>
      ) : showsData.length === 0 ? (
        <Text
          style={{ color: subTextColor, textAlign: "center", marginTop: 40 }}
        >
          You haven&apos;t saved anything yet.
        </Text>
      ) : (
        <>
          <Text
            style={{
              color: primaryTextColor,
              marginLeft: 10,
              fontSize: 20,
              fontWeight: "700",
            }}
          >
            Saved Movies/ TV shows
          </Text>
          <FlatList
            data={showsData}
            numColumns={3}
            columnWrapperStyle={styles.row}
            renderItem={({ item }) => (
              <View style={styles.cardContainer}>
                <MovieCard
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
                  media_type={item.media_type || "movie"}
                  width="100%"
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Remove ${item.title || item.name || "title"} from library`}
                  hitSlop={8}
                  onPress={() => {
                    Haptics.notificationAsync(
                      Haptics.NotificationFeedbackType.Warning,
                    );
                    setItemToRemove(item);
                  }}
                  style={styles.removeButton}
                >
                  <Ionicons name="trash-outline" size={18} color="#ffffff" />
                </Pressable>
              </View>
            )}
          />
        </>
      )}
      <Modal
        visible={itemToRemove !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setItemToRemove(null)}
      >
        <View style={styles.modalBackdrop}>
          <View
            accessibilityViewIsModal
            style={[
              styles.confirmation,
              { backgroundColor: dialogBg, borderColor: dialogBorder },
            ]}
          >
            <Text
              style={[styles.confirmationTitle, { color: primaryTextColor }]}
            >
              Remove from library?
            </Text>
            <Text style={[styles.confirmationMessage, { color: subTextColor }]}>
              Remove {itemToRemove?.title || itemToRemove?.name || "this title"}{" "}
              from your library?
            </Text>
            <View style={styles.confirmationActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  Haptics.selectionAsync();
                  setItemToRemove(null);
                }}
                style={({ pressed }) => [
                  styles.confirmationButton,
                  { backgroundColor: cancelBg, opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <Text
                  style={[
                    styles.confirmationButtonText,
                    { color: primaryTextColor },
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  confirmRemoveFromLibrary();
                  Haptics.selectionAsync();
                }}
                style={({ pressed }) => [
                  styles.confirmationButton,
                  { backgroundColor: "#dc2626", opacity: pressed ? 0.75 : 1 },
                ]}
              >
                <Text
                  style={[styles.confirmationButtonText, { color: "#ffffff" }]}
                >
                  Remove
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "column",
    paddingTop: 10,
  },
  row: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
    alignItems: "center",
    paddingHorizontal: 10,
  },
  cardContainer: {
    width: "31.5%",
    position: "relative",
  },
  removeButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: "rgba(8, 9, 11, 0.82)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255, 255, 255, 0.45)",
    zIndex: 1,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(0, 0, 0, 0.62)",
  },
  confirmation: {
    width: "100%",
    maxWidth: 360,
    padding: 20,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  confirmationMessage: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  confirmationActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  confirmationButton: {
    flex: 1,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  confirmationButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

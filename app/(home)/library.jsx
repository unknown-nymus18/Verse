import MovieCard from "@/components/Moviecard";
import SearchScreenSkeleton from "@/components/SearchScreenSkeleton";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as FileSystem from "expo-file-system/legacy";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  FlatList,
  Image,
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

// Must match the folder and file naming used in play.tsx
const DOWNLOAD_DIR = `${FileSystem.documentDirectory}downloads/`;
const FILE_PATTERN = /^([a-z]+)-(\d+)-S(\d+)E(\d+)-(.+)\.mp4$/;
const MIN_VALID_BYTES = 100 * 1024; // ignore tiny / broken files

function formatSize(bytes) {
  if (!bytes) return "";
  const mb = bytes / (1024 * 1024);
  return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${mb.toFixed(0)} MB`;
}

export default function LibraryScreen() {
  const { isDark } = useThemeProvider();
  const router = useRouter();

  const [tab, setTab] = useState("saved"); // "saved" | "downloaded"
  const [showsData, setShowsData] = useState([]);
  const [downloads, setDownloads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [itemToRemove, setItemToRemove] = useState(null);

  const bgColor = isDark ? "#08090b" : "#ffffff";
  const dialogBg = isDark ? "#18181b" : "#ffffff";
  const primaryTextColor = isDark ? "#ffffff" : "#17181c";
  const subTextColor = isDark ? "#a1a1aa" : "#8b8d94";
  const dialogBorder = isDark ? "#3f3f46" : "#e4e4e7";
  const cancelBg = isDark ? "#27272a" : "#f1f1f3";
  const placeholderBg = isDark ? "#18181b" : "#ececef";

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

  // Reads the downloads folder and looks up the title/poster for each file
  async function loadDownloadedItems() {
    try {
      const folder = await FileSystem.getInfoAsync(DOWNLOAD_DIR);
      if (!folder.exists) {
        setDownloads([]);
        return;
      }

      const names = await FileSystem.readDirectoryAsync(DOWNLOAD_DIR);
      const entries = [];

      for (const name of names) {
        const match = FILE_PATTERN.exec(name);
        if (!match) continue;

        const uri = DOWNLOAD_DIR + name;
        const info = await FileSystem.getInfoAsync(uri);
        if (!info.exists || info.size < MIN_VALID_BYTES) continue;

        entries.push({
          name,
          uri,
          size: info.size,
          id: match[2],
          media_type: match[1] === "tv" ? "tv" : "movie",
          season: match[3],
          episode: match[4],
          quality: match[5],
        });
      }

      const withDetails = await Promise.all(
        entries.map(async (entry) => {
          try {
            const response =
              entry.media_type === "tv"
                ? await getTvDetails(entry.id)
                : await getMovieDetails(entry.id);
            if (!response.ok) throw new Error(`${response.status}`);
            const data = await response.json();
            return {
              ...entry,
              title: data.title || data.name,
              poster_path: data.poster_path,
            };
          } catch {
            // Offline or lookup failed: still show the file
            return { ...entry, title: null, poster_path: null };
          }
        }),
      );

      setDownloads(withDetails);
    } catch (e) {
      console.error("Unable to load downloads", e);
    }
  }

  async function loadAllData() {
    setIsLoading(true);
    await Promise.all([loadSavedItems(), loadDownloadedItems()]);
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

  async function deleteDownload(item) {
    try {
      await FileSystem.deleteAsync(item.uri, { idempotent: true });
      setDownloads((current) => current.filter((d) => d.uri !== item.uri));
    } catch (e) {
      console.warn("Unable to delete download", e);
    }
  }

  async function confirmRemoveFromLibrary() {
    if (!itemToRemove) return;
    if (itemToRemove.isDownload) {
      await deleteDownload(itemToRemove);
    } else {
      await removeFromLibrary(itemToRemove);
    }
    setItemToRemove(null);
  }

  function playDownload(item) {
    const label =
      item.media_type === "tv"
        ? `${item.title ?? "Episode"} · S${item.season} E${item.episode}`
        : (item.title ?? "Movie");

    router.push({
      pathname: "/offline-player",
      params: { name: item.name, title: label },
    });
  }

  useFocusEffect(
    useCallback(() => {
      loadAllData();
    }, []),
  );

  const removeTitle = itemToRemove?.title || itemToRemove?.name || "this title";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: bgColor }]}
      edges={["top"]}
    >
      <View style={styles.tabs}>
        {[
          { key: "saved", label: "Saved" },
          { key: "downloaded", label: `Downloaded (${downloads.length})` },
        ].map(({ key, label }) => {
          const active = tab === key;
          return (
            <Pressable
              key={key}
              accessibilityRole="button"
              onPress={() => {
                Haptics.selectionAsync();
                setTab(key);
              }}
              style={[
                styles.tab,
                {
                  backgroundColor: active ? primaryTextColor : cancelBg,
                },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: active ? bgColor : primaryTextColor },
                ]}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {isLoading ? (
        <SearchScreenSkeleton></SearchScreenSkeleton>
      ) : tab === "saved" ? (
        showsData.length === 0 ? (
          <Text
            style={{ color: subTextColor, textAlign: "center", marginTop: 40 }}
          >
            You haven&apos;t saved anything yet.
          </Text>
        ) : (
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
        )
      ) : downloads.length === 0 ? (
        <Text
          style={{ color: subTextColor, textAlign: "center", marginTop: 40 }}
        >
          No downloaded videos yet.
        </Text>
      ) : (
        <FlatList
          data={downloads}
          numColumns={3}
          keyExtractor={(item) => item.name}
          columnWrapperStyle={styles.row}
          contentContainerStyle={{ paddingBottom: 24 }}
          renderItem={({ item }) => {
            const heading = item.title ?? `Title #${item.id}`;
            const detail =
              item.media_type === "tv"
                ? `S${item.season} E${item.episode} · ${item.quality}`
                : item.quality;

            return (
              <View style={styles.cardContainer}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Play ${heading}`}
                  onPress={() => {
                    Haptics.selectionAsync();
                    playDownload(item);
                  }}
                  style={({ pressed }) => ({ opacity: pressed ? 0.8 : 1 })}
                >
                  <View
                    style={[styles.poster, { backgroundColor: placeholderBg }]}
                  >
                    {item.poster_path ? (
                      <Image
                        source={{
                          uri: `https://image.tmdb.org/t/p/w342${item.poster_path}`,
                        }}
                        style={styles.posterImage}
                      />
                    ) : (
                      <Ionicons
                        name="film-outline"
                        size={32}
                        color={subTextColor}
                      />
                    )}
                    <View style={styles.playBadge}>
                      <Ionicons name="play" size={18} color="#ffffff" />
                    </View>
                  </View>
                  <Text
                    numberOfLines={1}
                    style={[styles.downloadTitle, { color: primaryTextColor }]}
                  >
                    {heading}
                  </Text>
                  <Text
                    numberOfLines={1}
                    style={[styles.downloadMeta, { color: subTextColor }]}
                  >
                    {detail} · {formatSize(item.size)}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Delete download of ${heading}`}
                  hitSlop={8}
                  onPress={() => {
                    Haptics.notificationAsync(
                      Haptics.NotificationFeedbackType.Warning,
                    );
                    setItemToRemove({ ...item, isDownload: true });
                  }}
                  style={styles.removeButton}
                >
                  <Ionicons name="trash-outline" size={18} color="#ffffff" />
                </Pressable>
              </View>
            );
          }}
        />
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
              {itemToRemove?.isDownload
                ? "Delete download?"
                : "Remove from library?"}
            </Text>
            <Text style={[styles.confirmationMessage, { color: subTextColor }]}>
              {itemToRemove?.isDownload
                ? `Delete the downloaded video of ${removeTitle} from this device?`
                : `Remove ${removeTitle} from your library?`}
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
                  {itemToRemove?.isDownload ? "Delete" : "Remove"}
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
  tabs: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 10,
    paddingBottom: 6,
  },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
    alignItems: "flex-start",
    paddingHorizontal: 10,
  },
  cardContainer: {
    width: "31.5%",
    position: "relative",
  },
  poster: {
    width: "100%",
    aspectRatio: 2 / 3,
    borderRadius: 10,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  posterImage: {
    width: "100%",
    height: "100%",
  },
  playBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(8, 9, 11, 0.82)",
  },
  downloadTitle: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
  },
  downloadMeta: {
    fontSize: 11,
    marginTop: 2,
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

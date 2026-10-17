import { Directory, File, Paths } from "expo-file-system";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PlayDownloadScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();

  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const downloadsDir = new Directory(Paths.document, "downloads");
        const movieDir = new Directory(downloadsDir, String(id));
        const videoFile = new File(movieDir, "video.mp4");

        if (videoFile.exists) {
          setVideoUri(videoFile.uri);
        } else {
          setError("Offline video file not found.");
        }
      } catch (e) {
        setError("Failed to locate local video file.");
      }
    })();
  }, [id]);

  const player = useVideoPlayer(videoUri, (player) => {
    player.loop = false;
    player.play();
  });

  if (error) {
    return (
      <SafeAreaView style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!videoUri) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading local offline video...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>✕ Close Player</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Offline Title #{id}</Text>
      </View>

      <VideoView
        style={styles.videoView}
        player={player}
        // allowsFullscreen

        allowsPictureInPicture
        startsPictureInPictureAutomatically
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  videoView: { flex: 1, backgroundColor: "#000" },
  header: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    backgroundColor: "#121318",
  },
  headerTitle: { color: "#A1A1AA", fontSize: 12, fontWeight: "600" },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: "#27272A",
    borderRadius: 6,
  },
  backText: { color: "#FFF", fontSize: 12, fontWeight: "bold" },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: { color: "#A1A1AA", marginTop: 12, fontSize: 14 },
  errorContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    color: "#EF4444",
    fontSize: 16,
    marginBottom: 16,
    textAlign: "center",
  },
  backBtn: {
    backgroundColor: "#8B5CF6",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backBtnText: { color: "#FFF", fontWeight: "bold" },
});

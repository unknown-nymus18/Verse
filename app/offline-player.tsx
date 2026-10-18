import * as FileSystem from "expo-file-system/legacy";
import { useKeepAwake } from "expo-keep-awake";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useVideoPlayer, VideoView } from "expo-video";
import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function OfflinePlayerScreen() {
  useKeepAwake();

  const { name, title } = useLocalSearchParams<{
    name: string;
    title?: string;
  }>();
  const navigation = useNavigation();
  const [error, setError] = useState<string | null>(null);

  // Rebuilt here from the file name, so the encoded folder name stays intact
  const uri = name ? `${FileSystem.documentDirectory}downloads/${name}` : null;

  const player = useVideoPlayer(uri, (p) => {
    p.play();
  });

  useEffect(() => {
    navigation.setOptions({
      title: title ?? "Downloaded video",
      gestureEnabled: true,
    });
  }, [navigation, title]);

  useEffect(() => {
    if (!uri) {
      setError("No video selected.");
      return;
    }
    console.log("Playing:", uri);
    FileSystem.getInfoAsync(uri).then((info) => {
      if (!info.exists) setError("This file no longer exists on the device.");
    });
  }, [uri]);

  useEffect(() => {
    const subscription = player.addListener(
      "statusChange",
      ({ status, error }) => {
        if (status === "error") {
          setError(error?.message ?? "This file couldn't be played.");
        }
      },
    );
    return () => subscription.remove();
  }, [player]);

  return (
    <SafeAreaView style={styles.container}>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <VideoView
          player={player}
          style={styles.video}
          nativeControls
          // allowsFullscreen
          allowsPictureInPicture
          contentFit="contain"
          onFullscreenEnter={() =>
            navigation.setOptions({ orientation: "landscape" })
          }
          onFullscreenExit={() => navigation.setOptions({ orientation: "all" })}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", justifyContent: "center" },
  video: { flex: 1, backgroundColor: "#000" },
  error: { color: "#fff", textAlign: "center", padding: 24 },
});

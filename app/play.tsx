import { getSubtitlesStorage } from "@/services/ApiServices";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

export default function VideoScreen() {
  const {
    id,
    type,
    seasonNumber = "1",
    episodeNumber = "1",
  } = useLocalSearchParams();

  const [subtitle, setSubtitle] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const stored = await getSubtitlesStorage();
      setSubtitle(stored);
    })();
  }, []);

  if (subtitle === null) return null;

  const VIDEO_URL = `https://vidstuck.xyz/embed/${type}/${id}/${seasonNumber}/${episodeNumber}?nextEpisode=true&autoplayNextEpisode=true&episodeSelector=true&overlay=true&color=8B5CF6&subtitle=${subtitle}&server=valstrax`;

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        source={{ uri: VIDEO_URL }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsPictureInPictureMediaPlayback
        sharedCookiesEnabled
        originWhitelist={["*"]}
        onError={(event) => console.log("WEBVIEW ERROR", event.nativeEvent)}
        onHttpError={(event) => console.log("HTTP ERROR", event.nativeEvent)}
        onNavigationStateChange={(event) =>
          console.log("NAVIGATION", event.url)
        }
        onOpenWindow={(event) =>
          console.log("OPEN WINDOW", event.nativeEvent.targetUrl)
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  webview: { flex: 1 },
});

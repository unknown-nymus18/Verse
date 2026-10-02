import { getSubtitlesStorage } from "@/services/ApiServices";
import { useLocalSearchParams, useNavigation } from "expo-router";
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
  } = useLocalSearchParams<{
    id: string;
    type?: string;
    seasonNumber?: string;
    episodeNumber?: string;
  }>();
  const navigation = useNavigation();

  const [subtitle, setSubtitle] = useState<string | null>(null);

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: true });
  }, [navigation]);

  useEffect(() => {
    (async () => {
      const storedSubtitle = await getSubtitlesStorage();
      setSubtitle(storedSubtitle ?? "en");
    })();
  }, []);

  if (subtitle === null) return null;

  const VIDEO_URL = `https://vidstuck.xyz/embed/${type}/${id}/${seasonNumber}/${episodeNumber}?subtitle=${subtitle}&server=valstrax`;

  // Script injected before content loads to suppress popup redirects and click-jacking overlays
  const AD_BLOCK_SCRIPT = `
    (function() {
      // 1. Block window.open popups entirely
      window.open = function() { return null; };

      // 2. Prevent click hijacking on elements attempting external redirects
      const originalClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function() {
        if (this.target === '_blank' || (this.href && !this.href.includes('vidstuck.xyz'))) {
          return;
        }
        return originalClick.apply(this, arguments);
      };

      // 3. MutationObserver to auto-remove transparent ad overlays & popups
      const removeAdOverlays = () => {
        const overlays = document.querySelectorAll('div[style*="z-index"], iframe[src*="about:blank"], a[target="_blank"]');
        overlays.forEach(el => {
          if (el && el.parentNode && (el.style.zIndex > 100 || el.style.position === 'absolute' || el.style.position === 'fixed')) {
            // Ensure video container itself is not deleted
            if (!el.querySelector('video')) {
              el.parentNode.removeChild(el);
            }
          }
        });
      };

      document.addEventListener('DOMContentLoaded', () => {
        removeAdOverlays();
        setInterval(removeAdOverlays, 500);
      });
    })();
    true;
  `;

  const FULLSCREEN_SCRIPT = `
    (function() {
      let isFullscreen = false;
      let stateTimer;

      const scheduleFullscreenEnter = () => {
        window.clearTimeout(stateTimer);
        stateTimer = window.setTimeout(() => {
          if (isFullscreen) return;
          isFullscreen = true;
          window.ReactNativeWebView.postMessage("fullscreen-enter");
        }, 200);
      };

      const fireFullscreenExit = () => {
        window.clearTimeout(stateTimer);
        if (!isFullscreen) return;
        isFullscreen = false;
        window.ReactNativeWebView.postMessage("fullscreen-exit");
      };

      const checkFullscreen = () => {
        const nowFull = Boolean(
          document.fullscreenElement || document.webkitFullscreenElement
        );
        if (nowFull) {
          scheduleFullscreenEnter();
        } else {
          fireFullscreenExit();
        }
      };

      document.addEventListener("fullscreenchange", checkFullscreen, true);
      document.addEventListener("webkitfullscreenchange", checkFullscreen, true);
      document.addEventListener("webkitbeginfullscreen", scheduleFullscreenEnter, true);
      document.addEventListener("webkitendfullscreen", fireFullscreenExit, true);
    })();
    true;
  `;

  function handleWebViewMessage(message: string) {
    if (message === "fullscreen-enter") {
      navigation.setOptions({ orientation: "landscape" });
    } else if (message === "fullscreen-exit") {
      // Restore free rotation — the OS follows the device sensor
      // back to portrait smoothly without forcing an animation.
      navigation.setOptions({ orientation: "all" });
    }
  }

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
        setSupportMultipleWindows={false}
        onOpenWindow={(event) => event.preventDefault()}
        allowsFullscreenVideo={true}
        injectedJavaScriptBeforeContentLoaded={AD_BLOCK_SCRIPT}
        injectedJavaScript={FULLSCREEN_SCRIPT}
        onMessage={(event) => handleWebViewMessage(event.nativeEvent.data)}
        onShouldStartLoadWithRequest={(request) => {
          const { url } = request;

          // Allow essential embed & CDN media requests only
          const isAllowed =
            url.includes("vidstuck.xyz") ||
            url.includes("sacdn.hakunaymatata.com") ||
            url.includes("about:blank") ||
            url.includes(".m4s") ||
            url.includes(".m3u8") ||
            url.includes(".mp4");

          // Block all external popup redirects on player clicks
          return isAllowed;
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  webview: { flex: 1, backgroundColor: "#000" },
});

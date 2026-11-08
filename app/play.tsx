import { getSubtitlesStorage } from "@/services/ApiServices";
import { useKeepAwake } from "expo-keep-awake";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { BackHandler, Linking, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
// import { useDownloadManager } from "../components/DownloadProvider";

export default function VideoScreen() {
  useKeepAwake();

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
  // const { startDownload } = useDownloadManager();

  const [subtitle, setSubtitle] = useState<string | null>(null);
  const webViewRef = useRef<any>(null);
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: true });
  }, [navigation]);

  useEffect(() => {
    const onBackPress = () => {
      if (canGoBack && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [canGoBack]);

  useEffect(() => {
    (async () => {
      const storedSubtitle = await getSubtitlesStorage();
      setSubtitle(storedSubtitle ?? "en");
    })();
  }, []);

  if (subtitle === null) return null;

  const VIDEO_URL = `https://vidstuck.cc/embed/${type}/${id}/${seasonNumber}/${episodeNumber}?subtitle=${subtitle}&server=valstrax`;

  // Script injected before content loads to suppress popup redirects and click-jacking overlays
  const AD_BLOCK_SCRIPT = `
    (function() {
      // 1. Allow workers.dev in window.open, otherwise block unwanted ad popups
      const originalWindowOpen = window.open;
      window.open = function(url) {
        if (url && typeof url === 'string' && (url.includes('workers.dev') || url.includes('.mkv'))) {
          window.location.href = url;
          return window;
        }
        return null;
      };

      // 2. Allow download links to navigate directly in the webview
      const originalClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function() {
        if (this.href && (this.href.includes('workers.dev') || this.href.includes('.mkv') || this.hasAttribute('download'))) {
          this.target = '_self';
          return originalClick.apply(this, arguments);
        }
        if (this.target === '_blank' || (this.href && !this.href.includes('vidstuck.xyz') && !this.href.includes('vidstuck.cc'))) {
          return;
        }
        return originalClick.apply(this, arguments);
      };

      // 3. Ensure any click on a download link targets _self so it redirects in-page
      document.addEventListener('click', function(e) {
        const a = e.target && e.target.closest ? e.target.closest('a') : null;
        if (a && (a.hasAttribute('download') || (a.href && (a.href.includes('workers.dev') || a.href.includes('.mkv'))))) {
          a.target = '_self';
        }
      }, true);

      // 4. MutationObserver to auto-remove transparent ad overlays & popups
      const removeAdOverlays = () => {
        const overlays = document.querySelectorAll('div[style*="z-index"], iframe[src*="about:blank"], a[target="_blank"]');
        overlays.forEach(el => {
          if (el && el.parentNode && (el.style.zIndex > 100 || el.style.position === 'absolute' || el.style.position === 'fixed')) {
            // Ensure video container and download elements are not deleted
            if (!el.querySelector('video') && !el.closest('a[download]') && (!el.href || (!el.href.includes('workers.dev') && !el.href.includes('.mkv')))) {
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

  // In-app download management interceptor (commented out so downloads behave normally)
  /*
  const ELEMENT_SCRIPT = `
    (function() {
      if (window.__downloadInterceptor) return;
      window.__downloadInterceptor = true;

      const intercept = (e) => {
        const target = e.target;
        const a = target && target.closest ? target.closest("a[download]") : null;
        if (!a) return;

        // Stop the site from opening the link itself
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        // Touch devices fire touchend then click, so only report once per tap
        const now = Date.now();
        if (window.__lastDownloadTap && now - window.__lastDownloadTap < 800) return;
        window.__lastDownloadTap = now;

        const quality = a.querySelector("p.font-medium");
        const kind = a.querySelector("p.text-xs");
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: "download-request",
          quality: quality ? quality.textContent.trim() : null,
          kind: kind ? kind.textContent.trim() : null,
          href: a.href
        }));
      };

      document.addEventListener("click", intercept, true);
      document.addEventListener("touchend", intercept, true);
    })();
    true;
  `;
  */

  function handleWebViewMessage(message: string) {
    if (message === "fullscreen-enter") {
      navigation.setOptions({ orientation: "landscape" });
    } else if (message === "fullscreen-exit") {
      navigation.setOptions({ orientation: "all" });
    } else {
      try {
        const data = JSON.parse(message);
        if (data.type === "open-url" && data.url) {
          Linking.openURL(data.url).catch((err: unknown) =>
            console.warn("Failed to open download URL:", err),
          );
        }
      } catch {
        // Ignore unrecognized messages
      }
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ uri: VIDEO_URL }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsPictureInPictureMediaPlayback
        allowsBackForwardNavigationGestures={true}
        onNavigationStateChange={(navState: any) =>
          setCanGoBack(navState.canGoBack)
        }
        sharedCookiesEnabled
        originWhitelist={["*"]}
        // setSupportMultipleWindows={false}
        onOpenWindow={(event: any) => {
          const targetUrl = event.nativeEvent.targetUrl;
          if (
            targetUrl &&
            (targetUrl.includes("workers.dev") || targetUrl.includes(".mkv"))
          ) {
            webViewRef.current?.injectJavaScript(
              `window.location.href = "${targetUrl}"; true;`,
            );
          }
          event.preventDefault();
        }}
        allowsFullscreenVideo={true}
        injectedJavaScriptBeforeContentLoaded={AD_BLOCK_SCRIPT}
        injectedJavaScript={FULLSCREEN_SCRIPT}
        onMessage={(event: any) => handleWebViewMessage(event.nativeEvent.data)}
        onShouldStartLoadWithRequest={(request: { url: string }) => {
          const { url } = request;

          // Allow essential embed, media streams, Cloudflare verification, and workers.dev download pages
          const isAllowed =
            url.includes("vidstuck.cc") ||
            url.includes("sacdn.hakunaymatata.com") ||
            url.includes("workers.dev") ||
            url.includes("cloudflare.com") ||
            url.includes("about:blank") ||
            url.includes(".m4s") ||
            url.includes(".m3u8") ||
            url.includes(".mp4") ||
            url.includes(".mkv");

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

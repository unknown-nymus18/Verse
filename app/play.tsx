import { useDownloadManager } from "@/components/DownloadProvider";
import { getSubtitlesStorage } from "@/services/ApiServices";
import { useKeepAwake } from "expo-keep-awake";
import { useLocalSearchParams, useNavigation } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { BackHandler, Linking, Platform, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";
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
  const { startDownload } = useDownloadManager();

  const [subtitle, setSubtitle] = useState<string | null>(null);
  const webViewRef = useRef<any>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const downloadFlowActive = useRef(false);
  const pendingDownload = useRef<{ quality: string | null } | null>(null);

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
        if (url && typeof url === 'string' && (url.includes('workers.dev') || url.includes('.mkv') || url.includes('.mp4') || url.includes('.bin'))) {
          window.location.href = url;
          return window;
        }
        return null;
      };

      // 2. Allow download links to navigate directly in the webview
      const originalClick = HTMLAnchorElement.prototype.click;
      HTMLAnchorElement.prototype.click = function() {
        if (this.href && (this.href.includes('workers.dev') || this.href.includes('.mkv') || this.href.includes('.mp4') || this.href.includes('.bin') || this.hasAttribute('download'))) {
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
        if (a && (a.hasAttribute('download') || (a.href && (a.href.includes('workers.dev') || a.href.includes('.mkv') || a.href.includes('.mp4') || a.href.includes('.bin'))))) {
          a.target = '_self';
        }

        if (a && (a.hasAttribute('download') || (a.href && (a.href.includes('workers.dev') || /\\.(mp4|mkv|bin)(?:[?#]|$)/i.test(a.href))))) {
          const quality = a.querySelector('p.font-medium');
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: "download-request",
            quality: quality ? quality.textContent.trim() : null
          }));
        }
      }, true);

      // 4. MutationObserver to auto-remove transparent ad overlays & popups
      const removeAdOverlays = () => {
        const overlays = document.querySelectorAll('div[style*="z-index"], iframe[src*="about:blank"], a[target="_blank"]');
        overlays.forEach(el => {
          if (el && el.parentNode && (el.style.zIndex > 100 || el.style.position === 'absolute' || el.style.position === 'fixed')) {
            // Ensure video container and download elements are not deleted
            if (!el.querySelector('video') && !el.closest('a[download]') && (!el.href || (!el.href.includes('workers.dev') && !el.href.includes('.mkv') && !el.href.includes('.mp4') && !el.href.includes('.bin')))) {
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
      navigation.setOptions({ orientation: "all" });
    } else {
      try {
        const data = JSON.parse(message);
        if (data.type === "open-url" && data.url) {
          Linking.openURL(data.url).catch((err: unknown) =>
            console.warn("Failed to open download URL:", err),
          );
        } else if (data.type === "download-request") {
          pendingDownload.current = {
            quality:
              typeof data.quality === "string" ? data.quality.trim() : null,
          };
          downloadFlowActive.current = true;
        }
      } catch {
        // Ignore unrecognized messages
      }
    }
  }

  function handleFileDownload(event: {
    nativeEvent: {
      downloadUrl: string;
      userAgent?: string;
      cookie?: string;
    };
  }) {
    const { downloadUrl, userAgent, cookie } = event.nativeEvent;
    if (!downloadUrl.toLowerCase().startsWith("https://")) {
      console.warn("Ignoring non-HTTPS download URL");
      downloadFlowActive.current = false;
      pendingDownload.current = null;
      return;
    }

    downloadFlowActive.current = false;
    const request = pendingDownload.current;
    pendingDownload.current = null;
    const quality = request?.quality || "Download";
    const safeId = id.replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeType = type === "tv" ? "tv" : "movie";
    const episodeSuffix =
      type === "tv"
        ? `-S${seasonNumber.replace(/\D/g, "") || "1"}E${episodeNumber.replace(/\D/g, "") || "1"}`
        : "";
    const safeQuality = quality.replace(/[^a-zA-Z0-9_-]/g, "_");
    const headers: Record<string, string> = {};
    if (userAgent) headers["User-Agent"] = userAgent;
    if (cookie) headers.Cookie = cookie;

    void startDownload({
      quality,
      href: downloadUrl,
      fileName: `${safeType}-${safeId}${episodeSuffix}-${safeQuality}.mp4`,
      headers,
      mediaId: id,
      mediaType: safeType,
    });
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
            targetUrl.toLowerCase().startsWith("https://") &&
            (targetUrl.includes("workers.dev") ||
              targetUrl.includes(".mkv") ||
              targetUrl.includes(".mp4") ||
              targetUrl.includes(".bin"))
          ) {
            downloadFlowActive.current = true;
            webViewRef.current?.injectJavaScript(
              `window.location.href = ${JSON.stringify(targetUrl)}; true;`,
            );
          }
          event.preventDefault();
        }}
        allowsFullscreenVideo={true}
        injectedJavaScriptBeforeContentLoaded={AD_BLOCK_SCRIPT}
        injectedJavaScript={FULLSCREEN_SCRIPT}
        onMessage={(event: any) => handleWebViewMessage(event.nativeEvent.data)}
        onShouldStartLoadWithRequest={(request: {
          url: string;
          navigationType?: string;
          isTopFrame?: boolean;
        }) => {
          const { url } = request;

          // Keep the verification and final-file redirects inside this WebView.
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

          if (
            isAllowed ||
            (downloadFlowActive.current &&
              url.toLowerCase().startsWith("https://"))
          ) {
            return true;
          }

          if (
            request.navigationType === "click" &&
            request.isTopFrame !== false &&
            url.toLowerCase().startsWith("https://")
          ) {
            downloadFlowActive.current = true;
            return true;
          }

          // Block all external popup redirects on player clicks
          return false;
        }}
        onFileDownload={
          Platform.OS === "android" ? handleFileDownload : undefined
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  webview: { flex: 1, backgroundColor: "#000" },
});

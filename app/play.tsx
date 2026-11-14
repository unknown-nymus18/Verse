import { getSubtitlesStorage } from "@/services/ApiServices";
import { useKeepAwake } from "expo-keep-awake";
import { useLocalSearchParams, useNavigation } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  BackHandler,
  Linking,
  Platform,
  StatusBar,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView } from "react-native-webview";

function isDownloadRedirect(url: string) {
  return (
    url.toLowerCase().includes("workers.dev") ||
    /\.(mp4|mkv|bin)(?:[?#]|$)/i.test(url)
  );
}

// Block download actions while filtering unrelated ad popups.
// Overlay removal is conservative and fully disabled while fullscreen,
// because removing the fullscreen element (or an ancestor) exits fullscreen.
const AD_BLOCK_SCRIPT = `
  (function() {
    if (window.__adBlockInstalled) return;
    window.__adBlockInstalled = true;

    const isDownloadRedirect = url =>
      typeof url === 'string' &&
      (url.toLowerCase().includes('workers.dev') || /\\.(mp4|mkv|bin)(?:[?#]|$)/i.test(url));
    const reportDownloadBlocked = () => {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: "download-unavailable"
        }));
      }
    };

    // Lock window.open so ad scripts can't restore it and open popups
    // (a popup window being created exits fullscreen on Android).
    const blockedOpen = function(url) {
      if (typeof url === 'string' && isDownloadRedirect(url)) {
        reportDownloadBlocked();
      }
      return null;
    };
    try {
      Object.defineProperty(window, 'open', {
        value: blockedOpen,
        writable: false,
        configurable: false
      });
    } catch (e) {
      window.open = blockedOpen;
    }

    const originalClick = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function() {
      if (isDownloadRedirect(this.href) || this.hasAttribute('download')) {
        reportDownloadBlocked();
        return;
      }
      if (this.target === '_blank' || (this.href && !this.href.includes('vidstuck.xyz') && !this.href.includes('vidstuck.cc'))) {
        return;
      }
      return originalClick.apply(this, arguments);
    };

    // Download blocking
    document.addEventListener('click', function(e) {
      const a = e.target && e.target.closest ? e.target.closest('a') : null;
      const control = e.target && e.target.closest
        ? e.target.closest('a, button, [role="button"], input[type="button"], input[type="submit"]')
        : null;
      const label = control
        ? [control.textContent, control.getAttribute('aria-label'), control.getAttribute('title'), control.getAttribute('value')]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
        : '';
      if (
        (a && (a.hasAttribute('download') || isDownloadRedirect(a.href))) ||
        /\\bdownload\\b/i.test(label)
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
        reportDownloadBlocked();
      }
    }, true);

    // Cancel clicks on target="_blank" and cross-host links before ad
    // scripts can act on them.
    document.addEventListener('click', function(e) {
      const a = e.target && e.target.closest ? e.target.closest('a') : null;
      if (!a) return;
      const isHttp = a.protocol === 'http:' || a.protocol === 'https:';
      if (a.target === '_blank' || (isHttp && a.host !== location.host)) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    }, true);

    const isFullscreenActive = () =>
      Boolean(document.fullscreenElement || document.webkitFullscreenElement);

    const removeAdOverlays = () => {
      if (isFullscreenActive()) return;

      document
        .querySelectorAll('div[style*="z-index"], iframe[src*="about:blank"], a[target="_blank"]')
        .forEach(el => {
          if (!el.parentNode) return;
          const style = el.style;
          const positioned = style.position === 'absolute' || style.position === 'fixed';
          const z = parseInt(style.zIndex, 10) || 0;

          const looksLikeAd =
            z >= 1000000 ||
            ((el.tagName === 'A' || el.tagName === 'IFRAME') && positioned);
          if (!looksLikeAd) return;

          if (el.querySelector('video, iframe, canvas')) return;
          if (el.closest('a[download]')) return;
          if (el.href && isDownloadRedirect(el.href)) return;

          el.parentNode.removeChild(el);
        });
    };

    const start = () => {
      removeAdOverlays();
      setInterval(removeAdOverlays, 500);
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', start);
    } else {
      start();
    }
  })();
  true;
`;

const FULLSCREEN_SCRIPT = `
  (function() {
    if (window.__fsTrackerInstalled) return;
    window.__fsTrackerInstalled = true;

    const frameId = Math.random().toString(36).slice(2);
    let reported = false;
    let videoFullscreen = false;
    let timer;

    const post = active => {
      reported = active;
      try {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: "fullscreen-state",
            frameId,
            active
          }));
        }
      } catch (e) {}
    };

    const isActive = () =>
      Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.webkitCurrentFullScreenElement ||
        videoFullscreen
      );

    // Entering is debounced longer (avoids flapping during the rotation);
    // exiting is reported quickly so the app can lock portrait right away.
    const sync = () => {
      window.clearTimeout(timer);
      const delay = isActive() ? 250 : 80;
      timer = window.setTimeout(() => {
        const next = isActive();
        if (next !== reported) post(next);
      }, delay);
    };

    document.addEventListener("fullscreenchange", sync, true);
    document.addEventListener("webkitfullscreenchange", sync, true);
    document.addEventListener("webkitbeginfullscreen", () => {
      videoFullscreen = true;
      sync();
    }, true);
    document.addEventListener("webkitendfullscreen", () => {
      videoFullscreen = false;
      sync();
    }, true);
    window.addEventListener("pagehide", () => {
      window.clearTimeout(timer);
      if (reported) post(false);
    });
  })();
  true;
`;

const EXIT_FULLSCREEN_SCRIPT = `
  (function() {
    try {
      var d = document;
      var exit = d.exitFullscreen || d.webkitExitFullscreen;
      if (exit) exit.call(d);
      var v = d.querySelector('video');
      if (v && v.webkitDisplayingFullscreen && v.webkitExitFullscreen) v.webkitExitFullscreen();
    } catch (e) {}
  })();
  true;
`;

const PLAYER_SCRIPT = `${AD_BLOCK_SCRIPT}\n${FULLSCREEN_SCRIPT}`;

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

  const [subtitle, setSubtitle] = useState<string | null>(null);
  const webViewRef = useRef<any>(null);
  const canGoBack = useRef(false);
  const downloadNoticeVisible = useRef(false);
  const fullscreenFrames = useRef(new Set<string>());
  const isFullscreen = useRef(false);
  const orientationTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const previousLock = useRef<ScreenOrientation.OrientationLock>(
    ScreenOrientation.OrientationLock.DEFAULT,
  );

  const applyFullscreen = useCallback(
    (active: boolean) => {
      isFullscreen.current = active;

      // Cancel any pending portrait re-assertions from a previous exit.
      orientationTimers.current.forEach(clearTimeout);
      orientationTimers.current = [];

      StatusBar.setHidden(active, "fade");

      const lockPortrait = () =>
        ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.PORTRAIT_UP,
        ).catch((error: unknown) =>
          console.warn("Failed to lock portrait orientation:", error),
        );

      if (active) {
        navigation.setOptions({ orientation: "landscape" });
        ScreenOrientation.lockAsync(
          ScreenOrientation.OrientationLock.LANDSCAPE,
        ).catch((error: unknown) =>
          console.warn("Failed to lock landscape orientation:", error),
        );
        return;
      }

      // Leaving fullscreen: go straight to portrait, then re-assert shortly
      // after to override any late orientation restore done by the WebView.
      lockPortrait();
      navigation.setOptions({ orientation: "portrait" });
      orientationTimers.current = [200, 600].map((delay) =>
        setTimeout(() => {
          if (!isFullscreen.current) lockPortrait();
        }, delay),
      );
    },
    [navigation],
  );

  const resetFullscreen = useCallback(() => {
    fullscreenFrames.current.clear();
    if (isFullscreen.current) applyFullscreen(false);
  }, [applyFullscreen]);

  useEffect(() => {
    navigation.setOptions({ gestureEnabled: true, orientation: "portrait" });
  }, [navigation]);

  useEffect(() => {
    (async () => {
      try {
        previousLock.current = await ScreenOrientation.getOrientationLockAsync();
      } catch (error) {
        console.warn("Failed to read orientation lock:", error);
      }
      ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.PORTRAIT_UP,
      ).catch((error: unknown) =>
        console.warn("Failed to lock portrait orientation:", error),
      );
    })();

    return () => {
      // Make sure no pending portrait re-assertion overrides the restore below.
      orientationTimers.current.forEach(clearTimeout);
      orientationTimers.current = [];
      StatusBar.setHidden(false, "fade");
      ScreenOrientation.lockAsync(previousLock.current).catch((error: unknown) =>
        console.warn("Failed to restore orientation lock:", error),
      );
    };
  }, []);

  useEffect(() => {
    const onBackPress = () => {
      if (isFullscreen.current) {
        webViewRef.current?.injectJavaScript(EXIT_FULLSCREEN_SCRIPT);
        setTimeout(() => {
          if (isFullscreen.current) resetFullscreen();
        }, 1000);
        return true;
      }
      if (canGoBack.current && webViewRef.current) {
        webViewRef.current.goBack();
        return true;
      }
      return false;
    };

    const sub = BackHandler.addEventListener("hardwareBackPress", onBackPress);
    return () => sub.remove();
  }, [resetFullscreen]);

  useEffect(() => {
    (async () => {
      const storedSubtitle = await getSubtitlesStorage();
      setSubtitle(storedSubtitle ?? "en");
    })();
  }, []);

  const source = useMemo(
    () => ({
      uri: `https://vidstuck.cc/embed/${type}/${id}/${seasonNumber}/${episodeNumber}?subtitle=${subtitle}&server=valstrax`,
    }),
    [type, id, seasonNumber, episodeNumber, subtitle],
  );

  if (subtitle === null) return null;

  function showDownloadUnavailable() {
    if (downloadNoticeVisible.current) return;
    downloadNoticeVisible.current = true;
    Alert.alert(
      "Not available",
      "This feature is yet to be rolled out.",
      [
        {
          text: "OK",
          onPress: () => {
            downloadNoticeVisible.current = false;
          },
        },
      ],
      {
        onDismiss: () => {
          downloadNoticeVisible.current = false;
        },
      },
    );
  }

  function updateFullscreenState(frameId: string, active: boolean) {
    if (active) {
      fullscreenFrames.current.add(frameId);
    } else {
      fullscreenFrames.current.delete(frameId);
    }

    const isNowFullscreen = fullscreenFrames.current.size > 0;
    if (isNowFullscreen === isFullscreen.current) return;
    applyFullscreen(isNowFullscreen);
  }

  function handleWebViewMessage(message: string) {
    try {
      const data = JSON.parse(message);
      if (data.type === "fullscreen-state") {
        if (
          typeof data.frameId === "string" &&
          typeof data.active === "boolean"
        ) {
          updateFullscreenState(data.frameId, data.active);
        }
      } else if (data.type === "download-unavailable") {
        showDownloadUnavailable();
      } else if (data.type === "open-url" && data.url) {
        Linking.openURL(data.url).catch((error: unknown) =>
          console.warn("Failed to open download URL:", error),
        );
      }
    } catch {
      // Ignore unrecognized messages
    }
  }

  function handleFileDownload() {
    showDownloadUnavailable();
  }

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        ref={webViewRef}
        source={source}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        allowsPictureInPictureMediaPlayback
        allowsBackForwardNavigationGestures={true}
        onNavigationStateChange={(navState: any) => {
          canGoBack.current = navState.canGoBack;
        }}
        onLoadStart={() => resetFullscreen()}
        sharedCookiesEnabled
        originWhitelist={["*"]}
        setSupportMultipleWindows={false}
        onOpenWindow={(event: any) => {
          const targetUrl = event.nativeEvent.targetUrl;
          if (targetUrl && isDownloadRedirect(targetUrl)) {
            showDownloadUnavailable();
          }
          event.preventDefault();
        }}
        allowsFullscreenVideo={true}
        injectedJavaScriptBeforeContentLoaded={PLAYER_SCRIPT}
        injectedJavaScriptBeforeContentLoadedForMainFrameOnly={false}
        injectedJavaScript={FULLSCREEN_SCRIPT}
        injectedJavaScriptForMainFrameOnly={false}
        onMessage={(event: any) => handleWebViewMessage(event.nativeEvent.data)}
        onFileDownload={
          Platform.OS === "android" ? handleFileDownload : undefined
        }
        onShouldStartLoadWithRequest={(request: {
          url: string;
          navigationType?: string;
          isTopFrame?: boolean;
        }) => {
          const { url } = request;

          if (isDownloadRedirect(url)) {
            showDownloadUnavailable();
            return false;
          }

          const isAllowed =
            url.includes("vidstuck.cc") ||
            url.includes("sacdn.hakunaymatata.com") ||
            url.includes("cloudflare.com") ||
            url.includes("about:blank") ||
            url.includes(".m4s") ||
            url.includes(".m3u8");

          if (isAllowed) {
            return true;
          }

          // Block all external popup redirects on player clicks
          return false;
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  webview: { flex: 1, backgroundColor: "#000" },
});
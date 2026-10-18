import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useThemeProvider } from "./ThemeProvider";

type DownloadRequest = {
  quality: string | null;
  href: string;
  fileName: string;
};

type ActiveDownload = {
  label: string;
  percent: number | null;
};

type DownloadContextValue = {
  startDownload: (request: DownloadRequest) => Promise<void>;
};

class FatalDownloadError extends Error {}

const DOWNLOAD_DIR = `${FileSystem.documentDirectory}downloads/`;
const DownloadContext = createContext<DownloadContextValue | null>(null);

function DownloadProgress({ download }: { download: ActiveDownload | null }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colorScheme } = useThemeProvider();
  const [max, setMax] = useState<boolean>(true);

  function maxTimeout() {
    setTimeout(() => {
      setMax(false);
    }, 5000);
  }

  useLayoutEffect(maxTimeout, []);

  if (!download) return null;

  return (
    <View
      pointerEvents="none"
      style={[styles.overlay, { paddingTop: insets.top + 8 }]}
    >
      <View
        style={[
          styles.banner,
          {
            width: Math.min(220, width - 24),
            backgroundColor: colorScheme.surface,
            borderColor: colorScheme.border,
          },
        ]}
      >
        <View style={styles.heading}>
          <Text
            numberOfLines={1}
            style={[styles.label, { color: colorScheme.textPrimary }]}
          >
            Downloading {download.label}
          </Text>
          {download.percent === null ? (
            <ActivityIndicator color={colorScheme.primary} size="small" />
          ) : (
            <Text
              style={[styles.percent, { color: colorScheme.textSecondary }]}
            >
              {download.percent}%
            </Text>
          )}
        </View>
        {download.percent !== null && (
          <View style={[styles.track, { backgroundColor: colorScheme.border }]}>
            <View
              style={[
                styles.fill,
                {
                  width: `${download.percent}%`,
                  backgroundColor: colorScheme.primary,
                },
              ]}
            />
          </View>
        )}
      </View>
    </View>
  );
}

export function DownloadProvider({ children }: PropsWithChildren) {
  const [activeDownload, setActiveDownload] = useState<ActiveDownload | null>(
    null,
  );
  const isDownloading = useRef(false);

  const startDownload = useCallback(
    async ({ quality, href, fileName }: DownloadRequest) => {
      if (isDownloading.current) {
        Alert.alert("Download in progress", "Wait for the current download.");
        return;
      }

      isDownloading.current = true;
      const label = quality ?? "video";
      setActiveDownload({ label, percent: 0 });
      const fileUri = DOWNLOAD_DIR + fileName;
      const partUri = fileUri + ".part";
      const maxAttempts = 20;
      const headers = {
        "User-Agent":
          "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      };
      const sleep = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

      try {
        await FileSystem.makeDirectoryAsync(DOWNLOAD_DIR, {
          intermediates: true,
        });
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
        await FileSystem.deleteAsync(partUri, { idempotent: true });

        const controller = new AbortController();
        let expectedSize: number | null = null;
        try {
          const response = await fetch(href, {
            headers: { ...headers, Range: "bytes=0-0" },
            signal: controller.signal,
          });
          const contentRange = response.headers.get("content-range");
          const rangeSize = contentRange
            ? Number(contentRange.split("/")[1])
            : NaN;
          const contentLength = Number(response.headers.get("content-length"));
          controller.abort();
          if (Number.isFinite(rangeSize) && rangeSize > 0) {
            expectedSize = rangeSize;
          } else if (
            response.status === 200 &&
            Number.isFinite(contentLength) &&
            contentLength > 0
          ) {
            expectedSize = contentLength;
          }
        } catch {
          controller.abort();
        }
        console.log("Expected size:", expectedSize ?? "unknown");

        let lastPercent = -1;
        let canResume = true;
        let finished = false;

        for (
          let attempt = 1;
          attempt <= maxAttempts && !finished;
          attempt += 1
        ) {
          const before = await FileSystem.getInfoAsync(partUri);
          let offset = before.exists ? before.size : 0;

          if (expectedSize && offset === expectedSize) {
            finished = true;
            break;
          }
          if (
            (expectedSize && offset > expectedSize) ||
            (!canResume && offset > 0)
          ) {
            await FileSystem.deleteAsync(partUri, { idempotent: true });
            offset = 0;
            lastPercent = -1;
          }

          console.log(
            `Download attempt ${attempt}, resuming from ${offset} bytes`,
          );

          const task = FileSystem.createDownloadResumable(
            href,
            partUri,
            { headers },
            (progress) => {
              if (progress.totalBytesExpectedToWrite <= 0) {
                setActiveDownload({ label, percent: null });
                return;
              }
              const percent = Math.min(
                100,
                Math.floor(
                  (progress.totalBytesWritten /
                    progress.totalBytesExpectedToWrite) *
                    100,
                ),
              );
              if (percent > lastPercent) {
                lastPercent = percent;
                setActiveDownload({ label, percent });
              }
            },
            offset > 0 ? String(offset) : undefined,
          );

          try {
            const result = await task.downloadAsync();
            if (!result) throw new Error("Download returned no result");

            if (result.status >= 400 && result.status < 500) {
              throw new FatalDownloadError(`HTTP ${result.status}`);
            }
            if (offset > 0 && result.status === 200) {
              canResume = false;
              await FileSystem.deleteAsync(partUri, { idempotent: true });
              lastPercent = -1;
              continue;
            }
            if (result.status !== 200 && result.status !== 206) {
              throw new Error(`Unexpected status ${result.status}`);
            }

            const after = await FileSystem.getInfoAsync(partUri);
            const size = after.exists ? after.size : 0;
            if (expectedSize && size < expectedSize) {
              throw new Error(`Incomplete: ${size} of ${expectedSize} bytes`);
            }
            if (expectedSize && size > expectedSize) {
              canResume = false;
              await FileSystem.deleteAsync(partUri, { idempotent: true });
              lastPercent = -1;
              continue;
            }
            finished = true;
          } catch (error) {
            if (
              error instanceof FatalDownloadError ||
              attempt === maxAttempts
            ) {
              throw error;
            }
            const message =
              error instanceof Error ? error.message : String(error);
            console.warn(`Attempt ${attempt} failed (${message}), retrying.`);
            await sleep(2000);
          }
        }

        if (!finished) throw new Error("Out of retries");

        const info = await FileSystem.getInfoAsync(partUri);
        const size = info.exists ? info.size : 0;
        if (size < 100 * 1024) {
          await FileSystem.deleteAsync(partUri, { idempotent: true });
          throw new Error(`File too small: ${size} bytes`);
        }

        await FileSystem.moveAsync({ from: partUri, to: fileUri });
        console.log("Saved to:", fileUri, `(${size} bytes)`);

        Alert.alert(
          "Download complete",
          `${label} saved (${(size / (1024 * 1024)).toFixed(1)} MB).`,
          [
            { text: "Close", style: "cancel" },
            {
              text: "Save / Share",
              onPress: async () => {
                if (await Sharing.isAvailableAsync()) {
                  await Sharing.shareAsync(fileUri, {
                    mimeType: "video/mp4",
                    dialogTitle: "Save video",
                  });
                }
              },
            },
          ],
        );
      } catch (error) {
        console.warn("Download failed:", error);
        Alert.alert(
          "Download failed",
          "The link may have expired. Reopen the Download menu and try again.",
        );
      } finally {
        isDownloading.current = false;
        setActiveDownload(null);
      }
    },
    [],
  );

  return (
    <DownloadContext.Provider value={{ startDownload }}>
      <View style={styles.root}>
        {children}
        <DownloadProgress download={activeDownload} />
      </View>
    </DownloadContext.Provider>
  );
}

export function useDownloadManager() {
  const context = useContext(DownloadContext);
  if (!context) {
    throw new Error("useDownloadManager must be used within DownloadProvider");
  }
  return context;
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  overlay: {
    position: "absolute",
    top: 0,
    left: 12,
    right: 12,
    alignItems: "flex-end",

    zIndex: 1000,
    elevation: 100,
  },
  banner: {
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
  heading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  label: { flex: 1, fontSize: 13, fontWeight: "600" },
  percent: { fontSize: 12, fontVariant: ["tabular-nums"] },
  track: { height: 4, borderRadius: 2, overflow: "hidden" },
  fill: { height: 4 },
});

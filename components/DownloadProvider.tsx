import { File } from "expo-file-system";
import * as FileSystem from "expo-file-system/legacy";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import * as Sharing from "expo-sharing";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  waiting: boolean; // true while it waits to reconnect
};

type DownloadContextValue = {
  startDownload: (request: DownloadRequest) => Promise<void>;
};

type FatalError = Error & { fatal?: boolean };
type Check = { ok: true } | { ok: false; reason: string };
type Probe = { size: number | null; rangeOk: boolean };

const DOWNLOAD_DIR = `${FileSystem.documentDirectory}downloads/`;
const MIN_VIDEO_BYTES = 100 * 1024;
const CHUNK_SIZE = 4 * 1024 * 1024; // each request asks for exactly this much
const MAX_STALL_MS = 10 * 60 * 1000; // give up after this long with no new data
const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
};

const DownloadContext = createContext<DownloadContextValue | null>(null);

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

const fatalError = (message: string): FatalError =>
  Object.assign(new Error(message), { fatal: true });

const isFatal = (error: unknown) => Boolean((error as FatalError)?.fatal);

function getHeader(
  headers: Record<string, string> | undefined,
  name: string,
): string | null {
  if (!headers) return null;
  const wanted = name.toLowerCase();
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === wanted) {
      const value = (headers as Record<string, unknown>)[key];
      return Array.isArray(value) ? String(value[0]) : String(value);
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// MP4 structure check
// ---------------------------------------------------------------------------

const BASE64_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

function base64ToBytes(base64: string): number[] {
  const bytes: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const char of base64) {
    if (char === "=") break;
    const value = BASE64_CHARS.indexOf(char);
    if (value < 0) continue;
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((buffer >> bits) & 0xff);
      buffer &= (1 << bits) - 1;
    }
  }
  return bytes;
}

// An MP4 is a chain of boxes (ftyp, moov, mdat, ...). Each box starts with its
// own size, so a healthy file's boxes add up to exactly the file size.
async function validateMp4(uri: string): Promise<Check> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return { ok: false, reason: "file is missing" };

    const total = info.size;
    if (total < MIN_VIDEO_BYTES) {
      return { ok: false, reason: `file too small (${total} bytes)` };
    }

    let offset = 0;
    let sawMoov = false;
    let sawMdat = false;

    for (let i = 0; i < 500 && offset < total; i += 1) {
      const remaining = total - offset;
      if (remaining < 8) {
        return { ok: false, reason: `${remaining} stray bytes at the end` };
      }

      const chunk = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
        position: offset,
        length: Math.min(16, remaining),
      });
      const bytes = base64ToBytes(chunk);
      if (bytes.length < 8) {
        return { ok: false, reason: `unreadable data at byte ${offset}` };
      }

      let size =
        bytes[0] * 16777216 + bytes[1] * 65536 + bytes[2] * 256 + bytes[3];
      const type = String.fromCharCode(bytes[4], bytes[5], bytes[6], bytes[7]);

      if (size === 1) {
        if (bytes.length < 16) {
          return { ok: false, reason: `broken box header at byte ${offset}` };
        }
        const high =
          bytes[8] * 16777216 + bytes[9] * 65536 + bytes[10] * 256 + bytes[11];
        const low =
          bytes[12] * 16777216 +
          bytes[13] * 65536 +
          bytes[14] * 256 +
          bytes[15];
        size = high * 4294967296 + low;
      } else if (size === 0) {
        size = remaining; // box runs to the end of the file
      }

      if (size < 8) {
        return { ok: false, reason: `invalid box "${type}" at byte ${offset}` };
      }
      if (size > remaining) {
        return {
          ok: false,
          reason: `box "${type}" needs ${size} bytes but only ${remaining} remain (file cut short)`,
        };
      }

      if (type === "moov") sawMoov = true;
      if (type === "mdat") sawMdat = true;
      offset += size;
    }

    if (offset !== total) {
      return { ok: false, reason: "file has extra data at the end" };
    }
    if (!sawMoov || !sawMdat) {
      return { ok: false, reason: "video data or index is missing" };
    }
    return { ok: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, reason: `could not read file (${message})` };
  }
}

// ---------------------------------------------------------------------------
// Download helpers
// ---------------------------------------------------------------------------

// Finds the file size and whether the server answers byte-range requests
async function probeSource(href: string): Promise<Probe> {
  const controller = new AbortController();
  try {
    const response = await fetch(href, {
      headers: { ...HEADERS, Range: "bytes=0-0" },
      signal: controller.signal,
    });
    const contentRange = response.headers.get("content-range");
    const rangeSize = contentRange ? Number(contentRange.split("/")[1]) : NaN;
    const contentLength = Number(response.headers.get("content-length"));
    controller.abort();

    if (
      response.status === 206 &&
      Number.isFinite(rangeSize) &&
      rangeSize > 0
    ) {
      return { size: rangeSize, rangeOk: true };
    }
    if (Number.isFinite(contentLength) && contentLength > 0) {
      return { size: contentLength, rangeOk: false };
    }
    return { size: null, rangeOk: false };
  } catch {
    controller.abort();
    return { size: null, rangeOk: false };
  }
}

// Downloads bytes start..end (inclusive) and returns them. The piece is only
// accepted if the server confirms the exact range and the size matches.
async function fetchChunk(
  href: string,
  chunkUri: string,
  start: number,
  end: number,
  onBytes: (written: number) => void,
): Promise<Uint8Array> {
  const expectedLength = end - start + 1;
  await FileSystem.deleteAsync(chunkUri, { idempotent: true });

  const task = FileSystem.createDownloadResumable(
    href,
    chunkUri,
    { headers: { ...HEADERS, Range: `bytes=${start}-${end}` } },
    (progress) => onBytes(progress.totalBytesWritten),
  );

  const result = await task.downloadAsync();
  if (!result) throw new Error("Download returned no result");

  // 408 (timeout) and 429 (slow down) are temporary. Other 4xx errors mean the
  // link has expired or was rejected, and waiting won't fix that.
  if (
    result.status >= 400 &&
    result.status < 500 &&
    result.status !== 408 &&
    result.status !== 429
  ) {
    throw fatalError(`HTTP ${result.status}`);
  }
  if (result.status !== 206) {
    throw new Error(
      `Server did not send the byte range (status ${result.status})`,
    );
  }

  const contentRange = getHeader(result.headers, "content-range");
  if (contentRange && !contentRange.startsWith(`bytes ${start}-`)) {
    throw new Error(`Server sent the wrong part (${contentRange})`);
  }

  const info = await FileSystem.getInfoAsync(chunkUri);
  const size = info.exists ? info.size : 0;
  if (size !== expectedLength) {
    throw new Error(`Piece incomplete: ${size} of ${expectedLength} bytes`);
  }

  return new File(chunkUri).bytes();
}

// Writes bytes into the file at an exact position
function writeAt(partUri: string, position: number, bytes: Uint8Array) {
  const file = new File(partUri);
  if (!file.exists) file.create();
  const handle = file.open();
  try {
    handle.offset = position;
    handle.writeBytes(bytes);
  } finally {
    handle.close();
  }
}

// Downloads the file piece by piece into the .part file. When something goes
// wrong (timeout, no signal, server error) it waits and carries on from the
// last saved piece by itself, for as long as it takes. It only stops if the
// link is rejected, or nothing new arrives for MAX_STALL_MS.
// Returns the byte count it started from (non-zero if it continued a .part).
async function downloadChunked(
  href: string,
  partUri: string,
  total: number,
  onPercent: (percent: number | null) => void,
  onWaiting: () => void,
): Promise<number> {
  const chunkUri = partUri + ".chunk";

  const existing = await FileSystem.getInfoAsync(partUri);
  let committed = 0;
  if (existing.exists) {
    if (existing.size > total) {
      await FileSystem.deleteAsync(partUri, { idempotent: true });
    } else {
      // Whole pieces only, so a piece that was cut off is simply fetched again
      committed = Math.floor(existing.size / CHUNK_SIZE) * CHUNK_SIZE;
    }
  }
  const startedFrom = committed;

  console.log(
    committed > 0
      ? `Continuing from ${committed} of ${total} bytes`
      : `Starting download of ${total} bytes`,
  );

  let lastPercent = -1;
  let lastProgressAt = Date.now();
  let bestBytes = committed;

  const report = (bytes: number) => {
    if (bytes > bestBytes) {
      bestBytes = bytes;
      lastProgressAt = Date.now();
    }
    const percent = Math.min(100, Math.floor((bytes / total) * 100));
    if (percent > lastPercent) {
      lastPercent = percent;
    }
    onPercent(lastPercent);
  };
  report(committed);

  let failures = 0;

  while (committed < total) {
    const start = committed;
    const end = Math.min(start + CHUNK_SIZE, total) - 1;

    try {
      const bytes = await fetchChunk(href, chunkUri, start, end, (written) =>
        report(start + written),
      );
      writeAt(partUri, start, bytes);
      committed = end + 1;
      failures = 0;
      lastProgressAt = Date.now();
      report(committed);
    } catch (error) {
      if (isFatal(error)) throw error;

      failures += 1;
      const message = error instanceof Error ? error.message : String(error);
      const stalledFor = Date.now() - lastProgressAt;
      console.warn(
        `Piece at byte ${start} failed (${message}). Saved so far: ${committed} bytes. Retry ${failures}.`,
      );

      if (stalledFor > MAX_STALL_MS) {
        throw new Error(
          `No new data for ${Math.round(stalledFor / 60000)} minutes`,
        );
      }

      onWaiting();
      // Wait a little longer each time, up to 10 seconds, then try again
      await sleep(Math.min(1000 * failures, 10000));
    }
  }

  await FileSystem.deleteAsync(chunkUri, { idempotent: true });

  const finalInfo = await FileSystem.getInfoAsync(partUri);
  const finalSize = finalInfo.exists ? finalInfo.size : 0;
  if (finalSize !== total) {
    await FileSystem.deleteAsync(partUri, { idempotent: true });
    throw new Error(`Wrong final size: ${finalSize}, expected ${total}`);
  }

  return startedFrom;
}

// Used only when the server can't do byte ranges: one request for the whole
// file, and a failed attempt has to start again from the beginning.
async function downloadWhole(
  href: string,
  partUri: string,
  expectedSize: number | null,
  onPercent: (percent: number | null) => void,
  onWaiting: () => void,
): Promise<void> {
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    await FileSystem.deleteAsync(partUri, { idempotent: true });
    onPercent(0);
    console.log(`Full download attempt ${attempt} of ${maxAttempts}`);

    let lastPercent = -1;
    const task = FileSystem.createDownloadResumable(
      href,
      partUri,
      { headers: HEADERS },
      (progress) => {
        if (progress.totalBytesExpectedToWrite <= 0) {
          onPercent(null);
          return;
        }
        const percent = Math.min(
          100,
          Math.floor(
            (progress.totalBytesWritten / progress.totalBytesExpectedToWrite) *
              100,
          ),
        );
        if (percent > lastPercent) {
          lastPercent = percent;
          onPercent(percent);
        }
      },
    );

    try {
      const result = await task.downloadAsync();
      if (!result) throw new Error("Download returned no result");
      if (result.status >= 400 && result.status < 500) {
        throw fatalError(`HTTP ${result.status}`);
      }
      if (result.status !== 200) {
        throw new Error(`Unexpected status ${result.status}`);
      }

      const info = await FileSystem.getInfoAsync(partUri);
      const size = info.exists ? info.size : 0;
      if (expectedSize && size !== expectedSize) {
        throw new Error(`Wrong size: got ${size}, expected ${expectedSize}`);
      }
      return;
    } catch (error) {
      await FileSystem.deleteAsync(partUri, { idempotent: true });
      if (isFatal(error) || attempt === maxAttempts) throw error;
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`Attempt ${attempt} failed (${message}), starting over.`);
      onWaiting();
      await sleep(2000);
    }
  }
}

// ---------------------------------------------------------------------------
// Progress UI
// ---------------------------------------------------------------------------

function DownloadProgress({ download }: { download: ActiveDownload | null }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colorScheme } = useThemeProvider();
  const [expanded, setExpanded] = useState(true);
  const isActive = download !== null;

  // Full banner for 4 seconds at the start of a download, then only the thin line
  useEffect(() => {
    if (!isActive) return;
    setExpanded(true);
    const timer = setTimeout(() => setExpanded(false), 4000);
    return () => clearTimeout(timer);
  }, [isActive]);

  // Show the banner again whenever it starts waiting to reconnect
  const isWaiting = download?.waiting ?? false;
  useEffect(() => {
    if (isWaiting) setExpanded(true);
  }, [isWaiting]);

  if (!download) return null;

  const percent = download.percent;

  return (
    <View pointerEvents="none" style={styles.overlay}>
      <View style={[styles.line, { backgroundColor: colorScheme.border }]}>
        <View
          style={[
            styles.lineFill,
            {
              width: percent === null ? "30%" : `${percent}%`,
              backgroundColor: colorScheme.primary,
            },
          ]}
        />
      </View>

      {expanded && (
        <View
          style={[
            styles.banner,
            {
              marginTop: insets.top + 8,
              marginRight: 12,
              width: Math.min(220, width - 24),
              backgroundColor: colorScheme.surface,
              borderColor: colorScheme.border,
            },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[styles.label, { color: colorScheme.textPrimary }]}
          >
            {download.waiting
              ? "Reconnecting…"
              : `Downloading ${download.label}`}
          </Text>
          {download.waiting || percent === null ? (
            <ActivityIndicator color={colorScheme.primary} size="small" />
          ) : (
            <Text
              style={[styles.percent, { color: colorScheme.textSecondary }]}
            >
              {percent}%
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

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
      const fileUri = DOWNLOAD_DIR + fileName;
      const partUri = fileUri + ".part";
      let canContinueLater = false;
      console.log("Download started:", fileName);

      try {
        activateKeepAwakeAsync("download").catch(() => {});

        await FileSystem.makeDirectoryAsync(DOWNLOAD_DIR, {
          intermediates: true,
        });

        // Skip if a healthy copy exists; replace it if it is damaged
        const existing = await FileSystem.getInfoAsync(fileUri);
        if (existing.exists) {
          const existingCheck = await validateMp4(fileUri);
          if (existingCheck.ok) {
            Alert.alert("Already downloaded", `${label} is already saved.`);
            return;
          }
          console.warn(
            "Existing file is damaged, replacing it:",
            existingCheck.reason,
          );
          await FileSystem.deleteAsync(fileUri, { idempotent: true });
        }

        setActiveDownload({ label, percent: 0, waiting: false });

        // Progress means we are connected, so it also clears "Reconnecting"
        const onPercent = (percent: number | null) =>
          setActiveDownload({ label, percent, waiting: false });
        const onWaiting = () =>
          setActiveDownload((current) => ({
            label,
            percent: current?.percent ?? null,
            waiting: true,
          }));

        const probe = await probeSource(href);
        console.log(
          "Expected size:",
          probe.size ?? "unknown",
          probe.rangeOk ? "(byte ranges supported)" : "(no byte ranges)",
        );

        let check: Check = { ok: false, reason: "not checked" };

        if (probe.rangeOk && probe.size) {
          canContinueLater = true;

          const startedFrom = await downloadChunked(
            href,
            partUri,
            probe.size,
            onPercent,
            onWaiting,
          );
          check = await validateMp4(partUri);
          console.log("Video check:", check.ok ? "ok" : check.reason);

          // A leftover .part may have come from a different link; redo it cleanly
          if (!check.ok && startedFrom > 0) {
            console.warn("Leftover data did not fit, downloading from scratch");
            await FileSystem.deleteAsync(partUri, { idempotent: true });
            await downloadChunked(
              href,
              partUri,
              probe.size,
              onPercent,
              onWaiting,
            );
            check = await validateMp4(partUri);
            console.log("Second video check:", check.ok ? "ok" : check.reason);
          }
        } else {
          await downloadWhole(href, partUri, probe.size, onPercent, onWaiting);
          check = await validateMp4(partUri);
          console.log("Video check:", check.ok ? "ok" : check.reason);
        }

        if (!check.ok) {
          await FileSystem.deleteAsync(partUri, { idempotent: true });
          throw new Error(`Downloaded file is damaged: ${check.reason}`);
        }

        const info = await FileSystem.getInfoAsync(partUri);
        const size = info.exists ? info.size : 0;

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
        const message = error instanceof Error ? error.message : "";

        if (message.startsWith("Downloaded file is damaged")) {
          Alert.alert(
            "Download failed",
            "The video came through damaged. Try again, or pick another quality.",
          );
        } else if (canContinueLater) {
          // Only reached when the link was rejected or nothing arrived for
          // 10 minutes. The .part file is kept and is used again next time.
          Alert.alert(
            "Download stopped",
            "The link no longer works. Your progress is saved: open the Download menu again and pick the same quality to carry on.",
          );
        } else {
          await FileSystem.deleteAsync(partUri, { idempotent: true }).catch(
            () => {},
          );
          Alert.alert(
            "Download failed",
            "The link may have expired. Reopen the Download menu and try again.",
          );
        }
      } finally {
        deactivateKeepAwake("download");
        isDownloading.current = false;
        setActiveDownload(null);
      }
    },
    [],
  );

  // Stable value, so screens that use the manager don't re-render on every percent
  const value = useMemo(() => ({ startDownload }), [startDownload]);

  return (
    <DownloadContext.Provider value={value}>
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
    left: 0,
    right: 0,
    alignItems: "flex-end",
    zIndex: 1000,
    elevation: 100,
  },
  line: { alignSelf: "stretch", height: 3 },
  lineFill: { height: 3 },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 8,
  },
  label: { flex: 1, fontSize: 12, fontWeight: "600" },
  percent: { fontSize: 12, fontVariant: ["tabular-nums"] },
});

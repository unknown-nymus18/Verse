import { getMovieDetails, getTvDetails } from "@/services/ApiServices";
import * as FileSystem from "expo-file-system/legacy";

export const DOWNLOAD_DIR = `${FileSystem.documentDirectory}downloads/`;

const POSTER_BASE = "https://image.tmdb.org/t/p/w342";
const LOOKUP_TIMEOUT_MS = 10000;

export type DownloadInfo = {
  title: string;
  poster: string | null; // local file path when saved, otherwise a TMDB link
};

type StoredMeta = {
  title: string;
  poster_path: string | null;
  hasPoster: boolean;
};

// "tv-123-S1E2-360p.mp4" -> "tv-123-S1E2-360p"
const baseName = (videoName: string) => videoName.replace(/\.mp4$/, "");
const metaUri = (videoName: string) =>
  `${DOWNLOAD_DIR}${baseName(videoName)}.json`;
const posterUri = (videoName: string) =>
  `${DOWNLOAD_DIR}${baseName(videoName)}.jpg`;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

// Reads the saved title and poster for a downloaded video (no network)
async function readMeta(videoName: string): Promise<DownloadInfo | null> {
  try {
    const uri = metaUri(videoName);
    const info = await FileSystem.getInfoAsync(uri);
    if (!info.exists) return null;

    const stored = JSON.parse(
      await FileSystem.readAsStringAsync(uri),
    ) as StoredMeta;
    if (!stored.title) return null;

    let poster: string | null = null;
    if (stored.hasPoster) {
      const posterInfo = await FileSystem.getInfoAsync(posterUri(videoName));
      if (posterInfo.exists) poster = posterUri(videoName);
    }
    if (!poster && stored.poster_path) {
      poster = POSTER_BASE + stored.poster_path;
    }
    return { title: stored.title, poster };
  } catch {
    return null;
  }
}

async function savePoster(
  videoName: string,
  posterPath: string,
): Promise<boolean> {
  const uri = posterUri(videoName);
  try {
    const result = await FileSystem.downloadAsync(
      POSTER_BASE + posterPath,
      uri,
    );
    if (result.status === 200) return true;
  } catch {
    // fall through and clean up
  }
  await FileSystem.deleteAsync(uri, { idempotent: true }).catch(() => {});
  return false;
}

// Returns the saved title and poster. If nothing is saved yet, it looks them up
// online, saves them next to the video, and returns them. Returns null if there
// is nothing saved and the lookup fails (for example, when offline).
export async function ensureMeta(
  videoName: string,
  mediaId: string,
  mediaType: "tv" | "movie",
): Promise<DownloadInfo | null> {
  const saved = await readMeta(videoName);
  if (saved) return saved;

  try {
    return await withTimeout(
      (async () => {
        const response =
          mediaType === "tv"
            ? await getTvDetails(mediaId)
            : await getMovieDetails(mediaId);
        if (!response.ok) return null;

        const data = await response.json();
        const title: string | null = data.title || data.name || null;
        if (!title) return null;

        const posterPath: string | null = data.poster_path ?? null;
        const hasPoster = posterPath
          ? await savePoster(videoName, posterPath)
          : false;

        const stored: StoredMeta = {
          title,
          poster_path: posterPath,
          hasPoster,
        };
        await FileSystem.writeAsStringAsync(
          metaUri(videoName),
          JSON.stringify(stored),
        );

        return {
          title,
          poster: hasPoster
            ? posterUri(videoName)
            : posterPath
              ? POSTER_BASE + posterPath
              : null,
        } as DownloadInfo;
      })(),
      LOOKUP_TIMEOUT_MS,
    );
  } catch {
    return null;
  }
}

// Removes the saved title and poster that belong to a video
export async function deleteMeta(videoName: string): Promise<void> {
  await FileSystem.deleteAsync(metaUri(videoName), { idempotent: true }).catch(
    () => {},
  );
  await FileSystem.deleteAsync(posterUri(videoName), {
    idempotent: true,
  }).catch(() => {});
}

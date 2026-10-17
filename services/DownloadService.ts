import * as FileSystem from "expo-file-system/legacy";

export interface DownloadProgress {
  movieId: string;
  progress: number;
  downloadedChunks: number;
  status: "downloading" | "completed" | "failed";
}

export interface SavedMovie {
  movieId: string;
  title?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  media_type?: string;
  downloadedAt: string;
  totalChunks: number;
  localDir: string;
  videoUri: string;
}

export interface DownloadMetadata {
  title?: string;
  poster_path?: string | null;
  backdrop_path?: string | null;
  media_type?: string;
}

/**
 * Downloads ALL initialization and media chunks until the stream terminates.
 */
export async function downloadDashStream(
  movieId: string,
  baseUrl: string,
  queryParams: string,
  estimatedChunks: number = 3000, // Large default cap to cover 2-3 hour movies
  onProgress?: (progress: DownloadProgress) => void,
  metadata?: DownloadMetadata,
): Promise<string> {
  const downloadsDir = `${FileSystem.documentDirectory}downloads/`;
  const movieDir = `${downloadsDir}${movieId}/`;

  const dirInfo = await FileSystem.getInfoAsync(movieDir);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(movieDir, { intermediates: true });
  }

  const finalVideoUri = `${movieDir}video.mp4`;
  const requestHeaders = {
    "User-Agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
    Referer: "https://vidstuck.xyz/",
  };

  try {
    const existingFile = await FileSystem.getInfoAsync(finalVideoUri);
    if (existingFile.exists) {
      await FileSystem.deleteAsync(finalVideoUri);
    }

    // 1. Fetch Init Segment
    const initVideoUrl = `${baseUrl}/init-stream0.m4s?${queryParams}`;
    const initTempUri = `${movieDir}init.tmp`;

    await FileSystem.downloadAsync(initVideoUrl, initTempUri, {
      headers: requestHeaders,
    });

    const initBase64 = await FileSystem.readAsStringAsync(initTempUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await FileSystem.writeAsStringAsync(finalVideoUri, initBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    await FileSystem.deleteAsync(initTempUri, { idempotent: true });

    // 2. Fetch ALL Chunks Continuously Until Stream Exists
    let chunkIndex = 1;
    let consecutiveFailures = 0;
    const MAX_CONSECUTIVE_FAILURES = 3; // Stop after 3 missing chunks in a row

    while (chunkIndex <= estimatedChunks) {
      const paddedIndex = String(chunkIndex).padStart(5, "0");
      const unpaddedIndex = String(chunkIndex);

      let videoChunkUrl = `${baseUrl}/chunk-stream0-${paddedIndex}.m4s?${queryParams}`;
      const chunkTempUri = `${movieDir}chunk_${paddedIndex}.tmp`;

      let downloadedSuccessfully = false;

      // Try padded index (chunk-stream0-00001.m4s)
      try {
        const res = await FileSystem.downloadAsync(
          videoChunkUrl,
          chunkTempUri,
          {
            headers: requestHeaders,
          },
        );
        if (res.status === 200) {
          downloadedSuccessfully = true;
        }
      } catch (e) {
        // Fallback: Try unpadded index (chunk-stream0-1.m4s)
        try {
          videoChunkUrl = `${baseUrl}/chunk-stream0-${unpaddedIndex}.m4s?${queryParams}`;
          const res2 = await FileSystem.downloadAsync(
            videoChunkUrl,
            chunkTempUri,
            {
              headers: requestHeaders,
            },
          );
          if (res2.status === 200) {
            downloadedSuccessfully = true;
          }
        } catch (e2) {
          downloadedSuccessfully = false;
        }
      }

      if (downloadedSuccessfully) {
        const chunkBase64 = await FileSystem.readAsStringAsync(chunkTempUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const currentVideoBase64 = await FileSystem.readAsStringAsync(
          finalVideoUri,
          { encoding: FileSystem.EncodingType.Base64 },
        );

        await FileSystem.writeAsStringAsync(
          finalVideoUri,
          currentVideoBase64 + chunkBase64,
          { encoding: FileSystem.EncodingType.Base64 },
        );

        await FileSystem.deleteAsync(chunkTempUri, { idempotent: true });
        consecutiveFailures = 0;

        onProgress?.({
          movieId,
          progress: Math.min(0.99, chunkIndex / estimatedChunks),
          downloadedChunks: chunkIndex,
          status: "downloading",
        });

        chunkIndex++;
      } else {
        await FileSystem.deleteAsync(chunkTempUri, { idempotent: true });
        consecutiveFailures++;

        // When we hit 3 failures, we've reached the end of the full movie
        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          console.log(
            `Full movie download complete at chunk ${chunkIndex - consecutiveFailures}`,
          );
          break;
        }
        chunkIndex++;
      }
    }

    const totalDownloadedChunks = Math.max(1, chunkIndex - consecutiveFailures);

    // 3. Save Metadata
    const metaUri = `${movieDir}metadata.json`;
    await FileSystem.writeAsStringAsync(
      metaUri,
      JSON.stringify({
        movieId,
        title: metadata?.title,
        poster_path: metadata?.poster_path,
        backdrop_path: metadata?.backdrop_path,
        media_type: metadata?.media_type || "movie",
        downloadedAt: new Date().toISOString(),
        totalChunks: totalDownloadedChunks,
        localDir: movieDir,
        videoUri: finalVideoUri,
      }),
    );

    onProgress?.({
      movieId,
      progress: 1,
      downloadedChunks: totalDownloadedChunks,
      status: "completed",
    });

    return finalVideoUri;
  } catch (error) {
    console.error("Full movie download failed:", error);
    const failCheck = await FileSystem.getInfoAsync(finalVideoUri);
    if (failCheck.exists) {
      await FileSystem.deleteAsync(finalVideoUri);
    }
    onProgress?.({
      movieId,
      progress: 0,
      downloadedChunks: 0,
      status: "failed",
    });
    throw error;
  }
}

export async function isMovieDownloaded(movieId: string): Promise<boolean> {
  try {
    const videoUri = `${FileSystem.documentDirectory}downloads/${movieId}/video.mp4`;
    const info = await FileSystem.getInfoAsync(videoUri);
    return info.exists;
  } catch (e) {
    return false;
  }
}

export async function getDownloadedMovies(): Promise<SavedMovie[]> {
  try {
    const downloadsDir = `${FileSystem.documentDirectory}downloads/`;
    const dirInfo = await FileSystem.getInfoAsync(downloadsDir);
    if (!dirInfo.exists) return [];

    const items = await FileSystem.readDirectoryAsync(downloadsDir);
    const savedMovies: SavedMovie[] = [];

    for (const folderName of items) {
      const metaUri = `${downloadsDir}${folderName}/metadata.json`;
      const metaInfo = await FileSystem.getInfoAsync(metaUri);

      if (metaInfo.exists) {
        try {
          const content = await FileSystem.readAsStringAsync(metaUri);
          const parsed = JSON.parse(content);
          savedMovies.push(parsed);
        } catch (e) {
          console.error(`Failed to parse metadata for ${folderName}`, e);
        }
      }
    }

    return savedMovies;
  } catch (e) {
    console.error("Failed to get downloaded movies:", e);
    return [];
  }
}

export async function deleteDownloadedMovie(movieId: string): Promise<boolean> {
  try {
    const movieDir = `${FileSystem.documentDirectory}downloads/${movieId}/`;
    const dirInfo = await FileSystem.getInfoAsync(movieDir);

    if (dirInfo.exists) {
      await FileSystem.deleteAsync(movieDir);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`Failed to delete download for movie ${movieId}:`, error);
    return false;
  }
}

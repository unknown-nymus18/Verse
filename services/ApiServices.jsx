import { TMDB_BEARER_TOKEN } from "@env";
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN = TMDB_BEARER_TOKEN;
const SUBTITLE_KEY = "subtitles";

async function getAllMovies(pageToLoad) {
  const response = await fetch(
    `https://api.themoviedb.org/3/trending/all/day?language=en-US&page=${pageToLoad}`,
    {
      method: "GET",
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
    },
  );
  return response;
}

async function getTrendingMovies() {
  const response = await fetch(
    "https://api.themoviedb.org/3/trending/movie/day",
    {
      headers: {
        Authorization: `Bearer ${TOKEN}`,
        accept: "application/json",
      },
    },
  );
  return response;
}

async function getGenreMovies(id) {
  const response = await fetch(
    `https://api.themoviedb.org/3/discover/movie?with_genres=${id}&sort_by=popularity.desc&language=en-US`,
    {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
    },
  );
  return response;
}

async function getMovieDetails(id) {
  const response = await fetch(
    `https://api.themoviedb.org/3/movie/${id}?language=en-US&append_to_response=credits,recommendations`,
    {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
    },
  );
  return response;
}

async function searchMovies(trimmed) {
  "https://api.themoviedb.org/3/search/multi?include_adult=false&language=en-US&page=1";
  const response = await fetch(
    `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(trimmed)}&language=en-US&page=1&include_adult=false`,
    {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
    },
  );
  return response;
}

async function getTvDetails(series_id) {
  const response = await fetch(
    `https://api.themoviedb.org/3/tv/${series_id}?language=en-US`,
    {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
    },
  );
  return response;
}

async function getSeasonDetails(series_id, season_number) {
  const response = await fetch(
    `https://api.themoviedb.org/3/tv/${series_id}/season/${season_number}?language=en-US`,
    {
      headers: {
        accept: "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
    },
  );
  return response;
}

async function setLocalTheme(isDark) {
  try {
    await AsyncStorage.setItem(THEME_KEY, JSON.stringify(isDark));
  } catch (error) {
    console.error("Error saving theme preference:", error);
  }
}

async function getLocalTheme(defaultValue = false) {
  try {
    const value = await AsyncStorage.getItem("isDark");
    return value !== null ? JSON.parse(value) : defaultValue;
  } catch (error) {
    console.error("Error reading local theme:", error);
    return defaultValue;
  }
}
async function setSubtitlesStorage(subtitle = "english") {
  try {
    await AsyncStorage.setItem(SUBTITLE_KEY, subtitle);
  } catch (error) {
    console.error("Error saving subtitle preference:", error);
  }
}

async function getSubtitlesStorage() {
  try {
    const value = await AsyncStorage.getItem(SUBTITLE_KEY);
    if (value !== null) return value;
    await setSubtitlesStorage("english");
    return "english";
  } catch (error) {
    console.error("Error reading subtitle preference:", error);
    return "english";
  }
}

const SUBTITLE_OPTIONS = [
  { label: "English", value: "english" },
  { label: "Spanish", value: "spanish" },
  { label: "French", value: "french" },
];

const DEFAULT_OPTIONS = "english";
export {
  DEFAULT_OPTIONS,
  getAllMovies,
  getGenreMovies,
  getMovieDetails,
  getSeasonDetails,
  getSubtitlesStorage,
  getTrendingMovies,
  getTvDetails,
  searchMovies,
  setSubtitlesStorage,
  SUBTITLE_OPTIONS
};


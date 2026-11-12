import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import YoutubePlayer from "react-native-youtube-iframe";

import Text from "@/components/AppText";
import MovieCard from "@/components/Moviecard";
import { isValid, parseISO } from "date-fns";
import {
  Alert,
  FlatList,
  Image,
  ImageBackground,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import DetailsScreenSkeleton from "../components/DetailsScreenSkeleton";
import { useThemeProvider } from "../components/ThemeProvider";
import {
  getMovieDetails,
  isItemSaved,
  toggleSavedItem,
} from "../services/ApiServices";
import {
  cancelReleaseReminder,
  findReleaseReminder,
  scheduleReleaseReminder,
  type ReleaseDetailsRoute,
} from "../services/ReleaseNotifications";


const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

function imageUrl(path: string | null | undefined, size: string) {
  return path ? `${IMAGE_BASE_URL}/${size}${path}` : null;
}

interface Genre {
  id: number;
  name: string;
}

interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

interface RecommendationItem {
  adult?: boolean;
  id: number;
  title?: string;
  original_title?: string;
  name?: string;
  original_name?: string;
  poster_path: string | null;
  media_type: "movie" | "tv";
  original_language?: string;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  width?: number | `${number}%`;
}

interface Video {
  id: string;
  key: string;
  site: string;
  official: boolean;
  type: string;
}

interface MovieDetails {
  id: number;
  title?: string;
  name?: string;
  media_type: "movie" | "tv";
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  release_date?: string;
  first_air_date?: string;
  runtime?: number;
  vote_average: number;
  genres?: Genre[];
  credits?: { cast: CastMember[] };
  recommendations?: { results: RecommendationItem[] };
  videos?: { results: Video[] };
}

const TYPE_RANK: Record<string, number> = { Trailer: 0, Teaser: 2, Clip: 4 };

function pickTrailerKey(videos: Video[] = []): string | undefined {
  const rank = (v: Video) => (TYPE_RANK[v.type] ?? 6) + (v.official ? 0 : 1);

  return videos
    .filter((v) => v.site === "YouTube")
    .sort((a, b) => rank(a) - rank(b))[0]?.key;
}

function formatRuntime(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

function ReleaseCountdown({
  releaseDate,
  title,
  reminderKey,
  route,
  mediaId,
  labelColor,
  numberColor,
  tileColor,
  borderColor,
  shadowColor,
}: {
  releaseDate?: string;
  title: string;
  reminderKey: string;
  route: ReleaseDetailsRoute;
  mediaId: string;
  labelColor: string;
  numberColor: string;
  tileColor: string;
  borderColor: string;
  shadowColor: string;
}) {
  const [now, setNow] = useState<number | null>(null);
  const [reminderId, setReminderId] = useState<string | null>(null);
  const [isReminderBusy, setReminderBusy] = useState(false);
  const parsedDate = releaseDate ? parseISO(releaseDate) : null;
  const releaseTimestamp =
    parsedDate && isValid(parsedDate) ? parsedDate.getTime() : null;
  const isUpcoming =
    releaseTimestamp !== null && (now === null || releaseTimestamp > now);

  useEffect(() => {
    if (!isUpcoming) return;

    const initialUpdate = setTimeout(() => setNow(Date.now()), 0);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(initialUpdate);
      clearInterval(timer);
    };
  }, [isUpcoming, releaseTimestamp]);

  useEffect(() => {
    if (Platform.OS === "web") return;

    let isMounted = true;
    findReleaseReminder(reminderKey, releaseTimestamp)
      .then((identifier) => {
        if (isMounted) setReminderId(identifier);
      })
      .catch((error) => {
        console.error("Unable to check release reminder", error);
        if (isMounted) {
          Alert.alert(
            "Reminder unavailable",
            "Could not check this title's notification reminder.",
          );
        }
      });

    return () => {
      isMounted = false;
    };
  }, [reminderKey, releaseTimestamp]);

  async function toggleReminder() {
    if (
      isReminderBusy ||
      releaseTimestamp === null ||
      releaseTimestamp <= Date.now()
    ) {
      return;
    }

    setReminderBusy(true);
    try {
      if (reminderId) {
        await cancelReleaseReminder(reminderId);
        setReminderId(null);
        return;
      }

      const identifier = await scheduleReleaseReminder(
        reminderKey,
        title,
        releaseTimestamp,
        route,
        mediaId,
      );
      if (!identifier) {
        Alert.alert(
          "Notifications are disabled",
          "Allow notifications in your device settings to receive release reminders.",
        );
        return;
      }

      setReminderId(identifier);
    } catch (error) {
      console.error("Unable to update release reminder", error);
      Alert.alert(
        "Reminder unavailable",
        "Could not update this title's notification reminder. Please try again.",
      );
    } finally {
      setReminderBusy(false);
    }
  }

  if (!isUpcoming || releaseTimestamp === null || now === null) return null;

  const secondsRemaining = Math.ceil((releaseTimestamp - now) / 1000);
  const days = Math.floor(secondsRemaining / 86400);
  const hours = Math.floor((secondsRemaining % 86400) / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;
  const units = [
    { label: "DAYS", value: String(days).padStart(2, "0") },
    { label: "HOURS", value: String(hours).padStart(2, "0") },
    { label: "MINUTES", value: String(minutes).padStart(2, "0") },
    { label: "SECONDS", value: String(seconds).padStart(2, "0") },
  ];

  return (
    <View>
      <View style={styles.releaseCountdown}>
        {units.map(({ label, value }) => (
          <View key={label} style={styles.countdownUnit}>
            <Text style={[styles.countdownLabel, { color: labelColor }]}>
              {label}
            </Text>
            <View
              style={[
                styles.countdownTile,
                { backgroundColor: tileColor, borderColor, shadowColor },
              ]}
            >
              <Text
                style={[
                  styles.countdownNumber,
                  { color: numberColor },
                  value.length > 2 && styles.countdownLongNumber,
                ]}
              >
                {value}
              </Text>
            </View>
          </View>
        ))}
      </View>
      {Platform.OS !== "web" && (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isReminderBusy }}
          disabled={isReminderBusy}
          onPress={() => {
            Haptics.selectionAsync();
            toggleReminder();
          }}
          style={[
            styles.releaseReminderButton,
            { backgroundColor: tileColor, borderColor },
          ]}
        >
          <Ionicons
            name={
              reminderId ? "notifications-off-outline" : "notifications-outline"
            }
            size={17}
            color={numberColor}
          />
          <Text style={[styles.releaseReminderText, { color: numberColor }]}>
            {isReminderBusy
              ? "Updating..."
              : reminderId
                ? "Cancel reminder"
                : "Notify me"}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

export default function DetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useThemeProvider();
  const {
    bgColor,
    primaryText,
    secondaryText,
    subText,
    cardBg,
    imagePlaceholder,
    listBtnBg,
    listBtnBorder,
    playBtnBg,
    playBtnText,
  } = colors;
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [isSaved, setSaved] = useState<boolean>(false);
  const [isPlaying, setPlaying] = useState(false);
  const [movie, setMovie] = useState<MovieDetails | null>(null);
  const [isLoading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showIcon, setShowIcon] = useState<boolean>(false);
  const delay = 4000;

  const playerHeight = Math.round((width * 9) / 16);

  async function getMovieData() {
    try {
      setSaved(await isItemSaved(id, "movie"));
      setLoading(true);
      setError(null);
      const response = await getMovieDetails(id);
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const data: MovieDetails = await response.json();
      setMovie(data);
    } catch (e) {
      console.error("Unable to load movie details", e);
      setError("Couldn't load this movie right now.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleSave() {
    const response = await toggleSavedItem(id, "movie");
    setSaved(response ? !isSaved : isSaved);
  }

  useEffect(() => {
    if (id) {
      getMovieData();
    }

    const timer = setTimeout(() => {
      setShowIcon(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [id, delay]);

  useEffect(() => {
    setPlaying(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      return () => setPlaying(false);
    }, []),
  );


  const onStateChange = useCallback((state: string) => {
    if (state === "ended") {
      setPlaying(false);
    }
  }, []);

  const startTrailer = useCallback(() => {
    Haptics.selectionAsync();
    setPlaying(true);
  }, []);

  const closeTrailer = useCallback(() => {
    setPlaying(false);
  }, []);

  if (isLoading) {
    return <DetailsScreenSkeleton />;
  }

  if (error || !movie) {
    return (
      <View style={[styles.center, { backgroundColor: bgColor }]}>
        <Text style={styles.errorText}>{error ?? "Movie not found"}</Text>
        <Pressable
          style={[styles.retryButton, { backgroundColor: primaryText }]}
          onPress={getMovieData}
        >
          <Text style={[styles.retryText, { color: bgColor }]}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const displayTitle = movie.title || movie.name || "Untitled";
  const releaseDate = movie.release_date || movie.first_air_date;
  const cast = movie.credits?.cast ?? [];
  const recommendations = movie.recommendations?.results ?? [];
  const backdropUrl = imageUrl(movie.backdrop_path, "w780");
  const videoId = pickTrailerKey(movie.videos?.results);

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      {!isPlaying || !videoId ? (
        <ImageBackground
          style={[styles.poster, { backgroundColor: imagePlaceholder }]}
          imageStyle={styles.posterImage}
          resizeMode="cover"
          source={backdropUrl ? { uri: backdropUrl } : undefined}
        >
          <LinearGradient
            pointerEvents="none"
            colors={colors.fadeGradient}
            locations={[0, 0.55, 1]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.fade}
          />

          <View style={styles.content}>
            <SafeAreaView edges={["top"]} style={styles.topSafeArea}>
              <Pressable
                onPress={() => router.back()}
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={22} color="#fff" />
              </Pressable>
            </SafeAreaView>

            {!!videoId && (
              <View style={styles.trailerOverlay}>
                <Pressable
                  onPress={startTrailer}
                  accessibilityRole="button"
                  accessibilityLabel="Play trailer"
                  hitSlop={16}
                  style={{
                    display: showIcon ? "flex" : "none",
                    width: 50,
                    height: 50,
                    borderRadius: 25,
                    backgroundColor: "rgba(0, 0, 0, 0.55)", // Dark semi-transparent background
                    justifyContent: "center",
                    alignItems: "center",

                    borderWidth: 1,
                    borderColor: "rgba(255, 255, 255, 0.3)",
                  }}
                >
                  <FontAwesome5
                    name="play"
                    size={24}
                    color="#FFFFFF"
                    style={{ marginLeft: 2 }}
                  />
                </Pressable>
              </View>
            )}

            <View style={styles.actions}>
              <TouchableOpacity
                style={[styles.button, { backgroundColor: playBtnBg }]}
                onPress={() => {
                  Haptics.selectionAsync();
                  router.push({
                    pathname: "/play",
                    params: {
                      id: id,
                      type: "movie",
                      title: displayTitle,
                      poster_path: movie.poster_path ?? undefined,
                      backdrop_path: movie.backdrop_path ?? undefined,
                    },
                  });
                }}
              >
                <Ionicons name="play" size={14} color={playBtnText} />
                <Text style={[styles.playText, { color: playBtnText }]}>
                  Play Now
                </Text>
              </TouchableOpacity>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  toggleSave();
                }}
                style={[
                  styles.button,
                  {
                    backgroundColor: isSaved ? "green" : listBtnBg,
                    borderColor: listBtnBorder,
                    borderWidth: 1,
                  },
                ]}
              >
                <Ionicons
                  name="bookmark-outline"
                  size={17}
                  color={primaryText}
                />
                <Text style={[styles.listText, { color: primaryText }]}>
                  {isSaved ? "Saved" : "Add to List"}
                </Text>
              </Pressable>
            </View>
          </View>
        </ImageBackground>
      ) : (
        <View style={[styles.poster, styles.playerBox]}>
          <YoutubePlayer
            width={width}
            height={playerHeight}
            play={isPlaying}
            videoId={videoId}
            onChangeState={onStateChange}
            onError={() => {
              // Some trailers have embedding disabled; fall back to YouTube itself
              setPlaying(false);
              Linking.openURL(`https://www.youtube.com/watch?v=${videoId}`);
            }}
            initialPlayerParams={{ rel: false, modestbranding: true }}
          />
          <Pressable
            onPress={closeTrailer}
            style={[
              styles.backButton,
              styles.closeButton,
              { top: insets.top + 4 },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Close trailer"
          >
            <Ionicons name="close" size={22} color="#fff" />
          </Pressable>
        </View>
      )}

      <SafeAreaView style={{ flex: 1 }} edges={["bottom"]}>
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: primaryText }]}>
            {displayTitle}
          </Text>

          <View style={styles.stats}>
            <Ionicons name="star" size={13} color="#ffc400" />
            <Text style={[styles.statsText, { color: secondaryText }]}>
              {movie.vote_average?.toFixed(1)}/10.0
            </Text>
            {!!releaseDate && (
              <Text style={[styles.statsText, { color: secondaryText }]}>
                {releaseDate}
              </Text>
            )}
            {!!movie.runtime && (
              <Text style={[styles.statsText, { color: secondaryText }]}>
                {formatRuntime(movie.runtime)}
              </Text>
            )}
          </View>

          {!!movie.genres?.length && (
            <View style={styles.genreRow}>
              {movie.genres.map((genre) => (
                <View
                  key={genre.id}
                  style={[styles.genreChip, { backgroundColor: cardBg }]}
                >
                  <Text style={[styles.genreText, { color: primaryText }]}>
                    {genre.name}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity 
          onPress={()=>router.push({pathname:"/reviews",params:{id}})}
          style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10 }}>
            <Text style={{ color: '#1e90ff',textDecorationLine: 'underline' }}>Reviews</Text>
            <Ionicons name="chevron-forward" size={16} color="#1e90ff" />
          </TouchableOpacity>

          <ReleaseCountdown
            releaseDate={releaseDate}
            title={displayTitle}
            reminderKey={`release-reminder:${movie.media_type}:${movie.id}`}
            route={movie.media_type === "tv" ? "tvdetails" : "details"}
            mediaId={String(movie.id)}
            labelColor={secondaryText}
            numberColor={primaryText}
            tileColor={cardBg}
            borderColor={listBtnBorder}
            shadowColor={subText}
          />


          {!!movie.overview && (
            <>
              <Text style={[styles.sectionTitle, { color: primaryText }]}>
                Overview
              </Text>
              <Text style={[styles.overview, { color: secondaryText }]}>
                {movie.overview}
              </Text>
            </>
          )}

          {!!cast.length && (
            <>
              <Text style={[styles.sectionTitle, { color: primaryText }]}>
                Cast
              </Text>
              <FlatList
                data={cast.slice(0, 15)}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.horizontalList}
                renderItem={({ item }) => {
                  const photoUrl = imageUrl(item.profile_path, "w200");
                  return (
                    <View style={styles.castCard}>
                      {photoUrl ? (
                        <Image
                          source={{ uri: photoUrl }}
                          style={[
                            styles.castPhoto,
                            { backgroundColor: imagePlaceholder },
                          ]}
                        />
                      ) : (
                        <View
                          style={[
                            styles.castPhoto,
                            { backgroundColor: imagePlaceholder },
                          ]}
                        />
                      )}
                      <Text
                        style={[styles.castName, { color: primaryText }]}
                        numberOfLines={1}
                      >
                        {item.name}
                      </Text>
                      <Text
                        style={[styles.castCharacter, { color: subText }]}
                        numberOfLines={1}
                      >
                        {item.character}
                      </Text>
                    </View>
                  );
                }}
              />
            </>
          )}

          {!!recommendations.length && (
            <>
              <Text style={[styles.sectionTitle, { color: primaryText }]}>
                Recommended
              </Text>
              <FlatList
                data={recommendations.slice(0, 15)}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.horizontalList}
                renderItem={({ item }) => {
                  // const recPosterUrl = imageUrl(item.poster_path, "w200");
                  return (
                    <MovieCard
                      adult={item.adult}
                      id={item.id}
                      title={item.title}
                      original_title={item.original_title}
                      name={item.name}
                      original_name={item.original_name}
                      poster_path={item.poster_path}
                      media_type={item.media_type}
                      original_language={item.original_language}
                      release_date={item.release_date}
                      first_air_date={item.first_air_date}
                      vote_average={item.vote_average}
                      width={110}
                      replace={true}
                    />
                  );
                }}
              />
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "center",
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 24,
  },
  errorText: {
    color: "#c0392b",
    fontSize: 15,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 4,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 7,
  },
  retryText: {
    fontSize: 13,
    fontWeight: "700",
  },
  poster: {
    height: "40%",
    width: "100%",
    overflow: "hidden",
  },
  posterImage: {
    height: "100%",
    width: "100%",
  },
  playerBox: {
    backgroundColor: "#000",
    justifyContent: "center",
  },
  closeButton: {
    position: "absolute",
    left: 14,
  },
  fade: {
    position: "absolute",
    right: 0,
    bottom: 0,
    left: 0,
    height: "44%",
  },
  content: {
    flex: 1,
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingBottom: 22,
    zIndex: 1,
  },
  topSafeArea: {
    width: "100%",
  },
  trailerOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingBottom: 22,
    zIndex: 100,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  button: {
    height: 42,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    paddingHorizontal: 18,
    borderRadius: 7,
  },
  playText: {
    fontSize: 13,
    fontWeight: "700",
  },
  listText: {
    fontSize: 13,
    fontWeight: "600",
  },
  body: {
    flex: 1,
    width: "100%",
  },
  bodyContent: {
    paddingHorizontal: 14,
    paddingBottom: 32,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    marginTop: 16,
  },
  stats: {
    flexDirection: "row",
    gap: 14,
    marginTop: 6,
    marginBottom:10,
  },
  statsText: {
    fontSize: 13,
  },
  releaseCountdown: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  releaseReminderButton: {
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  releaseReminderText: {
    fontSize: 14,
    fontWeight: "600",
  },
  countdownUnit: {
    flex: 1,
    alignItems: "center",
    minWidth: 0,
  },
  countdownLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
    marginBottom: 8,
  },
  countdownTile: {
    width: "100%",
    height: 72,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 6,
    borderWidth: 1,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
  },
  countdownNumber: {
    fontSize: 46,
    fontWeight: "900",
    fontVariant: ["tabular-nums"],
    lineHeight: 58,
  },
  countdownLongNumber: {
    fontSize: 34,
  },
  genreRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 14,
  },
  genreChip: {
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  genreText: {
    fontSize: 12,
    fontWeight: "600",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 18,
    marginBottom: 10,
  },
  overview: {
    fontSize: 14,
    lineHeight: 20,
  },
  horizontalList: {
    paddingRight: 14,
    gap: 16,
  },
  castCard: {
    width: 90,
    marginRight: 12,
  },
  castPhoto: {
    width: 90,
    height: 90,
    borderRadius: 45,
  },
  castName: {
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
  },
  castCharacter: {
    fontSize: 11,
    textAlign: "center",
  },
  recCard: {
    width: 110,
    marginRight: 12,
    overflow: "hidden",
  },
  recPoster: {
    width: 110,
    height: 165,
    borderRadius: 8,
  },
  recMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 5,
  },
  recTitle: {
    fontSize: 12,
    marginTop: 6,
  },
});

import DetailsScreenSkeleton from "@/components/DetailsScreenSkeleton";
import EpisodeCard from "@/components/EpisodeCard";
import MovieCard from "@/components/Moviecard";
import Text from "@/components/AppText";
import { useThemeProvider } from "@/components/ThemeProvider";
import {
  getSeasonDetails,
  getTvDetails,
  isItemSaved,
  toggleSavedItem,
} from "@/services/ApiServices";
import FontAwesome5 from "@expo/vector-icons/FontAwesome5";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Picker } from "@react-native-picker/picker";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import YoutubePlayer from "react-native-youtube-iframe";

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

interface Episode {
  id: number;
  name: string;
  still_path: string;
  vote_average: number;
  guest_stars: CastMember[];
  episode_number: number;
}

interface SeasonDetails {
  episodes: Episode[];
  crew: CastMember[];
  poster_path: string;
}

type SeasonsMap = Record<string, SeasonDetails>;

interface Season {
  episode_count: number;
  id: number;
  name: string;
  overview: string;
  poster_path: string;
  season_number: number;
  vote_average: number;
}

interface Video {
  id: string;
  key: string;
  site: string;
  official: boolean;
  type: string;
}

const TYPE_RANK: Record<string, number> = { Trailer: 0, Teaser: 2, Clip: 4 };

function pickTrailerKey(videos: Video[] = []): string | undefined {
  const rank = (v: Video) => (TYPE_RANK[v.type] ?? 6) + (v.official ? 0 : 1);

  return videos
    .filter((v) => v.site === "YouTube")
    .sort((a, b) => rank(a) - rank(b))[0]?.key;
}

interface TVProps {
  id: number;
  adult: string;
  backdrop_path: string;
  genres: Genre[];
  in_production: boolean;
  number_of_season: number;
  original_name: string;
  name: string;
  overview: string;
  poster_path: string;
  seasons: Season[];
  vote_average: number;
  tagline: string;
  credits?: { cast: CastMember[] };
  recommendations?: { results: RecommendationItem[] };
  videos?: { results: Video[] };
  last_air_date: string;
  runtime?: number;
}

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
function imageUrl(path: string | null | undefined, size: string) {
  return path ? `${IMAGE_BASE_URL}/${size}${path}` : null;
}

export default function TvDetails() {
  const { id }: { id: string } = useLocalSearchParams();
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
  } = colors;

  const [seriesData, setSeriesData] = useState<TVProps>();
  const [isLoading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [season, setSeason] = useState("1");
  const [seasonsData, setSeasonsData] = useState<SeasonsMap>({});
  const [isLoadingSeasons, setIsLoadingSeasons] = useState(false);
  const [isSaved, setSaved] = useState<boolean>(false);
  const [isPlaying, setPlaying] = useState(false);
  const [showIcon, setShowIcon] = useState<boolean>(false);
  const delay = 4000;

  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const playerHeight = Math.round((width * 9) / 16);

  // Opening another series from "Recommended" must not keep the old trailer going
  useEffect(() => {
    setPlaying(false);
    const timer = setTimeout(() => {
      setShowIcon(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [id, delay]);

  // Stop the trailer when this screen loses focus (navigating to /play, etc.)
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

  async function getAllSeasonsData(seasons: Season[]) {
    try {
      setSaved(await isItemSaved(id, "tv"));
      setIsLoadingSeasons(true);
      const results = await Promise.allSettled(
        seasons.map(async (s) => {
          const res = await getSeasonDetails(id, String(s.season_number));
          if (!res.ok) throw new Error(`Season ${s.season_number} failed`);
          const data: SeasonDetails = await res.json();
          return [String(s.season_number), data] as const;
        }),
      );

      const entries = results
        .filter(
          (r): r is PromiseFulfilledResult<readonly [string, SeasonDetails]> =>
            r.status === "fulfilled",
        )
        .map((r) => r.value);

      setSeasonsData(Object.fromEntries(entries));

      const failed = results.filter((r) => r.status === "rejected");
      if (failed.length) {
        console.error(`${failed.length} season(s) failed to load`);
      }
    } finally {
      setIsLoadingSeasons(false);
    }
  }

  async function getSeriesData() {
    try {
      setLoading(true);
      setError(null);
      const response = await getTvDetails(id);

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      const data: TVProps = await response.json();
      setSeriesData(data);
      return data;
    } catch (e) {
      console.error("Unable to load seriesData details", e);
      setError("Couldn't load this seriesData right now.");
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function toggleSave() {
    const response = await toggleSavedItem(id, "tv");
    // console.log(response);
    setSaved(response ? !isSaved : isSaved);
  }

  useEffect(() => {
    if (id) {
      getSeriesData().then((data) => {
        if (data?.seasons?.length) {
          getAllSeasonsData(data.seasons);
        }
      });
    }
  }, [id]);

  if (isLoading) {
    return <DetailsScreenSkeleton isTv />;
  }

  if (error || !seriesData) {
    return (
      <View style={[styles.center, { backgroundColor: bgColor }]}>
        <Text style={styles.errorText}>{error ?? "Movie not found"}</Text>
        <Pressable
          style={[styles.retryButton, { backgroundColor: primaryText }]}
          onPress={getSeriesData}
        >
          <Text style={[styles.retryText, { color: bgColor }]}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const displayTitle =
    seriesData.name || seriesData.original_name || "Untitled";
  const releaseDate = seriesData.last_air_date || "";
  const cast = seriesData.credits?.cast ?? [];
  const recommendations = seriesData.recommendations?.results ?? [];
  const backdropUrl = imageUrl(seriesData.backdrop_path, "w780");
  const videoId = pickTrailerKey(seriesData.videos?.results);
  const currentSeasonEpisodes = seasonsData[season]?.episodes ?? [];

  const seasonGuestStars = Array.from(
    new Map(
      currentSeasonEpisodes
        .flatMap((ep) => ep.guest_stars ?? [])
        .map((star) => [star.id, star]),
    ).values(),
  );

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
                    backgroundColor: "rgba(0, 0, 0, 0.55)",
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
      <SafeAreaView edges={["bottom"]} style={styles.bottomSafeArea}>
        <ScrollView
          style={styles.body}
          contentContainerStyle={styles.bodyContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.title, { color: primaryText }]}>
            {displayTitle}
          </Text>

          <View style={styles.stats}>
            <>
              <Ionicons name="star" size={13} color="#ffc400" />
              <Text style={[styles.statsText, { color: secondaryText }]}>
                {seriesData.vote_average?.toFixed(1)}/10.0
              </Text>
            </>
            {!!releaseDate && (
              <Text style={[styles.statsText, { color: secondaryText }]}>
                {releaseDate}
              </Text>
            )}
            {!!seriesData.runtime && (
              <Text style={[styles.statsText, { color: secondaryText }]}>
                {seriesData.runtime} min
              </Text>
            )}
          </View>

          {!!seriesData.genres?.length && (
            <View style={styles.genreRow}>
              {seriesData.genres.map((genre) => (
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

          {!!seriesData.overview && (
            <>
              <Text style={[styles.sectionTitle, { color: primaryText }]}>
                Overview
              </Text>
              <Text style={[styles.overview, { color: secondaryText }]}>
                {seriesData.overview}
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

          <Text style={[styles.sectionTitle, { color: primaryText }]}>
            Episodes
          </Text>

          <View style={[styles.pickerWrapper]}>
            <Picker
              selectedValue={season}
              onValueChange={(value) => setSeason(String(value))}
              mode="dropdown"
              itemStyle={{ color: primaryText }}
              dropdownIconColor={primaryText}
            >
              {seriesData.seasons.map((element: Season) => (
                <Picker.Item
                  key={element.id}
                  label={element.name}
                  value={String(element.season_number)}
                  style={{ color: bgColor, backgroundColor: bgColor }}
                  color={primaryText}
                />
              ))}
            </Picker>
          </View>

          {isLoadingSeasons ? (
            <ActivityIndicator
              color={primaryText}
              style={{ marginVertical: 20 }}
            />
          ) : (
            !!currentSeasonEpisodes.length && (
              <FlatList
                data={currentSeasonEpisodes}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.horizontalList}
                renderItem={({ item, index }) => (
                  <EpisodeCard
                    seasonNumber={season}
                    showId={String(seriesData.id)}
                    episode={item}
                    episodeNumber={index + 1}
                  />
                )}
              />
            )
          )}

          {!isLoadingSeasons && !!seasonGuestStars.length && (
            <>
              <Text style={[styles.sectionTitle, { color: primaryText }]}>
                Guest Stars
              </Text>
              <FlatList
                data={seasonGuestStars}
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
          {recommendations && (
            <>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: "700",
                  marginTop: 18,
                  marginBottom: 10,
                  color: primaryText,
                }}
              >
                Recommended
              </Text>
              <FlatList
                horizontal
                data={recommendations}
                keyExtractor={(item) => item.id.toString()}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[styles.recs, { gap: 16 }]} // Adds spacing between horizontal items
                renderItem={({ item }) => (
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
                )}
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
  bottomSafeArea: {
    flex: 1,
  },
  body: {
    flex: 1,
    width: "100%",
    paddingBottom: 40,
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
  },
  statsText: {
    fontSize: 13,
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
  pickerWrapper: {
    borderRadius: 10,
    overflow: "hidden",
  },
  horizontalList: {
    paddingRight: 14,
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
  // recCard: {
  //   width: 110,
  //   marginRight: 12,
  // },
  // recPoster: {
  //   width: 110,
  //   height: 165,
  //   borderRadius: 8,
  // },
  // recTitle: {
  //   fontSize: 12,
  //   marginTop: 6,
  // },
  recs: {
    marginTop: 20,
    marginRight: 20,
  },
});

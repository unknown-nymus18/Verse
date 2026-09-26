import EpisodeCard from "@/components/EpisodeCard";
import { useThemeProvider } from "@/components/ThemeProvider";
import { getSeasonDetails, getTvDetails } from "@/services/ApiServices";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Picker } from "@react-native-picker/picker";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
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
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  media_type?: string;
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
  last_air_date: string;
  runtime?: number;
}

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";
function imageUrl(path: string | null | undefined, size: string) {
  return path ? `${IMAGE_BASE_URL}/${size}${path}` : null;
}

export default function TvDetails() {
  const { id }: { id: string } = useLocalSearchParams();
  const { isDark } = useThemeProvider();

  const [seriesData, setSeriesData] = useState<TVProps>();
  const [isLoading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [season, setSeason] = useState("1");
  const [seasonsData, setSeasonsData] = useState<SeasonsMap>({});
  const [isLoadingSeasons, setIsLoadingSeasons] = useState(false);

  const bgColor = isDark ? "#08090b" : "#ffffff";
  const primaryText = isDark ? "#ffffff" : "#17181c";
  const secondaryText = isDark ? "#a1a1aa" : "#54565c";
  const subText = isDark ? "#71717a" : "#8b8d94";
  const cardBg = isDark ? "#18181b" : "#f1f1f3";
  const imagePlaceholder = isDark ? "#27272a" : "#e5e5e5";
  const listBtnBg = isDark ? "#18181b" : "#ffffff";
  const listBtnBorder = isDark ? "#27272a" : "#e1e2e5";
  const playBtnBg = isDark ? "#ffffff" : "#08090b";
  const playBtnText = isDark ? "#08090b" : "#ffffff";

  async function getAllSeasonsData(seasons: Season[]) {
    try {
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
    return (
      <View style={[styles.center, { backgroundColor: bgColor }]}>
        <ActivityIndicator size="large" color={primaryText} />
      </View>
    );
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
      <ImageBackground
        style={[styles.poster, { backgroundColor: imagePlaceholder }]}
        imageStyle={styles.posterImage}
        resizeMode="cover"
        source={backdropUrl ? { uri: backdropUrl } : undefined}
      >
        <LinearGradient
          pointerEvents="none"
          colors={
            isDark
              ? ["rgba(8, 9, 11, 0)", "rgba(8, 9, 11, 0.65)", "#08090b"]
              : [
                  "rgba(255, 255, 255, 0)",
                  "rgba(255, 255, 255, 0.35)",
                  "#ffffff",
                ]
          }
          locations={[0, 0.55, 1]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.fade}
        />
        <View style={styles.content}>
          <SafeAreaView edges={["top"]} style={styles.topSafeArea}>
            <Pressable onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </Pressable>
          </SafeAreaView>
          <View style={styles.actions}>
            <Pressable
              style={[
                styles.button,
                {
                  backgroundColor: listBtnBg,
                  borderColor: listBtnBorder,
                  borderWidth: 1,
                },
              ]}
            >
              <Ionicons name="bookmark-outline" size={17} color={primaryText} />
              <Text style={[styles.listText, { color: primaryText }]}>
                Add to List
              </Text>
            </Pressable>
          </View>
        </View>
      </ImageBackground>
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
            <Text style={[styles.statsText, { color: secondaryText }]}>
              {seriesData.vote_average?.toFixed(1)}/10.0
            </Text>
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
                  style={{ color: primaryText }}
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

          {/* {!!recommendations.length && (
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
                const recPosterUrl = imageUrl(item.poster_path, "w200");
                return (
                  <Pressable
                    style={styles.recCard}
                    onPress={() => goToRecommendation(item)}
                  >
                    {recPosterUrl ? (
                      <Image
                        source={{ uri: recPosterUrl }}
                        style={[
                          styles.recPoster,
                          { backgroundColor: imagePlaceholder },
                        ]}
                      />
                    ) : (
                      <View
                        style={[
                          styles.recPoster,
                          { backgroundColor: imagePlaceholder },
                        ]}
                      />
                    )}
                    <Text
                      style={[styles.recTitle, { color: primaryText }]}
                      numberOfLines={2}
                    >
                      {item.title || item.name}
                    </Text>
                  </Pressable>
                );
              }}
            />
          </>
        )} */}
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
  recCard: {
    width: 110,
    marginRight: 12,
  },
  recPoster: {
    width: 110,
    height: 165,
    borderRadius: 8,
  },
  recTitle: {
    fontSize: 12,
    marginTop: 6,
  },
});

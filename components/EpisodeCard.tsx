import Ionicons from "@expo/vector-icons/Ionicons";
import { router } from "expo-router";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { useThemeProvider } from "./ThemeProvider";
interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

interface Episode {
  id: number;
  name: string;
  still_path: string;
  vote_average: number;
  guest_stars: CastMember[];
  episode_number: number;
}

interface Props {
  showId: string;
  seasonNumber: string;
  episode: Episode;
  episodeNumber?: number;
  onPress?: (episode: Episode) => void;
}

const IMAGE_BASE_URL = "https://image.tmdb.org/t/p";

export default function EpisodeCard({
  episode,
  episodeNumber,
  showId,
  seasonNumber,
  // onPress,
}: Props) {
  const { isDark } = useThemeProvider();

  const textColor = isDark ? "#ffffff" : "#111111";
  const metaColor = isDark ? "#a1a1aa" : "#8b8d94";
  const cardBg = isDark ? "#18181b" : "#f1f1f3";
  const imageBg = isDark ? "#27272a" : "#e5e5e5";

  const stillUrl = episode.still_path
    ? `${IMAGE_BASE_URL}/w300${episode.still_path}`
    : null;

  return (
    <Pressable
      style={[styles.container, { backgroundColor: cardBg }]}
      onPress={() => {
        console.log(showId, episodeNumber);
        router.push({
          pathname: "/play",
          params: {
            id: showId,
            type: "tv",
            episodeNumber: episodeNumber,
            seasonNumber: seasonNumber,
          },
        });
      }}
    >
      <View style={[styles.stillWrapper, { backgroundColor: imageBg }]}>
        {stillUrl ? (
          <Image
            source={{ uri: stillUrl }}
            style={styles.still}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderIcon}>
            <Ionicons name="tv-outline" size={22} color={metaColor} />
          </View>
        )}
        {!!episodeNumber && (
          <View style={styles.episodeBadge}>
            <Text style={styles.episodeBadgeText}>E{episodeNumber}</Text>
          </View>
        )}
      </View>

      <View style={styles.info}>
        <Text numberOfLines={1} style={[styles.title, { color: textColor }]}>
          {episode.name}
        </Text>

        <View style={styles.metaRow}>
          {episode.vote_average != null && episode.vote_average > 0 && (
            <>
              <Ionicons name="star" size={12} color="#ffc400" />
              <Text style={[styles.metaText, { color: metaColor }]}>
                {episode.vote_average.toFixed(1)}
              </Text>
            </>
          )}
          {!!episode.guest_stars?.length && (
            <Text
              style={[styles.metaText, styles.guestText, { color: metaColor }]}
              numberOfLines={1}
            >
              feat. {episode.guest_stars[0].name}
              {episode.guest_stars.length > 1
                ? ` +${episode.guest_stars.length - 1}`
                : ""}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 200,
    marginRight: 12,
    borderRadius: 10,
    overflow: "hidden",
  },
  stillWrapper: {
    width: "100%",
    height: 112,
    position: "relative",
  },
  still: {
    width: "100%",
    height: "100%",
  },
  placeholderIcon: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  episodeBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  episodeBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
  info: {
    padding: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
    gap: 4,
  },
  metaText: {
    fontSize: 11,
  },
  guestText: {
    marginLeft: 8,
    flexShrink: 1,
  },
});

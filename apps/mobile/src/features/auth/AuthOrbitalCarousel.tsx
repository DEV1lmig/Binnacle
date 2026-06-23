import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AccessibilityInfo,
  LayoutAnimation,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  UIManager,
  View,
  ViewStyle,
  Image,
} from "react-native";
import { useQuery } from "convex/react";
import { api } from "@binnacle/convex-generated/api";
import { Body } from "@/src/ui/primitives";
import { radius, spacing } from "@/src/ui/theme";

const ITEMS = [
  { title: "Hollow Knight", status: "Backlog", color: "#0f2038", accent: "#60a5fa" },
  { title: "Elden Ring", status: "Playing", color: "#3a2a1b", accent: "#22d3ee" },
  { title: "Celeste", status: "Completed", color: "#2c1f43", accent: "#34d399" },
  { title: "Disco Elysium", status: "Backlog", color: "#393317", accent: "#60a5fa" },
  { title: "Outer Wilds", status: "Wishlist", color: "#1d2a42", accent: "#a78bfa" },
  { title: "NieR: Automata", status: "Completed", color: "#33302c", accent: "#34d399" },
  { title: "Hades", status: "Completed", color: "#3d2323", accent: "#34d399" },
] as const;

const CARD_RATIO = 1.4;

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type AuthOrbitalCarouselProps = {
  style?: StyleProp<ViewStyle>;
};

export function AuthOrbitalCarousel({ style }: AuthOrbitalCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [frameWidth, setFrameWidth] = useState(320);

  const itemCount = ITEMS.length;

  const titles = useMemo(() => ITEMS.map((item) => item.title), []);
  const coversResponse = useQuery(api.games.getCoversByTitles, { titles });
  const covers = useMemo(() => {
    const map: Record<string, string> = {};
    if (coversResponse) {
      for (const item of coversResponse) {
        if (item.coverUrl) {
          let url = item.coverUrl;
          if (url.startsWith("//")) {
            url = "https:" + url;
          }
          map[item.title] = url;
        }
      }
    }
    return map;
  }, [coversResponse]);

  useEffect(() => {
    let mounted = true;

    AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (mounted) {
        setReduceMotion(enabled);
      }
    });

    const sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);

  const updateIndex = useCallback((next: number) => {
    LayoutAnimation.configureNext(
      LayoutAnimation.create(750, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity)
    );

    const wrapped = ((next % itemCount) + itemCount) % itemCount;
    setActiveIndex(wrapped);
  }, [itemCount]);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    const id = setInterval(() => {
      updateIndex(activeIndex + 1);
    }, 3200);

    return () => {
      clearInterval(id);
    };
  }, [activeIndex, reduceMotion, updateIndex]);

  const geometry = useMemo(() => {
    const outerSize = Math.min(frameWidth * 0.95, 320);
    return {
      centerX: frameWidth / 2,
      centerY: 120,
      outerSize,
      midSize: outerSize * 0.76,
      glowSize: outerSize * 0.42,
      rx: outerSize * 0.46,
      ry: outerSize * 0.28,
    };
  }, [frameWidth]);

  return (
    <View
      style={[styles.root, style]}
      onLayout={(event) => {
        const next = event.nativeEvent.layout.width;
        if (next > 0 && Math.abs(next - frameWidth) > 4) {
          setFrameWidth(next);
        }
      }}
    >
      <View
        style={[
          styles.ring,
          {
            width: geometry.outerSize,
            height: geometry.outerSize,
            left: geometry.centerX - geometry.outerSize / 2,
            top: geometry.centerY - geometry.outerSize / 2,
            opacity: 0.26,
          },
        ]}
      />

      {ITEMS.map((item, index) => {
        const offset =
          ((index - activeIndex + itemCount) % itemCount) - Math.floor(itemCount / 2);
        const isActive = index === activeIndex;
        const angle = (offset / itemCount) * Math.PI * 2;
        const depth = Math.cos(angle);
        const x = Math.sin(angle) * geometry.rx;
        const y = -Math.cos(angle) * geometry.ry * 0.55;
        const scale = isActive ? 1.18 : 0.55 + Math.max(0, depth) * 0.25;
        const opacity = isActive ? 1 : 0.17 + Math.max(0, depth) * 0.42;
        const cardWidth = isActive ? 124 : depth > 0.35 ? 80 : 56;
        const cardHeight = cardWidth * CARD_RATIO;
        const imageUrl = covers?.[item.title];

        return (
          <Pressable
            key={item.title}
            onPress={() => updateIndex(index)}
            style={[
              styles.card,
              {
                width: cardWidth,
                height: cardHeight,
                left: geometry.centerX - cardWidth / 2 + x,
                top: geometry.centerY - cardHeight / 2 + y,
                opacity,
                transform: [{ scale }],
                zIndex: isActive ? 30 : Math.round((depth + 1) * 10),
                borderColor: isActive ? "rgba(96,165,250,0.65)" : "rgba(96,165,250,0.2)",
                shadowOpacity: isActive ? 0.45 : 0.18,
                shadowRadius: isActive ? 20 : 8,
                elevation: isActive ? 8 : 2,
                backgroundColor: item.color,
              },
            ]}
          >
            {imageUrl && (
              <Image 
                source={{ uri: imageUrl }} 
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
              />
            )}
            <View style={[styles.cardAccent, { backgroundColor: item.accent }]} />
            <View style={styles.cardShade} />
            <View style={styles.cardFooter}>
              <Body numberOfLines={1} style={[styles.cardTitle, isActive && styles.cardTitleActive]}>
                {item.title}
              </Body>
            </View>
          </Pressable>
        );
      })}

      <View style={styles.metaWrap}>
        <View style={styles.metaRow}>
          <View style={[styles.metaDot, { backgroundColor: ITEMS[activeIndex].accent }]} />
          <Body style={[styles.metaStatus, { color: ITEMS[activeIndex].accent }]}>
            {ITEMS[activeIndex].status}
          </Body>
        </View>
      </View>

      <View style={styles.pagination}>
        {ITEMS.map((item, index) => {
          const isActive = index === activeIndex;
          return (
            <Pressable
              key={item.title}
              onPress={() => updateIndex(index)}
              style={[
                styles.dot,
                isActive && styles.dotActive,
                { backgroundColor: isActive ? "#60a5fa" : "rgba(96,165,250,0.22)" },
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    width: "100%",
    height: 338,
    position: "relative",
    marginBottom: spacing.md,
  },
  ring: {
    position: "absolute",
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: "rgba(96,165,250,0.18)",
  },
  glow: {
    position: "absolute",
    borderRadius: radius.full,
    backgroundColor: "rgba(96,165,250,0.1)",
  },
  crossHorizontal: {
    position: "absolute",
    height: 1,
    backgroundColor: "rgba(96,165,250,0.2)",
  },
  crossVertical: {
    position: "absolute",
    width: 1,
    backgroundColor: "rgba(96,165,250,0.2)",
  },
  card: {
    position: "absolute",
    borderRadius: 8,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
  },
  cardAccent: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.18,
  },
  cardShade: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  cardFooter: {
    marginTop: "auto",
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  cardTitle: {
    color: "#cbd5e1",
    fontSize: 8,
    lineHeight: 10,
  },
  cardTitleActive: {
    fontSize: 12,
    lineHeight: 16,
    color: "#e2e8f0",
  },
  metaWrap: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 46,
    alignItems: "center",
    gap: spacing.xs,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  metaDot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
  },
  metaStatus: {
    textTransform: "uppercase",
    fontSize: 11,
    letterSpacing: 1,
  },
  pagination: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 14,
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.xs,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: radius.full,
  },
  dotActive: {
    width: 20,
    borderRadius: 999,
  },
});
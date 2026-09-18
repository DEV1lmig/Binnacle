/**
 * What a game physically came on, from its platforms.
 *
 * A game whose original platform took cartridges or cassettes shows up as that
 * cartridge or cassette rather than a disc case. IGDB lists every platform a
 * game was ever on — a NES game re-released on Switch Online lists both — so the
 * original is taken to be the earliest platform whose years fit the game's own
 * release year. Everything else is a case.
 *
 * Platform ids are IGDB's. Families group platforms whose cartridges look alike
 * enough to share one drawing; the families are what the stylesheet knows.
 */
export type Medium =
  | "case"
  | "nes" | "famicom" | "snes" | "n64"
  | "gb" | "gba" | "card"
  | "megadrive" | "mastersystem" | "gamegear"
  | "atari" | "neogeo" | "ngp" | "hucard"
  | "cassette";

type Platform = { medium: Medium; from: number; to: number; /** Only counts when nothing else fits: PC and phones span every era. */ weak?: boolean };

const PLATFORMS: Record<number, Platform> = {
  // Disc and download platforms, so a multi-platform game finds its true original.
  7: { medium: "case", from: 1994, to: 2006 },
  8: { medium: "case", from: 2000, to: 2013 },
  9: { medium: "case", from: 2006, to: 2017 },
  48: { medium: "case", from: 2013, to: 2025 },
  167: { medium: "case", from: 2020, to: 2035 },
  11: { medium: "case", from: 2001, to: 2009 },
  12: { medium: "case", from: 2005, to: 2016 },
  49: { medium: "case", from: 2013, to: 2025 },
  169: { medium: "case", from: 2020, to: 2035 },
  21: { medium: "case", from: 2001, to: 2007 },
  5: { medium: "case", from: 2006, to: 2013 },
  41: { medium: "case", from: 2012, to: 2017 },
  38: { medium: "case", from: 2004, to: 2014 },
  23: { medium: "case", from: 1998, to: 2002 },
  32: { medium: "case", from: 1994, to: 2000 },
  78: { medium: "case", from: 1991, to: 1996 },
  50: { medium: "case", from: 1993, to: 1996 },
  16: { medium: "case", from: 1985, to: 1996 },
  63: { medium: "case", from: 1985, to: 1993 },
  75: { medium: "case", from: 1977, to: 1993 },
  6: { medium: "case", from: 1981, to: 2100, weak: true },
  14: { medium: "case", from: 1984, to: 2100, weak: true },
  3: { medium: "case", from: 1991, to: 2100, weak: true },
  39: { medium: "case", from: 2007, to: 2100, weak: true },
  34: { medium: "case", from: 2008, to: 2100, weak: true },
  82: { medium: "case", from: 1995, to: 2100, weak: true },
  // Cartridges, cards and tapes.
  18: { medium: "nes", from: 1983, to: 1995 },
  99: { medium: "famicom", from: 1983, to: 1994 },
  19: { medium: "snes", from: 1990, to: 1999 },
  58: { medium: "snes", from: 1990, to: 1999 },
  4: { medium: "n64", from: 1996, to: 2002 },
  33: { medium: "gb", from: 1989, to: 2001 },
  22: { medium: "gb", from: 1998, to: 2003 },
  24: { medium: "gba", from: 2001, to: 2008 },
  20: { medium: "card", from: 2004, to: 2013 },
  37: { medium: "card", from: 2011, to: 2020 },
  137: { medium: "card", from: 2014, to: 2020 },
  130: { medium: "card", from: 2017, to: 2030 },
  508: { medium: "card", from: 2025, to: 2035 },
  46: { medium: "card", from: 2011, to: 2019 },
  42: { medium: "card", from: 2003, to: 2006 },
  87: { medium: "gba", from: 1995, to: 1996 },
  29: { medium: "megadrive", from: 1988, to: 1997 },
  30: { medium: "megadrive", from: 1994, to: 1996 },
  64: { medium: "mastersystem", from: 1985, to: 1996 },
  84: { medium: "mastersystem", from: 1983, to: 1985 },
  35: { medium: "gamegear", from: 1990, to: 1997 },
  59: { medium: "atari", from: 1977, to: 1992 },
  66: { medium: "atari", from: 1982, to: 1986 },
  60: { medium: "atari", from: 1986, to: 1992 },
  62: { medium: "atari", from: 1993, to: 1996 },
  61: { medium: "gamegear", from: 1989, to: 1995 },
  68: { medium: "atari", from: 1982, to: 1985 },
  67: { medium: "atari", from: 1979, to: 1990 },
  70: { medium: "atari", from: 1982, to: 1984 },
  88: { medium: "atari", from: 1978, to: 1984 },
  80: { medium: "neogeo", from: 1990, to: 2004 },
  79: { medium: "neogeo", from: 1990, to: 2004 },
  119: { medium: "ngp", from: 1998, to: 2001 },
  120: { medium: "ngp", from: 1999, to: 2001 },
  86: { medium: "hucard", from: 1987, to: 1994 },
  128: { medium: "hucard", from: 1989, to: 1994 },
  57: { medium: "ngp", from: 1999, to: 2003 },
  123: { medium: "ngp", from: 2000, to: 2003 },
  15: { medium: "cassette", from: 1982, to: 1994 },
  26: { medium: "cassette", from: 1982, to: 1992 },
  25: { medium: "cassette", from: 1984, to: 1992 },
  27: { medium: "cassette", from: 1983, to: 1990 },
  53: { medium: "cassette", from: 1985, to: 1992 },
  65: { medium: "cassette", from: 1979, to: 1992 },
};

/** The platform ids in a game's `platforms` JSON, whatever shape it took. */
function platformIds(raw: unknown): number[] {
  let list: unknown = raw;
  if (typeof raw === "string") {
    try { list = JSON.parse(raw); } catch { return []; }
  }
  if (!Array.isArray(list)) return [];
  return list
    .map(item => (typeof item === "number" ? item : typeof item === "object" && item && typeof (item as { id?: unknown }).id === "number" ? (item as { id: number }).id : NaN))
    .filter(id => Number.isFinite(id));
}

/** Any game-shaped object will do; one without platforms is simply a case. */
type GameLike = { platforms?: string | null; releaseYear?: number | null; [key: string]: unknown };

export function mediumOf(game: GameLike | null | undefined): Medium {
  if (!game) return "case";
  const year = game.releaseYear ?? null;
  const fits = platformIds(game.platforms)
    .map(id => PLATFORMS[id])
    .filter((p): p is Platform => Boolean(p) && (year === null || (year >= p.from - 1 && year <= p.to + 1)))
    .sort((a, b) => Number(Boolean(a.weak)) - Number(Boolean(b.weak)) || a.from - b.from);
  return fits[0]?.medium ?? "case";
}


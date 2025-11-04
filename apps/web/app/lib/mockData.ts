export interface Game {
  id: string;
  title: string;
  cover: string;
  rating?: number;
  averageRating?: number;
  totalRatings?: number;
  status?: 'backlog' | 'playing' | 'completed' | 'onhold' | 'dropped';
  userRating?: number;
  playTime?: number;
  releaseDate_human?: string;
  esrbRating?: string;
  platform?: string[];
  summary?: string;
  storyline?: string;
  screenshots?: string[];
  genre?: string[];
  developer?: string;
  publishers?: string[];
  categories?: string[];
  credits?: Array<{ role: string; name: string }>;
  links?: Array<{ platform: string; url: string }>;
  ratingBreakdown?: Array<{ score: number; count: number; percentage: number }>;
  similarGames?: string[];
}

export interface Review {
  id: string;
  gameId: string;
  gameTitle: string;
  gameCover: string;
  userName: string;
  userAvatar: string;
  rating: number;
  text: string;
  date: string;
  likes: number;
}

export interface User {
  username: string;
  name: string;
  avatar: string;
  color: string;
  reviews: number;
  followers: number;
}

export const mockGames: Game[] = [
  {
    id: '1',
    title: 'Elden Ring',
    cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co2n7c.jpg',
    rating: 4.8,
    averageRating: 96,
    totalRatings: 2547,
    status: 'completed',
    userRating: 5,
    playTime: 120,
    releaseDate_human: 'February 25, 2022',
    esrbRating: 'M (Mature)',
    platform: ['PlayStation 5', 'Xbox Series X/S', 'PC'],
    summary: 'Elden Ring is an action role-playing game developed by FromSoftware and published by Bandai Namco Entertainment.',
    storyline: 'Rise, Tarnished, and let grace guide thee...',
    screenshots: [
      'https://images.igdb.com/igdb/image/upload/t_screenshot_big/scq3dj.jpg',
      'https://images.igdb.com/igdb/image/upload/t_screenshot_big/scq3dl.jpg',
    ],
    genre: ['Role-playing (RPG)', 'Adventure'],
    developer: 'FromSoftware',
    publishers: ['Bandai Namco Entertainment'],
    categories: ['Single player', 'Multiplayer'],
    credits: [
      { role: 'Director', name: 'Hidetaka Miyazaki' },
      { role: 'Producer', name: 'Masaru Yamamura' },
    ],
    links: [
      { platform: 'Steam', url: 'https://store.steampowered.com' },
      { platform: 'PlayStation Store', url: 'https://store.playstation.com' },
    ],
    ratingBreakdown: [
      { score: 90, count: 1200, percentage: 85 },
      { score: 80, count: 800, percentage: 60 },
      { score: 70, count: 547, percentage: 40 },
    ],
    similarGames: ['2', '3'],
  },
  {
    id: '2',
    title: 'Baldur\'s Gate 3',
    cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co5eyz.jpg',
    rating: 4.7,
    averageRating: 95,
    totalRatings: 3210,
    status: 'playing',
    userRating: 4,
    playTime: 85,
    releaseDate_human: 'August 3, 2023',
    esrbRating: 'M (Mature)',
    platform: ['PlayStation 5', 'PC'],
    genre: ['Role-playing (RPG)'],
    developer: 'Larian Studios',
    publishers: ['Larian Studios'],
    similarGames: ['1', '3'],
  },
  {
    id: '3',
    title: 'The Legend of Zelda: Tears of the Kingdom',
    cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co5w7v.jpg',
    rating: 4.9,
    averageRating: 98,
    totalRatings: 1876,
    status: 'backlog',
    releaseDate_human: 'May 12, 2023',
    esrbRating: 'E10+ (Everyone 10+)',
    platform: ['Nintendo Switch'],
    genre: ['Adventure', 'Action'],
    developer: 'Nintendo EPD',
    publishers: ['Nintendo'],
    similarGames: ['1', '2'],
  },
  {
    id: '4',
    title: 'Cyberpunk 2077',
    cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co1wcl.jpg',
    rating: 3.8,
    averageRating: 78,
    totalRatings: 4123,
    status: 'onhold',
    playTime: 45,
    releaseDate_human: 'December 10, 2020',
    genre: ['Role-playing (RPG)', 'Shooter'],
    developer: 'CD Projekt Red',
    publishers: ['CD Projekt Red'],
  },
  {
    id: '5',
    title: 'Starfield',
    cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co8vvh.jpg',
    rating: 4.2,
    averageRating: 83,
    totalRatings: 2890,
    status: 'playing',
    playTime: 60,
    releaseDate_human: 'September 6, 2023',
    genre: ['Role-playing (RPG)', 'Adventure'],
    developer: 'Bethesda Game Studios',
    publishers: ['Microsoft'],
  },
  {
    id: '6',
    title: 'Hogwarts Legacy',
    cover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co5nih.jpg',
    rating: 4.3,
    averageRating: 84,
    totalRatings: 3564,
    status: 'completed',
    playTime: 95,
    releaseDate_human: 'February 10, 2023',
    genre: ['Role-playing (RPG)', 'Adventure'],
    developer: 'Avalanche Software',
    publishers: ['Warner Bros. Games'],
  },
];

export const mockReviews: Review[] = [
  {
    id: '1',
    gameId: '1',
    gameTitle: 'Elden Ring',
    gameCover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co2n7c.jpg',
    userName: 'Alex Rivera',
    userAvatar: 'A',
    rating: 5,
    text: 'Absolutely phenomenal experience! The world design is breathtaking, and the combat system is so satisfying. Took me 120 hours to complete, and I loved every second of it.',
    date: '2 days ago',
    likes: 342,
  },
  {
    id: '2',
    gameId: '2',
    gameTitle: 'Baldur\'s Gate 3',
    gameCover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co5eyz.jpg',
    userName: 'Jordan Smith',
    userAvatar: 'J',
    rating: 5,
    text: 'This game is a masterpiece of storytelling and player choice. Every playthrough feels different, and the writing is incredibly engaging. Currently on my third playthrough!',
    date: '1 week ago',
    likes: 528,
  },
  {
    id: '3',
    gameId: '5',
    gameTitle: 'Starfield',
    gameCover: 'https://images.igdb.com/igdb/image/upload/t_cover_big/co8vvh.jpg',
    userName: 'Sam Chen',
    userAvatar: 'S',
    rating: 4,
    text: 'Space exploration done right! Great character creation and base building mechanics. Still playing through, but so far it\'s been a solid adventure.',
    date: '3 days ago',
    likes: 267,
  },
];

export const mockUsers: User[] = [
  {
    username: 'alex_rivera',
    name: 'Alex Rivera',
    avatar: 'A',
    color: 'bg-blue-500',
    reviews: 24,
    followers: 156,
  },
  {
    username: 'jordan_smith',
    name: 'Jordan Smith',
    avatar: 'J',
    color: 'bg-purple-500',
    reviews: 31,
    followers: 203,
  },
  {
    username: 'sam_chen',
    name: 'Sam Chen',
    avatar: 'S',
    color: 'bg-green-500',
    reviews: 18,
    followers: 89,
  },
  {
    username: 'taylor_swift',
    name: 'Taylor Swift',
    avatar: 'T',
    color: 'bg-pink-500',
    reviews: 45,
    followers: 412,
  },
  {
    username: 'casey_jones',
    name: 'Casey Jones',
    avatar: 'C',
    color: 'bg-orange-500',
    reviews: 12,
    followers: 67,
  },
  {
    username: 'morgan_lee',
    name: 'Morgan Lee',
    avatar: 'M',
    color: 'bg-red-500',
    reviews: 28,
    followers: 178,
  },
];

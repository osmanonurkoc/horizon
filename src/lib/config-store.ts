import { type PersonalizedBriefingInput } from "@/ai/flows/personalized-briefing";

export interface SportsTeam {
  id: string; // Changed from number to string for TheSportsDB compatibility
  name: string;
  logo: string;
}

export interface DiscoverConfig {
  theme: 'latte' | 'mocha';
  layout: 'single' | 'double';
  apiKeys: {
    weather: string;
    news: string;
    sports: string;
  };
  searchEngine: string;
  location: string;
  newsTopics: string[];
  newsLanguages: string[];
  newsCountry: string;
  stocks: string[];
  sportsTeams: SportsTeam[];
  bookmarks: { name: string; url: string }[];
  enabledWidgets: {
    search: boolean;
    weather: boolean;
    market: boolean;
    sports: boolean;
    newsFeed: boolean;
    bookmarks: boolean;
  };
  widgetOrder: string[];
}

export const SEARCH_ENGINES = [
  { name: 'Google', url: 'https://www.google.com/search?q=' },
  { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
  { name: 'Bing', url: 'https://www.bing.com/search?q=' },
];

export const DEFAULT_CONFIG: DiscoverConfig = {
  theme: 'latte',
  layout: 'double',
  apiKeys: {
    weather: '',
    news: '',
    sports: '',
  },
  searchEngine: 'https://www.google.com/search?q=',
  location: '',
  newsTopics: ['general'],
  newsLanguages: ['en'],
  newsCountry: 'any',
  stocks: [],
  sportsTeams: [],
  bookmarks: [],
  enabledWidgets: {
    search: true,
    weather: true,
    market: true,
    sports: true,
    newsFeed: true,
    bookmarks: true,
  },
  widgetOrder: ['search', 'bookmarks', 'weather', 'market', 'sports'],
};

const CONFIG_KEY = 'discover_config';

export function getConfig(): DiscoverConfig {
  if (typeof window === 'undefined') return DEFAULT_CONFIG;
  const stored = localStorage.getItem(CONFIG_KEY);
  if (!stored) return DEFAULT_CONFIG;
  try {
    const parsed = JSON.parse(stored);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: DiscoverConfig) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  
  if (config.theme === 'mocha') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function convertConfigToBriefingInput(config: DiscoverConfig): PersonalizedBriefingInput {
  return {
    enabledWidgets: {
      weather: config.enabledWidgets.weather,
      market: config.enabledWidgets.market,
      newsFeed: config.enabledWidgets.newsFeed,
      sports: config.enabledWidgets.sports,
    },
    location: config.location,
    newsTopics: config.newsTopics,
    stocks: config.stocks,
    sportsTeams: config.sportsTeams.map(t => t.name),
  };
}

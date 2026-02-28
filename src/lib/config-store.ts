import { type PersonalizedBriefingInput } from "@/ai/flows/personalized-briefing";

export interface DiscoverConfig {
  theme: 'latte' | 'mocha';
  layout: 'single' | 'double';
  apiKeys: {
    weather: string;
    news: string;
    market: string;
  };
  searchEngine: string;
  location: string;
  newsTopics: string[];
  newsLanguages: string[];
  stocks: string[];
  sportsTeams: string[];
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

export const DEFAULT_CONFIG: DiscoverConfig = {
  theme: 'latte',
  layout: 'double',
  apiKeys: {
    weather: '',
    news: '',
    market: '',
  },
  searchEngine: 'https://www.google.com/search?q=',
  location: '',
  newsTopics: [],
  newsLanguages: ['en'],
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
    return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: DiscoverConfig) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

export function convertConfigToBriefingInput(config: DiscoverConfig): PersonalizedBriefingInput {
  return {
    enabledWidgets: {
      weather: config.enabledWidgets.weather,
      market: config.enabledWidgets.market,
      newsFeed: config.enabledWidgets.newsFeed,
    },
    location: config.location,
    newsTopics: config.newsTopics,
    stocks: config.stocks,
  };
}
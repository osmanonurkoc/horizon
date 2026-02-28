'use server';
/**
 * @fileOverview A Genkit flow for generating a personalized daily briefing.
 *
 * - generatePersonalizedBriefing - A function that orchestrates fetching data and generating a personalized briefing.
 * - PersonalizedBriefingInput - The input type for the generatePersonalizedBriefing function.
 * - PersonalizedBriefingOutput - The return type for the generatePersonalizedBriefing function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Assume these service functions exist or will be implemented elsewhere.
// They would likely interact with the custom fetcher utility for caching.
// For now, they are mock implementations.
async function getWeatherData(location: string | undefined): Promise<string | undefined> {
  // In a real app, this would fetch from a weather API using the location.
  // It should return a string summary or undefined if data is unavailable.
  if (!location) return undefined;
  // Mock data:
  if (location.toLowerCase() === 'london') {
    return 'Partly cloudy with a chance of rain, 15°C.';
  } else if (location.toLowerCase() === 'new york') {
    return 'Sunny and clear, 22°C.';
  }
  return 'Clear skies, 20°C.'; // Default mock
}

async function getNewsHeadlines(topics: string[] | undefined): Promise<string[] | undefined> {
  // In a real app, this would fetch from a news API using topics and languages.
  // It should return an array of strings or undefined if data is unavailable.
  if (!topics || topics.length === 0) return undefined;
  // Mock data:
  const allHeadlines = [
    'Tech giant unveils new AI model.',
    'Global markets show mixed performance.',
    'Sports team wins championship in dramatic fashion.',
    'Scientific breakthrough in quantum computing.',
    'Local community event draws large crowd.',
  ];
  return allHeadlines.filter(headline => topics.some(topic => headline.toLowerCase().includes(topic.toLowerCase()))).slice(0, 3);
}

async function getMarketSummary(stocks: string[] | undefined): Promise<string | undefined> {
  // In a real app, this would fetch from a market API using stock tickers.
  // It should return a string summary or undefined if data is unavailable.
  if (!stocks || stocks.length === 0) return undefined;
  // Mock data:
  if (stocks.includes('GOOGL') && stocks.includes('MSFT')) {
    return 'Tech stocks are up today, with Google increasing by 1.5% and Microsoft gaining 0.8%.';
  } else if (stocks.includes('GOOGL')) {
    return 'Google shares rose by 1.5% in early trading.';
  }
  return 'Markets are generally stable, with minor fluctuations across sectors.'; // Default mock
}


// Input for the wrapper function and flow
const PersonalizedBriefingInputSchema = z.object({
  enabledWidgets: z.object({
    weather: z.boolean().default(false),
    market: z.boolean().default(false),
    newsFeed: z.boolean().default(false),
  }).describe('Flags indicating which widgets are enabled by the user.'),
  location: z.string().optional().describe('User\'s configured location for weather. Only needed if weather widget is enabled.'),
  newsTopics: z.array(z.string()).optional().describe('User\'s configured news topics. Only needed if news feed widget is enabled.'),
  stocks: z.array(z.string()).optional().describe('User\'s configured stock tickers. Only needed if market widget is enabled.'),
});
export type PersonalizedBriefingInput = z.infer<typeof PersonalizedBriefingInputSchema>;

// Output Schema
const PersonalizedBriefingOutputSchema = z.string().describe('A concise, personalized daily briefing based on the user\'s enabled widgets and provided data.');
export type PersonalizedBriefingOutput = z.infer<typeof PersonalizedBriefingOutputSchema>;

// Input for the prompt (constructed within the flow)
const PersonalizedBriefingPromptInputSchema = z.object({
  enabledWidgets: z.object({
    weather: z.boolean(),
    market: z.boolean(),
    newsFeed: z.boolean(),
  }),
  location: z.string().optional(),
  weatherData: z.string().optional(),
  newsHeadlines: z.array(z.string()).optional(),
  marketSummary: z.string().optional(),
});

// Prompt definition
const prompt = ai.definePrompt({
  name: 'personalizedBriefingPrompt',
  input: {schema: PersonalizedBriefingPromptInputSchema},
  output: {schema: PersonalizedBriefingOutputSchema},
  prompt: `You are an AI assistant for a personalized dashboard. Your goal is to provide a concise, friendly, and informative daily briefing to the user based on their enabled widgets and the data provided.\n\nStart with a friendly greeting, for example, "Good morning!". Then, based on the enabled widgets and provided data, summarize the most important information. Keep it brief and to the point, typically a few sentences. If a widget is enabled but data is not available, acknowledge it briefly.\n\nHere is the user's configuration and available data:\n\n{{#if enabledWidgets.weather}}\n  {{#if weatherData}}\n    The weather in {{location}} is currently: {{weatherData}}.\n  {{else}}\n    (Weather data is unavailable for your location.)\n  {{/if}}\n{{/if}}\n\n{{#if enabledWidgets.newsFeed}}\n  {{#if newsHeadlines}}\n    Top News Headlines:\n    {{#each newsHeadlines}}\n    - {{{this}}}\n    {{/each}}\n  {{else}}\n    (No news headlines could be fetched.)\n  {{/if}}\n{{/if}}\n\n{{#if enabledWidgets.market}}\n  {{#if marketSummary}}\n    Market Update: {{marketSummary}}\n  {{else}}\n    (Market data is currently unavailable.)\n  {{/if}}\n{{/if}}\n\nBased on the information above, generate a concise personalized briefing.\n`,
});

// Flow definition
const personalizedBriefingFlow = ai.defineFlow(
  {
    name: 'personalizedBriefingFlow',
    inputSchema: PersonalizedBriefingInputSchema,
    outputSchema: PersonalizedBriefingOutputSchema,
  },
  async input => {
    let weatherData: string | undefined;
    let newsHeadlines: string[] | undefined;
    let marketSummary: string | undefined;

    if (input.enabledWidgets.weather && input.location) {
      weatherData = await getWeatherData(input.location);
    }

    if (input.enabledWidgets.newsFeed && input.newsTopics && input.newsTopics.length > 0) {
      newsHeadlines = await getNewsHeadlines(input.newsTopics);
    }

    if (input.enabledWidgets.market && input.stocks && input.stocks.length > 0) {
      marketSummary = await getMarketSummary(input.stocks);
    }

    const promptInput = {
      enabledWidgets: input.enabledWidgets,
      location: input.location,
      weatherData,
      newsHeadlines,
      marketSummary,
    };

    const {output} = await prompt(promptInput);
    return output!;
  }
);

// Wrapper function to be called from the Next.js client
export async function generatePersonalizedBriefing(input: PersonalizedBriefingInput): Promise<PersonalizedBriefingOutput> {
  return personalizedBriefingFlow(input);
}

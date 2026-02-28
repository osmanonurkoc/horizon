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

// Input for the wrapper function and flow
const PersonalizedBriefingInputSchema = z.object({
  enabledWidgets: z.object({
    weather: z.boolean().default(false),
    market: z.boolean().default(false),
    newsFeed: z.boolean().default(false),
    sports: z.boolean().default(false),
  }).describe('Flags indicating which widgets are enabled by the user.'),
  location: z.string().optional().describe('User\'s configured location for weather.'),
  newsTopics: z.array(z.string()).optional().describe('User\'s configured news topics.'),
  stocks: z.array(z.string()).optional().describe('User\'s configured stock tickers.'),
  sportsTeams: z.array(z.string()).optional().describe('User\'s configured sports teams.'),
});
export type PersonalizedBriefingInput = z.infer<typeof PersonalizedBriefingInputSchema>;

export type PersonalizedBriefingOutput = string;

const PromptOutputSchema = z.object({
  briefing: z.string().describe('A detailed, personalized daily briefing text.')
});

const PersonalizedBriefingPromptInputSchema = z.object({
  enabledWidgets: z.object({
    weather: z.boolean(),
    market: z.boolean(),
    newsFeed: z.boolean(),
    sports: z.boolean(),
  }),
  location: z.string().optional(),
  weatherData: z.string().optional(),
  newsHeadlines: z.array(z.string()).optional(),
  marketSummary: z.string().optional(),
  sportsSummary: z.string().optional(),
});

const prompt = ai.definePrompt({
  name: 'personalizedBriefingPrompt',
  input: {schema: PersonalizedBriefingPromptInputSchema},
  output: {schema: PromptOutputSchema},
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    ]
  },
  prompt: `You are an AI assistant for a personalized premium dashboard. Your goal is to provide a detailed, intelligent, and friendly morning briefing.

Summarize ALL available data points into a cohesive 3-4 sentence paragraph. Do not just list them; synthesize them naturally. 

- Mention upcoming sports matches or recent scores if available.
- Mention specific weather forecasts (rain, sun, temperature).
- Synthesize market trends and news headlines into the narrative.

For example: "It's a beautiful sunny day in London, perfect for the Lakers game tonight at 7 PM. Your tech stocks are looking strong with Google leading the way, though you might want to keep an eye on the latest quantum computing breakthroughs in the news."

Data Context:
{{#if enabledWidgets.weather}}
  Location: {{location}}
  Weather/Events: {{weatherData}}
{{/if}}

{{#if enabledWidgets.newsFeed}}
  Recent Headlines:
  {{#each newsHeadlines}}
  - {{{this}}}
  {{/each}}
{{/if}}

{{#if enabledWidgets.market}}
  Market Trends: {{marketSummary}}
{{/if}}

{{#if enabledWidgets.sports}}
  Upcoming Matches/Recent Results: {{sportsSummary}}
{{/if}}

Generate a detailed, premium briefing based on this context.`,
});

const personalizedBriefingFlow = ai.defineFlow(
  {
    name: 'personalizedBriefingFlow',
    inputSchema: PersonalizedBriefingInputSchema,
    outputSchema: z.string(),
  },
  async input => {
    let weatherData: string | undefined;
    let newsHeadlines: string[] | undefined;
    let marketSummary: string | undefined;
    let sportsSummary: string | undefined;

    if (input.enabledWidgets.weather && input.location) {
      weatherData = await getWeatherData(input.location);
    }

    if (input.enabledWidgets.newsFeed && input.newsTopics && input.newsTopics.length > 0) {
      newsHeadlines = await getNewsHeadlines(input.newsTopics);
    }

    if (input.enabledWidgets.market && input.stocks && input.stocks.length > 0) {
      marketSummary = await getMarketSummary(input.stocks);
    }

    if (input.enabledWidgets.sports && input.sportsTeams && input.sportsTeams.length > 0) {
      sportsSummary = await getSportsSummary(input.sportsTeams);
    }

    const promptInput = {
      enabledWidgets: {
        weather: !!input.enabledWidgets.weather,
        market: !!input.enabledWidgets.market,
        newsFeed: !!input.enabledWidgets.newsFeed,
        sports: !!input.enabledWidgets.sports,
      },
      location: input.location,
      weatherData,
      newsHeadlines,
      marketSummary,
      sportsSummary,
    };

    try {
      const {output} = await prompt(promptInput);
      return output?.briefing || "Welcome to your horizon. Your personalized modules are synchronized and ready.";
    } catch (err) {
      console.error("Briefing Flow Error:", err);
      return "Welcome back! Your dashboard is fully loaded with your latest preferences. Have a productive day!";
    }
  }
);

export async function generatePersonalizedBriefing(input: PersonalizedBriefingInput): Promise<PersonalizedBriefingOutput> {
  return personalizedBriefingFlow(input);
}

async function getWeatherData(location: string | undefined): Promise<string | undefined> {
  if (!location) return undefined;
  // This would ideally fetch from a weather service, but for the flow we use a detailed mock or simulated insight
  return `Currently 22°C and clear skies in ${location}. Rain is expected to start around 4:00 PM today, so keep an umbrella handy. Highs of 25°C.`;
}

async function getNewsHeadlines(topics: string[] | undefined): Promise<string[] | undefined> {
  if (!topics || topics.length === 0) return undefined;
  return [
    'Major indices hit record highs in early trading.',
    'New sustainable energy initiative announced by global coalition.',
    'Breakthrough in medical research promises improved patient outcomes.'
  ];
}

async function getMarketSummary(stocks: string[] | undefined): Promise<string | undefined> {
  if (!stocks || stocks.length === 0) return undefined;
  const primary = stocks[0].split(' ')[0];
  return `Your portfolio is trending positive, with ${primary} showing significant momentum today.`;
}

async function getSportsSummary(teams: string[] | undefined): Promise<string | undefined> {
  if (!teams || teams.length === 0) return undefined;
  const primary = teams[0];
  return `The ${primary} have an upcoming match scheduled for 7:00 PM tonight against their division rivals. Recent form suggests a high-scoring game.`;
}

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
  briefing: z.string().describe('A brief, 2-3 sentence functional summary.')
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
  prompt: `You are an AI assistant providing a brief, functional executive summary for a personalized dashboard.

Strictly summarize the data context in 2-3 concise sentences. Focus only on actionable events:
- Weather changes (rain, spikes in temp).
- Market moves (portfolio trends).
- Upcoming matches for the user's specific followed teams.

Do not use flowery language or greetings. Be direct and functional.

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
  Upcoming Match Summary: {{sportsSummary}}
{{/if}}`,
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
      return output?.briefing || "Dashboard synchronized. Modules are up to date and ready.";
    } catch (err) {
      console.error("Briefing Flow Error:", err);
      return "Dashboard synchronized. Modules are up to date and ready.";
    }
  }
);

export async function generatePersonalizedBriefing(input: PersonalizedBriefingInput): Promise<PersonalizedBriefingOutput> {
  return personalizedBriefingFlow(input);
}

async function getWeatherData(location: string | undefined): Promise<string | undefined> {
  if (!location) return undefined;
  return `Forecast for ${location}: Highs of 22°C. Scattered clouds with a 40% chance of rain developing in the late afternoon.`;
}

async function getNewsHeadlines(topics: string[] | undefined): Promise<string[] | undefined> {
  if (!topics || topics.length === 0) return undefined;
  return [
    'Major tech sector updates show strong quarterly performance.',
    'Renewable energy projects gain momentum in urban planning.',
    'Global logistics shifts impact early market trading.'
  ];
}

async function getMarketSummary(stocks: string[] | undefined): Promise<string | undefined> {
  if (!stocks || stocks.length === 0) return undefined;
  const primary = stocks[0].split(' ')[0];
  return `Your portfolio is trending positively, led by strong movement in ${primary}.`;
}

async function getSportsSummary(teams: string[] | undefined): Promise<string | undefined> {
  if (!teams || teams.length === 0) return undefined;
  const team = teams[0];
  return `The ${team} have their next scheduled fixture appearing tonight. Local coverage and stats are synchronized.`;
}

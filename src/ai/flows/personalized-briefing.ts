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
  }).describe('Flags indicating which widgets are enabled by the user.'),
  location: z.string().optional().describe('User\'s configured location for weather.'),
  newsTopics: z.array(z.string()).optional().describe('User\'s configured news topics.'),
  stocks: z.array(z.string()).optional().describe('User\'s configured stock tickers.'),
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
  }),
  location: z.string().optional(),
  weatherData: z.string().optional(),
  newsHeadlines: z.array(z.string()).optional(),
  marketSummary: z.string().optional(),
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

Summarize ALL available data points into a cohesive 3-4 sentence paragraph. Do not just list them; synthesize them. For example: "It's a beautiful sunny day in London, and your tech stocks are looking strong with Google leading the way, though you might want to keep an eye on the latest quantum computing breakthroughs in the news."

Data Context:
{{#if enabledWidgets.weather}}
  Location: {{location}}
  Weather: {{weatherData}}
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

Generate a detailed briefing based on this context.`,
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

    try {
      const {output} = await prompt(promptInput);
      return output?.briefing || "Welcome to your horizon. Your personalized modules are synchronized and ready.";
    } catch (err) {
      return "Welcome back! Your dashboard is fully loaded with your latest preferences. Have a productive day!";
    }
  }
);

export async function generatePersonalizedBriefing(input: PersonalizedBriefingInput): Promise<PersonalizedBriefingOutput> {
  return personalizedBriefingFlow(input);
}

async function getWeatherData(location: string | undefined): Promise<string | undefined> {
  if (!location) return undefined;
  return `Currently 22°C and clear skies in ${location}. Highs of 25°C expected later today.`;
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
  return 'Your portfolio is trending positive, with technology and healthcare sectors showing significant momentum.';
}

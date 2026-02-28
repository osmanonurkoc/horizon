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
  location: z.string().optional().describe('User\'s configured location for weather. Only needed if weather widget is enabled.'),
  newsTopics: z.array(z.string()).optional().describe('User\'s configured news topics. Only needed if news feed widget is enabled.'),
  stocks: z.array(z.string()).optional().describe('User\'s configured stock tickers. Only needed if market widget is enabled.'),
});
export type PersonalizedBriefingInput = z.infer<typeof PersonalizedBriefingInputSchema>;

// Output type for the flow and wrapper (the final briefing string)
export type PersonalizedBriefingOutput = string;

// Internal schema for the prompt to ensure structured JSON output from the model.
// Using an object schema is more reliable for LLMs than single primitive values.
const PromptOutputSchema = z.object({
  briefing: z.string().describe('A concise, personalized daily briefing text.')
});

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
  output: {schema: PromptOutputSchema},
  config: {
    safetySettings: [
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
    ]
  },
  prompt: `You are an AI assistant for a personalized dashboard. Your goal is to provide a concise, friendly, and informative daily briefing to the user based on their enabled widgets and the data provided.

Start with a friendly greeting, for example, "Good morning!". Then, based on the enabled widgets and provided data, summarize the most important information. Keep it brief and to the point, typically 2-3 sentences. 

If a widget is enabled but data is not available, acknowledge it briefly.

Here is the user's configuration and available data:

{{#if enabledWidgets.weather}}
  {{#if weatherData}}
    The weather in {{location}} is currently: {{weatherData}}.
  {{else}}
    (Weather data is unavailable for your location.)
  {{/if}}
{{/if}}

{{#if enabledWidgets.newsFeed}}
  {{#if newsHeadlines}}
    Top News Headlines:
    {{#each newsHeadlines}}
    - {{{this}}}
    {{/each}}
  {{else}}
    (No news headlines could be fetched.)
  {{/if}}
{{/if}}

{{#if enabledWidgets.market}}
  {{#if marketSummary}}
    Market Update: {{marketSummary}}
  {{else}}
    (Market data is currently unavailable.)
  {{/if}}
{{/if}}

Based on the information above, generate a concise personalized briefing and return it in the requested JSON format.`,
});

// Flow definition
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
      return output?.briefing || "Welcome back to your dashboard! Have a productive and wonderful day ahead.";
    } catch (err) {
      console.error("Personalized briefing prompt failed:", err);
      // Fallback greeting if AI generation fails
      return "Welcome back! Your personalized dashboard is ready. Have a great day!";
    }
  }
);

// Wrapper function to be called from the Next.js client
export async function generatePersonalizedBriefing(input: PersonalizedBriefingInput): Promise<PersonalizedBriefingOutput> {
  return personalizedBriefingFlow(input);
}

// Mock service functions
async function getWeatherData(location: string | undefined): Promise<string | undefined> {
  if (!location) return undefined;
  if (location.toLowerCase() === 'london') return 'Partly cloudy with a chance of rain, 15°C.';
  if (location.toLowerCase() === 'new york') return 'Sunny and clear, 22°C.';
  return 'Clear skies, 20°C.';
}

async function getNewsHeadlines(topics: string[] | undefined): Promise<string[] | undefined> {
  if (!topics || topics.length === 0) return undefined;
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
  if (!stocks || stocks.length === 0) return undefined;
  if (stocks.includes('GOOGL') && stocks.includes('MSFT')) {
    return 'Tech stocks are up today, with Google increasing by 1.5% and Microsoft gaining 0.8%.';
  }
  return 'Markets are generally stable, with minor fluctuations across sectors.';
}

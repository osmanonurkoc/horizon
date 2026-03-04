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
  }),
  apiKeys: z.any().optional(),
  location: z.string().optional(),
  newsTopics: z.array(z.any()).optional(),
  stocks: z.array(z.any()).optional(),
  sportsTeams: z.array(z.any()).optional(),
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

    if (input.enabledWidgets.weather && input.location && input.apiKeys?.weather) {
      weatherData = await getWeatherData(input.location, input.apiKeys.weather);
    }

    if (input.enabledWidgets.newsFeed && input.newsTopics && input.apiKeys?.news) {
      newsHeadlines = await getNewsHeadlines(input.newsTopics, input.apiKeys.news);
    }

    if (input.enabledWidgets.market && input.stocks && input.stocks.length > 0) {
      marketSummary = await getMarketSummary(input.stocks);
    }

    if (input.enabledWidgets.sports && input.sportsTeams && input.sportsTeams.length > 0) {
      sportsSummary = await getSportsSummary(input.sportsTeams, input.apiKeys?.sports || '3');
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

async function getWeatherData(location: string, apiKey: string): Promise<string | undefined> {
  try {
    const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${location}&appid=${apiKey}&units=metric`);
    const data = await res.json();
    if (data.weather && data.main) {
      return `Current weather in ${location}: ${data.weather[0].description}, Temp: ${Math.round(data.main.temp)}°C.`;
    }
  } catch (e) { return undefined; }
  return undefined;
}

async function getNewsHeadlines(topics: any[], apiKey: string): Promise<string[] | undefined> {
  if (!topics.length) return undefined;
  try {
    const topicVal = typeof topics[0] === 'object' ? (topics[0].value || 'general') : topics[0];
    const res = await fetch(`https://gnews.io/api/v4/top-headlines?category=${topicVal}&lang=en&max=3&apikey=${apiKey}`);
    const data = await res.json();
    if (data.articles) {
      return data.articles.slice(0, 3).map((a: any) => a.title);
    }
  } catch(e) { return undefined; }
  return undefined;
}

async function getMarketSummary(stocks: any[]): Promise<string | undefined> {
  if (!stocks.length) return undefined;
  try {
    const symbol = typeof stocks[0] === 'object' ? stocks[0].value : stocks[0];
    const parsedSymbol = symbol.split(' ')[0];
    // Direct fetch (No CORS needed on server)
    const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${parsedSymbol}?interval=1d&range=1d`, {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    const data = await res.json();
    const meta = data.chart?.result?.[0]?.meta;
    if (meta && meta.regularMarketPrice && meta.chartPreviousClose) {
      const price = meta.regularMarketPrice;
      const diff = ((price - meta.chartPreviousClose) / meta.chartPreviousClose) * 100;
      return `${parsedSymbol} is trading at ${price.toFixed(2)} (${diff >= 0 ? '+' : ''}${diff.toFixed(2)}% today).`;
    }
  } catch(e) { return undefined; }
  return undefined;
}

async function getSportsSummary(teams: any[], apiKey: string): Promise<string | undefined> {
  if (!teams.length) return undefined;
  try {
    const team = teams[0];
    const teamId = typeof team === 'object' ? team.id : team;
    const teamName = typeof team === 'object' ? team.name : team;
    
    // Check Next Match
    let res = await fetch(`https://www.thesportsdb.com/api/v1/json/${apiKey}/eventsnext.php?id=${teamId}`);
    let data = await res.json();
    if (data.events && data.events.length > 0) {
       const next = data.events[0];
       return `${teamName} plays ${next.strAwayTeam === teamName ? next.strHomeTeam : next.strAwayTeam} on ${next.dateEvent}.`;
    }
    // Fallback to Last Match
    res = await fetch(`https://www.thesportsdb.com/api/v1/json/${apiKey}/eventslast.php?id=${teamId}`);
    data = await res.json();
    if (data.results && data.results.length > 0) {
       const last = data.results[0];
       return `${teamName} latest result: ${last.strHomeTeam} ${last.intHomeScore} - ${last.intAwayScore} ${last.strAwayTeam}.`;
    }
  } catch(e) { return undefined; }
  return undefined;
}

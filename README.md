# 🌅 Personal Horizon

**Personal Horizon** is a high-performance, strictly desktop-only personalized dashboard designed for clarity, focus, and utility. It synthesizes real-time data from weather, global markets, sports stadiums, and news feeds into a single, aesthetically refined executive interface.

Built with **Next.js 15**, **React 19**, and **Genkit AI**, Personal Horizon follows a "Bring Your Own Key" (BYOK) philosophy, allowing users to connect their own professional-grade data streams for a truly private and customized experience.

---

## 🚀 Key Features

### 🤖 At a Glance
It analyzes your enabled widgets to highlight imminent rain, portfolio movements, and upcoming match kickoffs. And shows brief greetings text.

### 📊 Professional Widget Suite
- **Weather Hub**: Real-time conditions and 5-day outlook via OpenWeather.
- **Market Watch**: Global ticker tracking and 30-day historical trend analysis (Yahoo Finance).
- **Stadium Central**: Community-driven sports fixtures and live league standings (TheSportsDB).
- **Deep Dive News**: A masonry-grid news feed tailored to your specific interests and languages (GNews).
- **Fast Lanes**: Custom bookmarks for your most-visited professional tools.

### 🔔 Smart Event Notifications
An event-driven notification row that surfaces actionable insights:
- Imminent weather shifts (e.g., "Rain expected at 14:00").
- Live sports scores or prioritized "Next Match" countdowns.
- Portfolio trend percentages.

### 🎨 Refined Interface
- **Desktop Only**: Optimized specifically for displays 1024px and wider.
- **Dual Theming**: "Latte" (Light) and "Mocha" (Dark) modes inspired by professional color palettes.
- **Onboarding Wizard**: A seamless, multi-step configuration experience with import/export capabilities for your settings.

---

## 🛠 Tech Stack

- **Framework**: [Next.js 15 (App Router)](https://nextjs.org/)
- **UI Components**: [ShadCN UI](https://ui.shadcn.com/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **AI/LLM**: [Genkit](https://firebase.google.com/docs/genkit) + Google AI (Gemini)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Recharts](https://recharts.org/)
- **Date Handling**: [date-fns](https://date-fns.org/)

---

## 🚦 Getting Started

### Prerequisites
- [Node.js 20+](https://nodejs.org/)
- A Google AI API Key (for the Genkit briefing)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/personal-horizon.git
   cd personal-horizon
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory and add your Google AI key:
   ```env
   GOOGLE_GENAI_API_KEY=your_gemini_api_key_here
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open [http://localhost:9002](http://localhost:9002) in your desktop browser.

---

## 🔑 Data Sources (BYOK)

To fully unlock the dashboard, you will need the following (mostly free) API keys:

| Service | Purpose | Source |
| :--- | :--- | :--- |
| **OpenWeather** | Weather Forecasts | [openweathermap.org](https://openweathermap.org/api) |
| **GNews** | Global News Feed | [gnews.io](https://gnews.io/) |
| **TheSportsDB** | Sports Fixtures/Standings | [thesportsdb.com](https://www.thesportsdb.com/api.php) |
| **Yahoo Finance** | Market Tickers | *Native Proxy Provided* |

---

## 📁 Architecture

- `src/app/api`: Server-side proxies to bypass CORS and handle rate-limiting.
- `src/ai`: Genkit flow definitions and AI prompt engineering.
- `src/components/widgets`: Isolated, modular logic for each dashboard module.
- `src/lib/config-store.ts`: LocalStorage-based configuration and persistence layer.
- `src/app/globals.css`: Custom ShadCN theme variables (Latte/Mocha).

---

## 📜 License
This project is open-source and available under the MIT License.

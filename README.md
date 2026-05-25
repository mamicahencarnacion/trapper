# World Travel Planner & Map Tracker

A beautiful, interactive, fully client-side and **100% offline-ready** world travel mapping and itinerary planning dashboard. Pin visited countries, track statistics, draft locations to visit, manage travel notes, and organize details without needing an internet connection.

## 🌐 Live Application
**Check out the deployed project:** 🚀 **[Launch PlanTravelLog](https://plantravellog.pages.dev)**

---

## 🎨 Core Features

- **Interactive SVG D3 World Map**: Hover over countries, select them to open quick customization portals, and view visually stylized markers for your travels.
- **Offline First**: All map geometry (`world-atlas` TopoJSON) and regional ISO-3166 country registries are completely bundled and served locally from client-side bundles. Works flawlessly on airplanes, trains, or deep in remote areas without internet coverage.
- **Client-Side Travel Statistics**: Automatic calculations of global surface coverage, total visited regions, continent-specific summaries, and trip completion metrics.
- **Itinerary & Note Management**: Keep detailed reservations, trip budgets, destination check-lists, and useful URLs safely stored for immediate lookups.
- **Secure Local Storage Engine**: Your data belongs to you. Absolute privacy with offline persistence stored strictly inside your browser's local cache.
- **Browser Data Clear Warning**: An elegant, dismissible daily warning banner reminding you that clearing all browser cookies or search cache will erase local travel configurations.

---

## 🚀 Getting Started

### Prerequisites
- Node.js (version 18 or higher recommended)
- npm or yarn

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Build production-optimized static assets:
   ```bash
   npm run build
   ```

---

## 🌐 Free Hosting Options

Because this app is a fully client-side Single Page Application (SPA), you can host it for free on many popular cloud platforms. Here are the best websites to host this application completely for free:

### 1. **Cloudflare Pages** (Highly Recommended)
- **Why**: Fastest CDN edge network, unmetered bandwidth, and extremely simple integration with Git repositories.
- **How to Host**: 
  1. Connect your GitHub repository to [Cloudflare Dashboard](https://dash.cloudflare.com).
  2. Choose **Vite** or specify build command: `npm run build` and output directory: `dist`.
  3. Deploy!

### 2. **Vercel**
- **Why**: Excellent developer experience, automatic preview deployments on pull requests, and instant staging builds.
- **How to Host**:
  1. Install Vercel CLI (`npm install -g vercel`) and run `vercel`, or import your repository directly on [vercel.com](https://vercel.com).
  2. Frame settings detect Vite automatically. Out-of-the-box configurations will run successfully.

### 3. **Netlify**
- **Why**: Intuitive drag-and-drop deployment or Git integration. Provides free custom domain configuration and free SSL certificates instantly.
- **How to Host**:
  1. Import through GitHub or zip the built `./dist/` folder and drag/drop it on the [Netlify App Dashboard](https://app.netlify.com).
  2. Build configuration defaults: build command: `npm run build`, publish directory: `dist`.

### 4. **GitHub Pages**
- **Why**: Completely integrated with your source code. Free hosting directly on github.io.
- **How to Host**:
  - Set up a GitHub Action to deploy static files on push to your main branch, or use a tool like `gh-pages` npm package.
  - *Note*: Ensure your `vite.config.ts` has the correct `base` path (e.g. `base: '/repo-name/'`) if deploying to a subdirectory rather than a custom root domain.

---

## 🔒 Privacy & Data Portability

- This app strictly operates **on-device only**.
- It does not contact any remote cloud endpoints, databases, telemetry servers, or analytics engines.
- If you intend to change devices or clear your browser data, your map files and itineraries can be preserved by setting up automated browser persistence backups or downloading custom page presets.

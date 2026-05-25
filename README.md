# World Travel Planner & Map Tracker

A beautiful, interactive, fully client-side and **100% offline-ready** world travel mapping and itinerary planning dashboard. Pin visited countries, track statistics, draft locations to visit, manage travel notes, and organize details without needing an internet connection.

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

## 🔒 Privacy & Data Portability

- This app strictly operates **on-device only**.
- It does not contact any remote cloud endpoints, databases, telemetry servers, or analytics engines.
- If you intend to change devices or clear your browser data, your map files and itineraries can be preserved by setting up automated browser persistence backups or downloading custom page presets.

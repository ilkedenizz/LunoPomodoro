# Luno

Luno is a modern, atmospheric Pomodoro and focus web app designed to help users focus in their own atmosphere.

---

## Features

* **Pomodoro Timer**: Accurate, drift-free timer engine supporting Focus (25m), Short Break (5m), and Long Break (15m) intervals with automatic break/session transitions.
* **Manual Duration Input**: Direct numeric keyboard input for custom session lengths (1 to 180 minutes) with real-time validation and normalization.
* **Daily Focus & Goals**: Set and monitor daily targets in pomodoros and minutes with real-time circular progress tracking and streak counters.
* **Focus Tasks**: Integrated task management to add, edit, reorder, check off, and bind active tasks directly to ongoing Pomodoro sessions.
* **Task Pomodoro Counter**: Automatic per-task pomodoro session incrementing and visual completion states.
* **Focus History & Analytics**: Interactive charts and session logs providing breakdown summaries across Daily, Weekly, and Monthly timeframes.
* **Custom Timer Colors**: Choose from 9 distinct timer accent colors (Default, White, Red, Orange, Yellow, Green, Blue, Purple, Pink) applied exclusively to the timer display and progress ring.
* **Atmosphere & Visual Backdrops**: Curated themes including Tokyo Rain, Cozy Study, Midnight Library, Rainy Cafe, and Glass Raindrops with dedicated Light and Dark variants.
* **Ambient Sound Mixer**: Built-in Web Audio synthesis and ambient tracks (Rain, Cafe, Ocean Waves, Fireplace, Lo-Fi) with multi-track individual volume controls.
* **Atmosphere Presets**: Save and load custom combinations of visual backdrops and sound mixer levels.
* **Keyboard Shortcuts**: Full accessibility with keyboard controls (`Space` to toggle, `R` to reset, `S` to skip, `M` to toggle audio).
* **Responsive 3-Column Layout**: True geometric center timer workspace with Daily Focus on the left and Task List on the right for widescreen desktops, smoothly reflowing on tablets and smartphones.
* **Guest / Local Mode**: 100% functional out of the box with zero setup or sign-up required.
* **Local-First Architecture**: High-speed synchronous reads and writes using persistent local storage, keeping the interface immediate and responsive.
* **Supabase Authentication**: Optional secure email and password user authentication with email confirmation support.
* **Cloud Synchronization**: Granular, incremental sync that pushes updates and merges data across devices when authenticated.
* **Offline-First Resilience**: Seamless continuation when disconnected; queued changes are automatically uploaded when connectivity returns.
* **PWA Support**: Web app manifest with standalone display configuration, maskable icons, and mobile optimization.
* **Accessibility**: Full ARIA modal semantics, visible focus outlines, scalable touch targets, and high-contrast light/dark support.
* **Dynamic Document Title**: Live countdown time and session status displayed in the browser tab title.
* **SEO Metadata**: Open Graph tags, Twitter Cards, Schema.org WebApplication structured data, and robots.txt.

---

## Design Philosophy

* **Minimal**: Clean, distraction-free user interface focused entirely on mindful work.
* **Premium**: Subtle glassmorphism, refined typography (Inter, JetBrains Mono, Plus Jakarta Sans), and smooth state transitions.
* **Focus-Oriented**: The timer remains the visual center of gravity without unnecessary cognitive clutter.
* **Atmospheric**: Immersive ambient audio and coordinated visual backgrounds that foster deep concentration.
* **Responsive**: Thoughtfully scaled from multi-monitor desktop setups down to mobile handheld screens.
* **Customizable**: Independent controls for themes, visual backgrounds, timer typography colors, and ambient soundscapes.

---

## How It Works

Luno is engineered with a **Local-First** design pattern, ensuring that data operations never block the user interface or timer execution.

```
┌─────────────────────────────────────────────────────────┐
│                       Luno UI                           │
└──────────────────────────┬──────────────────────────────┘
                           │
                 [Fast Local Storage]
                           │
       ┌───────────────────┴───────────────────┐
       ▼                                       ▼
  Guest Mode                              Account Mode
(Local Browser)                       (Supabase Cloud Sync)
                                               │
                                     [Incremental Sync Engine]
                                               │
                                     [Granular Offline Queue]
                                               │
                                      [Remote PostgreSQL]
```

### Guest Mode
By default, all settings, tasks, daily goals, history sessions, and atmosphere presets are stored locally in the browser's `localStorage`. No account is required, no external API calls are made, and all features remain completely available.

### Account Mode
When connected to a Supabase backend and signed in, Luno synchronizes data to a personal cloud account. Local state acts as an instant-read cache while the `SyncEngine` streams updates incrementally to remote PostgreSQL tables protected by Row Level Security.

### Offline Mode
If your internet connection drops while signed in, Luno continues uninterrupted in local mode. All modifications are tracked in a granular pending sync queue (`luno_pending_sync_queue_v2`). As soon as network connectivity is re-established (or upon clicking "Sync Now"), the queue automatically flushes pending diffs to the cloud.

### Data Safety
* **Guest Mode Data**: Stored in the browser cache. Clearing browser site data or cookies will remove locally saved records.
* **Account Mode Data**: Stored both locally and backed up to Supabase cloud storage, allowing multi-device synchronization and restoration.

---

## Tech Stack

* **Frontend Framework**: [React 19](https://react.dev/)
* **Language**: [TypeScript](https://www.typescriptlang.org/)
* **Build Tool**: [Vite](https://vite.dev/)
* **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
* **Icons**: [Lucide React](https://lucide.dev/)
* **Celebration Effects**: [Canvas Confetti](https://www.kirilv.com/canvas-confetti/)
* **Linter**: [Oxlint](https://oxc.rs/)
* **Cloud & Auth**: [@supabase/supabase-js](https://supabase.com/)

---

## Project Structure

```
├── public/
│   ├── atmospheres/          # Atmospheric background image assets
│   ├── favicon.svg           # Luno focus mark favicon
│   ├── manifest.webmanifest  # PWA installation manifest
│   └── robots.txt            # Search engine crawler configuration
├── src/
│   ├── assets/               # Static styles and fonts
│   ├── components/           # React UI components
│   │   ├── AmbienceAudioPlayer.tsx     # Ambient audio drawer modal
│   │   ├── AuthModal.tsx               # Account creation & sign-in modal
│   │   ├── BackgroundSelectorModal.tsx # Atmosphere gallery modal
│   │   ├── BackgroundView.tsx          # Fullscreen atmospheric background
│   │   ├── DailyFocus.tsx              # Daily goal tracker & stats card
│   │   ├── FocusChart.tsx              # Focus history analytics chart
│   │   ├── FocusHistoryModal.tsx       # Detailed session statistics modal
│   │   ├── Header.tsx                  # Top navigation & toolbar
│   │   ├── MainTimerDisplay.tsx        # Central circular timer display
│   │   ├── PresetsManager.tsx          # Atmosphere & audio preset manager
│   │   ├── SettingsModal.tsx           # Application & timer settings modal
│   │   ├── ShortcutsModal.tsx          # Keyboard shortcuts reference modal
│   │   ├── SoundMixer.tsx              # Multi-channel ambient audio mixer
│   │   ├── TaskItem.tsx                # Individual task row with actions
│   │   ├── TaskList.tsx                # Task list management card
│   │   ├── TimerControls.tsx           # Start / Pause / Reset / Skip buttons
│   │   └── TimerModeSelector.tsx       # Focus / Short / Long break pills
│   ├── services/             # Backend, Auth, and Sync services
│   │   ├── auth.ts                     # Supabase authentication service
│   │   ├── repository.ts               # Data access repository layer
│   │   ├── supabaseClient.ts           # Supabase client initializer & validator
│   │   └── syncEngine.ts               # Incremental sync & deterministic merge
│   ├── types/                # TypeScript interface and type declarations
│   ├── utils/                # Audio engines, storage helpers, and math
│   │   ├── backgrounds.ts              # Theme background definitions
│   │   ├── sound.ts                    # Web Audio synthesizer & chime player
│   │   ├── statistics.ts               # Focus history aggregation
│   │   ├── storage.ts                  # LocalStorage schema & migration layer
│   │   └── timerColors.ts              # Timer accent color palette definitions
│   ├── App.tsx               # Core application shell & state coordinator
│   ├── index.css             # Tailwind imports & glassmorphic custom rules
│   └── main.tsx              # React DOM entrypoint
├── supabase/
│   └── schema.sql            # PostgreSQL DDL, RLS policies, and indexes
├── .env.example              # Environment variables template
├── index.html                # Main HTML entry with SEO & JSON-LD metadata
├── package.json              # Dependencies and build scripts
└── vite.config.ts            # Vite configuration & Rollup chunk splitting
```

---

## Getting Started

### Prerequisites
* [Node.js](https://nodejs.org/) (version 18+ recommended)
* `npm` package manager

### Installation

1. Clone the repository and navigate into the project directory:
   ```bash
   git clone https://github.com/your-username/pomodoro.git
   cd pomodoro
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the local development server:
   ```bash
   npm run dev
   ```

4. Open your browser and visit `http://localhost:5173`.

---

## Available Scripts

* `npm run dev`: Starts the Vite local development server with Hot Module Replacement.
* `npm run build`: Type-checks TypeScript code and creates an optimized production bundle in `dist/`.
* `npm run lint`: Runs the high-performance Oxlint code analyzer.
* `npm run preview`: Locally previews the production build.

---

## Environment Variables

Luno works completely without any environment variables in **Guest Mode**.

To enable cloud accounts and multi-device synchronization, create a `.env` file in the project root based on `.env.example`:

```env
# Supabase Cloud Sync Configuration (Optional)
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

> [!CAUTION]
> Only supply the public `anon` key in the frontend. Never place your Supabase `service_role` key in frontend environment variables or commit it to version control.

---

## Supabase Setup

To set up multi-device synchronization:

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL Editor** in your Supabase dashboard.
3. Paste and run the contents of [`supabase/schema.sql`](file:///C:/dev/Pomodoro/supabase/schema.sql).
4. Configure your desired Authentication providers (Email/Password) under **Authentication > Providers**.
5. Copy your Project URL and Anon Public Key from **Project Settings > API**.
6. Create a `.env` file with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
7. Restart your development server (`npm run dev`).

### Database Tables Created by `schema.sql`:
* `public.user_settings`: User timer durations, theme preferences, volume, and timer color.
* `public.daily_goals`: Target pomodoros and target focus minutes.
* `public.tasks`: Task titles, completed status, pomodoros earned, and timestamps.
* `public.focus_sessions`: Logged focus sessions with duration and mode.
* `public.atmosphere_presets`: Saved atmosphere visual and audio mixer presets.

---

## Data Synchronization

Luno uses an **Incremental Sync Engine** rather than re-uploading the entire database on minor changes:

* **Granular Pending Queue**: Tracks individual pending entities (`pendingTaskIds`, `pendingSessionIds`, `pendingSettings`, etc.) in `luno_pending_sync_queue_v2`.
* **Individual Entity Endpoints**: Micro-updates (e.g. toggling a task checkbox) only invoke single-row upserts (`pushTask`, `pushSession`, `pushSettings`).
* **Deterministic Merge**: When signing in from a new device, local and cloud datasets merge deterministically using timestamps (`updatedAt || createdAt`) and highest pomodoro counters (`Math.max`).
* **Automatic Offline Retry**: The `window.online` listener automatically pushes queued updates once internet connectivity resumes.

---

## Authentication

* **Guest Mode**: Full functionality without creating an account or logging in.
* **Supabase Auth**: Clean email and password registration and login via the official Supabase Auth SDK.
* **Email Verification**: Handles email confirmation requirements gracefully without creating broken session states.
* **Session Persistence**: Sessions persist securely in local storage and refresh automatically.
* **Sign Out**: Clears user session while retaining existing local data safely on the device.
* **Honest Unconfigured State**: If Supabase credentials are not provided in `.env`, the app clearly indicates Local/Guest mode without generating fake mock accounts.

---

## Responsive Design

* **Desktop (≥ 1280px)**: 3-column workspace with Daily Focus on the left, central geometric Pomodoro Timer in the middle, and Tasks on the right.
* **Tablet (768px - 1279px)**: 2-column layout with prioritized timer and stacked secondary panels.
* **Mobile (< 768px)**: Single-column vertically scrollable layout with touch-friendly controls, condensed header, and drawer-based settings.

---

## Progressive Web App (PWA)

* Configured via `public/manifest.webmanifest`.
* Supports standalone display mode and custom theme bar colors (`#050508`).
* Vector SVG maskable app icons for home screen installation on iOS, Android, macOS, and Windows.

---

## Accessibility

* **Keyboard Navigation**: Full keyboard navigation across all timer actions and modal controls.
* **ARIA Standards**: Modals include `role="dialog"`, `aria-modal="true"`, and associated `aria-labelledby` headers.
* **Focus Management**: Visible focus rings (`focus-visible:ring-2`) on all interactive buttons and inputs.
* **Form Controls**: Screen-reader accessible labels on duration inputs and volume sliders.

---

## SEO & Metadata

* Standard meta tags (`description`, `keywords`, `robots`).
* Social sharing metadata (`og:title`, `og:description`, `og:type`, `og:site_name`).
* Twitter Card metadata (`twitter:card`, `twitter:title`, `twitter:description`).
* Structured Data: Schema.org `WebApplication` JSON-LD definition.
* Dedicated `public/robots.txt`.

---

## Verification & Testing

The application is validated through:
* **Linting**: Oxlint automated code quality checks (`npm run lint`).
* **Type Checking**: Strict TypeScript compilation (`tsc -b`).
* **Production Build**: Rollup/Vite tree-shaking and chunk verification (`npm run build`).

---

## Security

* **Row Level Security (RLS)**: Enabled across all Supabase database tables with strict `auth.uid() = user_id` access controls.
* **Safe Keys**: Only public anonymous API keys are exposed to the client; `service_role` keys are forbidden.
* **Input Sanitization**: Numerical input limits (1–180 minutes) and strict enum validation for themes, modes, and timer colors.
* **No Password Storage**: User passwords are never saved in local storage or client memory.

---

## License

License: Not specified.

---

**Luno — Focus in your own atmosphere.**

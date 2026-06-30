# Kiko — Private, Real-Time Communication Platform

Kiko is a private, real-time messaging, calling, and live-streaming platform inspired by Discord. Kiko focuses strictly on **privacy**, **temporary media sharing**, **instant screen/camera streaming**, and **lightweight performance**. 

Unlike standard chat apps, Kiko is **not a permanent cloud storage service**—all uploaded media expires and is permanently deleted after 24 hours.

---

## Key Features

1. **Ephemeral Storage System**:
   - Supported uploads: Images, Videos, Audio, Documents, ZIPs, and audio/screen recordings.
   - Files automatically expire and are unlinked from the server disk after exactly **24 hours**.
   - Live visual countdown clocks are displayed on media attachments.
   - A dual-strategy background cleanup worker (BullMQ/Redis + fail-safe database interval scanner) deletes files permanently.
   
2. **Pure Live Streaming (WebRTC)**:
   - Zero-setup sharing of browser tabs, single windows, cameras, and system microphones.
   - Direct peer-to-peer mesh WebRTC architecture—low latency, high performance.
   - Live stream quality selectors (1080p, 720p, 480p).
   
3. **Instant Connect Call Rooms**:
   - Single-click voice, video, or stream channels.
   - Dynamic visual voice activity nodes that pulse when active.
   - Direct DMs calling support.
   
4. **Real-time Messaging**:
   - Instant message delivery powered by Socket.IO.
   - Text formatting with Markdown parser, code blocks, and emoji reactions.
   - Threaded replies, typing indicators, and message deletion sync.

5. **Theme Personalization**:
   - Glassmorphic translucent layers, blur backdrops, and neon glows.
   - Available in **Dark Mode**, **Light Mode**, and **AMOLED Black Mode**.

---

## Project Structure

```
kiko/
├── backend/
│   ├── prisma/             # Prisma PostgreSQL schema and seed files
│   ├── src/
│   │   ├── middleware/     # JWT authentication middleware
│   │   ├── routes/         # REST API routes (auth, friends, servers, media)
│   │   ├── cleanupWorker.js# 24h file cleanup worker (BullMQ + interval)
│   │   ├── socket.js       # Socket.IO & WebRTC mesh signaling
│   │   └── server.js       # Express server bootstrap
│   └── Dockerfile          # Node.js Alpine runtime image
├── frontend/
│   ├── src/
│   │   ├── components/     # AppShell, WebRTCCall, ProfileModal, AuthPage
│   │   ├── context/        # AppContext (Auth, API, WebSockets, WebRTC signaling)
│   │   ├── main.jsx        # SPA mounter
│   │   └── index.css       # Design tokens, glassmorphism CSS
│   ├── nginx.conf          # Reverse proxy config for routing in production
│   └── Dockerfile          # Multi-stage Vite compiler + Nginx server
├── docker-compose.yml      # Multi-container orchestration (DB, Redis, API, Client)
└── package.json            # Root workspaces configuration
```

---

## Getting Started (Local Development)

### Prerequisites

- Node.js (v18+)
- PostgreSQL database running locally
- Redis server running locally (Optional, fallback interval active)

### Installation & Configuration

1. **Clone the repository and install dependencies**:
   ```bash
   npm install
   ```
   *This automatically runs recursive workspace installs for both frontend and backend.*

2. **Setup environment variables**:
   Modify `backend/.env` to point to your PostgreSQL and Redis instances:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/kiko?schema=public"
   REDIS_URL="redis://localhost:6379"
   JWT_SECRET="kiko_secret_key"
   ```

3. **Run database migrations and seed default data**:
   ```bash
   # Push schema to database
   npm run prisma:migrate
   
   # Seed default communities (Kiko HQ), channels, and mock users
   npm run prisma:seed
   ```

4. **Launch development servers**:
   ```bash
   npm run dev
   ```
   *Runs backend API on port 5000 and Vite React server on port 3000 concurrently.*

5. **Access Application**:
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Running with Docker (Recommended)

To launch the complete production-ready stack in containers:

1. **Launch container group**:
   ```bash
   docker-compose up --build
   ```

2. **Provision database schemas inside the container**:
   In a separate terminal, run:
   ```bash
   # Setup tables
   docker exec -it kiko-backend npx prisma db push
   
   # Populate seeds (mock users: mo_aaqil, aaqilezio, mexzy, sunmi)
   docker exec -it kiko-backend npx prisma db seed
   ```

3. **Access**:
   - Client Portal: [http://localhost:3000](http://localhost:3000)
   - API Services: [http://localhost:5000](http://localhost:5000)

---

## Mock Accounts (Password: `kiko1234`)

Use these pre-seeded accounts to test multi-user calling, messaging, and streaming:
* `mo_aaqil@kiko.im` / Username: `mo_aaqil` (Server Owner)
* `aaqilezio@kiko.im` / Username: `aaqilezio` (Server Admin)
* `mexzy@kiko.im` / Username: `mexzy`
* `sunmi@kiko.im` / Username: `sunmi`

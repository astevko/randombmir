# BMIR Audio Player

A modern React Next.js audio player for BMIR (Black Rock City Information Radio) clips with Fireproof local database storage and Redis session management.

## Features

- 🎵 **Modern Audio Player** - Clean, responsive interface with custom controls
- 📱 **Session Persistence** - Redis stores playback state, volume, and current clip
- 🗄️ **Local Database** - Fireproof stores all audio metadata locally
- 🎲 **Navigation** - Previous, Next, and Random clip selection
- 🎨 **Beautiful UI** - Tailwind CSS with custom styling
- ⚡ **Fast & Responsive** - Built with Next.js 14 and React 18

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Database**: Fireproof (local, encrypted)
- **Session Storage**: Redis
- **Audio**: HTML5 Audio API

## Getting Started

### Prerequisites

- Node.js 18+ 
- Redis server running locally (or Redis Cloud)

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd bmir-audio-player
   npm install
   ```

2. **Set up environment variables:**
   Create a `.env.local` file:
   ```env
   REDIS_URL=redis://localhost:6379
   # Or for Redis Cloud:
   # REDIS_URL=redis://username:password@host:port
   ```

3. **Start Redis (if running locally):**
   ```bash
   # macOS with Homebrew
   brew services start redis
   
   # Or start manually
   redis-server
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                 # Next.js app directory
│   ├── globals.css     # Global styles
│   └── page.tsx        # Main page
├── components/         # React components
│   └── AudioPlayer.tsx # Main audio player component
├── lib/               # Services and utilities
│   ├── audio-db.ts    # Fireproof database service
│   └── redis.ts       # Redis session service
├── types/             # TypeScript type definitions
│   └── audio.ts       # Audio and session types
└── scripts/           # Data import scripts
    └── import-audio-data.ts
```

## Data Model

### AudioClip
```typescript
interface AudioClip {
  _id: string;           // Fireproof auto-generated ID
  title: string;         // Display title
  audioUrl: string;      // S3 URL to audio file
  category: string;      // 'long-talks' | 'random' | 'camps-arts' | 'warnings'
  filename: string;      // Original filename
  transcript?: string;   // Optional transcript
  createdAt: number;     // Timestamp
}
```

### SessionState
```typescript
interface SessionState {
  currentClipId: string; // Currently playing clip ID
  volume: number;        // Audio volume (0-1)
  isPlaying: boolean;    // Playback state
  currentTime: number;   // Current playback position
  sessionId: string;     // Unique session identifier
  lastUpdated: number;   // Last update timestamp
}
```

## Usage

### Basic Navigation
- **Play/Pause**: Click the green button
- **Previous/Next**: Use the blue navigation buttons
- **Random**: Click the purple "Random Clip" button
- **Volume**: Adjust with the volume slider
- **Seek**: Drag the progress bar to jump to any position

### Session Persistence
- Your current clip, volume, and playback position are saved to Redis
- When you reopen the page, it will resume exactly where you left off
- Session data expires after 24 hours

### Database Management
The app uses Fireproof for local storage, which means:
- All data is stored encrypted in your browser
- No server setup required for the database
- Data persists between browser sessions
- Can be synced to cloud storage later

## Importing Your Audio Data

To import your actual BMIR audio files:

1. **Update the import script** with your actual audio URLs and titles
2. **Run the import** (you can add this as a development script)
3. **Customize the data** as needed

## Deployment

### Vercel (Recommended)
1. Push to GitHub
2. Connect to Vercel
3. Add Redis environment variable
4. Deploy

### Other Platforms
- Ensure Redis is available (Redis Cloud, Upstash, etc.)
- Set environment variables
- Build and deploy

## Development

### Adding New Features
- Audio clips are stored in Fireproof database
- Session state is managed in Redis
- UI components are in `src/components/`
- Types are defined in `src/types/`

### Styling
- Uses Tailwind CSS for styling
- Custom slider styles in `globals.css`
- Responsive design for mobile/desktop

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this for your own projects!

## Acknowledgments

- BMIR for the audio content
- Fireproof for the local database
- Next.js team for the amazing framework
- Tailwind CSS for the styling system

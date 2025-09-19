# BMIR Audio Player

A modern React Next.js audio player for BMIR (Black Rock City Information Radio) clips with Fireproof local database storage and localStorage session management.

## Features

- 🎵 **Modern Audio Player** - Clean, responsive interface with custom controls
- 📱 **Session Persistence** - localStorage stores playback state, volume, and current clip
- 🗄️ **Local Database** - Fireproof stores all audio metadata locally
- 🎲 **Navigation** - Previous, Next, and Random clip selection
- 🎨 **Beautiful UI** - Tailwind CSS with custom styling
- ⚡ **Fast & Responsive** - Built with Next.js 15 and React 19

## Tech Stack

- **Frontend**: Next.js 15.3.4, React 19.1.0, TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: Fireproof (local, encrypted)
- **Session Storage**: localStorage (browser-based)
- **Audio**: HTML5 Audio API

## Getting Started

### Prerequisites

- Node.js 18+ 

### Installation

1. **Clone and install dependencies:**
   ```bash
   cd bmir-audio-player
   npm install
   ```

2. **Run the development server:**
   ```bash
   npm run dev
   ```

3. **Open your browser:**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
├── app/                 # Next.js app directory
│   ├── globals.css     # Global styles
│   └── page.tsx        # Main page
├── components/         # React components
│   └── BrowserAudioPlayer.tsx # Main audio player component
├── lib/               # Services and utilities
│   ├── audio-db.ts    # Fireproof database service
│   └── local-storage-service.ts # localStorage session service
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

### PlayerState
```typescript
interface PlayerState {
  currentClipId: string; // Currently playing clip ID
  volume: number;        // Audio volume (0-1)
  isPlaying: boolean;    // Playback state
  currentTime: number;   // Current playback position
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
- Your current clip, volume, and playback position are saved to localStorage
- When you reopen the page, it will resume exactly where you left off
- Session data persists until browser data is cleared

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
3. Deploy

### Other Platforms
- No external dependencies required
- Build and deploy

## Development

### Adding New Features
- Audio clips are stored in Fireproof database
- Session state is managed in localStorage
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

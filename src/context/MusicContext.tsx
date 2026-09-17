import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { Song, MUSIC_CATALOG } from '../data/musicCatalog';
import { useWellness } from './WellnessContext';
import { getGroqRecommendations } from '../lib/groqApi';

export type PlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'buffering' | 'completed' | 'error';

interface SpotifyArtist {
  name: string;
}

interface SpotifyTrack {
  name: string;
  artists: SpotifyArtist[];
  external_urls?: {
    spotify?: string;
  };
}

interface SpotifySearchResponse {
  tracks?: {
    items?: SpotifyTrack[];
  };
}

interface MusicContextType {
  songs: Song[];
  currentSong: Song | null;
  isPlaying: boolean;
  playerState: PlayerState;
  currentTime: number;
  duration: number;
  volume: number;
  queue: Song[];
  recentlyPlayed: Song[];
  errorMsg: string | null;
  playSong: (song: Song) => void;
  togglePlayPause: () => void;
  nextSong: () => void;
  previousSong: () => void;
  seekTo: (time: number) => void;
  setVolume: (vol: number) => void;
  toggleFavorite: (songId: string) => void;
  addToQueue: (song: Song) => void;
  playNextInQueue: (song: Song) => void;
  retryPlayback: () => void;
  stopPlayback: () => void;
  closePlayer: () => void;
  selectedLanguage: string;
  setSelectedLanguage: (lang: string) => void;
  selectedMood: string;
  setSelectedMood: (mood: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  groqSongs: Song[];
  loadGroqRecommendations: (mood: string) => Promise<void>;
}

const MusicContext = createContext<MusicContextType | undefined>(undefined);

// Reference to maintain a single dedicated Spotify tab across song plays
let spotifyWindow: Window | null = null;

export const MusicProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userData, updateMusicStats } = useWellness();

  const [songs, setSongs] = useState<Song[]>(() => {
    const favIds = userData.musicStats?.favorites || [];
    return MUSIC_CATALOG.map(s => ({ ...s, favorite: favIds.includes(s.id) }));
  });

  const [currentSong, setCurrentSong] = useState<Song | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playerState, setPlayerState] = useState<PlayerState>('idle');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolumeState] = useState<number>(0.8);
  const [queue, setQueue] = useState<Song[]>([]);

  const [recentlyPlayed, setRecentlyPlayed] = useState<Song[]>(() => {
    const recentIds = userData.musicStats?.recentlyPlayed || [];
    return recentIds.map(id => MUSIC_CATALOG.find(s => s.id === id)).filter(Boolean) as Song[];
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [selectedLanguage, setSelectedLanguage] = useState<string>('All');
  const [selectedMood, setSelectedMood] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [groqSongs, setGroqSongs] = useState<Song[]>([]);

  const queueRef = useRef<Song[]>([]);
  const selectedLanguageRef = useRef<string>('All');
  const currentSongRef = useRef<Song | null>(null);
  const songsRef = useRef<Song[]>([]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  useEffect(() => {
    selectedLanguageRef.current = selectedLanguage;
  }, [selectedLanguage]);

  useEffect(() => {
    currentSongRef.current = currentSong;
  }, [currentSong]);

  useEffect(() => {
    songsRef.current = songs;
  }, [songs]);

  // Save favorites
  useEffect(() => {
    const favIds = songs.filter(s => s.favorite).map(s => s.id);
    updateMusicStats({ favorites: favIds });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songs]);

  // Save recently played
  useEffect(() => {
    const recentIds = recentlyPlayed.slice(0, 20).map(s => s.id);
    updateMusicStats({ recentlyPlayed: recentIds, lastPlayedDate: new Date().toISOString() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentlyPlayed]);

  const normalize = (text: string): string => {
    return text.trim().toLowerCase();
  };

  /**
   * Opens or redirects a single dedicated Spotify window/tab.
   * Uses a named target window ('MoodMentorSpotifyPlayer') and window reference.
   * Note: 'noopener' is omitted here because browsers deliberately sever the JS window
   * reference when 'noopener' is present, preventing tab re-use.
   */
  const openOrFocusSpotifyTab = (url: string) => {
    try {
      if (spotifyWindow && !spotifyWindow.closed) {
        spotifyWindow.location.href = url;
        spotifyWindow.focus();
      } else {
        spotifyWindow = window.open(url, 'MoodMentorSpotifyPlayer');
      }
    } catch {
      // Fallback if cross-origin access blocks location modification
      spotifyWindow = window.open(url, 'MoodMentorSpotifyPlayer');
    }
  };

  const loadGroqRecommendations = async (mood: string) => {
    try {
      const data = await getGroqRecommendations(mood, 5);

      const lines = data.recommendations
        .split('\n')
        .map((line: string) => line.trim())
        .filter((line: string) => line);

      const recommendedSongs: Song[] = lines.map(
        (line: string, index: number) => {
          const cleaned = line.replace(/^\d+\.\s*/, '');
          const parts = cleaned.split(' - ');

          const title = parts[0]?.trim() || cleaned;
          const artist = parts.slice(1).join(' - ').trim() || 'Unknown Artist';

          return {
            id: `groq-${Date.now()}-${index}`,
            title,
            artist,
            album: 'Groq AI Recommendation',
            language: 'English',
            mood: mood as Song['mood'],
            duration: '0:00',
            coverUrl:
              'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&q=80',
            audioUrl: '',
            spotifyUrl: `https://open.spotify.com/search/${encodeURIComponent(
              `${title}${artist}`
            )}`,
            favorite: false
          };
        }
      );

      setGroqSongs(recommendedSongs);
    } catch (error) {
      console.error('Groq recommendations error:', error);
      setGroqSongs([]);
    }
  };

  const openSpotifySearchFallback = (song: Song) => {
    const fallbackQuery = encodeURIComponent(`${song.title} ${song.artist}`);
    openOrFocusSpotifyTab(`https://open.spotify.com/search/${fallbackQuery}`);
  };

  const findBestTrackMatch = (tracks: SpotifyTrack[], song: Song): SpotifyTrack | null => {
    const targetTitle = normalize(song.title);
    const targetArtist = normalize(song.artist);

    // Pass 1: Strict match — Exact Title AND Exact Artist
    const exactMatch = tracks.find(track => {
      const trackTitle = normalize(track.name);
      const hasArtistMatch = track.artists?.some(a => normalize(a.name) === targetArtist);
      return trackTitle === targetTitle && hasArtistMatch;
    });

    if (exactMatch) return exactMatch;

    // Pass 2: Partial/Normalized match — Substring Title match AND Exact Artist
    const partialMatch = tracks.find(track => {
      const trackTitle = normalize(track.name);
      const hasArtistMatch = track.artists?.some(a => normalize(a.name) === targetArtist);
      const isTitleRelated = trackTitle.includes(targetTitle) || targetTitle.includes(trackTitle);
      return isTitleRelated && hasArtistMatch;
    });

    return partialMatch || null;
  };

  const openSpotify = async (song: Song) => {
    try {
      const titleQuery = encodeURIComponent(song.title);
      const artistQuery = encodeURIComponent(song.artist);

      const response = await fetch(
        `https://moodmentor-ai.onrender.com/spotify/search?q=${titleQuery}&artist=${artistQuery}`
      );

      if (!response.ok) {
        throw new Error('Spotify search failed');
      }

      const data: SpotifySearchResponse = await response.json();
      const tracks = data.tracks?.items || [];

      const matchedTrack = findBestTrackMatch(tracks, song);

      if (matchedTrack?.external_urls?.spotify) {
        openOrFocusSpotifyTab(matchedTrack.external_urls.spotify);
        return;
      }

      // No reliable match found — fallback to search query
      openSpotifySearchFallback(song);
    } catch (error) {
      console.error('Spotify search error, opening fallback search page:', error);
      openSpotifySearchFallback(song);
    }
  };

  const playSong = (song: Song) => {
    setCurrentSong(song);
    setPlayerState('idle');
    setIsPlaying(false);
    setErrorMsg(null);
    setCurrentTime(0);

    openSpotify(song);

    setRecentlyPlayed(prev => [
      song,
      ...prev.filter(s => s.id !== song.id)
    ]);
  };

  const retryPlayback = () => {
    if (currentSong) {
      playSong(currentSong);
    }
  };

  const togglePlayPause = () => {
    if (!currentSong) return;
    openSpotify(currentSong);
  };

  const seekTo = (time: number) => {
    setCurrentTime(time);
  };

  const setVolume = (vol: number) => {
    setVolumeState(vol);
  };

  const toggleFavorite = (songId: string) => {
    setSongs(prev => prev.map(s => (s.id === songId ? { ...s, favorite: !s.favorite } : s)));
  };

  const addToQueue = (song: Song) => {
    setQueue(prev => [...prev, song]);
  };

  const playNextInQueue = (song: Song) => {
    setQueue(prev => [song, ...prev]);
  };

  const playNextDefault = () => {
    const list = songs.filter(s => selectedLanguage === 'All' || s.language === selectedLanguage);
    if (list.length === 0) return;
    const currentIndex = currentSong ? list.findIndex(s => s.id === currentSong.id) : -1;
    const nextIndex = (currentIndex + 1) % list.length;
    playSong(list[nextIndex]);
  };

  const nextSong = () => {
    if (queue.length > 0) {
      const next = queue[0];
      setQueue(q => q.slice(1));
      playSong(next);
      return;
    }
    playNextDefault();
  };

  const previousSong = () => {
    if (recentlyPlayed.length > 1 && currentSong) {
      const currentIndex = recentlyPlayed.findIndex(s => s.id === currentSong.id);
      if (currentIndex !== -1 && currentIndex + 1 < recentlyPlayed.length) {
        playSong(recentlyPlayed[currentIndex + 1]);
        return;
      }
    }
    if (songs.length > 0) {
      playSong(songs[0]);
    }
  };

  const stopPlayback = () => {
    setIsPlaying(false);
    setPlayerState('idle');
    setCurrentSong(null);
    setCurrentTime(0);
    setErrorMsg(null);
  };

  const closePlayer = () => {
    stopPlayback();
  };

  return (
    <MusicContext.Provider
      value={{
        songs,
        currentSong,
        isPlaying,
        playerState,
        currentTime,
        duration,
        volume,
        queue,
        recentlyPlayed,
        errorMsg,
        playSong,
        togglePlayPause,
        nextSong,
        previousSong,
        seekTo,
        setVolume,
        toggleFavorite,
        addToQueue,
        playNextInQueue,
        retryPlayback,
        stopPlayback,
        closePlayer,
        selectedLanguage,
        setSelectedLanguage,
        selectedMood,
        setSelectedMood,
        searchQuery,
        setSearchQuery,
        groqSongs,
        loadGroqRecommendations
      }}
    >
      {children}
    </MusicContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useMusic = () => {
  const context = useContext(MusicContext);
  if (!context) throw new Error('useMusic must be used within a MusicProvider');
  return context;
};
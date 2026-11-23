import { CONFIG } from './config.js';
import { demoAlbums, demoArtists, demoPlaylists, demoTracks } from './demo-data.js';

const STORAGE_KEYS = Object.freeze({
  favorites: 'melora:favorites',
  playlists: 'melora:playlists',
  history: 'melora:history'
});

function readLocal(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function unwrap(payload, collectionKey) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.[collectionKey])) return payload[collectionKey];
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  return [];
}

export class MusicDB {
  constructor() {
    this.demoMode = CONFIG.DEMO_MODE;
  }

  async request(path, options = {}) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}${path}`, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {})
        }
      });
      const body = response.status === 204 ? null : await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.message || `API error: ${response.status}`);
      }
      return body;
    } finally {
      clearTimeout(timeout);
    }
  }

  async getSongs(query = '') {
    if (!this.demoMode) {
      const suffix = query ? `?q=${encodeURIComponent(query)}` : '';
      return unwrap(await this.request(`/songs${suffix}`), 'songs');
    }
    const keyword = query.trim().toLocaleLowerCase('vi');
    return demoTracks.filter((track) => !keyword ||
      `${track.title} ${track.artist} ${track.album}`.toLocaleLowerCase('vi').includes(keyword));
  }

  async getAlbums() {
    return this.demoMode ? [...demoAlbums] : unwrap(await this.request('/albums'), 'albums');
  }

  async getArtists() {
    return this.demoMode ? [...demoArtists] : unwrap(await this.request('/artists'), 'artists');
  }

  async getPlaylists() {
    if (!this.demoMode) return unwrap(await this.request('/playlists'), 'playlists');
    return readLocal(STORAGE_KEYS.playlists, demoPlaylists.map((item) => ({ ...item, track_ids: [...item.track_ids] })));
  }

  async getFavoriteIds() {
    if (!this.demoMode) {
      const records = unwrap(await this.request('/favorites'), 'favorites');
      return records.map((item) => String(typeof item === 'object' ? (item.song_id ?? item.id) : item));
    }
    return readLocal(STORAGE_KEYS.favorites, ['song-01', 'song-05']);
  }

  async getHistoryIds() {
    if (!this.demoMode) {
      const records = unwrap(await this.request('/listening-history'), 'history');
      return records.map((item) => String(typeof item === 'object' ? (item.song_id ?? item.id) : item));
    }
    return readLocal(STORAGE_KEYS.history, ['song-03', 'song-01', 'song-06']);
  }

  async toggleFavorite(songId, currentlyFavorite) {
    if (!this.demoMode) {
      const id = encodeURIComponent(songId);
      if (currentlyFavorite) await this.request(`/favorites/${id}`, { method: 'DELETE' });
      else await this.request('/favorites', { method: 'POST', body: JSON.stringify({ song_id: Number(songId) }) });
      return !currentlyFavorite;
    }
    const favorites = readLocal(STORAGE_KEYS.favorites, []);
    const next = currentlyFavorite
      ? favorites.filter((id) => String(id) !== String(songId))
      : [...favorites, songId];
    writeLocal(STORAGE_KEYS.favorites, next);
    return !currentlyFavorite;
  }

  async createPlaylist(name) {
    const cleanName = name.trim();
    if (!cleanName) throw new Error('Tên playlist không được để trống.');
    if (!this.demoMode) {
      const payload = await this.request('/playlists', {
        method: 'POST',
        body: JSON.stringify({ name: cleanName })
      });
      return payload?.playlist || payload?.data || payload;
    }
    const playlists = await this.getPlaylists();
    const playlist = {
      id: `pl-${Date.now()}`,
      name: cleanName,
      description: 'Playlist do bạn tạo.',
      track_ids: [],
      cover_url: './assets/covers/cover-06.svg'
    };
    writeLocal(STORAGE_KEYS.playlists, [playlist, ...playlists]);
    return playlist;
  }

  async addSongToPlaylist(playlistId, songId) {
    if (!this.demoMode) {
      await this.request(`/playlists/${encodeURIComponent(playlistId)}/items`, {
        method: 'POST',
        body: JSON.stringify({ song_id: Number(songId) })
      });
      return;
    }
    const playlists = await this.getPlaylists();
    const playlist = playlists.find((item) => String(item.id) === String(playlistId));
    if (!playlist) throw new Error('Không tìm thấy playlist.');
    playlist.track_ids = [...(playlist.track_ids || []), songId];
    writeLocal(STORAGE_KEYS.playlists, playlists);
  }

  async removeSongFromPlaylist(playlistId, songId) {
    if (!this.demoMode) {
      const payload = await this.request(`/playlists/${encodeURIComponent(playlistId)}/items`);
      const items = unwrap(payload, 'items');
      const item = items.find((entry) => String(entry.song_id) === String(songId));
      if (!item) return;
      await this.request(`/playlist-items/${encodeURIComponent(item.playlist_item_id)}`, {
        method: 'DELETE'
      });
      return;
    }
    const playlists = await this.getPlaylists();
    const playlist = playlists.find((item) => String(item.id) === String(playlistId));
    if (!playlist) return;
    const index = (playlist.track_ids || []).findIndex((id) => String(id) === String(songId));
    if (index >= 0) playlist.track_ids.splice(index, 1);
    writeLocal(STORAGE_KEYS.playlists, playlists);
  }

  async recordPlay(songId) {
    if (!this.demoMode) {
      await this.request('/listening-history', {
        method: 'POST',
        body: JSON.stringify({ song_id: Number(songId) })
      });
      return;
    }
    const history = readLocal(STORAGE_KEYS.history, []);
    writeLocal(STORAGE_KEYS.history, [songId, ...history.filter((id) => String(id) !== String(songId))].slice(0, 30));
  }

  async getStreamUrl(song) {
    if (this.demoMode) return song?.audio_url || null;
    const payload = await this.request(`/stream/${encodeURIComponent(song.id)}`);
    return payload?.url || payload?.data?.url || payload?.stream_url || null;
  }
}

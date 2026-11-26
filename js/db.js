import { CONFIG } from './config.js';
import { demoAlbums, demoArtists, demoPlaylists, demoTracks } from './demo-data.js';

const STORAGE_KEYS = Object.freeze({
  favorites: 'melora:favorites',
  playlists: 'melora:playlists',
  history: 'melora:history',
  session: 'melora:auth-session'
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

function readSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEYS.session);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
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

  getSession() {
    return readSession();
  }

  getCurrentUser() {
    return readSession()?.user || null;
  }

  saveSession(session, user = null) {
    if (!session?.access_token || !session?.refresh_token) {
      this.clearSession();
      return;
    }

    const previous = readSession();
    sessionStorage.setItem(STORAGE_KEYS.session, JSON.stringify({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
      expires_at: session.expires_at || null,
      token_type: session.token_type || 'bearer',
      user: user || session.user || previous?.user || null
    }));
  }

  clearSession() {
    sessionStorage.removeItem(STORAGE_KEYS.session);
  }

  async refreshSession() {
    const current = readSession();
    if (!current?.refresh_token) return false;

    const response = await fetch(`${CONFIG.API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: current.refresh_token })
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok || !payload?.session) {
      this.clearSession();
      return false;
    }

    this.saveSession(payload.session, current.user);
    return true;
  }

  async request(path, options = {}, allowRefresh = true) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT_MS);
    try {
      const session = readSession();
      const headers = {
        'Content-Type': 'application/json',
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        ...(options.headers || {})
      };

      const response = await fetch(`${CONFIG.API_BASE_URL}${path}`, {
        ...options,
        signal: controller.signal,
        headers
      });

      if (
        response.status === 401 &&
        allowRefresh &&
        session?.refresh_token &&
        !path.startsWith('/auth/')
      ) {
        clearTimeout(timeout);
        const refreshed = await this.refreshSession();
        if (refreshed) return this.request(path, options, false);
      }

      const body = response.status === 204 ? null : await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.message || `API error: ${response.status}`);
      }
      return body;
    } finally {
      clearTimeout(timeout);
    }
  }

  async restoreAuthUser() {
    if (!readSession()?.access_token) return null;
    try {
      const payload = await this.request('/auth/me');
      const user = payload?.user || null;
      if (user) this.saveSession(readSession(), user);
      return user;
    } catch {
      this.clearSession();
      return null;
    }
  }

  async register({ email, password, username }) {
    const payload = await this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, username })
    });
    if (payload?.session) this.saveSession(payload.session, payload.user);
    return payload;
  }

  async login({ email, password }) {
    const payload = await this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
    if (payload?.session) this.saveSession(payload.session, payload.user);
    return payload;
  }

  async logout() {
    try {
      if (readSession()?.access_token) {
        await this.request('/auth/logout', { method: 'POST' });
      }
    } finally {
      this.clearSession();
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

  async getLeaderboard(limit = 50) {
    const safeLimit = Number.isInteger(Number(limit)) && Number(limit) > 0
      ? Math.min(Number(limit), 100)
      : 50;

    if (this.demoMode) {
      const tracks = await this.getSongs();
      return tracks
        .map((track) => ({
          song_id: track.id,
          title: track.title,
          artist: track.artist,
          duration_seconds: track.duration_seconds ?? track.duration ?? null,
          play_count: Number(track.plays || 0)
        }))
        .sort((a, b) => b.play_count - a.play_count)
        .slice(0, safeLimit)
        .map((item, index) => ({ ...item, rank: index + 1 }));
    }

    const payload = await this.request(`/ranking/leaderboard?limit=${safeLimit}`);
    return Array.isArray(payload?.ranking) ? payload.ranking : [];
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
      if (!readSession()?.access_token) return [];
      const records = unwrap(await this.request('/favorites'), 'favorites');
      return records.map((item) => String(typeof item === 'object' ? (item.song_id ?? item.id) : item));
    }
    return readLocal(STORAGE_KEYS.favorites, ['song-01', 'song-05']);
  }

  async getHistoryIds() {
    if (!this.demoMode) {
      if (!readSession()?.access_token) return [];
      const records = unwrap(await this.request('/listening-history'), 'history');
      return records.map((item) => String(typeof item === 'object' ? (item.song_id ?? item.id) : item));
    }
    return readLocal(STORAGE_KEYS.history, ['song-03', 'song-01', 'song-06']);
  }

  async toggleFavorite(songId, currentlyFavorite) {
    if (!this.demoMode) {
      if (!readSession()?.access_token) throw new Error('Bạn cần đăng nhập để sử dụng danh sách yêu thích.');
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
      if (!readSession()?.access_token) throw new Error('Bạn cần đăng nhập để tạo playlist.');
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

  async deletePlaylist(playlistId) {
    if (!this.demoMode) {
      if (!readSession()?.access_token) throw new Error('Bạn cần đăng nhập để xóa playlist.');
      await this.request(`/playlists/${encodeURIComponent(playlistId)}`, {
        method: 'DELETE'
      });
      return;
    }
    const playlists = await this.getPlaylists();
    const remaining = playlists.filter((playlist) => String(playlist.id) !== String(playlistId));
    if (remaining.length === playlists.length) throw new Error('Không tìm thấy playlist.');
    writeLocal(STORAGE_KEYS.playlists, remaining);
  }

  async addSongToPlaylist(playlistId, songId) {
    if (!this.demoMode) {
      if (!readSession()?.access_token) throw new Error('Bạn cần đăng nhập để chỉnh sửa playlist.');
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
      if (!readSession()?.access_token) throw new Error('Bạn cần đăng nhập để chỉnh sửa playlist.');
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
      if (!readSession()?.access_token) return null;
      const payload = await this.request('/listening-history', {
        method: 'POST',
        body: JSON.stringify({ song_id: Number(songId) })
      });
      return payload?.history || null;
    }
    const history = readLocal(STORAGE_KEYS.history, []);
    writeLocal(STORAGE_KEYS.history, [songId, ...history.filter((id) => String(id) !== String(songId))].slice(0, 30));
    return null;
  }

  async updateListeningProgress(historyId, listenedSeconds, completed = false) {
    if (this.demoMode || !historyId) return null;
    return this.request(`/listening-history/${encodeURIComponent(historyId)}`, {
      method: 'PATCH',
      body: JSON.stringify({
        listened_seconds: listenedSeconds,
        completed
      })
    });
  }

  async getStreamUrl(song) {
    if (this.demoMode) return song?.audio_url || null;
    const payload = await this.request(`/stream/${encodeURIComponent(song.id)}`);
    return payload?.url || payload?.data?.url || payload?.stream_url || null;
  }
}

'use strict';

import { MusicDB } from './db.js';
import { AudioEngine } from './audio-engine.js';
import { fmtTime, escapeHTML, formatCount } from './helpers.js';
import { bindPlayer } from './player.js';

const PAGE_LABELS = {
  songs: 'Khám phá', albums: 'Album', artists: 'Nghệ sĩ',
  playlists: 'Playlist của tôi', favorites: 'Yêu thích', history: 'Nghe gần đây'
};

export class MusicApp {
  constructor() {
    this.db = new MusicDB();
    this.engine = new AudioEngine();
    this.tracks = [];
    this.playlists = [];
    this.albums = [];
    this.artists = [];
    this.favorites = new Set();
    this.history = [];
    this.artCache = new Map();
    this.currentTab = 'songs';
    this.detailView = null; // { type: 'album'|'playlist', key: string|number }
    this._menuTrackId = null;
    this._pendingAddToPlaylist = null;
    this._confirmResolve = null;
    this._pickerPlaylistId = null;
    this._pickerSelected = new Set();
    this._editTrackId = null;
    this._editArtBlob = undefined; // undefined = no change, null = remove, Blob = new artwork
    this._importing = false;
    this.searchTerm = '';
    this.shuffle = false;
    this.repeat = false;
    this.queue = [];
    this._toastTimer = null;
    this.authUser = this.db.getCurrentUser();
    this.authMode = 'login';
    window._app = this;
  }

  /* ----- Helper (bound to instance for player.js) ----- */
  _fmtTime(s) {
    return fmtTime(s);
  }

  async init() {
    this.bindUI();
    bindPlayer(this);
    this.updateAuthButton();
    try {
      const [tracks, albums, artists, playlists, favorites, history] = await Promise.all([
        this.db.getSongs(), this.db.getAlbums(), this.db.getArtists(),
        this.db.getPlaylists(), this.db.getFavoriteIds(), this.db.getHistoryIds()
      ]);
      this.tracks = tracks;
      this.albums = albums;
      this.artists = artists;
      this.playlists = playlists;
      this.favorites = new Set(favorites.map(String));
      this.history = history.map(String);
      this.queue = [...this.tracks];
      this.render();
    } catch (error) {
      document.getElementById('page-content').innerHTML = this.emptyState(
        'Không tải được thư viện', error.message, 'Thử tải lại', 'data-reload'
      );
      document.querySelector('[data-reload]')?.addEventListener('click', () => window.location.reload());
    }
  }

  bindUI() {
    document.querySelectorAll('[data-nav]').forEach((button) => {
      button.addEventListener('click', (event) => {
        event.preventDefault();
        this.navigate(button.dataset.nav);
        document.getElementById('sidebar')?.classList.remove('sidebar-open');
      });
    });

    document.getElementById('global-search')?.addEventListener('input', (event) => {
      this.searchTerm = event.currentTarget.value.trim();
      this.currentTab = 'songs';
      this.detailView = null;
      this.render();
    });

    document.getElementById('mobile-menu')?.addEventListener('click', () => {
      document.getElementById('sidebar')?.classList.toggle('sidebar-open');
    });

    document.getElementById('account-button')?.addEventListener('click', () => this.handleAccountClick());
    document.getElementById('auth-form')?.addEventListener('submit', (event) => this.submitAuth(event));
    document.querySelectorAll('[data-auth-mode]').forEach((button) => {
      button.addEventListener('click', () => this.openAuthModal(button.dataset.authMode));
    });
    document.querySelectorAll('[data-close-auth]').forEach((button) => {
      button.addEventListener('click', () => this.closeAuthModal());
    });
    document.getElementById('auth-modal')?.addEventListener('click', (event) => {
      if (event.target.id === 'auth-modal') this.closeAuthModal();
    });

    document.getElementById('page-content')?.addEventListener('click', (event) => this.handleContentClick(event));

    document.getElementById('confirm-add-playlist')?.addEventListener('click', () => this.confirmAddToPlaylist());
    document.querySelectorAll('[data-close-modal]').forEach((button) => {
      button.addEventListener('click', () => this.closePlaylistModal());
    });
    document.getElementById('playlist-modal')?.addEventListener('click', (event) => {
      if (event.target.id === 'playlist-modal') this.closePlaylistModal();
    });

    window.addEventListener('app:toast', (event) => {
      this.notify(event.detail.message, event.detail.type);
    });

    document.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        document.getElementById('global-search')?.focus();
      }
      if (event.key === 'Escape') this.closePlaylistModal();
    });
  }

  updateAuthButton() {
    const button = document.getElementById('account-button');
    if (!button) return;

    if (this.authUser) {
      const name = this.authUser.user_metadata?.display_name ||
        this.authUser.user_metadata?.username ||
        this.authUser.email ||
        'Tài khoản';
      button.textContent = name.length > 14 ? `${name.slice(0, 12)}…` : name;
      button.title = `Đã đăng nhập: ${this.authUser.email || name}. Nhấn để đăng xuất.`;
      button.classList.add('is-authenticated');
    } else {
      button.textContent = 'Đăng nhập';
      button.title = 'Đăng nhập hoặc tạo tài khoản';
      button.classList.remove('is-authenticated');
    }
  }

  handleAccountClick() {
    if (!this.authUser) {
      this.openAuthModal('login');
      return;
    }

    if (!window.confirm(`Bạn đang đăng nhập bằng ${this.authUser.email || 'tài khoản này'}. Bạn có muốn đăng xuất không?`)) {
      return;
    }

    this.db.logout()
      .then(async () => {
        this.authUser = null;
        if (!this.db.demoMode) {
          this.favorites.clear();
          this.history = [];
          await this.refreshPlaylists();
        }
        this.updateAuthButton();
        this.render();
        this.notify('Đã đăng xuất.');
      })
      .catch((error) => this.notify(error.message, 'error'));
  }

  openAuthModal(mode = 'login') {
    this.authMode = mode === 'register' ? 'register' : 'login';
    const modal = document.getElementById('auth-modal');
    const username = document.getElementById('auth-username-field');
    const title = document.getElementById('auth-title');
    const description = document.getElementById('auth-description');
    const submit = document.getElementById('auth-submit');
    const switchText = document.getElementById('auth-switch-text');

    if (username) username.hidden = this.authMode !== 'register';
    if (title) title.textContent = this.authMode === 'register' ? 'Tạo tài khoản Melora' : 'Chào mừng trở lại';
    if (description) description.textContent = this.authMode === 'register'
      ? 'Đăng ký bằng email để lưu thư viện âm nhạc của bạn.'
      : 'Đăng nhập để truy cập playlist và dữ liệu cá nhân.';
    if (submit) submit.textContent = this.authMode === 'register' ? 'Tạo tài khoản' : 'Đăng nhập';
    if (switchText) switchText.textContent = this.authMode === 'register'
      ? 'Đã có tài khoản?'
      : 'Chưa có tài khoản?';

    document.getElementById('auth-switch')?.setAttribute(
      'data-auth-mode',
      this.authMode === 'register' ? 'login' : 'register'
    );
    const switchButton = document.getElementById('auth-switch');
    if (switchButton) switchButton.textContent = this.authMode === 'register' ? 'Đăng nhập' : 'Đăng ký';

    if (modal) modal.hidden = false;
    document.getElementById('auth-email')?.focus();
  }

  closeAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.hidden = true;
    document.getElementById('auth-form')?.reset();
  }

  async submitAuth(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;
    const username = form.elements.username.value.trim();
    const submit = document.getElementById('auth-submit');

    if (this.authMode === 'register' && !username) {
      this.notify('Hãy nhập tên người dùng.', 'error');
      return;
    }

    if (submit) submit.disabled = true;
    try {
      const result = this.authMode === 'register'
        ? await this.db.register({ email, password, username })
        : await this.db.login({ email, password });

      if (result.session) {
        this.authUser = result.user || this.db.getCurrentUser();
        if (!this.authUser) {
          const me = await this.db.request('/auth/me');
          this.authUser = me.user;
          this.db.saveSession(this.db.getSession(), this.authUser);
        }
        if (!this.db.demoMode) {
          const [favorites, history, playlists] = await Promise.all([
            this.db.getFavoriteIds(),
            this.db.getHistoryIds(),
            this.db.getPlaylists()
          ]);
          this.favorites = new Set(favorites.map(String));
          this.history = history.map(String);
          this.playlists = playlists;
        }
        this.updateAuthButton();
        this.closeAuthModal();
        this.render();
        this.notify(this.authMode === 'register' ? 'Tạo tài khoản thành công.' : 'Đăng nhập thành công.');
      } else {
        this.notify('Đăng ký đã được ghi nhận. Hãy kiểm tra email để xác nhận tài khoản trước khi đăng nhập.');
      }
    } catch (error) {
      this.notify(error.message || 'Không thể xác thực tài khoản.', 'error');
    } finally {
      if (submit) submit.disabled = false;
    }
  }

  navigate(tab) {
    if (!PAGE_LABELS[tab]) return;
    this.currentTab = tab;
    this.detailView = null;
    this.searchTerm = '';
    const search = document.getElementById('global-search');
    if (search) search.value = '';
    this.render();
  }

  async handleContentClick(event) {
    const navButton = event.target.closest('[data-nav]');
    if (navButton) {
      this.navigate(navButton.dataset.nav);
      return;
    }

    const action = event.target.closest('[data-action]');
    if (!action) {
      const card = event.target.closest('[data-open-album], [data-open-playlist]');
      if (card) {
        if (card.dataset.openAlbum) this.openAlbum(card.dataset.openAlbum);
        if (card.dataset.openPlaylist) this.openPlaylist(card.dataset.openPlaylist);
      }
      return;
    }

    const { action: type, id, playlistId } = action.dataset;
    try {
      switch (type) {
        case 'play': await this.playTrack(id); break;
        case 'favorite': await this.toggleFavorite(id); break;
        case 'add-playlist': this.openPlaylistModal(id); break;
        case 'create-playlist': await this.createPlaylistFromPrompt(); break;
        case 'remove-playlist-song':
          await this.db.removeSongFromPlaylist(playlistId, id);
          await this.refreshPlaylists();
          this.render();
          this.notify('Đã xóa bài hát khỏi playlist.');
          break;
        case 'back': this.detailView = null; this.render(); break;
        case 'play-all':
          if (id) {
            let trackIds;
            try { trackIds = JSON.parse(id); }
            catch { trackIds = [id]; }
            if (Array.isArray(trackIds)) await this.playCollection(trackIds);
          }
          break;
      }
    } catch (error) {
      this.notify(error.message || 'Đã xảy ra lỗi.', 'error');
    }
  }

  async refreshPlaylists() {
    this.playlists = await this.db.getPlaylists();
  }

  getTrack(id) {
    return this.tracks.find((track) => String(track.id) === String(id));
  }

  async playTrack(id) {
    const track = this.getTrack(id);
    if (!track) throw new Error('Không tìm thấy bài hát.');
    const streamUrl = await this.db.getStreamUrl(track);
    await this.engine.load(track, streamUrl);
    await this.engine.play();
    this.queue = this.queue.length ? this.queue : [...this.tracks];
    await this.db.recordPlay(track.id);
    this.history = [String(track.id), ...this.history.filter((item) => item !== String(track.id))].slice(0, 30);
    this.updateNowPlaying(track);
    this.render();
  }

  async playCollection(trackIds) {
    const first = this.getTrack(trackIds[0]);
    if (!first) return;
    this.queue = trackIds.map((id) => this.getTrack(id)).filter(Boolean);
    await this.playTrack(first.id);
  }

  async playNext() {
    const currentId = this.engine.currentTrack?.id;
    const collection = this.queue.length ? this.queue : this.tracks;
    if (!collection.length) return;
    let index = collection.findIndex((track) => String(track.id) === String(currentId));
    let nextIndex;
    if (this.shuffle && collection.length > 1) {
      do { nextIndex = Math.floor(Math.random() * collection.length); } while (nextIndex === index);
    } else {
      nextIndex = (index + 1) % collection.length;
    }
    try { await this.playTrack(collection[nextIndex].id); }
    catch (error) { this.notify(error.message, 'error'); }
  }

  async playPrevious() {
    const currentTime = this.engine.getState().currentTime;
    if (currentTime > 3) {
      this.engine.seek(0);
      return;
    }
    const collection = this.queue.length ? this.queue : this.tracks;
    if (!collection.length) return;
    const index = collection.findIndex((track) => String(track.id) === String(this.engine.currentTrack?.id));
    const previousIndex = (index - 1 + collection.length) % collection.length;
    try { await this.playTrack(collection[previousIndex].id); }
    catch (error) { this.notify(error.message, 'error'); }
  }

  async toggleFavorite(id) {
    const key = String(id);
    const currentlyFavorite = this.favorites.has(key);
    await this.db.toggleFavorite(id, currentlyFavorite);
    if (currentlyFavorite) this.favorites.delete(key);
    else this.favorites.add(key);
    this.render();
    if (this.engine.currentTrack && String(this.engine.currentTrack.id) === key) {
      this.updatePlayerFavorite();
    }
    this.notify(currentlyFavorite ? 'Đã bỏ bài hát khỏi yêu thích.' : 'Đã thêm vào danh sách yêu thích.');
  }

  async createPlaylistFromPrompt() {
    const name = window.prompt('Nhập tên playlist mới:');
    if (name === null) return;
    await this.db.createPlaylist(name);
    await this.refreshPlaylists();
    this.currentTab = 'playlists';
    this.detailView = null;
    this.render();
    this.notify('Đã tạo playlist mới.');
  }

  openPlaylistModal(trackId) {
    this._pendingAddToPlaylist = trackId;
    this._pickerPlaylistId = null;
    const choices = document.getElementById('playlist-choices');
    if (!this.playlists.length) {
      choices.innerHTML = '<p class="muted-text">Bạn chưa có playlist. Hãy tạo playlist trước.</p>';
    } else {
      choices.innerHTML = this.playlists.map((playlist) => `
        <label class="playlist-choice">
          <input type="radio" name="playlist-choice" value="${escapeHTML(playlist.id)}" />
          <span class="playlist-choice-cover">♫</span>
          <span><strong>${escapeHTML(playlist.name)}</strong><small>${(playlist.track_ids || []).length} bài hát</small></span>
        </label>`).join('');
      choices.querySelectorAll('input').forEach((input) => {
        input.addEventListener('change', () => { this._pickerPlaylistId = input.value; });
      });
    }
    document.getElementById('playlist-modal').hidden = false;
  }

  closePlaylistModal() {
    const modal = document.getElementById('playlist-modal');
    if (modal) modal.hidden = true;
    this._pendingAddToPlaylist = null;
    this._pickerPlaylistId = null;
  }

  async confirmAddToPlaylist() {
    if (!this._pickerPlaylistId || !this._pendingAddToPlaylist) {
      this.notify('Hãy chọn một playlist.', 'error');
      return;
    }
    try {
      await this.db.addSongToPlaylist(this._pickerPlaylistId, this._pendingAddToPlaylist);
      await this.refreshPlaylists();
      this.closePlaylistModal();
      this.render();
      this.notify('Đã thêm bài hát vào playlist.');
    } catch (error) {
      this.notify(error.message, 'error');
    }
  }

  openAlbum(id) {
    this.detailView = { type: 'album', key: id };
    this.currentTab = 'albums';
    this.render();
  }

  openPlaylist(id) {
    this.detailView = { type: 'playlist', key: id };
    this.currentTab = 'playlists';
    this.render();
  }

  updateNowPlaying(track) {
    document.getElementById('player-title').textContent = track.title;
    document.getElementById('player-artist').textContent = track.artist;
    document.getElementById('player-cover').src = track.cover_url || './assets/covers/cover-01.svg';
    this.updatePlayerFavorite();
  }

  updatePlayerFavorite() {
    const button = document.getElementById('player-favorite');
    const isFavorite = this.engine.currentTrack && this.favorites.has(String(this.engine.currentTrack.id));
    button.textContent = isFavorite ? '♥' : '♡';
    button.classList.toggle('is-favorite', Boolean(isFavorite));
  }

  updatePlayerButtons(isPlaying) {
    const button = document.getElementById('play-button');
    if (!button) return;
    button.textContent = isPlaying ? 'Ⅱ' : '▶';
    button.setAttribute('aria-label', isPlaying ? 'Tạm dừng' : 'Phát nhạc');
  }

  notify(message, type = 'info') {
    const region = document.getElementById('toast-region');
    if (!region) return;
    region.innerHTML = `<div class="toast toast-${type}">${escapeHTML(message)}</div>`;
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => { region.innerHTML = ''; }, 3200);
  }

  render() {
    document.querySelectorAll('[data-nav]').forEach((item) => {
      item.classList.toggle('active', item.dataset.nav === this.currentTab);
    });
    document.getElementById('breadcrumb-current').textContent = PAGE_LABELS[this.currentTab] || 'Khám phá';

    const content = document.getElementById('page-content');
    if (this.detailView?.type === 'album') content.innerHTML = this.renderAlbumDetail();
    else if (this.detailView?.type === 'playlist') content.innerHTML = this.renderPlaylistDetail();
    else if (this.currentTab === 'songs') content.innerHTML = this.renderSongsPage();
    else if (this.currentTab === 'albums') content.innerHTML = this.renderAlbumsPage();
    else if (this.currentTab === 'artists') content.innerHTML = this.renderArtistsPage();
    else if (this.currentTab === 'playlists') content.innerHTML = this.renderPlaylistsPage();
    else if (this.currentTab === 'favorites') content.innerHTML = this.renderTrackCollectionPage('favorites');
    else if (this.currentTab === 'history') content.innerHTML = this.renderTrackCollectionPage('history');
  }

  renderSongsPage() {
    const filtered = this.searchTerm
      ? this.tracks.filter((track) => `${track.title} ${track.artist} ${track.album}`.toLocaleLowerCase('vi').includes(this.searchTerm.toLocaleLowerCase('vi')))
      : this.tracks;
    return `
      <section class="hero-banner">
        <div class="hero-copy">
          <p class="eyebrow eyebrow-light">ÂM NHẠC DÀNH CHO BẠN</p>
          <h1>Mỗi giai điệu<br />là một <em>câu chuyện.</em></h1>
          <p>Khám phá những thanh âm mới và lưu lại khoảnh khắc bạn yêu thích.</p>
          <button class="button button-light" type="button" data-action="play" data-id="${escapeHTML(filtered[0]?.id || '')}">▶ &nbsp; Nghe ngay</button>
        </div>
        <div class="hero-art" aria-hidden="true"><span class="hero-disc"></span><span class="hero-spark spark-one">✦</span><span class="hero-spark spark-two">✧</span></div>
        <div class="hero-index">01 <span>/</span> 03</div>
      </section>
      <div class="section-heading section-heading-spaced">
        <div><p class="eyebrow">DANH SÁCH PHÁT</p><h2>${this.searchTerm ? `Kết quả cho “${escapeHTML(this.searchTerm)}”` : 'Những bài hát nổi bật'}</h2><p class="section-subtitle">${filtered.length} bài hát trong thư viện</p></div>
        <button class="text-button" type="button" data-nav="albums">Khám phá album <span>→</span></button>
      </div>
      ${filtered.length ? this.renderTrackTable(filtered) : this.emptyState('Không tìm thấy bài hát', 'Thử một từ khóa khác nhé.')}
      <div class="section-heading lower-heading"><div><p class="eyebrow">GỢI Ý CHO BẠN</p><h2>Album đáng nghe</h2></div><button class="text-button" type="button" data-nav="albums">Xem tất cả <span>→</span></button></div>
      ${this.renderAlbumCards(this.albums.slice(0, 4))}`;
  }

  renderTrackCollectionPage(type) {
    const ids = type === 'favorites' ? [...this.favorites] : this.history;
    const tracks = ids.map((id) => this.getTrack(id)).filter(Boolean);
    const title = type === 'favorites' ? 'Bài hát bạn yêu thích' : 'Những bài hát đã nghe gần đây';
    return `<div class="page-heading"><div><p class="eyebrow">THƯ VIỆN CỦA BẠN</p><h1>${title}</h1><p>${tracks.length} bài hát</p></div></div>
      ${tracks.length ? this.renderTrackTable(tracks) : this.emptyState('Chưa có bài hát nào', 'Hãy nghe nhạc và lưu lại những bài hát bạn thích.')}`;
  }

  renderAlbumsPage() {
    return `<div class="page-heading"><div><p class="eyebrow">KHÁM PHÁ ÂM NHẠC</p><h1>Album</h1><p>Những bộ sưu tập âm nhạc được tuyển chọn.</p></div></div>${this.renderAlbumCards(this.albums)}`;
  }

  renderArtistsPage() {
    return `<div class="page-heading"><div><p class="eyebrow">GƯƠNG MẶT ÂM NHẠC</p><h1>Nghệ sĩ</h1><p>Gặp gỡ những người đứng sau các giai điệu.</p></div></div>
      <div class="artist-grid">${this.artists.map((artist) => `
        <article class="artist-card"><img src="${escapeHTML(artist.image_url || './assets/covers/cover-01.svg')}" alt="" loading="lazy" /><h3>${escapeHTML(artist.name)}</h3><p>${escapeHTML(artist.bio || 'Nghệ sĩ')}</p><span class="artist-card-decoration">♪</span></article>`).join('')}</div>`;
  }

  renderPlaylistsPage() {
    return `<div class="page-heading"><div><p class="eyebrow">BỘ SƯU TẬP RIÊNG</p><h1>Playlist của tôi</h1><p>Tạo không gian âm nhạc theo cách của bạn.</p></div><button class="button button-primary" data-action="create-playlist" type="button">＋ Tạo playlist</button></div>
      ${this.playlists.length ? `<div class="album-grid">${this.playlists.map((playlist) => this.renderPlaylistCard(playlist)).join('')}</div>` : this.emptyState('Bạn chưa có playlist', 'Tạo playlist đầu tiên để gom những bài hát yêu thích.')}`;
  }

  renderAlbumCards(albums) {
    if (!albums.length) return this.emptyState('Chưa có album', 'Album sẽ xuất hiện tại đây khi thư viện có dữ liệu.');
    return `<div class="album-grid">${albums.map((album) => `
      <article class="album-card" data-open-album="${escapeHTML(album.id)}" tabindex="0" role="button" aria-label="Mở album ${escapeHTML(album.title)}">
        <div class="album-cover-wrap"><img src="${escapeHTML(album.cover_url || './assets/covers/cover-01.svg')}" alt="Bìa ${escapeHTML(album.title)}" loading="lazy" /><span class="cover-play">▶</span></div>
        <h3>${escapeHTML(album.title)}</h3><p>${escapeHTML(album.artist || 'Nhiều nghệ sĩ')} · ${escapeHTML(album.year || '')}</p>
      </article>`).join('')}</div>`;
  }

  renderPlaylistCard(playlist) {
    const coverUrl = playlist.cover_url || './assets/covers/cover-06.svg';
    return `<article class="album-card" data-open-playlist="${escapeHTML(playlist.id)}" tabindex="0" role="button" aria-label="Mở playlist ${escapeHTML(playlist.name)}">
      <div class="album-cover-wrap"><img src="${escapeHTML(coverUrl)}" alt="" loading="lazy" /><span class="cover-play">▶</span></div>
      <h3>${escapeHTML(playlist.name)}</h3><p>${(playlist.track_ids || []).length} bài hát</p>
    </article>`;
  }

  renderTrackTable(tracks, options = {}) {
    const removeFromPlaylist = options.playlistId;
    return `<div class="track-table-wrap"><table class="track-table"><thead><tr><th class="track-number">#</th><th>BÀI HÁT</th><th>ALBUM</th><th>LƯỢT NGHE</th><th class="track-duration">THỜI LƯỢNG</th><th></th></tr></thead><tbody>
      ${tracks.map((track, index) => {
        const favorite = this.favorites.has(String(track.id));
        return `<tr>
          <td class="track-number">${String(index + 1).padStart(2, '0')}</td>
          <td><div class="track-main"><button class="track-cover-button" type="button" data-action="play" data-id="${escapeHTML(track.id)}"><img src="${escapeHTML(track.cover_url || './assets/covers/cover-01.svg')}" alt="" loading="lazy"><span>▶</span></button><div class="track-meta"><button class="track-title-button" type="button" data-action="play" data-id="${escapeHTML(track.id)}">${escapeHTML(track.title)}</button><span>${escapeHTML(track.artist || 'Nghệ sĩ chưa rõ')}</span></div></div></td>
          <td class="album-cell">${escapeHTML(track.album || '—')}</td><td class="plays-cell">${formatCount(track.plays || 0)}</td><td class="track-duration">${track.duration_seconds || track.duration ? fmtTime(track.duration_seconds || track.duration) : '—'}</td>
          <td><div class="track-actions"><button class="row-action ${favorite ? 'is-favorite' : ''}" type="button" data-action="favorite" data-id="${escapeHTML(track.id)}" aria-label="Yêu thích">${favorite ? '♥' : '♡'}</button><button class="row-action" type="button" data-action="add-playlist" data-id="${escapeHTML(track.id)}" aria-label="Thêm vào playlist">＋</button>${removeFromPlaylist ? `<button class="row-action" type="button" data-action="remove-playlist-song" data-id="${escapeHTML(track.id)}" data-playlist-id="${escapeHTML(removeFromPlaylist)}" aria-label="Xóa khỏi playlist">×</button>` : ''}</div></td>
        </tr>`;
      }).join('')}</tbody></table></div>`;
  }

  renderAlbumDetail() {
    const album = this.albums.find((item) => String(item.id) === String(this.detailView.key));
    if (!album) return this.emptyState('Không tìm thấy album', 'Album có thể đã bị xóa.');
    const ids = album.track_ids || this.tracks.filter((track) => String(track.album_id) === String(album.id)).map((track) => track.id);
    const tracks = ids.map((id) => this.getTrack(id)).filter(Boolean);
    return `<button class="back-button" data-action="back" type="button">← Quay lại album</button><section class="detail-hero"><img src="${escapeHTML(album.cover_url || './assets/covers/cover-01.svg')}" alt="" /><div><p class="eyebrow">ALBUM · ${escapeHTML(album.year || '')}</p><h1>${escapeHTML(album.title)}</h1><p>${escapeHTML(album.artist || 'Nhiều nghệ sĩ')} · ${tracks.length} bài hát</p><button class="button button-primary" type="button" data-action="play-all" data-id="${escapeHTML(JSON.stringify(ids))}">▶ Phát album</button></div></section>${tracks.length ? this.renderTrackTable(tracks) : this.emptyState('Album chưa có bài hát', 'Các bài hát sẽ xuất hiện tại đây.')}`;
  }

  renderPlaylistDetail() {
    const playlist = this.playlists.find((item) => String(item.id) === String(this.detailView.key));
    if (!playlist) return this.emptyState('Không tìm thấy playlist', 'Playlist có thể đã bị xóa.');
    const tracks = (playlist.track_ids || []).map((id) => this.getTrack(id)).filter(Boolean);
    return `<button class="back-button" data-action="back" type="button">← Quay lại playlist</button><section class="detail-hero"><img src="${escapeHTML(playlist.cover_url || './assets/covers/cover-06.svg')}" alt="" /><div><p class="eyebrow">PLAYLIST CỦA BẠN</p><h1>${escapeHTML(playlist.name)}</h1><p>${escapeHTML(playlist.description || '')} · ${tracks.length} bài hát</p>${tracks.length ? `<button class="button button-primary" type="button" data-action="play-all" data-id="${escapeHTML(JSON.stringify(playlist.track_ids || []))}">▶ Phát tất cả</button>` : ''}</div></section>${tracks.length ? this.renderTrackTable(tracks, { playlistId: playlist.id }) : this.emptyState('Playlist đang trống', 'Thêm bài hát từ danh sách khám phá.')}`;
  }

  emptyState(title, description, buttonText = '', buttonAttribute = '') {
    return `<div class="empty-state"><span class="empty-state-icon">♫</span><h3>${escapeHTML(title)}</h3><p>${escapeHTML(description)}</p>${buttonText ? `<button class="button button-primary" type="button" ${buttonAttribute}>${escapeHTML(buttonText)}</button>` : ''}</div>`;
  }
}

const app = new MusicApp();
app.init();

export class AudioEngine extends EventTarget {
  constructor() {
    super();
    this.audio = new Audio();
    this.audio.preload = 'metadata';
    this.audio.volume = 0.75;
    this.currentTrack = null;

    ['timeupdate', 'loadedmetadata', 'ended', 'pause', 'play', 'waiting', 'canplay'].forEach((eventName) => {
      this.audio.addEventListener(eventName, () => {
        this.dispatchEvent(new CustomEvent(eventName, { detail: this.getState() }));
      });
    });
    this.audio.addEventListener('error', () => {
      this.dispatchEvent(new CustomEvent('audioerror', {
        detail: { message: 'Không thể tải file âm thanh. Hãy kiểm tra URL hoặc dịch vụ lưu trữ.' }
      }));
    });
  }

  getState() {
    return {
      currentTime: this.audio.currentTime || 0,
      duration: Number.isFinite(this.audio.duration) ? this.audio.duration : 0,
      paused: this.audio.paused,
      volume: this.audio.volume,
      track: this.currentTrack
    };
  }

  async load(track, streamUrl = track?.audio_url) {
    if (!track) throw new Error('Không có bài hát để phát.');
    if (!streamUrl) throw new Error('Bài hát chưa có URL âm thanh.');
    this.currentTrack = track;
    this.audio.pause();
    this.audio.src = streamUrl;
    this.audio.load();
  }

  async play() {
    if (!this.audio.src) throw new Error('Hãy chọn một bài hát trước.');
    await this.audio.play();
  }

  pause() {
    this.audio.pause();
  }

  async toggle() {
    if (this.audio.paused) await this.play();
    else this.pause();
  }

  seek(timeInSeconds) {
    if (!Number.isFinite(this.audio.duration)) return;
    const safeTime = Math.max(0, Math.min(Number(timeInSeconds) || 0, this.audio.duration));
    this.audio.currentTime = safeTime;
  }

  setVolume(volume) {
    this.audio.volume = Math.max(0, Math.min(1, Number(volume) || 0));
  }

  setPlaybackRate(rate) {
    this.audio.playbackRate = Math.max(0.5, Math.min(2, Number(rate) || 1));
  }

  destroy() {
    this.audio.pause();
    this.audio.removeAttribute('src');
    this.audio.load();
  }
}

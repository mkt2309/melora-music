import { fmtTime } from './helpers.js';

export function bindPlayer(app) {
  const byId = (id) => document.getElementById(id);

  const collapseButton = byId('collapse-player-button');
  const expandButton = byId('expand-player-button');

  collapseButton?.addEventListener('click', () => {
    document.body.classList.add('player-hidden');
    if (expandButton) {
      expandButton.hidden = false;
      expandButton.focus();
    }
  });

  expandButton?.addEventListener('click', () => {
    document.body.classList.remove('player-hidden');
    expandButton.hidden = true;
    collapseButton?.focus();
  });

  byId('play-button')?.addEventListener('click', async () => {
    try {
      if (!app.engine.currentTrack) {
        const firstTrack = app.tracks[0];
        if (firstTrack) await app.playTrack(firstTrack.id);
        return;
      }
      await app.engine.toggle();
    } catch (error) {
      app.notify(error.message, 'error');
    }
  });

  byId('previous-button')?.addEventListener('click', () => app.playPrevious());
  byId('next-button')?.addEventListener('click', () => app.playNext());
  byId('shuffle-button')?.addEventListener('click', (event) => {
    app.shuffle = !app.shuffle;
    event.currentTarget.classList.toggle('control-active', app.shuffle);
    app.notify(app.shuffle ? 'Đã bật phát ngẫu nhiên.' : 'Đã tắt phát ngẫu nhiên.');
  });
  byId('repeat-button')?.addEventListener('click', (event) => {
    app.repeat = !app.repeat;
    event.currentTarget.classList.toggle('control-active', app.repeat);
    app.notify(app.repeat ? 'Đã bật lặp lại bài hát.' : 'Đã tắt lặp lại.');
  });

  byId('seek-slider')?.addEventListener('input', (event) => {
    const duration = app.engine.getState().duration;
    if (duration > 0) app.engine.seek((Number(event.currentTarget.value) / 100) * duration);
  });

  byId('volume-slider')?.addEventListener('input', (event) => {
    app.engine.setVolume(event.currentTarget.value);
  });

  byId('player-favorite')?.addEventListener('click', async () => {
    const track = app.engine.currentTrack;
    if (track) await app.toggleFavorite(track.id);
  });

  app.engine.addEventListener('timeupdate', (event) => {
    const { currentTime, duration } = event.detail;
    const slider = byId('seek-slider');
    if (slider && document.activeElement !== slider) {
      slider.value = duration > 0 ? String((currentTime / duration) * 100) : '0';
    }
    byId('current-time').textContent = fmtTime(currentTime);
    byId('duration-time').textContent = fmtTime(duration);
  });

  app.engine.addEventListener('loadedmetadata', (event) => {
    byId('duration-time').textContent = fmtTime(event.detail.duration);
  });

  app.engine.addEventListener('play', () => app.updatePlayerButtons(true));
  app.engine.addEventListener('pause', () => app.updatePlayerButtons(false));
  app.engine.addEventListener('ended', () => {
    if (app.repeat) {
      app.engine.seek(0);
      app.engine.play().catch((error) => app.notify(error.message, 'error'));
    } else {
      app.playNext();
    }
  });
  app.engine.addEventListener('audioerror', (event) => app.notify(event.detail.message, 'error'));
}

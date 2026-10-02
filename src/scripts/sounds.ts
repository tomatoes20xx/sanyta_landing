// One sound preview at a time, played from the list of sound buttons or from
// the phone's own player (SoundScreen.astro), which mirrors the app's Now
// Playing screen: title, artist, colour, moving bars and real progress.
// Tapping the playing sound pauses it, tapping it again resumes; previous /
// next and the seek bar work on the phone. If a preview can't load, the
// status line says so (in-app error tone, §A5).
import sounds from '../data/sounds.generated.json';

const root = document.querySelector<HTMLElement>('[data-sound-preview]');
const np = document.querySelector<HTMLElement>('[data-np]');

if (root) {
  const status = root.querySelector<HTMLElement>('[data-sound-status]');
  const idle = status?.textContent?.trim() ?? '';
  const buttons = new Map([...root.querySelectorAll<HTMLButtonElement>('.snd')].map((b) => [b.dataset.id ?? '', b]));
  const audio = new Audio();
  audio.preload = 'none';

  const part = <T extends Element = HTMLElement>(sel: string) => np?.querySelector<T>(sel) ?? null;
  const seek = part('[data-np-seek]');
  const toggle = part('[data-np-toggle]');
  const pos = part('[data-np-pos]');
  const left = part('[data-np-left]');

  let index = Math.max(0, sounds.findIndex((s) => s.id === np?.dataset.id));
  let loaded = false; // audio.src holds sounds[index]
  let playing = false;
  let frame = 0;

  const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
  const length = () => (Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : sounds[index].seconds);

  const setStatus = (text: string, state: 'idle' | 'error' = 'idle') => {
    if (!status) return;
    status.textContent = text;
    status.dataset.state = state;
  };

  const ring = (i: number, p: number) =>
    buttons.get(sounds[i].id)?.querySelector<HTMLElement>('.ring')?.style.setProperty('--p', String(p));

  // progress on the sound's button and on the phone
  const paint = () => {
    const d = length();
    const t = loaded ? Math.min(audio.currentTime, d) : 0;
    const p = d ? t / d : 0;
    ring(index, p);
    np?.style.setProperty('--p', String(p));
    if (pos) pos.textContent = fmt(t);
    if (left) left.textContent = `-${fmt(Math.max(0, Math.floor(d) - Math.floor(t)))}`;
    seek?.setAttribute('aria-valuenow', String(Math.floor(t)));
    seek?.setAttribute('aria-valuemax', String(Math.floor(d)));
    seek?.setAttribute('aria-valuetext', fmt(t));
  };
  const tick = () => {
    paint();
    frame = requestAnimationFrame(tick);
  };

  const setPlaying = (on: boolean) => {
    playing = on;
    buttons.get(sounds[index].id)?.setAttribute('aria-pressed', String(on));
    np?.toggleAttribute('data-playing', on);
    toggle?.setAttribute('aria-label', on ? 'შეაჩერე' : 'ჩართე');
    cancelAnimationFrame(frame);
    if (on) tick();
    else paint();
  };

  // put sound i on the phone
  const show = (i: number) => {
    const s = sounds[i];
    if (!np) return;
    np.dataset.id = s.id;
    np.dataset.tab = s.tab;
    const text: [string, string][] = [
      ['[data-np-title]', s.title],
      ['[data-np-artist]', s.artist],
      ['[data-np-desc]', s.desc],
      ['[data-np-tab]', s.tab === 'music' ? 'იავნანა' : 'თეთრი ხმაური'],
    ];
    for (const [sel, value] of text) {
      const el = part(sel);
      if (el) el.textContent = value;
    }
    np.querySelectorAll<HTMLElement>('[data-np-glyph]').forEach((g) => (g.hidden = g.dataset.npGlyph !== s.id));
  };

  const load = () => {
    if (loaded) return;
    audio.src = sounds[index].src;
    loaded = true;
  };

  const play = () => {
    load();
    setStatus(idle);
    setPlaying(true);
    audio.play().catch((e: DOMException) => {
      if (e.name === 'AbortError') return; // another sound took over first
      audio.pause();
      loaded = false;
      setPlaying(false);
      ring(index, 0);
      setStatus('ხმა ვერ ჩაიტვირთა. შეამოწმე ინტერნეტი და სცადე თავიდან.', 'error');
    });
  };

  const pause = () => {
    audio.pause();
    setPlaying(false);
  };

  // switch to sound i and play it from the start
  const select = (i: number) => {
    audio.pause();
    setPlaying(false);
    ring(index, 0);
    index = (i + sounds.length) % sounds.length;
    loaded = false;
    show(index);
    paint();
    play();
  };

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const i = sounds.findIndex((s) => s.id === btn.dataset.id);
      if (i !== index) select(i);
      else if (playing) pause();
      else play();
    });
  });

  toggle?.addEventListener('click', () => (playing ? pause() : play()));
  part('[data-np-prev]')?.addEventListener('click', () => select(index - 1));
  part('[data-np-next]')?.addEventListener('click', () => select(index + 1));

  if (seek) {
    const seekTo = (seconds: number) => {
      load();
      audio.currentTime = Math.min(Math.max(seconds, 0), length());
      paint();
    };
    const fromPointer = (x: number) => {
      const r = seek.getBoundingClientRect();
      seekTo(((x - r.left) / r.width) * length());
    };
    seek.addEventListener('pointerdown', (e) => {
      seek.setPointerCapture(e.pointerId);
      fromPointer(e.clientX);
    });
    seek.addEventListener('pointermove', (e) => {
      if (seek.hasPointerCapture(e.pointerId)) fromPointer(e.clientX);
    });
    seek.addEventListener('keydown', (e) => {
      const t = loaded ? audio.currentTime : 0;
      const to = { ArrowRight: t + 1, ArrowUp: t + 1, ArrowLeft: t - 1, ArrowDown: t - 1, Home: 0, End: length() }[e.key];
      if (to === undefined) return;
      e.preventDefault();
      seekTo(to);
    });
  }

  audio.addEventListener('ended', () => {
    audio.currentTime = 0;
    setPlaying(false);
  });
  // keep in step when the browser or a media key pauses / resumes; the
  // events arrive late, so check the element's real state (a switch to
  // another sound has usually started it again by then)
  audio.addEventListener('pause', () => {
    if (playing && audio.paused && !audio.ended) setPlaying(false);
  });
  audio.addEventListener('play', () => {
    if (!playing && !audio.paused) setPlaying(true);
  });

  // Don't keep playing on a hidden tab.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && playing) pause();
  });
}

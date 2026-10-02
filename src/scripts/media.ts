// Phones that move: screen recordings and the growth chart's line.
// Each plays once when its section scrolls into view, then waits on its last
// frame with a replay button; two phones in one section take turns
// (data-order), and the one about to play swaps to the front first. The
// button on each phone pauses, resumes and replays (WCAG 2.2.2). Leaving the
// view pauses; coming back resumes. With reduced motion nothing starts by
// itself: recordings wait on their first frame and the growth line shows
// drawn.

type State = 'idle' | 'playing' | 'paused' | 'ended';

const LABEL: Record<State, string> = {
  idle: 'ჩართე',
  playing: 'შეაჩერე',
  paused: 'გააგრძელე',
  ended: 'თავიდან ჩართე',
};

const still = matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window);

class Player {
  state: State = 'idle';
  autoPaused = false;
  onEnd: (() => void) | null = null;
  /** brings this phone in front of its partner before it plays */
  raise: (() => Promise<void>) | null = null;
  private video: HTMLVideoElement | null;
  private anim: Element | null;

  constructor(
    readonly phone: HTMLElement,
    private btn: HTMLButtonElement,
  ) {
    this.video = phone.querySelector('video[data-media-video]');
    this.anim = phone.querySelector('[data-media-anim]');
    this.video?.addEventListener('ended', () => this.finish());
    const dots = this.anim?.querySelectorAll('.dot');
    dots?.[dots.length - 1]?.addEventListener('animationend', () => this.finish());
    btn.addEventListener('click', () => {
      this.autoPaused = false; // a tap takes over from scrolling
      if (this.state === 'playing') this.pause();
      else this.play();
    });
    btn.hidden = false;
    this.set(still && this.anim ? 'ended' : 'idle');
  }

  private set(s: State) {
    this.state = s;
    this.phone.dataset.state = s;
    this.btn.setAttribute('aria-label', LABEL[s]);
  }

  async play() {
    const from = this.state;
    await this.raise?.();
    if (this.video) {
      if (from === 'ended') this.video.currentTime = 0;
      this.set('playing');
      // blocked autoplay (e.g. iOS Low Power Mode): wait for a tap
      this.video.play().catch(() => this.set('paused'));
    } else {
      if (from !== 'paused') {
        this.set('idle'); // drop the animation so it starts over
        void this.phone.offsetWidth;
      }
      this.set('playing');
    }
  }

  pause() {
    if (this.state !== 'playing') return;
    this.video?.pause();
    this.set('paused');
  }

  preload() {
    if (this.video?.preload === 'none') {
      this.video.preload = 'auto';
      this.video.load();
    }
  }

  private finish() {
    this.set('ended');
    const next = this.onEnd;
    this.onEnd = null;
    next?.();
  }
}

const SWAP_HALF = 380; // ms: slide apart, change depth, slide back
const SWAP_EASE = 'cubic-bezier(0.65, 0, 0.35, 1)';

// Overlapped phones: `phone` comes forward, its partner sinks back. Both
// slide out to their own side (just clear of the overlap), trade depth at
// the widest point, and settle back into place.
function pairSwap(phones: HTMLElement[]) {
  const setFront = (front: HTMLElement) => phones.forEach((p) => p.toggleAttribute('data-front', p === front));
  setFront(phones.find((p) => p.classList.contains('front')) ?? phones[0]);

  return (phone: HTMLElement) => async () => {
    if (phone.hasAttribute('data-front')) return;
    const other = phones.find((p) => p !== phone)!;
    if (still) return setFront(phone);
    const a = phone.getBoundingClientRect();
    const b = other.getBoundingClientRect();
    const side = a.left + a.width / 2 < b.left + b.width / 2 ? -1 : 1;
    const dx = a.width * 0.09;
    const up = `translateX(${side * dx}px) scale(1.03)`;
    const down = `translateX(${-side * dx}px) scale(0.94)`;
    const half = { duration: SWAP_HALF, easing: SWAP_EASE, fill: 'forwards' as const };
    const out = [phone.animate([{ transform: 'none' }, { transform: up }], half), other.animate([{ transform: 'none' }, { transform: down }], half)];
    await Promise.all(out.map((x) => x.finished));
    setFront(phone);
    const back = [phone.animate([{ transform: up }, { transform: 'none' }], half), other.animate([{ transform: down }, { transform: 'none' }], half)];
    await Promise.all(back.map((x) => x.finished));
    [...out, ...back].forEach((x) => x.cancel());
  };
}

for (const group of document.querySelectorAll<HTMLElement>('[data-media-group]')) {
  const players = [...group.querySelectorAll<HTMLElement>('[data-media]')]
    .sort((a, b) => Number(a.dataset.order ?? 0) - Number(b.dataset.order ?? 0))
    .map((phone) => new Player(phone, phone.querySelector<HTMLButtonElement>('[data-media-btn]')!));
  if (group.classList.contains('pair') && players.length === 2) {
    const raiser = pairSwap(players.map((p) => p.phone));
    players.forEach((p) => {
      const other = players.find((o) => o !== p)!;
      const swap = raiser(p.phone);
      p.raise = () => {
        other.pause(); // only the phone in front moves
        return swap();
      };
    });
  }
  if (still) continue;

  let visible = false;
  let started = false;
  let pending: number | null = null;

  // play players[i], then the next one when it ends; skip any the visitor
  // already started by hand
  const run = (i: number) => {
    if (i >= players.length) return;
    if (!visible) {
      pending = i;
      return;
    }
    const p = players[i];
    if (p.state !== 'idle') return run(i + 1);
    p.onEnd = () => run(i + 1);
    p.play();
  };

  const near = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        players.forEach((p) => p.preload());
        near.disconnect();
      }
    },
    { rootMargin: '0px 0px 75% 0px' },
  );
  near.observe(group);

  new IntersectionObserver(
    ([e]) => {
      visible = e.isIntersecting;
      if (visible) {
        if (!started) {
          started = true;
          setTimeout(() => run(0), 350); // let the reveal settle first
        } else if (pending !== null) {
          const i = pending;
          pending = null;
          run(i);
        }
        players.forEach((p) => {
          if (p.autoPaused) {
            p.autoPaused = false;
            p.play();
          }
        });
      } else {
        players.forEach((p) => {
          if (p.state === 'playing') {
            p.pause();
            p.autoPaused = true;
          }
        });
      }
    },
    { threshold: 0.4 },
  ).observe(group);
}

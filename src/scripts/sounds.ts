// Plays one sound preview at a time; tapping the playing sound stops it.
// If a preview can't load, the status line says so (in-app error tone, §A5).
const root = document.querySelector<HTMLElement>('[data-sound-preview]');

if (root) {
  const status = root.querySelector<HTMLElement>('[data-sound-status]');
  const idle = status?.textContent?.trim() ?? '';
  const audio = new Audio();
  audio.preload = 'none';
  let current: HTMLButtonElement | null = null;

  const setStatus = (text: string, state: 'idle' | 'error' = 'idle') => {
    if (!status) return;
    status.textContent = text;
    status.dataset.state = state;
  };

  const setProgress = (btn: HTMLButtonElement | null, p: number) => {
    btn?.querySelector<HTMLElement>('.ring')?.style.setProperty('--p', String(p));
  };

  const stop = () => {
    audio.pause();
    if (current) {
      current.setAttribute('aria-pressed', 'false');
      setProgress(current, 0);
    }
    current = null;
  };

  root.querySelectorAll<HTMLButtonElement>('.snd').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (current === btn) {
        stop();
        return;
      }
      stop();
      setStatus(idle);
      current = btn;
      btn.setAttribute('aria-pressed', 'true');
      audio.src = btn.dataset.src ?? '';
      audio.currentTime = 0;
      audio.play().catch(() => {
        stop();
        setStatus('ხმა ვერ ჩაიტვირთა. შეამოწმე ინტერნეტი და სცადე თავიდან.', 'error');
      });
    });
  });

  audio.addEventListener('timeupdate', () => {
    if (current && audio.duration) setProgress(current, audio.currentTime / audio.duration);
  });
  audio.addEventListener('ended', stop);

  // Don't keep playing on a hidden tab.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
  });
}

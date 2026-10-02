"""Build the site's images, sound previews and OG card from the app's assets.

Run from the repo root after changing any source asset (e.g. fresh screenshots):

    python tools/prepare_assets.py

Sources live outside this repo, in the Sanyta project folder:
    ../../App Assets/...                      screenshots, onboarding art, sounds
    ../children_health_app/assets/...         activity data, partner logo

Dark screenshots: put them in "App Assets/UI Screens/dark/" with the same file
names as the light ones; the phone mockups switch to them in dark mode.

Screen recordings (iPhone, light mode) live in "App Assets/UI Screens/Videos";
CLIPS below says which parts of each one the site plays.

Needs Pillow. Sound previews and clips need ffmpeg: on PATH, FFMPEG=<path>,
or the one that comes with the imageio-ffmpeg Python package (clips need its
xfade and loop filters, which the ffmpeg bundled with Remotion lacks).
Writes into public/ and src/data/*.generated.json (both are committed).
"""

from __future__ import annotations

import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
PROJECT = ROOT.parent.parent
ASSETS = PROJECT / 'App Assets'
APP = ROOT.parent / 'children_health_app'
PUBLIC = ROOT / 'public'
DATA = ROOT / 'src' / 'data'

# name on the site -> screenshot file in "App Assets/UI Screens"
SCREENS = {
    'home': 'home.png',
    'diary': 'tracking home.png',
    'diary-history': 'tracking history.png',
    'sounds': 'sound player.png',
    'sounds-list': 'sounds.png',
    'development': 'development.png',
    'recipes': 'recipes.png',
    'growth': 'growth chart.png',  # empty chart: the site draws the child's line (GrowthLine.astro)
    'vaccines': 'vaccines.png',
    'calendar': 'calendar.png',
    'moments': 'milestones.png',
    'profile': 'child profile.png',
}

# iPhone screenshots that still carry the status bar (older ones were cropped by hand)
WITH_STATUS_BAR = {'growth chart.png'}

# name on the site -> (recording in "App Assets/UI Screens/Videos", spans).
# Spans are (start, end) in source seconds, joined by a hard cut where the
# screen is still, or by a short crossfade where 'fade' sits between them.
# The fades skip system screens that show in English (the time-picker dialog,
# the iOS photo picker, the emoji keyboard). A third number freezes the
# span's last frame for that many seconds.
CLIPS: dict[str, tuple[str, list]] = {
    'development': ('articles.mp4', [(7.0, 9.4), (10.4, 13.0), (14.6, 16.2)]),
    'recipes': ('recipes.mp4', [(1.6, 6.9), (7.5, 13.9)]),
    'vaccines': ('vaccines.mp4', [(0.6, 8.6)]),
    'calendar': ('calendar.mp4', [(3.0, 6.3), 'fade', (9.7, 14.0)]),
    'moments': ('moments.mp4', [(1.6, 5.0), 'fade', (7.9, 8.8, 0.5), 'fade', (13.3, 15.6)]),
}

# name on the site -> onboarding art in "App Assets/Onboarding Assets"
ART: dict[str, str] = {}  # onboarding art used on the site (none at the moment)

SCREEN_W = 600      # 2x a ~300px phone
ART_W = 720
ART_W_OVERRIDES: dict[str, int] = {}
PREVIEW_SECONDS = 20
CLIP_W = 592        # the recordings' own width, ~2x a phone on the page
CLIP_FPS = 30
CLIP_FADE = 0.3
STATUS_BAR = 64 / 592  # iPhone status bar height as a share of the screen width


def save_webp(im: Image.Image, dest: Path, quality: int = 82) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, 'WEBP', quality=quality, method=6)


def fit_width(im: Image.Image, width: int) -> Image.Image:
    if im.width <= width:
        return im
    return im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)


def open_screen(path: Path) -> Image.Image:
    im = Image.open(path).convert('RGB')
    if path.name in WITH_STATUS_BAR:
        im = im.crop((0, round(im.width * STATUS_BAR), im.width, im.height))
    return fit_width(im, SCREEN_W)


def build_screens() -> dict:
    out = {}
    src_dir = ASSETS / 'UI Screens'
    for name, file in SCREENS.items():
        light = src_dir / file
        if not light.exists():
            print(f'  ! missing screenshot {light}')
            continue
        im = open_screen(light)
        save_webp(im, PUBLIC / 'screens' / f'{name}.webp')
        entry = {'light': f'/screens/{name}.webp', 'dark': None, 'w': im.width, 'h': im.height}
        dark = src_dir / 'dark' / file
        if dark.exists():
            dim = open_screen(dark)
            save_webp(dim, PUBLIC / 'screens' / f'{name}-dark.webp')
            entry['dark'] = f'/screens/{name}-dark.webp'
        out[name] = entry
    print(f'  screens: {len(out)}')
    return out


def build_art() -> None:
    src_dir = ASSETS / 'Onboarding Assets'
    for name, file in ART.items():
        im = Image.open(src_dir / file).convert('RGBA')
        save_webp(fit_width(im, ART_W_OVERRIDES.get(name, ART_W)), PUBLIC / 'art' / f'{name}.webp')
    logo = APP / 'assets' / 'images' / 'firstaid_logo.png'
    save_webp(fit_width(Image.open(logo).convert('RGBA'), 360), PUBLIC / 'partners' / 'first-aid-skillhub.webp')
    print(f'  art: {len(ART)} + partner logo')


def ffmpeg_candidates() -> list[str]:
    found = [os.environ.get('FFMPEG'), shutil.which('ffmpeg')]
    try:
        import imageio_ffmpeg
        found.append(imageio_ffmpeg.get_ffmpeg_exe())
    except Exception:
        pass
    # The promo-video project ships one with Remotion.
    found.append(str(PROJECT / 'Marketing' / 'Promo Video' / 'source' / 'node_modules' / '@remotion' / 'compositor-win32-x64-msvc' / 'ffmpeg.exe'))
    return [f for f in found if f and Path(f).exists()]


def find_ffmpeg(filters: tuple[str, ...] = ()) -> str | None:
    """The first ffmpeg that has every filter in `filters`."""
    for exe in ffmpeg_candidates():
        if not filters:
            return exe
        listing = subprocess.run([exe, '-hide_banner', '-filters'], capture_output=True, text=True).stdout
        names = {line.split()[1] for line in listing.splitlines() if len(line.split()) > 2}
        if all(f in names for f in filters):
            return exe
    return None


def build_sounds() -> list:
    sounds = json.loads((APP / 'assets' / 'data' / 'sounds.json').read_text(encoding='utf-8'))
    ffmpeg = find_ffmpeg()
    out = []
    for s in sounds:
        src = ASSETS / 'Sounds' / Path(s['asset']).name
        dest = PUBLIC / 'sounds' / f"{s['id']}.mp3"
        # re-encode only when the source sound is newer than its preview
        fresh = dest.exists() and src.exists() and dest.stat().st_mtime >= src.stat().st_mtime
        if ffmpeg and src.exists() and not fresh:
            dest.parent.mkdir(parents=True, exist_ok=True)
            fade_out_at = PREVIEW_SECONDS - 2
            subprocess.run(
                [ffmpeg, '-y', '-loglevel', 'error', '-i', str(src), '-t', str(PREVIEW_SECONDS),
                 # fades via a volume expression: the ffmpeg bundled with Remotion has no afade
                 '-af', f"volume='if(lt(t,0.6),t/0.6,if(gt(t,{fade_out_at}),max(0,({PREVIEW_SECONDS}-t)/2),1))':eval=frame",
                 '-ac', '1', '-b:a', '64k', str(dest)],
                check=True,
            )
        elif not dest.exists():
            print(f'  ! no preview for {s["id"]} (ffmpeg missing or source not found)')
            continue
        out.append({
            'id': s['id'], 'tab': s['tab'], 'title': s['title'], 'artist': s['artist'], 'desc': s['desc'].strip(),
            'glyph': s['glyph'], 'src': f"/sounds/{s['id']}.mp3", 'seconds': min(PREVIEW_SECONDS, s['durationSeconds']),
        })
    print(f'  sounds: {len(out)}' + ('' if ffmpeg else ' (reused existing previews)'))
    return out


def clip_graph(spans: list) -> tuple[str, float]:
    """ffmpeg filter graph that cuts `spans` out of one recording and joins
    them; returns the graph and the clip's length in seconds."""
    top = round(CLIP_W * STATUS_BAR)
    segs = [s for s in spans if s != 'fade']
    lengths = [s[1] - s[0] + (s[2] if len(s) > 2 else 0) for s in segs]
    graph = [
        f'[0:v]fps={CLIP_FPS},scale={CLIP_W}:-2:flags=lanczos:out_range=tv,'
        f'crop={CLIP_W}:trunc((ih-{top})/2)*2:0:{top},setsar=1,split={len(segs)}'
        + ''.join(f'[s{i}]' for i in range(len(segs)))
    ]
    for i, s in enumerate(segs):
        f = f'[s{i}]trim=start={s[0]}:end={s[1]},setpts=PTS-STARTPTS'
        if len(s) > 2:
            # repeat the last frame (tpad never sees the end of a trimmed span)
            last = round((s[1] - s[0]) * CLIP_FPS) - 1
            f += f',loop=loop={round(s[2] * CLIP_FPS)}:size=1:start={last},setpts=N/{CLIP_FPS}/TB'
        graph.append(f + f',fps={CLIP_FPS}[v{i}]')  # xfade wants a constant rate
    acc, total, i, fade = 'v0', lengths[0], 0, False
    for item in spans[1:]:
        if item == 'fade':
            fade = True
            continue
        i += 1
        if fade:
            graph.append(f'[{acc}][v{i}]xfade=transition=fade:duration={CLIP_FADE}:offset={total - CLIP_FADE:.3f}[j{i}]')
            total += lengths[i] - CLIP_FADE
        else:
            graph.append(f'[{acc}][v{i}]concat=n=2:v=1:a=0[j{i}]')
            total += lengths[i]
        acc, fade = f'j{i}', False
    graph.append(f'[{acc}]format=yuv420p[out]')
    return ';'.join(graph), total


def build_clips() -> dict:
    """Muted H.264 clips for the phone mockups, plus a poster (the first
    frame) that shows until a clip plays."""
    ffmpeg = find_ffmpeg(('xfade', 'loop'))
    src_dir = ASSETS / 'UI Screens' / 'Videos'
    out_dir = PUBLIC / 'clips'
    previous = {}
    generated = DATA / 'clips.generated.json'
    if generated.exists():
        previous = json.loads(generated.read_text(encoding='utf-8'))
    out = {}
    for name, (file, spans) in CLIPS.items():
        src = src_dir / file
        video, poster = out_dir / f'{name}.mp4', out_dir / f'{name}.webp'
        if not (ffmpeg and src.exists()):
            if name in previous and video.exists() and poster.exists():
                out[name] = previous[name]
            else:
                print(f'  ! no clip for {name} (ffmpeg with xfade missing or {src} not found)')
            continue
        out_dir.mkdir(parents=True, exist_ok=True)
        graph, length = clip_graph(spans)
        # H.264 plays everywhere. CRF 28 keeps small Georgian text as sharp as
        # the recordings themselves (they are already compressed by iCloud).
        subprocess.run(
            [ffmpeg, '-y', '-loglevel', 'error', '-i', str(src), '-filter_complex', graph, '-map', '[out]', '-an',
             '-c:v', 'libx264', '-preset', 'slow', '-crf', '28', '-tune', 'film', '-profile:v', 'high',
             '-color_range', 'tv', '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
             '-movflags', '+faststart', str(video)],
            check=True,
        )
        frame = out_dir / f'{name}.png'
        subprocess.run([ffmpeg, '-y', '-loglevel', 'error', '-i', str(video), '-frames:v', '1', str(frame)], check=True)
        im = Image.open(frame).convert('RGB')
        save_webp(im, poster)
        im.close()
        frame.unlink()
        out[name] = {
            'light': {'src': f'/clips/{name}.mp4', 'poster': f'/clips/{name}.webp'},
            'dark': None,
            'w': im.width,
            'h': im.height,
            'seconds': round(length, 2),
        }
    print(f'  clips: {len(out)}' + ('' if ffmpeg else ' (reused existing clips)'))
    return out


def font(path: str, size: int, weight: int) -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(str(ROOT / 'node_modules' / path), size)
    f.set_variation_by_axes([weight])
    return f


def is_georgian(ch: str) -> bool:
    cp = ord(ch)
    return 0x10A0 <= cp <= 0x10FF or 0x1C90 <= cp <= 0x1CBF or 0x2D00 <= cp <= 0x2D2F


def draw_mixed(d: ImageDraw.ImageDraw, xy: tuple[int, int], text: str, size: int, weight: int, fill) -> None:
    """Georgian runs in Noto Sans Georgian, everything else in Montserrat —
    the same fallback the site's CSS font stack gives. Spaces join the run
    they sit in."""
    geo = font('@fontsource-variable/noto-sans-georgian/files/noto-sans-georgian-georgian-wght-normal.woff2', size, weight)
    lat = font('@fontsource-variable/montserrat/files/montserrat-latin-wght-normal.woff2', size, weight)
    runs: list[tuple[bool, str]] = []
    for ch in text:
        g = runs[-1][0] if (ch == ' ' and runs) else is_georgian(ch)
        if runs and runs[-1][0] == g:
            runs[-1] = (g, runs[-1][1] + ch)
        else:
            runs.append((g, ch))
    x, y = xy
    for g, run in runs:
        f = geo if g else lat
        d.text((x, y), run, font=f, fill=fill)
        x += d.textlength(run, font=f)


def build_og() -> None:
    """1200x630 share card: pale dawn sky, hills, the welcome art, the positioning line."""
    W, H = 1200, 630
    sky = Image.new('RGB', (W, H))
    top, bottom = (255, 246, 236), (243, 228, 250)
    d = ImageDraw.Draw(sky)
    for y in range(H):
        t = y / H
        d.line([(0, y), (W, y)], fill=tuple(round(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    d.ellipse((-260, 470, 640, 940), fill=(231, 211, 243))
    d.ellipse((380, 500, 1500, 1040), fill=(245, 201, 192))

    art = Image.open(ASSETS / 'Onboarding Assets' / 'welcome_hero.png').convert('RGB')
    ah = 600
    art = art.resize((round(art.width * ah / art.height), ah), Image.LANCZOS)
    mask = Image.new('L', art.size, 0)
    ImageDraw.Draw(mask).ellipse((20, 10, art.width - 20, art.height + 140), fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(30))
    sky.paste(art, (W - art.width - 30, 40), mask)
    d.ellipse((-100, 560, 1400, 1120), fill=(255, 246, 236))

    icon = Image.open(ASSETS / 'Icons' / 'ios' / 'AppIcon~ios-marketing.png').convert('RGBA').resize((84, 84), Image.LANCZOS)
    m = Image.new('L', icon.size, 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, 83, 83), 20, fill=255)
    sky.paste(icon, (80, 88), m)

    ink, lav, sub = (45, 45, 62), (155, 127, 212), (107, 107, 128)
    draw_mixed(d, (184, 104), 'Sanyta', 48, 800, ink)
    draw_mixed(d, (80, 232), 'სანდო თანამგზავრი', 50, 800, ink)
    draw_mixed(d, (80, 302), 'ბავშვის პირველი', 50, 800, lav)
    draw_mixed(d, (80, 372), '3 წლისთვის', 50, 800, lav)
    draw_mixed(d, (80, 476), 'ჯანსაღი ბავშვი. მშვიდი მშობელი.', 28, 600, sub)

    sky.save(PUBLIC / 'og.png', optimize=True)
    print('  og.png')


def main() -> int:
    if not ASSETS.exists():
        print(f'App Assets not found at {ASSETS}')
        return 1
    print('Preparing site assets…')
    screens = build_screens()
    build_art()
    sounds = build_sounds()
    clips = build_clips()
    build_og()
    DATA.mkdir(parents=True, exist_ok=True)
    (DATA / 'screens.generated.json').write_text(json.dumps(screens, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (DATA / 'sounds.generated.json').write_text(json.dumps(sounds, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (DATA / 'clips.generated.json').write_text(json.dumps(clips, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Done.')
    return 0


if __name__ == '__main__':
    sys.exit(main())

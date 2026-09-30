"""Build the site's images, sound previews and OG card from the app's assets.

Run from the repo root after changing any source asset (e.g. fresh screenshots):

    python tools/prepare_assets.py

Sources live outside this repo, in the Sanyta project folder:
    ../../App Assets/...                      screenshots, onboarding art, sounds
    ../children_health_app/assets/...         activity data, partner logo

Dark screenshots: put them in "App Assets/UI Screens/dark/" with the same file
names as the light ones; the phone mockups switch to them in dark mode.

Needs Pillow. Sound previews need ffmpeg: on PATH, or set FFMPEG=<path>.
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
    'growth': 'growth.png',
    'vaccines': 'vaccines.png',
    'calendar': 'calendar.png',
    'moments': 'milestones.png',
    'profile': 'child profile.png',
}

# name on the site -> onboarding art in "App Assets/Onboarding Assets"
ART: dict[str, str] = {}  # onboarding art used on the site (none at the moment)

SCREEN_W = 600      # 2x a ~300px phone
ART_W = 720
ART_W_OVERRIDES: dict[str, int] = {}
PREVIEW_SECONDS = 20


def save_webp(im: Image.Image, dest: Path, quality: int = 82) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    im.save(dest, 'WEBP', quality=quality, method=6)


def fit_width(im: Image.Image, width: int) -> Image.Image:
    if im.width <= width:
        return im
    return im.resize((width, round(im.height * width / im.width)), Image.LANCZOS)


def build_screens() -> dict:
    out = {}
    src_dir = ASSETS / 'UI Screens'
    for name, file in SCREENS.items():
        light = src_dir / file
        if not light.exists():
            print(f'  ! missing screenshot {light}')
            continue
        im = fit_width(Image.open(light).convert('RGB'), SCREEN_W)
        save_webp(im, PUBLIC / 'screens' / f'{name}.webp')
        entry = {'light': f'/screens/{name}.webp', 'dark': None, 'w': im.width, 'h': im.height}
        dark = src_dir / 'dark' / file
        if dark.exists():
            dim = fit_width(Image.open(dark).convert('RGB'), SCREEN_W)
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


def find_ffmpeg() -> str | None:
    env = os.environ.get('FFMPEG')
    if env and Path(env).exists():
        return env
    on_path = shutil.which('ffmpeg')
    if on_path:
        return on_path
    # The promo-video project ships one with Remotion.
    bundled = PROJECT / 'Marketing' / 'Promo Video' / 'source' / 'node_modules' / '@remotion' / 'compositor-win32-x64-msvc' / 'ffmpeg.exe'
    return str(bundled) if bundled.exists() else None


def build_sounds() -> list:
    sounds = json.loads((APP / 'assets' / 'data' / 'sounds.json').read_text(encoding='utf-8'))
    ffmpeg = find_ffmpeg()
    out = []
    for s in sounds:
        src = ASSETS / 'Sounds' / Path(s['asset']).name
        dest = PUBLIC / 'sounds' / f"{s['id']}.mp3"
        if ffmpeg and src.exists():
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
        out.append({'id': s['id'], 'tab': s['tab'], 'title': s['title'], 'glyph': s['glyph'], 'src': f"/sounds/{s['id']}.mp3"})
    print(f'  sounds: {len(out)}' + ('' if ffmpeg else ' (reused existing previews)'))
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
    build_og()
    DATA.mkdir(parents=True, exist_ok=True)
    (DATA / 'screens.generated.json').write_text(json.dumps(screens, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (DATA / 'sounds.generated.json').write_text(json.dumps(sounds, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Done.')
    return 0


if __name__ == '__main__':
    sys.exit(main())

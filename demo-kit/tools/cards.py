"""
Draws the stat cards and the screenshot cards in ../cards. (The title and end
cards were drawn separately and are kept as they are.)

The screenshot cards crop from frames shot at 2x pixel density, so the game's
text is downscaled into the card (sharp) rather than blown up (blurry). Make
those frames first, with the dev server running:

    sed -e "s#const OUT = root + '/demo-kit/screenshots/'#const OUT = '/tmp/novus-hires/'#" \
        -e "s/deviceScaleFactor: 1/deviceScaleFactor: 2/" \
        demo-kit/tools/scenes.mjs > demo-kit/tools/_hires.mjs
    mkdir -p /tmp/novus-hires && npm i --no-save puppeteer-core
    node demo-kit/tools/_hires.mjs && rm demo-kit/tools/_hires.mjs
    HIRES=/tmp/novus-hires python3 demo-kit/tools/cards.py

Without HIRES set, only the stat cards are drawn.
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter

K = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..') + '/'
HIRES = os.environ.get('HIRES')

# the landing page tokens (styles/index.css)
PLUM, PLUM2, LINE = (20, 13, 24), (36, 20, 48), (74, 42, 85)
MAGENTA, BLUSH, AMETHYST = (255, 45, 120), (245, 234, 240), (138, 107, 232)
MUTED = (185, 163, 194)
SILK = K + 'fonts/Silkscreen-Regular.ttf'
MONO = K + 'fonts/IBMPlexMono-Regular.ttf'
W, H = 1920, 1080


def plum_with_blooms(w, h):
    """the landing page's two slow glows, magenta top-left and amethyst bottom-right"""
    base = Image.new('RGB', (w, h), PLUM)
    glow = Image.new('RGB', (w, h), (0, 0, 0))
    d = ImageDraw.Draw(glow)
    d.ellipse([-w * 0.25, -h * 0.45, w * 0.45, h * 0.55], fill=(110, 18, 60))
    d.ellipse([w * 0.55, h * 0.45, w * 1.3, h * 1.5], fill=(58, 40, 110))
    glow = glow.filter(ImageFilter.GaussianBlur(w // 7))
    return Image.blend(base, glow, 0.55)


def pixel_dollar(size):
    """the favicon's 8x9 pixel $, redrawn cell by cell so it stays crisp"""
    cells = [(3, 1, 2, 1), (1, 2, 6, 1), (1, 3, 3, 1), (2, 4, 4, 1), (4, 5, 3, 1), (1, 6, 6, 1), (3, 7, 2, 1)]
    im = Image.new('RGBA', (8 * size, 9 * size), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for x, y, w, h in cells:
        d.rectangle([x * size, y * size, (x + w) * size - 1, (y + h) * size - 1], fill=MAGENTA)
    return im


def font(path, size):
    return ImageFont.truetype(path, size)


def crisp_text(draw, xy, text, size, fill, face=SILK):
    # Silkscreen is a pixel face: drawn without anti-aliasing at a multiple of 8
    draw.fontmode = '1' if face == SILK else 'L'
    draw.text(xy, text, font=font(face, size), fill=fill)


def width(text, size, face=SILK):
    return font(face, size).getbbox(text)[2]


def wrap(text, size, max_w, face=SILK):
    lines = []
    for para in text.split('\n'):
        line = ''
        for word in para.split(' '):
            trial = (line + ' ' + word).strip()
            if width(trial, size, face) <= max_w or not line:
                line = trial
            else:
                lines.append(line)
                line = word
        lines.append(line)
    return lines


def centred(d, y, text, size, fill, face=SILK):
    crisp_text(d, ((W - width(text, size, face)) // 2, y), text, size, fill, face)


# ---------- stat cards: one big figure, the title card's shape ----------

STATS = {
    '07a-stat-12-concepts': ('12', 200, 'CONCEPTS.', 'EACH ONE EXPLAINED THE MOMENT IT FIRST MATTERS.', None),
    '07c-stat-2-replays': ('2', 200, 'REAL COLLAPSES, REPLAYED.', 'SATYAM 2008 · IL&FS 2018 · NO HINDSIGHT', None),
    # the code's real shape: NVS- plus two runs of five from 23456789ABCDEFGHJKLMNPQRSTUVWXYZ
    '09b-stat-verify-code': ('NVS-7KQ2M-X4P9D', 120, 'ONE CODE. ANYONE CAN CHECK IT.', 'NO SIGN-IN NEEDED TO VERIFY A TRANSCRIPT', None),
    '10b-stat-7-of-12': ('7/12', 200, 'ARE TRADING THE NOISE.', "SO THAT'S NEXT WEEK'S LESSON.", 'FROM THE SAMPLE CLASS'),
}


def stat_card(name, figure, fig_size, label, sub, note):
    im = plum_with_blooms(W, H)
    d = ImageDraw.Draw(im)
    fig_font = font(MONO, fig_size)
    top, bottom = fig_font.getbbox(figure)[1], fig_font.getbbox(figure)[3]
    # stack: figure, label, sub — centred as a block on the frame
    block = (bottom - top) + 70 + 64 + 36 + 28
    y = (H - block) // 2 - top
    centred(d, y, figure, fig_size, BLUSH, MONO)
    y += bottom + 70
    centred(d, y, label, 64, MAGENTA)
    # the sub-line is mono: Silkscreen's '&' looks like a '$', and IL&FS can't read as IL$FS
    centred(d, y + 64 + 36, sub, 28, MUTED, MONO)
    if note:
        centred(d, 990, note, 16, MUTED)
    im.save(K + f'cards/{name}.png')


# ---------- screenshot cards: words left, a crop of the real game right ----------

# crop boxes are in CSS pixels on the 1920x1080 page; the frames are 2x. A list
# of boxes is stacked top to bottom with a gap, to leave out what's between
# them (a disabled "sign in to issue" button reads as broken on a card).
SHOTS = {
    '07b-academy': (
        '07-replay-ilfs', (632, 312, 1288, 968), 800,
        'THE ACADEMY',
        'REPLAY THE REAL COLLAPSES.',
        'Satyam, 2008. IL&FS, 2018. Each step shows only what was public at the time, '
        'and you are marked on what was defensible then, not on knowing the ending.',
    ),
    '09a-transcript': (
        '09a-report-card', (632, 370, 1288, 760), 1000,
        'THE REPORT CARD',
        'EVERY RUN BECOMES A RECORD.',
        'Days, concepts, modules and every call, scored on the reasoning rather than the '
        'outcome. Issue it as a transcript with a public code.',
    ),
    '09c-awards': (
        '09b-awards', [(632, 364, 1288, 564), (632, 630, 1288, 842)], 1000,
        'AWARDS',
        'EARNED ON EVIDENCE.',
        'Named awards with published conditions. Every requirement is measured, never '
        'granted, and you can read all of them before you meet any.',
    ),
    # the dashboard's top row: "What to teach next" and the habits heatmap
    '10a-teachers': (
        '10-teach-sample', (84, 198, 1247, 623), 1060,
        'FOR TEACHERS',
        'SEE WHERE A CLASS IS STUCK.',
        'One screen per class: who has done the work, the habits the game logged, and '
        'next week\'s lesson, built from how they played rather than from scores.',
    ),
}

COL_X, COL_W = 120, 640


def shot_card(name, frame, box, out_w, kicker, headline, body):
    src = Image.open(os.path.join(HIRES, frame + '.png')).convert('RGB')
    pieces = [src.crop(tuple(v * 2 for v in b)) for b in (box if isinstance(box, list) else [box])]
    gap = 40
    crop = Image.new('RGB', (pieces[0].width, sum(p.height for p in pieces) + gap * (len(pieces) - 1)), (0, 0, 0))
    y = 0
    for p in pieces:
        crop.paste(p, (0, y))
        y += p.height + gap
    crop = crop.resize((out_w, round(crop.height * out_w / crop.width)), Image.LANCZOS)

    im = plum_with_blooms(W, H)
    d = ImageDraw.Draw(im)

    # the screenshot, right-aligned, with the site's hard magenta offset and a line border
    px = W - 110 - crop.width
    py = (H - crop.height) // 2
    d.rectangle([px + 14, py + 14, px + crop.width + 13, py + crop.height + 13], fill=MAGENTA)
    im.paste(crop, (px, py))
    d.rectangle([px - 2, py - 2, px + crop.width + 1, py + crop.height + 1], outline=LINE, width=2)

    # the words, vertically centred in the left column
    col_w = min(COL_W, px - 80 - COL_X)
    head = wrap(headline, 56, col_w)
    lines = wrap(body, 26, col_w, MONO)
    block = 24 + 36 + len(head) * 72 + 36 + len(lines) * 40
    y = (H - block) // 2
    d.rectangle([COL_X, y + 2, COL_X + 7, y + 25], fill=MAGENTA)
    crisp_text(d, (COL_X + 22, y), kicker, 24, MAGENTA)
    y += 24 + 36
    for line in head:
        crisp_text(d, (COL_X, y), line, 56, BLUSH)
        y += 72
    y += 36
    for line in lines:
        crisp_text(d, (COL_X, y), line, 26, MUTED, MONO)
        y += 40
    im.save(K + f'cards/{name}.png')


if __name__ == '__main__':
    for name, args in STATS.items():
        stat_card(name, *args)
    if HIRES:
        for name, args in SHOTS.items():
            shot_card(name, *args)
    else:
        print('HIRES not set: skipped the screenshot cards')
    print('cards written:', sorted(os.listdir(K + 'cards')))

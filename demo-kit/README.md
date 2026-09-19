# Novus trailer kit

Everything needed to record and cut a ~100-second Novus trailer with **OBS
Studio** (recording) and **Clipchamp** (editing, in the browser) on this
machine: Arch, Hyprland on Wayland, 1920×1080, RTX 4050, PipeWire.

Start here, then work through [`SHOT-LIST.md`](SHOT-LIST.md) scene by scene.

## What's in the folder

| Folder | What it is |
|---|---|
| `SHOT-LIST.md` | Scene by scene: what to load, what to press, which close-up, which caption, how long |
| `load.html` | The save loader. Opens at `http://localhost:5173/demo-kit/load.html` while `npm run dev` runs |
| `saves/` | Four prepared moments (A–D), built from the real game code — see below |
| `screenshots/` | A reference frame for every scene: what the camera should be seeing |
| `captions/` | Every caption as a **full-frame transparent overlay**, already positioned lower-left. Drag it onto the timeline above the video; nothing to adjust |
| `captions/tight/` | The same captions cropped to their size, if you'd rather position them yourself |
| `cards/` | Title card (`01`), end card (`11`), and eight feature cards for the Academy, transcript, awards and teacher scenes (`07a`–`10b`), all 1920×1080. The shot list says where each goes |
| `background/` | A plum-and-magenta backdrop, if you want the video to sit inside a frame (optional) |
| `music/` | SummerTown, full quality (320 kbps). CC0 — see `music/LICENCE.md` |
| `fonts/` | Silkscreen and IBM Plex Mono, if you want to make more captions. OFL |
| `tools/` | The scripts that built the saves and the screenshots, if you need to regenerate them |

## The one idea behind the kit

**Every scene is prepared in advance, so you never play through the game on
camera to reach it, and you never retake a scene because the dice went the
wrong way.**

Novus is seeded, so a given save always produces the same results. The saves in
`saves/` use a seed that was searched for, so on day 2 all of these happen
every time:

- **Rejecting Vector Trading turns out right.** It would have defaulted.
- **Approving Anand Dairy in full is marked sound, and it still defaults.** This
  is your core claim, "graded on your reasoning, not your luck", happening live.
- **Escalating Sahyadri Software turns out right**, followed by *"You have seen
  this before — Satyam"*.
- **The infrastructure headline fires at 9:46.** By 11:15, Sethu Infra is up
  5.3% because of the news, and Tarang Payments is up 4.1% on nothing but noise.
- **The day-end report** shows +₹14,761.50 and the lesson *"Your book is 100%
  Sethu Infra."*

Every one of these was checked by playing the script in a real browser
(`tools/scenes.mjs`).

Because it's repeatable, you can record the same moment twice, once wide and
once close up, and the two takes match exactly. The close-ups below rely on this.

## 1 · Set up once

**Tools:** OBS Studio is installed. Clipchamp needs no install: it runs in
Chrome at [app.clipchamp.com](https://app.clipchamp.com) and needs a (free)
Microsoft account.

**Make a separate Chrome profile for recording** (Chrome → profile icon → Add).
This gives you no bookmarks bar, no extensions and no personal tabs. It also
keeps the demo saves out of the browser you normally play in.

**Run the game locally.** Record on `localhost`, not the live site. The loader
only works on the dev server, and nothing you do on camera touches real data.

```
cd ~/Documents/rpgs/novus
npm run dev
```

**Load a save.** In the recording profile, open
`http://localhost:5173/demo-kit/load.html`. Click A, B, C or D, then press
**Continue** on the title screen. Leave "Turn the in-game music off" ticked,
because the music goes in during the edit.

**Fullscreen is automatic.** Pressing **Continue** puts the game in fullscreen
by itself, covering Hyprland's bar, so the recording shows only the game.
Chrome shows a *"Press and hold Esc to exit full screen"* note at the top for
about three seconds. Wait for it to go before you start the take, or trim it.
A quick press of **Esc** still closes panels as usual. Only holding it leaves
fullscreen. (If you ever need it off: Settings → *Fullscreen on start*.)

**Pause notifications** while you record, so no pop-up lands in a take.

## 2 · Set up OBS (once)

Run through these, then make a **10-second test recording** and open it in
Clipchamp before doing any real takes.

**Settings → Video**
- Base (canvas) resolution: 1920×1080
- Output (scaled) resolution: 1920×1080
- FPS: 60

**Settings → Output → Output mode: Advanced → Recording**
- **Format: MKV.** If OBS crashes mid-take, an MKV is still playable (an MP4
  isn't). Clipchamp *can* open MKV, but it converts it first, which is slow.
  So also turn on **Settings → Advanced → Recording → Automatically remux to
  MP4**. OBS then saves an MP4 next to each MKV when you press Stop. Import the
  MP4 into Clipchamp.
- **Encoder: NVIDIA NVENC H.264.** Your RTX 4050 does the encoding, so the game
  doesn't stutter. If NVENC isn't in the list, use x264 instead.
- **Rate control: CQP, CQ level 18.** High quality, so small text and pixel
  edges stay sharp, without making files too heavy for a browser editor.
  (For x264: CRF 18.)
- **Keyframe interval: 1 s.** Makes scrubbing in Clipchamp smoother.
- **Preset:** one of the higher-quality ones. The defaults for everything else
  are fine.

**Settings → Audio**
- Desktop audio: default. With the game's music off, this records only the
  click sounds.
- Mic: disabled, unless you're doing a voiceover.

**The source** (Sources → + → **Screen Capture (PipeWire)**). Hyprland's picker
pops up; choose the screen (`eDP-1`). In the source's properties, set **Show
cursor**:
- **On** for takes where you click (A, B, D), so viewers can follow what's
  clicked. Move the mouse slowly.
- **Off** for the end-card take (5), where nothing is clicked.

**Starting and stopping.** Press Start Recording in OBS, switch to Chrome, do
the take, switch back, and press Stop. Trim the switching off each end in
Clipchamp. Don't rely on OBS hotkeys: on Wayland they may not fire while Chrome
has focus.

**Game controls on camera:**

| Key | Does |
|---|---|
| W A S D | Walk |
| E (or Space) | Talk to someone you're standing next to |
| ← / → | Switch the bottom tabs (Case, Market, Portfolio, Feed) |
| Esc | Close whatever is open |
| Enter | Dismiss a level-up, and start the next day from the day-end screen |

## 3 · Close-ups: zoom the browser, not the edit

Zooming in any editor, Clipchamp included, stretches the picture, which blurs
pixel art and small text. Do close-ups while recording instead:

**Load the same save again, press Ctrl + until Chrome shows 150%, and record
just the moment you want close.** The browser redraws text at the larger size,
so it stays **perfectly sharp** (tested). In Clipchamp you then just place the
close-up clip after the wide one. Press **Ctrl 0** to reset afterwards. At 150%
some panels need a scroll to reach the buttons below; that's expected.

Each scene in the shot list marks which moments deserve a close-up.

## 4 · Record in this order

Recording follows the saves, not the trailer order. You rearrange in the edit.

| Take | Load | Scenes | About |
|---|---|---|---|
| 1 | **A** | 02 walk → 03 Vector Trading → 04 Anand Dairy → walk → 06 Sahyadri → walk → 07 replay | 4–5 min |
| 1c | **A** at 150% | Close-ups: the Vector Trading file and its badges, the Anand Dairy badges, the Sahyadri tells and the purple box | 3 min |
| 2 | **B** | 05 market: Sethu Infra, then Tarang Payments | 1 min |
| 2c | **B** at 150% | Close-ups: each breakdown | 1 min |
| 3 | **C** | 08 day-end (opens by itself about 5 seconds after Continue) | 30 s |
| 4 | **D** | 09 report card → issue a transcript → open its link | 2 min |
| 4b | `/teach/sample` (no save) | 10 teacher dashboard | 1 min |
| 5 | **A** | 11 the plaza, camera still, cursor off, for the end card | 15 s |

Record takes 1 and 4 as one continuous take each and cut in the edit. That's
easier than stopping and restarting mid-flow. Extra seconds at either end don't
matter; you trim them in Clipchamp.

**Important for 1c and 2c:** decisions stick within a save. Once you've
submitted Vector Trading in take 1, it's decided. For the close-up take,
**reload A from the loader** and play the same moment again; the result is
identical. The same goes for B.

## 5 · Edit in Clipchamp

Clipchamp works like a slideshow app with a timeline: drag things in, drag
their edges to trim, and change settings in the panel on the right.

**Start**
1. Open [app.clipchamp.com](https://app.clipchamp.com) in Chrome (your normal
   profile is fine) and sign in.
2. **Create a new video.** Leave the aspect ratio at **16:9**.
3. Drag into **Your media**: your OBS **MP4s**, then everything in `captions/`,
   `cards/` and `music/`.

**Build it scene by scene**, in the order of the shot list:

| To do this | Do this |
|---|---|
| Put a clip on the timeline | Drag it from Your media onto the timeline |
| Cut out the part you don't want | Move the playhead to the spot, press the **split** (scissors) button, select the unwanted piece, press Delete |
| Trim the start or end | Drag the clip's edge inward |
| Speed up a walk | Select the clip → **Speed** in the right-hand panel → 3–4× |
| Add a caption | Drag the caption PNG onto the timeline **above** the video, at the right moment. It's full-frame, so it lands in the right spot by itself |
| Set the caption's length | Drag its edge to about 3 seconds |
| Fade the caption in and out | Select it → **Fade** in the right-hand panel → about 0.3 s each way |
| Add the title card | Drag `01-title-card.png` to the very start, 4 seconds long |
| Add the end card | Drag `11-end-card.png` above the last 5–6 s of the plaza shot, with a fade in |
| Add a feature card | Drag it onto the main track between two clips, for the length the shot list gives (2 s for a stat card, 3 s for a screenshot card). Fade 0.2 s each way |

**Music**
- Drag `summertown-320k.mp3` onto the timeline at 0:00. It runs 1:43, which
  covers the whole trailer.
- Select it → **Audio** in the right-hand panel → volume about 70%. Add a fade
  out at the end.
- Select each recording and set its volume to about 40%, so the game's clicks
  sit quietly under the music.

**Don't use Clipchamp's own stock footage, music, stickers or premium
effects.** Anything marked premium blocks the free export. Everything the video
needs is already in this folder.

**Optional frame.** For a plum border around the game: put
`background/novus-plum-2560x1440.png` on the timeline *under* the recordings for
the full length, then shrink each recording slightly in the preview. It looks
polished but costs legibility, so skipping it is fine.

Clipchamp saves your project as you go.

## 6 · Export

- **Export** (top right) → **1080p**. It's free and has no watermark as long as
  nothing premium is in the project. You get an MP4.
- **Short 30 s version for social:** duplicate the project from the Clipchamp
  home page, then cut it down to scenes 02 → 03 → 05 → 06 → 11. Keep it 16:9; a
  vertical crop of a 16:9 game UI loses too much.

## Before you record: things to know

- **Scene 10 uses the sample class at `/teach/sample`.** It's a fixed,
  invented class of twelve with a *Sample data — not real students* banner.
  Keep the banner in shot. Nothing to load and no sign-in needed.
- **Don't open the Casebook tab on camera.** It still shows the DRAFT banner
  until you sign the content off. Scene 06 uses the "You have seen this before"
  box on the case outcome instead, which has no banner.
- **Scene 09 needs you signed in, in a throwaway account.** An issued transcript
  can never be edited or deleted — that's the point of it — and signing in with
  a loaded save pushes that save over the account's cloud copy. Sign in *before*
  loading D.
- **The player is called "Asha Iyer"**, and that name is on the transcript. To
  change it, run `NOVUS_DEMO_NAME="Your Name" node demo-kit/tools/build-saves.mjs`.
  Nothing else depends on the name.
- **Two game fixes are included that aren't deployed yet.** Both turned up
  while building this kit, and both are already correct on localhost:
  - A file left open in the Bank followed you into Risk & Compliance. Each desk
    now shows only its own files (`src/ui/case/CasePanel.tsx`).
  - Money with paise lost its trailing zero everywhere: `₹14,761.5`. It now
    reads `₹14,761.50`, and whole rupees stay whole (`src/lib/format.ts`).

## Regenerating

```
node demo-kit/tools/build-saves.mjs                                # the four saves
npm i --no-save puppeteer-core && node demo-kit/tools/scenes.mjs   # the reference frames + checks
```

The feature cards come from `tools/cards.py`. Its header says how to make the
sharp 2× frames the screenshot cards crop from.

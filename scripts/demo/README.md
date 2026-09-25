# Demo GIFs

Scripts that drive greenterm with synthetic mouse and keyboard input,
record five scenes with ffmpeg at 60 fps, and turn them into the GIFs in
`docs/media/` used by the READMEs: 50 fps at the recorded width. 50 is the
most a GIF can do; browsers slow shorter frame delays down to 1/10 s.

| File | Role |
| --- | --- |
| `record.ps1` | Positions the window, runs the scenes, records `rec\<scene>.mkv` |
| `scenes.ps1` | What each scene does and how long it records |
| `layout.ps1` | Screen coordinates of the title bar controls and panes |
| `ui.ps1` | SendInput mouse/keyboard driver with a focus guard |
| `make-gifs.ps1` | `rec\*.mkv` to `docs\media\*.gif` (50 fps, recorded width, 256 colors) |
| `common.ps1` | Paths and ffmpeg lookup |

## Use

```powershell
winget install Gyan.FFmpeg                              # once
npm run tauri:dev                                       # start a dev build
.\scripts\demo\record.ps1 -Panes 1                      # current pane count
.\scripts\demo\make-gifs.ps1
```

The scripts only drive a greenterm built from this repo (`-Exe`, default
`*\src-tauri\target\*\greenterm.exe`), never an installed copy. Use the
dev build while an installed greenterm runs: a release build would hand
itself over to the installed one (single instance). `record.ps1` starts
with Settings > Reset, so that build's settings go back to their defaults.

Do not touch the mouse or keyboard while `record.ps1` runs (about 2 min).
To abort, click any other window: every input first checks that greenterm
is the foreground window and the script stops if it is not.

Record only some scenes with `-Only split,settings`. Scenes that continue
from an earlier one (`activity`, `settings`) expect its end state; see the
top of `scenes.ps1`.

## When the UI changes

Coordinates in `layout.ps1` are for the fixed window size set by
`record.ps1`. After changing the title bar, capture the window, measure the
new centers of the controls and update `$Target` and `$Settings` (the
settings panel opens right-aligned under the gear). Pane positions are
computed from the grid rules and only need `$Workspace` to stay correct.

Recordings go to `scripts\demo\rec\`, which git ignores.

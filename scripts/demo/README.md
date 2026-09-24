# Demo GIFs

Scripts that drive greenterm with synthetic mouse and keyboard input,
record four scenes with ffmpeg, and turn them into the GIFs in
`docs/media/` used by the READMEs.

| File | Role |
| --- | --- |
| `record.ps1` | Positions the window, runs the scenes, records `rec\<scene>.mkv` |
| `scenes.ps1` | What each scene does and how long it records |
| `layout.ps1` | Screen coordinates of the title bar controls and panes |
| `ui.ps1` | SendInput mouse/keyboard driver with a focus guard |
| `make-gifs.ps1` | `rec\*.mkv` to `docs\media\*.gif` (25 fps, 256 colors) |
| `common.ps1` | Paths and ffmpeg lookup |

## Use

```powershell
winget install Gyan.FFmpeg                              # once
npm run tauri build -- --no-bundle
.\src-tauri\target\release\greenterm.exe                # start the app
.\scripts\demo\record.ps1 -Panes 1 -FontSize 14         # current pane count and font size
.\scripts\demo\make-gifs.ps1
```

Do not touch the mouse or keyboard while `record.ps1` runs (about 90 s).
To abort, click any other window: every input first checks that greenterm
is the foreground window and the script stops if it is not.

Record only some scenes with `-Only split,themes`. Scenes that continue
from an earlier one (`activity`, `themes`) expect its end state; see the
top of `scenes.ps1`.

## When the UI changes

Coordinates in `layout.ps1` are for the fixed window size set by
`record.ps1`. After changing the title bar, capture the window, measure the
new centers of the controls and update `$Target`. Pane positions are
computed from the grid rules and only need `$Workspace` to stay correct.

Recordings go to `scripts\demo\rec\`, which git ignores.

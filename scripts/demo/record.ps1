param(
  [string[]]$Only = @("split", "arrange", "shells", "activity", "settings", "web"),
  [int]$Panes = 1,  # panes open right now
  # Which greenterm to drive: one built from this repo, never an installed
  # copy that may be running with real work in it.
  [string]$Exe = "*\src-tauri\target\*\greenterm.exe"
)
# Drives a running greenterm and records each scene to rec\<scene>.mkv at
# 60 fps. Do not touch mouse or keyboard while it runs; to abort, click any
# other window (the focus guard in ui.ps1 stops the script).
# Settings > Reset runs before the first scene, so the settings stored by
# that build (theme, font size, ...) go back to their defaults.

$GtExe = $Exe
. "$PSScriptRoot\common.ps1"
. "$PSScriptRoot\ui.ps1"
. "$PSScriptRoot\layout.ps1"
. "$PSScriptRoot\scenes.ps1"

$ffmpeg = Find-Ffmpeg
New-Item -ItemType Directory -Force $RecDir | Out-Null

function Start-Rec([string]$name, [int]$seconds) {
  $f = Get-GtFrame
  $w = ($f.Rt - $f.L) - (($f.Rt - $f.L) % 2); $h = ($f.B - $f.T) - (($f.B - $f.T) % 2)
  $a = "-y -loglevel error -f gdigrab -framerate 60 -draw_mouse 1 -offset_x $($f.L) -offset_y $($f.T) " +
       "-video_size ${w}x${h} -i desktop -t $seconds -c:v libx264 -preset ultrafast -crf 14 -pix_fmt yuv444p `"$RecDir\$name.mkv`""
  $script:ff = Start-Process $ffmpeg -ArgumentList $a -WindowStyle Hidden -PassThru
  Wait-Ms 900
}

$h = Get-GtWindow
try {
  # Topmost so nothing covers the recorded area; the title bar click can
  # then only hit greenterm and makes it the foreground window.
  [Ui]::SetWindowPos($h, [IntPtr](-1), 300, 150, $WindowSize[0], $WindowSize[1], 0x40) | Out-Null
  [Ui]::SetForegroundWindow($h) | Out-Null; Wait-Ms 300
  $f = Get-GtFrame; [Ui]::Click($f.L + $Target.TitleBar[0], $f.T + $Target.TitleBar[1]); Wait-Ms 400
  Assert-GtFocus

  Reset-Scene $Panes
  $open = 1  # panes open after each scene
  $after = @{ split = 3; arrange = 3; shells = 3; activity = 2; settings = 2; web = 2 }
  foreach ($name in $Scenes.Keys) {
    if ($Only -notcontains $name) { continue }
    if ($name -eq "arrange" -and $open -ne 3) {
      Reset-Scene $open
      Tap $Target.New; Wait-Ms 900; Tap $Target.New; Wait-Ms 1200; Park
    }
    if ($name -eq "shells" -and $open -ne 1) { Reset-Scene $open }
    if ($name -eq "web") {
      if ($open -ne 1) { Reset-Scene $open }
      Set-WebHome $WebHome
    }
    $seconds, $body = $Scenes[$name]
    Start-Rec $name $seconds
    & $body
    Park; $script:ff.WaitForExit(); Wait-Ms 300
    $open = $after[$name]
    "recorded $name"
  }
}
finally {
  if ($script:ff -and -not $script:ff.HasExited) { Stop-Process -Id $script:ff.Id -Force }
  [Ui]::SetWindowPos($h, [IntPtr](-2), 0, 0, 0, 0, 3) | Out-Null
}

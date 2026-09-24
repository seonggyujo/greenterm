param(
  [string[]]$Only = @("split", "shells", "activity", "themes"),
  [int]$Panes = 1,     # panes open right now
  [int]$FontSize = 14  # font size shown in the title bar right now
)
# Drives a running greenterm and records each scene to rec\<scene>.mkv.
# Do not touch mouse or keyboard while it runs; to abort, click any other
# window (the focus guard in ui.ps1 stops the script).

. "$PSScriptRoot\common.ps1"
. "$PSScriptRoot\ui.ps1"
. "$PSScriptRoot\layout.ps1"
. "$PSScriptRoot\scenes.ps1"

$ffmpeg = Find-Ffmpeg
New-Item -ItemType Directory -Force $RecDir | Out-Null

function Start-Rec([string]$name, [int]$seconds) {
  $f = Get-GtFrame
  $w = ($f.Rt - $f.L) - (($f.Rt - $f.L) % 2); $h = ($f.B - $f.T) - (($f.B - $f.T) % 2)
  $a = "-y -loglevel error -f gdigrab -framerate 30 -draw_mouse 1 -offset_x $($f.L) -offset_y $($f.T) " +
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

  Reset-Scene $Panes $FontSize
  $open = 1  # panes open after each scene: split leaves 3, shells 3, activity 2
  $after = @{ split = 3; shells = 3; activity = 2; themes = 2 }
  foreach ($name in $Scenes.Keys) {
    if ($Only -notcontains $name) { continue }
    if ($name -eq "shells" -and $open -ne 1) { Reset-Scene $open 14 }
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

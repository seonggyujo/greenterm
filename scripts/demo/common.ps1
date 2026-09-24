# Shared paths for the demo scripts. Dot-source it.

$DemoDir = $PSScriptRoot
$RepoDir = (Resolve-Path "$PSScriptRoot\..\..").Path
$RecDir = Join-Path $DemoDir "rec"          # raw recordings, git-ignored
$MediaDir = Join-Path $RepoDir "docs\media"  # GIFs used by the READMEs

# ffmpeg from PATH, or the winget install location (winget install Gyan.FFmpeg).
function Find-Ffmpeg([string]$tool = "ffmpeg") {
  $cmd = Get-Command "$tool.exe" -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }
  $hit = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter "$tool.exe" -ErrorAction SilentlyContinue |
    Select-Object -First 1
  if ($hit) { return $hit.FullName }
  throw "$tool not found. Install it with: winget install Gyan.FFmpeg"
}

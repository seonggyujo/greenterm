param(
  [string[]]$Only = @("split", "shells", "activity", "themes"),
  [int]$Width = 960,
  [int]$Fps = 25
)
# Turns rec\<scene>.mkv into docs\media\<scene>.gif:
#   - drops the first 0.5 s (recording warm-up)
#   - trims 4 px from every edge (window border, desktop pixels)
#   - 256-color palette from the whole frame, so static parts such as the
#     traffic lights keep their colors; unchanged areas cost almost nothing
# Keep the .mkv files until the GIFs are approved.

. "$PSScriptRoot\common.ps1"
$ffmpeg = Find-Ffmpeg
$ffprobe = Find-Ffmpeg "ffprobe"
New-Item -ItemType Directory -Force $MediaDir | Out-Null

foreach ($name in $Only) {
  $src = Join-Path $RecDir "$name.mkv"
  if (-not (Test-Path $src)) { "skip $name (no recording)"; continue }
  $out = Join-Path $MediaDir "$name.gif"

  $graph = "[0:v]trim=start=0.5,setpts=PTS-STARTPTS,crop=iw-8:ih-8:4:4,fps=$Fps," +
           "scale=${Width}:-1:flags=lanczos,split[a][b];" +
           "[a]palettegen=stats_mode=full:max_colors=256[pal];" +
           "[b][pal]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle"
  & $ffmpeg -y -loglevel error -i $src -filter_complex $graph $out

  $dur = [double](& $ffprobe -v error -show_entries format=duration -of csv=p=0 $out)
  "{0}.gif: {1:N1} s, {2} fps, {3:N2} MB" -f $name, $dur, $Fps, ((Get-Item $out).Length / 1MB)
}

# Draws the installer artwork into src-tauri/installer/ (24-bit BMP, the
# format NSIS and WiX require). Run again after changing the app icon:
#   .\scripts\installer\make-images.ps1
# The icon is taken from src-tauri/icons/icon.png (512x512).

Add-Type -AssemblyName System.Drawing

$root = (Resolve-Path "$PSScriptRoot\..\..").Path
$out = Join-Path $root "src-tauri\installer"
New-Item -ItemType Directory -Force $out | Out-Null
$icon = [Drawing.Image]::FromFile((Join-Path $root "src-tauri\icons\icon.png"))

$green = [Drawing.Color]::FromArgb(0x39, 0xff, 0x88)
$dim = [Drawing.Color]::FromArgb(0x5f, 0xae, 0x7f)
$top = [Drawing.Color]::FromArgb(0x0d, 0x24, 0x17)
$bottom = [Drawing.Color]::FromArgb(0x05, 0x0c, 0x08)
$mono = "Cascadia Mono"
if (-not ([Drawing.Text.InstalledFontCollection]::new().Families.Name -contains $mono)) { $mono = "Consolas" }

function New-Canvas([int]$w, [int]$h) {
  $bmp = New-Object Drawing.Bitmap $w, $h, ([Drawing.Imaging.PixelFormat]::Format24bppRgb)
  $g = [Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = "AntiAlias"; $g.InterpolationMode = "HighQualityBicubic"; $g.TextRenderingHint = "AntiAliasGridFit"
  @{ Bmp = $bmp; G = $g }
}

# Dark green panel with the icon, the name and a tagline, centered in a box.
function Draw-Panel($g, [int]$x, [int]$w, [int]$h, [int]$iconSize) {
  $rect = New-Object Drawing.Rectangle $x, 0, $w, $h
  $g.FillRectangle((New-Object Drawing.Drawing2D.LinearGradientBrush $rect, $top, $bottom, 90), $rect)
  $g.FillRectangle((New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(0x1f, 0x4d, 0x33))), $x + $w - 1, 0, 1, $h)
  $iy = [int]($h * 0.2)
  $g.DrawImage($icon, $x + ($w - $iconSize) / 2, $iy, $iconSize, $iconSize)
  $center = New-Object Drawing.StringFormat; $center.Alignment = "Center"
  $g.DrawString("greenterm", (New-Object Drawing.Font $mono, 15, ([Drawing.FontStyle]::Bold), ([Drawing.GraphicsUnit]::Pixel)),
    (New-Object Drawing.SolidBrush $green), (New-Object Drawing.RectangleF $x, ($iy + $iconSize + 14), $w, 24), $center)
  $g.DrawString("terminals that`nsplit themselves", (New-Object Drawing.Font $mono, 10, ([Drawing.FontStyle]::Regular), ([Drawing.GraphicsUnit]::Pixel)),
    (New-Object Drawing.SolidBrush $dim), (New-Object Drawing.RectangleF $x, ($iy + $iconSize + 42), $w, 40), $center)
}

function Save([hashtable]$c, [string]$name) {
  $c.Bmp.Save((Join-Path $out $name), [Drawing.Imaging.ImageFormat]::Bmp); $c.G.Dispose(); $c.Bmp.Dispose()
  "wrote src-tauri\installer\$name"
}

# NSIS Welcome/Finish sidebar, 164x314.
$c = New-Canvas 164 314; Draw-Panel $c.G 0 164 314 88; Save $c "nsis-sidebar.bmp"

# NSIS page header, 150x57: sits at the right of a white header strip.
$c = New-Canvas 150 57
$c.G.Clear([Drawing.Color]::White)
$c.G.DrawImage($icon, 104, 8, 40, 40)
$right = New-Object Drawing.StringFormat; $right.Alignment = "Far"; $right.LineAlignment = "Center"
$c.G.DrawString("greenterm", (New-Object Drawing.Font $mono, 13, ([Drawing.FontStyle]::Bold), ([Drawing.GraphicsUnit]::Pixel)),
  (New-Object Drawing.SolidBrush ([Drawing.Color]::FromArgb(0x10, 0x60, 0x38))), (New-Object Drawing.RectangleF 0, 0, 98, 57), $right)
Save $c "nsis-header.bmp"

# WiX Welcome/Finish background, 493x312: WiX writes black text on the
# right, so only the left 164 px are dark.
$c = New-Canvas 493 312
$c.G.Clear([Drawing.Color]::White); Draw-Panel $c.G 0 164 312 88; Save $c "wix-dialog.bmp"

# WiX banner, 493x58: WiX writes the page title on the left in black.
$c = New-Canvas 493 58
$c.G.Clear([Drawing.Color]::White)
$c.G.DrawImage($icon, 441, 9, 40, 40)
$c.G.FillRectangle((New-Object Drawing.SolidBrush $green), 0, 56, 493, 2)
Save $c "wix-banner.bmp"

$icon.Dispose()

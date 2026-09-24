# Where things are on screen, for a window of 1216x796 (outer size).
# Coordinates are relative to the visible frame (see ui.ps1). Re-measure
# them if the title bar changes: the controls are right-aligned, so any
# width change to their right shifts everything to their left.

$WindowSize = @(1216, 796)

$Target = @{
  New     = @(933, 22)    # "+ New terminal"
  Menu    = @(1086, 22)   # the ▾ next to it
  APlus   = @(852, 22)
  AMinus  = @(792, 22)
  Green   = @(735, 22)    # theme swatches
  Black   = @(757, 22)
  TitleBar = @(400, 22)   # empty title bar, safe to click
  Park    = @(600, 420)   # where the pointer rests between actions
}

$MenuItem = @{ powershell = @(1000, 62); cmd = @(975, 92); gitbash = @(1000, 122) }

# Workspace content box (inside its padding) and the grid gap.
$Workspace = @{ X = 11; Y = 55; W = 1180; H = 722; Gap = 10 }

# Pane boxes for n panes, with the same rules as src/layout/grid.ts.
function Get-Panes([int]$n) {
  $w = $Workspace
  $cols = [math]::Ceiling([math]::Sqrt($n)); $rows = [math]::Ceiling($n / $cols)
  $full = $cols * ($rows - 1); $last = $n - $full
  $rh = ($w.H - ($rows - 1) * $w.Gap) / $rows
  for ($i = 0; $i -lt $n; $i++) {
    $row = [math]::Floor($i / $cols)
    $inRow = if ($i -lt $full) { $cols } else { $last }
    $col = if ($i -lt $full) { $i % $cols } else { $i - $full }
    $cw = ($w.W - ($inRow - 1) * $w.Gap) / $inRow
    $x = $w.X + $col * ($cw + $w.Gap); $y = $w.Y + $row * ($rh + $w.Gap)
    [pscustomobject]@{
      Close = @([int]($x + $cw - 18), [int]($y + 14))
      Body  = @([int]($x + $cw / 2), [int]($y + $rh / 2))
    }
  }
}

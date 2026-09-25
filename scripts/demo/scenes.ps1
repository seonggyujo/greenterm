# The README scenes. Each assumes the state the previous one leaves:
#   split     starts from 1 PowerShell pane, ends with 3
#   arrange   continues from split: 3 PowerShell panes in the grid
#   shells    starts from 1 PowerShell pane (record.ps1 resets before it)
#   activity  continues from shells: PowerShell, cmd, Git Bash
#   settings  continues from activity: PowerShell, cmd
#   web       starts from 1 PowerShell pane with $WebHome as the web start
#             page (record.ps1 resets and sets it before it)
# The second number is the recording length in seconds.

$WebHome = "en.wikipedia.org/wiki/Terminal_emulator"

function Wait-Ms([int]$ms) { Start-Sleep -Milliseconds $ms }
function Park { Move-Gt $Target.Park[0] $Target.Park[1] 200 }

$Scenes = [ordered]@{
  split = @(13, {
    for ($n = 1; $n -le 5; $n++) { Tap $Target.New; Wait-Ms 700 }
    Wait-Ms 600
    foreach ($n in 6, 5, 4) { Tap (Get-Panes $n)[$n - 2].Close; Wait-Ms 750 }
  })

  arrange = @(14, {
    $g = Get-Gaps3
    $v2 = @(($g.V[0] + 220), $g.V[1]); $h2 = @($g.H[0], ($g.H[1] + 110))
    Drag-Gt $g.V $v2 900; Wait-Ms 700
    Drag-Gt $g.H $h2 900; Wait-Ms 900
    DoubleTap $v2; Wait-Ms 800
    DoubleTap $h2; Wait-Ms 900
    # Swap: the wide bottom pane onto the middle of the top-left one.
    $p = Get-Panes 3
    Drag-Gt $p[2].Header $p[0].Body 1100
    Park; Wait-Ms 1200
  })

  shells = @(17, {
    Tap $Target.Menu; Wait-Ms 450; Tap $MenuItem.cmd; Wait-Ms 350; Tap $Target.New; Wait-Ms 900
    Type-Gt "cd C:\Windows" 60; Enter-Gt; Wait-Ms 900
    Tap $Target.Menu; Wait-Ms 450; Tap $MenuItem.gitbash; Wait-Ms 350; Tap $Target.New; Wait-Ms 1400
    Type-Gt "cd /c/Users" 60; Enter-Gt; Wait-Ms 600
  })

  activity = @(16, {
    $p = Get-Panes 3
    Tap $p[0].Body; Wait-Ms 300
    Type-Gt "Get-ChildItem -Recurse C:\Windows\System32 -ErrorAction SilentlyContinue" 22; Enter-Gt
    Wait-Ms 3200; CtrlC-Gt; Wait-Ms 900
    Tap $p[1].Body; Wait-Ms 300; Type-Gt "exit 3" 70; Enter-Gt; Wait-Ms 1200
    Tap $p[2].Body; Wait-Ms 300; Type-Gt "exit" 70; Enter-Gt; Wait-Ms 1000
  })

  settings = @(13, {
    Tap $Target.Gear; Wait-Ms 900
    Tap $Settings.Black; Wait-Ms 1500; Tap $Settings.Green; Wait-Ms 1200
    for ($i = 0; $i -lt 3; $i++) { Tap $Settings.APlus; Wait-Ms 550 }
    Wait-Ms 400
    for ($i = 0; $i -lt 3; $i++) { Tap $Settings.AMinus; Wait-Ms 550 }
    Wait-Ms 500; Tap $Target.Gear; Wait-Ms 400
  })

  web = @(14, {
    Tap $Target.Menu; Wait-Ms 500; Tap $MenuItem.web; Wait-Ms 600
    Park; Wait-Ms 3000
    # Drag the web pane by its header to the left edge of the terminal.
    $p = Get-Panes 2
    Drag-Gt $p[1].Header $p[0].Left 1100
    Park; Wait-Ms 1800
  })
}

# Back to one PowerShell pane with every setting at its default (Settings >
# Reset): green theme, font 14, animations on, PowerShell for +.
function Reset-Scene([int]$panes) {
  for ($n = $panes; $n -ge 1; $n--) { Tap (Get-Panes $n)[$n - 1].Close; Wait-Ms 450 }
  Tap $Target.Gear; Wait-Ms 400
  Tap $Settings.Reset; Wait-Ms 250; Tap $Settings.Reset; Wait-Ms 1600
  Tap $Target.Gear; Wait-Ms 300
  Tap $Target.New; Wait-Ms 1200
  Park; Wait-Ms 800
}

function Set-WebHome([string]$url) {
  Tap $Target.Gear; Wait-Ms 400
  Tap $Settings.WebHome; Wait-Ms 200; CtrlKey-Gt 0x41; Type-Gt $url 12; Enter-Gt; Wait-Ms 300
  Tap $Target.Gear; Park; Wait-Ms 500
}

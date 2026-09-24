# The four README scenes. Each assumes the state the previous one leaves:
#   split    starts from 1 PowerShell pane, ends with 3
#   shells   starts from 1 PowerShell pane (record.ps1 resets before it)
#   activity continues from shells: PowerShell, cmd, Git Bash
#   themes   continues from activity
# The second number is the recording length in seconds.

function Wait-Ms([int]$ms) { Start-Sleep -Milliseconds $ms }
function Park { Move-Gt $Target.Park[0] $Target.Park[1] 200 }

$Scenes = [ordered]@{
  split = @(13, {
    for ($n = 1; $n -le 5; $n++) { Tap $Target.New; Wait-Ms 700 }
    Wait-Ms 600
    foreach ($n in 6, 5, 4) { Tap (Get-Panes $n)[$n - 2].Close; Wait-Ms 750 }
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

  themes = @(12, {
    Tap $Target.Black; Wait-Ms 1600; Tap $Target.Green; Wait-Ms 1300
    for ($i = 0; $i -lt 3; $i++) { Tap $Target.APlus; Wait-Ms 550 }
    Wait-Ms 400
    for ($i = 0; $i -lt 3; $i++) { Tap $Target.AMinus; Wait-Ms 550 }
  })
}

# Back to one PowerShell pane, font 14, green theme.
function Reset-Scene([int]$panes, [int]$font) {
  Tap $Target.Menu; Wait-Ms 300; Tap $MenuItem.powershell; Wait-Ms 300
  for ($n = $panes; $n -ge 1; $n--) { Tap (Get-Panes $n)[$n - 1].Close; Wait-Ms 450 }
  Tap $Target.New; Wait-Ms 1200
  for ($i = $font; $i -lt 14; $i++) { Tap $Target.APlus; Wait-Ms 200 }
  for ($i = $font; $i -gt 14; $i--) { Tap $Target.AMinus; Wait-Ms 200 }
  Tap $Target.Green; Park; Wait-Ms 800
}

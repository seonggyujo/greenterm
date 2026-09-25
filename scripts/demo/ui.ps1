# Input driver for the demo: mouse and keyboard through SendInput.
# Dot-source it. Coordinates are relative to the window's visible frame.
#
# Safety: every click and key goes out only while greenterm is the
# foreground window. If anything else takes focus the script throws, so no
# input can leak into another app.

Add-Type @"
using System; using System.Runtime.InteropServices; using System.Threading;
public static class Ui {
  [StructLayout(LayoutKind.Sequential)] public struct R { public int L, T, Rt, B; }
  [StructLayout(LayoutKind.Sequential)] public struct P { public int X, Y; }
  [StructLayout(LayoutKind.Sequential)] struct MOUSEINPUT { public int dx, dy; public uint data, flags, time; public IntPtr extra; }
  [StructLayout(LayoutKind.Sequential)] struct KEYBDINPUT { public ushort vk, scan; public uint flags, time; public IntPtr extra; }
  [StructLayout(LayoutKind.Explicit)] struct INPUT {
    [FieldOffset(0)] public uint type;
    [FieldOffset(8)] public MOUSEINPUT mi;
    [FieldOffset(8)] public KEYBDINPUT ki;
  }
  [DllImport("user32.dll")] static extern uint SendInput(uint n, INPUT[] i, int size);
  [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
  [DllImport("user32.dll")] public static extern bool GetCursorPos(out P p);
  [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
  [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
  [DllImport("user32.dll")] public static extern bool SetWindowPos(IntPtr h, IntPtr after, int x, int y, int cx, int cy, uint f);
  [DllImport("dwmapi.dll")] public static extern int DwmGetWindowAttribute(IntPtr h, int a, out R r, int s);

  static void Send(INPUT i) { SendInput(1, new[] { i }, Marshal.SizeOf(typeof(INPUT))); }
  static void Mouse(uint flags) { var i = new INPUT { type = 0 }; i.mi.flags = flags; Send(i); }
  public static void Down() { Mouse(0x0002); }
  public static void Up() { Mouse(0x0004); }
  public static void Click(int x, int y) {
    SetCursorPos(x, y); Thread.Sleep(60);
    Mouse(0x0002); Thread.Sleep(40); Mouse(0x0004);
  }
  public static void Key(ushort vk, bool up) {
    var i = new INPUT { type = 1 }; i.ki.vk = vk; i.ki.flags = up ? 2u : 0u; Send(i);
  }
  // Unicode characters as VK_PACKET, so the keyboard layout and IME do not matter.
  public static void Char(char c) {
    var d = new INPUT { type = 1 }; d.ki.scan = c; d.ki.flags = 4; Send(d);
    var u = new INPUT { type = 1 }; u.ki.scan = c; u.ki.flags = 6; Send(u);
  }
}
"@

# Only a greenterm built from this repo ($GtExe, set by record.ps1), never an
# installed one that may be running with real work in it.
function Get-GtWindow {
  $p = Get-Process greenterm -ErrorAction SilentlyContinue |
    Where-Object { $_.MainWindowHandle -ne 0 -and $_.Path -like $GtExe } | Select-Object -First 1
  if (-not $p) { throw "no greenterm matching $GtExe is running" }
  $p.MainWindowHandle
}

# 9 = DWMWA_EXTENDED_FRAME_BOUNDS: the visible frame, without resize borders.
function Get-GtFrame {
  $r = New-Object Ui+R
  [Ui]::DwmGetWindowAttribute((Get-GtWindow), 9, [ref]$r, 16) | Out-Null
  $r
}

function Assert-GtFocus {
  if ([Ui]::GetForegroundWindow() -ne (Get-GtWindow)) { throw "greenterm lost focus; demo stopped" }
}

function Click-Gt([int]$x, [int]$y) { Assert-GtFocus; $f = Get-GtFrame; [Ui]::Click($f.L + $x, $f.T + $y) }

function Type-Gt([string]$text, [int]$delayMs = 45) {
  foreach ($c in $text.ToCharArray()) { Assert-GtFocus; [Ui]::Char($c); Start-Sleep -Milliseconds $delayMs }
}

function Enter-Gt { Assert-GtFocus; [Ui]::Key(0x0D, $false); [Ui]::Key(0x0D, $true) }

# Ctrl + a letter key, e.g. CtrlKey-Gt 0x43 for Ctrl+C.
function CtrlKey-Gt([uint16]$vk) {
  Assert-GtFocus
  [Ui]::Key(0x11, $false); [Ui]::Key($vk, $false); [Ui]::Key($vk, $true); [Ui]::Key(0x11, $true)
}

function CtrlC-Gt { CtrlKey-Gt 0x43 }

# Smooth cursor glide so the recording shows where the pointer goes.
function Move-Gt([int]$x, [int]$y, [int]$ms = 280) {
  $f = Get-GtFrame; $p = New-Object Ui+P; [Ui]::GetCursorPos([ref]$p) | Out-Null
  $tx = $f.L + $x; $ty = $f.T + $y; $steps = [math]::Max(1, [int]($ms / 14))
  for ($i = 1; $i -le $steps; $i++) {
    $e = 1 - [math]::Pow(1 - $i / $steps, 3)
    [Ui]::SetCursorPos([int]($p.X + ($tx - $p.X) * $e), [int]($p.Y + ($ty - $p.Y) * $e)) | Out-Null
    Start-Sleep -Milliseconds 14
  }
}

function Tap($pt) { Move-Gt $pt[0] $pt[1]; Start-Sleep -Milliseconds 120; Click-Gt $pt[0] $pt[1] }

# Two clicks close enough in time and place to count as a double-click.
function DoubleTap($pt) {
  Move-Gt $pt[0] $pt[1]; Start-Sleep -Milliseconds 120
  Click-Gt $pt[0] $pt[1]; Start-Sleep -Milliseconds 90; Click-Gt $pt[0] $pt[1]
}

# Press at $from, glide to $to, release. The button is always released.
function Drag-Gt($from, $to, [int]$ms = 900) {
  Move-Gt $from[0] $from[1]; Start-Sleep -Milliseconds 150
  Assert-GtFocus; [Ui]::Down()
  try { Move-Gt $to[0] $to[1] $ms; Start-Sleep -Milliseconds 350; Assert-GtFocus }
  finally { [Ui]::Up() }
}

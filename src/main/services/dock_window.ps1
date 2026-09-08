param (
    [string]$ChildTitle = "GameinPC - Mirror View",
    [long]$ParentHwnd = 0,
    [int]$X = 0,
    [int]$Y = 48,
    [int]$Width = 1080,
    [int]$Height = 720
)

$csharp = @"
using System;
using System.Runtime.InteropServices;

public class Win32Native {
    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern IntPtr SetParent(IntPtr hWndChild, IntPtr hWndNewParent);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool SetWindowPos(IntPtr hWnd, IntPtr hWndInsertAfter, int X, int Y, int cx, int cy, uint uFlags);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern int SetWindowLong(IntPtr hWnd, int nIndex, int dwNewLong);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern int GetWindowLong(IntPtr hWnd, int nIndex);

    [DllImport("user32.dll", SetLastError = true)]
    public static extern bool ShowWindow(IntPtr hWnd, int nCmdShow);
}
"@

try {
    Add-Type -TypeDefinition $csharp -Language CSharp -ErrorAction SilentlyContinue
} catch {}

$childHwnd = [Win32Native]::FindWindow([string]::Empty, $ChildTitle)
if ($childHwnd -eq [IntPtr]::Zero) {
    # Retry once after 300ms
    Start-Sleep -Milliseconds 300
    $childHwnd = [Win32Native]::FindWindow([string]::Empty, $ChildTitle)
}

if ($childHwnd -ne [IntPtr]::Zero -and $ParentHwnd -ne 0) {
    $parentIntPtr = [IntPtr]$ParentHwnd
    
    # 1. Set Parent to Electron Window
    [Win32Native]::SetParent($childHwnd, $parentIntPtr)
    
    # 2. Modify Window Style: WS_CHILD (0x40000000) | WS_VISIBLE (0x10000000) = 0x50000000
    # Remove WS_POPUP (0x80000000) and WS_CAPTION (0x00C00000)
    $GWL_STYLE = -16
    $style = [Win32Native]::GetWindowLong($childHwnd, $GWL_STYLE)
    $newStyle = ($style -band (-bnot 0x80C00000)) -bor 0x40000000 -bor 0x10000000
    [Win32Native]::SetWindowLong($childHwnd, $GWL_STYLE, $newStyle)
    
    # 3. Position inside the Electron container (SWP_NOZORDER = 0x0004, SWP_FRAMECHANGED = 0x0020, SWP_SHOWWINDOW = 0x0040)
    $SWP_FLAGS = 0x0004 -bor 0x0020 -bor 0x0040
    [Win32Native]::SetWindowPos($childHwnd, [IntPtr]::Zero, $X, $Y, $Width, $Height, $SWP_FLAGS)
    
    Write-Output "DOCKED_SUCCESS"
} else {
    Write-Output "WINDOW_NOT_FOUND"
}

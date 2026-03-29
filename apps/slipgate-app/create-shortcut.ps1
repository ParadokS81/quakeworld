$ws = New-Object -ComObject WScript.Shell
$shortcut = $ws.CreateShortcut("$env:USERPROFILE\Desktop\Slipgate Dev.lnk")
$shortcut.TargetPath = "cmd.exe"
$shortcut.Arguments = "/k cd /d `"C:\Users\Administrator\projects\slipgate-app`" && bun run tauri dev"
$shortcut.WorkingDirectory = "C:\Users\Administrator\projects\slipgate-app"
$shortcut.Description = "Start Slipgate App dev server"
$shortcut.Save()
Write-Host "Shortcut created on Desktop"

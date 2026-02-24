$WshShell = New-Object -comObject WScript.Shell

# Desktop Shortcut
$Shortcut = $WshShell.CreateShortcut("$HOME\Desktop\OrthoData.lnk")
$Shortcut.TargetPath = "wscript.exe"
$Shortcut.Arguments = """c:\Users\akermaoui\Downloads\orthodata\OrthoData_Silent.vbs"""
$Shortcut.WorkingDirectory = "c:\Users\akermaoui\Downloads\orthodata"
$Shortcut.IconLocation = "c:\Users\akermaoui\Downloads\orthodata\public\logo1.ico"
$Shortcut.Save()

# Stop Shortcut (Desktop)
$StopShortcut = $WshShell.CreateShortcut("$HOME\Desktop\Stop OrthoData.lnk")
$StopShortcut.TargetPath = "c:\Users\akermaoui\Downloads\orthodata\Stop_OrthoData.bat"
$StopShortcut.WorkingDirectory = "c:\Users\akermaoui\Downloads\orthodata"
$StopShortcut.IconLocation = "shell32.dll,27" # Warning/Stop icon
$StopShortcut.Save()

Write-Host "Shortcuts updated!"

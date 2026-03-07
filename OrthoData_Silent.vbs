Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")
ScriptDir = FSO.GetParentFolderName(WScript.ScriptFullName)

' 1. Start Backend (Hidden)
WshShell.CurrentDirectory = ScriptDir & "\app-patients-backend"
WshShell.Run "cmd /c npm start", 0, False

' 2. Start Frontend (Hidden)
WshShell.CurrentDirectory = ScriptDir
WshShell.Run "cmd /c npm run dev -- --host", 0, False

' 3. Open Browser after 5 seconds
WScript.Sleep 5000
WshShell.Run "http://10.4.28.11:80/orthodata/"

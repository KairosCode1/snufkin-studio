Dim sh, dir
dir = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\") - 1)
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = dir

' Instalar node_modules si no existen
If Not CreateObject("Scripting.FileSystemObject").FolderExists(dir & "\node_modules") Then
    sh.Run "cmd /c npm install", 0, True
End If

' Arrancar Electron sin terminal visible
sh.Run "cmd /c npx electron .", 0, False

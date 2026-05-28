' ABRIR_ELECTRON.vbs — Launcher robusto de SnufkinStudio
'  1. Mata procesos huérfanos (electron + python en puerto 7331) de sesiones anteriores
'  2. Instala node_modules si faltan
'  3. Lanza una sola instancia de Electron (single-instance lock en main.js)

Option Explicit
Dim sh, fso, dir, http, alreadyRunning, cmd
dir = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\") - 1)
Set sh  = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
sh.CurrentDirectory = dir

' ── 1. Comprobar si el server YA responde (instancia anterior viva y sana) ──
alreadyRunning = False
On Error Resume Next
Set http = CreateObject("WinHttp.WinHttpRequest.5.1")
http.Open "GET", "http://127.0.0.1:7331/", False
http.SetTimeouts 800, 800, 800, 800
http.Send
If Err.Number = 0 And http.Status = 200 Then alreadyRunning = True
On Error GoTo 0

' Si la app ya está corriendo, el single-instance lock de Electron hará que el
' nuevo proceso se cierre solo. No hacemos nada más.
If alreadyRunning Then
    ' Aún así lanzamos electron — el lock devuelve foco a la ventana existente
    sh.Run "cmd /c npx electron .", 0, False
    WScript.Quit
End If

' ── 2. Matar procesos huérfanos (electron, python, node) que puedan bloquear puerto ──
'    Si el server NO respondió pero hay procesos electron/python vivos, son zombies
On Error Resume Next
sh.Run "cmd /c taskkill /F /IM electron.exe /T", 0, True
sh.Run "cmd /c taskkill /F /IM python.exe /T", 0, True
sh.Run "cmd /c taskkill /F /IM pythonw.exe /T", 0, True
' Liberar puerto 7331 por si quedó alguno colgado
sh.Run "cmd /c for /f ""tokens=5"" %a in ('netstat -aon ^| findstr :7331 ^| findstr LISTENING') do taskkill /F /PID %a", 0, True
WScript.Sleep 500
On Error GoTo 0

' ── 3. Instalar node_modules si no existen ──
If Not fso.FolderExists(dir & "\node_modules") Then
    sh.Run "cmd /c npm install", 0, True
End If

' ── 4. Arrancar Electron en background sin terminal visible ──
sh.Run "cmd /c npx electron .", 0, False

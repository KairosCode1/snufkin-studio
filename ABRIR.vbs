Dim sh, dir, http, running
dir = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\") - 1)
Set sh = CreateObject("WScript.Shell")
sh.CurrentDirectory = dir

' Comprobar si el servidor ya esta corriendo
running = False
On Error Resume Next
Set http = CreateObject("WinHttp.WinHttpRequest.5.1")
http.Open "GET", "http://localhost:7331", False
http.SetTimeouts 800, 800, 800, 800
http.Send
If Err.Number = 0 Then running = True
On Error GoTo 0

' Si no corre, arrancar Python y esperar
If Not running Then
    sh.Run "pythonw server.py", 0, False
    WScript.Sleep 2500
End If

' Abrir navegador siempre
sh.Run "http://localhost:7331"

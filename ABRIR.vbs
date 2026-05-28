' ABRIR.vbs — Redirección por compatibilidad
'
' Este script ANTIGUO arrancaba el server y abría el navegador.
' Ahora simplemente delega a ABRIR_ELECTRON.vbs para que abra la app de
' escritorio (Electron) — el navegador ya no se usa.
'
' Se mantiene solo por compatibilidad con shortcuts viejos o scripts
' externos que aún apunten aquí.

Dim sh, dir
dir = Left(WScript.ScriptFullName, InStrRev(WScript.ScriptFullName, "\") - 1)
Set sh = CreateObject("WScript.Shell")
sh.Run """" & dir & "\ABRIR_ELECTRON.vbs""", 0, False

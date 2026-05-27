$ws = New-Object -ComObject WScript.Shell
$s = $ws.CreateShortcut("$env:USERPROFILE\Desktop\Auto Captions.lnk")
$s.TargetPath = "$env:USERPROFILE\Desktop\auto-captions\ABRIR.vbs"
$s.WorkingDirectory = "$env:USERPROFILE\Desktop\auto-captions"
$s.Description = "Abrir Auto Captions"
$s.Save()
Write-Host "Acceso directo creado en el escritorio"

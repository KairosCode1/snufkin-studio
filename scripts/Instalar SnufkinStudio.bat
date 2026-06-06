@echo off
title SnufkinStudio — Instalador
chcp 65001 >nul 2>&1

powershell -NoProfile -ExecutionPolicy Bypass -Command "
  Add-Type -AssemblyName PresentationFramework | Out-Null
  [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.SecurityProtocolType]::Tls12

  # ── Obtener la última versión desde GitHub ──────────────────────────────────
  try {
    $api = Invoke-RestMethod 'https://api.github.com/repos/KairosCode1/snufkin-studio/releases/latest' -ErrorAction Stop
  } catch {
    [System.Windows.MessageBox]::Show(
      'No se pudo conectar a GitHub para comprobar la versión.`nComprueba tu conexión a internet e inténtalo de nuevo.',
      'SnufkinStudio — Error', 'OK', 'Error') | Out-Null
    exit 1
  }

  $version = $api.tag_name -replace '^v',''
  $asset   = $api.assets | Where-Object { $_.name -like 'SnufkinStudio-Setup-*.exe' } | Select-Object -First 1

  if (-not $asset) {
    [System.Windows.MessageBox]::Show(
      'No se encontró el instalador en el último release de GitHub.',
      'SnufkinStudio — Error', 'OK', 'Error') | Out-Null
    exit 1
  }

  $url      = $asset.browser_download_url
  $tmpFile  = Join-Path $env:TEMP ('SnufkinStudio-Setup-' + $version + '.exe')

  # ── Si ya lo descargamos antes, reutilizarlo ────────────────────────────────
  if (-not (Test-Path $tmpFile)) {
    Write-Host ''
    Write-Host '  Descargando SnufkinStudio v' $version '...'
    Write-Host ''

    try {
      $wc = New-Object System.Net.WebClient
      $wc.DownloadFile($url, $tmpFile)
    } catch {
      [System.Windows.MessageBox]::Show(
        ('Error descargando el instalador:`n' + $_.Exception.Message),
        'SnufkinStudio — Error', 'OK', 'Error') | Out-Null
      exit 1
    }
  } else {
    Write-Host ''
    Write-Host '  Instalador v' $version 'ya descargado — usando copia en caché.'
  }

  # ── Lanzar el instalador ────────────────────────────────────────────────────
  Write-Host '  Instalando...'
  Start-Process -FilePath $tmpFile -Wait
  Write-Host ''
  Write-Host '  ¡Listo! SnufkinStudio v' $version 'instalado.'
"

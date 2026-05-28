# SnufkinStudio — Guía de Colaboración

Esta guía explica cómo tú y tu colaborador podéis trabajar juntos en SnufkinStudio,
publicar actualizaciones y que ambos las recibáis automáticamente.

---

## Cómo funciona el sistema

```
[Kairo hace cambios] → PUBLICAR_UPDATE.bat → GitHub Release v1.x.x
                                                        ↓
[Amigo hace cambios] → PUBLICAR_UPDATE.bat → GitHub Release v1.x.x
                                                        ↓
                          Ambas apps reciben la actualización automáticamente al abrirlas
```

- El sistema de auto-actualizaciones ya está configurado en la app (`electron-updater`).
- Cuando se publica una nueva versión en GitHub, **cualquier usuario que tenga la app instalada
  la recibe automáticamente** la próxima vez que la abra.
- Tanto tú como tu amigo podéis publicar actualizaciones con el script `PUBLICAR_UPDATE.bat`.

---

## LO QUE TIENES QUE HACER TÚ (Kairo) — una sola vez

### 1. Añadir a tu amigo como colaborador en GitHub

1. Ve a → https://github.com/KairosCode1/snufkin-studio/settings/access
2. Haz clic en **"Add people"**
3. Introduce el usuario de GitHub de tu amigo
4. Selecciona rol **"Write"** (puede hacer push y publicar releases)
5. Tu amigo recibirá un email para aceptar la invitación

---

## LO QUE TIENE QUE HACER TU AMIGO — configuración inicial

### Paso 1 — Instalar herramientas

Descargar e instalar en orden:

| Herramienta | Enlace | Notas |
|-------------|--------|-------|
| **Git** | https://git-scm.com/download/win | Opciones por defecto |
| **Node.js LTS** | https://nodejs.org/en/download | Versión LTS (la verde) |
| **Claude Code** | https://claude.ai/download | App de escritorio |

### Paso 2 — Crear un token de GitHub

Este token permite publicar releases desde su ordenador.

1. Ir a → https://github.com/settings/tokens/new
2. En **"Note"** escribir: `SnufkinStudio releases`
3. En **"Expiration"** seleccionar: `No expiration`
4. En **"Select scopes"** marcar: ✅ `repo` (todo el bloque)
5. Hacer clic en **"Generate token"**
6. **Copiar el token** (empieza por `ghp_...`) — solo se muestra una vez

### Paso 3 — Configurar el token en Windows

Ejecutar esto en CMD o PowerShell (sustituir `ghp_XXXXXXXXX` por el token real):

```cmd
setx GH_TOKEN "ghp_XXXXXXXXX"
```

Cerrar y volver a abrir cualquier terminal después de este comando.

### Paso 4 — Clonar el repositorio

En una carpeta de su elección (ej: Escritorio):

```cmd
git clone https://github.com/KairosCode1/snufkin-studio.git
cd snufkin-studio
npm install
```

### Paso 5 — Verificar que todo funciona

```cmd
git pull origin main
node -v    # debe mostrar v18 o superior
```

---

## FLUJO DE TRABAJO DIARIO

### Para hacer cambios (cualquiera de los dos):

1. **Abrir Claude Code** en la carpeta del proyecto
2. Pedirle a Claude que haga los cambios que quieras
3. Cuando estés satisfecho, ejecutar `PUBLICAR_UPDATE.bat`
4. Introducir la nueva versión (ej: `1.2.0`)
5. Esperar a que termine (~3-5 minutos)
6. ¡Listo! La nueva versión aparecerá en todos los ordenadores con la app instalada

### Regla de versiones sugerida:

- `1.1.x` → correcciones pequeñas (1.1.1, 1.1.2...)
- `1.x.0` → nueva funcionalidad (1.2.0, 1.3.0...)
- `x.0.0` → cambio grande (2.0.0...)

### Sincronizar antes de empezar:

Si el otro colaborador publicó una actualización, primero hacer pull:

```cmd
git pull origin main
```

---

## CÓMO RECIBEN LAS ACTUALIZACIONES LOS USUARIOS

- Al abrir la app, **espera 5 segundos** y comprueba GitHub
- Si hay versión nueva: aparece un diálogo preguntando si quiere actualizar
- El usuario hace clic en "Actualizar" y la app se reinicia con la nueva versión
- **No necesitan descargar nada manualmente**

---

## Archivos importantes del proyecto

```
snufkin-studio/
├── auto_captions.py          ← Motor Python de captions (lógica principal)
├── server.py                 ← Servidor FastAPI (API endpoints)
├── static/src/
│   ├── App.js                ← App React principal
│   ├── VideoEditor.js        ← Editor de video con overlay de captions
│   ├── Settings.js           ← Panel de ajustes/estilos
│   ├── Uploader.js           ← Pantalla de subida de video
│   └── Hero.js               ← Pantalla de inicio
├── electron/
│   └── main.js               ← Ventana Electron + auto-updates
├── package.json              ← Versión de la app (cambiar aquí para releases)
└── PUBLICAR_UPDATE.bat       ← Script para publicar nueva versión
```

---

## Soporte / Problemas comunes

**"npm run release falla con error de autenticación"**
→ El token `GH_TOKEN` no está configurado o ha expirado. Repetir Paso 2 y 3.

**"git push falla con 'permission denied'"**
→ No has sido añadido como colaborador. Pedir a Kairo que te añada (Paso de Kairo).

**"La app no recibe actualizaciones"**
→ Comprobar que `latest.yml` está en el release de GitHub. Ejecutar `npm run release` de nuevo.

**"Conflicto al hacer git pull"**
→ Abrir Claude Code y pedirle que resuelva el conflicto en los archivos marcados.

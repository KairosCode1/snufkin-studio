// Settings modal — Groq API key management
// Only shown when running inside Electron (window.electronAPI.isElectron === true)
// Falls back to the /api/settings HTTP endpoint for browser-mode dev

const { useState: useStateS, useEffect: useEffectS, useCallback: useCallbackS } = React;
const { motion: motionS, AnimatePresence: AnimatePresenceS } = window.Motion;

/* ── tiny SVG icons ─────────────────────────────────────────────────────────── */
function IconGear({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  );
}

function IconClose({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  );
}

function IconKey({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
    </svg>
  );
}

function IconCheck({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

/* ── API helpers ─────────────────────────────────────────────────────────────── */
async function apiGetSettings() {
  if (window.electronAPI) return window.electronAPI.getSettings();
  const r = await fetch('/api/settings');
  return r.json();
}

async function apiSaveSettings(data) {
  if (window.electronAPI) return window.electronAPI.saveSettings(data);
  const r = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return r.json();
}

async function apiDeleteKey() {
  if (window.electronAPI) return window.electronAPI.deleteGroqKey();
  await fetch('/api/settings/groq_api_key', { method: 'DELETE' });
}

/* ── Main Settings Modal ─────────────────────────────────────────────────────── */
function SettingsModal({ onClose }) {
  const [keyValue,  setKeyValue]  = useStateS('');
  const [masked,    setMasked]    = useStateS('');
  const [keySet,    setKeySet]    = useStateS(false);
  const [loading,   setLoading]   = useStateS(true);
  const [saving,    setSaving]    = useStateS(false);
  const [saved,     setSaved]     = useStateS(false);
  const [showKey,   setShowKey]   = useStateS(false);
  const [error,     setError]     = useStateS('');

  useEffectS(() => {
    apiGetSettings()
      .then((s) => {
        setKeySet(s.groqApiKeySet || s.groq_api_key_set || false);
        setMasked(s.groqApiKeyMasked || s.groq_api_key_masked || '');
      })
      .catch(() => setError('No se pudo conectar con el servidor.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = useCallbackS(async () => {
    const trimmed = keyValue.trim();
    if (!trimmed) return;
    setSaving(true);
    setError('');
    try {
      await apiSaveSettings({ groqApiKey: trimmed });
      setKeySet(true);
      setMasked(trimmed.slice(0, 8) + '...' + trimmed.slice(-4));
      setKeyValue('');
      setSaved(true);
      // Notificar al banner de advertencia para que se oculte
      window.dispatchEvent(new CustomEvent('groq-key-saved'));
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError('Error al guardar. Inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }, [keyValue]);

  const handleDelete = useCallbackS(async () => {
    setSaving(true);
    try {
      await apiDeleteKey();
      setKeySet(false);
      setMasked('');
      setKeyValue('');
    } catch (e) {
      setError('Error al eliminar la key.');
    } finally {
      setSaving(false);
    }
  }, []);

  const handleKeyDown = useCallbackS((e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') onClose();
  }, [handleSave, onClose]);

  return (
    <motionS.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(5,5,6,0.82)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <motionS.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 480,
          background: 'linear-gradient(160deg, rgba(255,255,255,0.055) 0%, rgba(255,255,255,0.018) 100%)',
          backdropFilter: 'blur(40px)',
          WebkitBackdropFilter: 'blur(40px)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 20,
          boxShadow: '0 0 0 1px rgba(255,255,255,0.04), 0 24px 64px rgba(0,0,0,0.70), 0 0 100px rgba(94,106,210,0.06)',
          padding: '32px 32px 28px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Top shimmer line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.10), transparent)',
          pointerEvents: 'none',
        }} />

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '50%', width: 32, height: 32,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#6b7280', cursor: 'pointer',
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.10)'; e.currentTarget.style.color = '#EDEDEF'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#6b7280'; }}
        >
          <IconClose />
        </button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(94,106,210,0.25), rgba(94,106,210,0.10))',
            border: '1px solid rgba(94,106,210,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#7C85E0',
          }}>
            <IconGear size={17} />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#EDEDEF', letterSpacing: '-0.01em' }}>
              Configuración
            </div>
            <div style={{ fontSize: 12, color: '#4a4e5a', marginTop: 1 }}>
              SnufkinStudio
            </div>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 24 }} />

        {loading ? (
          <div style={{ textAlign: 'center', color: '#4a4e5a', fontSize: 13, padding: '16px 0' }}>
            Cargando…
          </div>
        ) : (
          <>
            {/* Section: Groq API Key */}
            <div style={{ marginBottom: 20 }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7,
                marginBottom: 10, color: '#8A8F98', fontSize: 12,
                fontWeight: 500, letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                <IconKey size={13} />
                Groq API Key
              </div>

              {/* Current key status */}
              {keySet && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  background: 'rgba(94,106,210,0.08)',
                  border: '1px solid rgba(94,106,210,0.18)',
                  borderRadius: 10, padding: '9px 14px',
                  marginBottom: 12,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: '#4ADE80',
                      boxShadow: '0 0 6px rgba(74,222,128,0.80)',
                    }} />
                    <span style={{ fontSize: 13, color: '#8A8F98', fontFamily: 'monospace' }}>
                      {masked}
                    </span>
                  </div>
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    style={{
                      background: 'none', border: 'none',
                      color: '#4a4e5a', fontSize: 11, cursor: 'pointer',
                      padding: '2px 6px', borderRadius: 5,
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = '#FF3D9A'; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = '#4a4e5a'; }}
                  >
                    Eliminar
                  </button>
                </div>
              )}

              {/* Input for new key */}
              <div style={{ position: 'relative' }}>
                <input
                  type={showKey ? 'text' : 'password'}
                  value={keyValue}
                  onChange={(e) => setKeyValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={keySet ? 'Reemplazar con nueva key…' : 'gsk_…'}
                  autoComplete="off"
                  spellCheck={false}
                  style={{
                    width: '100%',
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 10,
                    padding: '10px 42px 10px 14px',
                    fontSize: 13,
                    color: '#EDEDEF',
                    fontFamily: 'monospace',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(94,106,210,0.45)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; }}
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    color: '#4a4e5a', cursor: 'pointer', fontSize: 11,
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = '#8A8F98'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = '#4a4e5a'; }}
                >
                  {showKey ? 'Ocultar' : 'Ver'}
                </button>
              </div>

              <div style={{ marginTop: 7, fontSize: 11, color: '#383c47', lineHeight: 1.5 }}>
                Consigue tu key gratis en{' '}
                <span
                  style={{ color: '#5E6AD2', cursor: 'pointer', textDecoration: 'underline' }}
                  onClick={() => window.open('https://console.groq.com/keys', '_blank')}
                >
                  console.groq.com/keys
                </span>
                . Es necesaria para la detección de palabras clave y clips virales.
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                background: 'rgba(255,61,61,0.10)',
                border: '1px solid rgba(255,61,61,0.20)',
                borderRadius: 8, padding: '8px 12px',
                fontSize: 12, color: '#ff6b6b',
                marginBottom: 16,
              }}>
                {error}
              </div>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', marginBottom: 20 }} />

            {/* Save button */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={onClose}
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.07)',
                  borderRadius: 9999, padding: '9px 18px',
                  fontSize: 13, color: '#6b7280', cursor: 'pointer',
                  transition: 'background 0.15s, color 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#EDEDEF'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#6b7280'; }}
              >
                Cerrar
              </button>

              <button
                onClick={handleSave}
                disabled={saving || !keyValue.trim()}
                style={{
                  background: saved
                    ? 'linear-gradient(135deg, rgba(74,222,128,0.25), rgba(74,222,128,0.10))'
                    : 'linear-gradient(135deg, rgba(94,106,210,0.40), rgba(94,106,210,0.20))',
                  border: saved
                    ? '1px solid rgba(74,222,128,0.35)'
                    : '1px solid rgba(94,106,210,0.35)',
                  borderRadius: 9999, padding: '9px 22px',
                  fontSize: 13, fontWeight: 500,
                  color: saved ? '#4ADE80' : '#A5ADFF',
                  cursor: (saving || !keyValue.trim()) ? 'not-allowed' : 'pointer',
                  opacity: (saving || !keyValue.trim()) ? 0.5 : 1,
                  transition: 'all 0.2s',
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {saved ? <><IconCheck /> Guardado</> : saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </>
        )}
      </motionS.div>
    </motionS.div>
  );
}

/* ── Banner de advertencia de API key no configurada ────────────────────────── */
function GroqWarningBanner() {
  const [show, setShow] = useStateS(null); // null=cargando, false=oculto, true=visible

  useEffectS(() => {
    async function checkKey() {
      try {
        let s;
        if (window.electronAPI) {
          s = await window.electronAPI.getSettings();
        } else {
          const r = await fetch('/api/settings');
          s = await r.json();
        }
        const keySet = s.groqApiKeySet || s.groq_api_key_set || false;
        setShow(!keySet);
      } catch (_) {
        setShow(false); // Si no se puede comprobar, no mostrar
      }
    }
    checkKey();

    const handler = () => setShow(false);
    window.addEventListener('groq-key-saved', handler);
    return () => window.removeEventListener('groq-key-saved', handler);
  }, []);

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
      background: 'rgba(12,8,4,0.94)',
      borderTop: '1px solid rgba(251,146,60,0.28)',
      backdropFilter: 'blur(18px)',
      WebkitBackdropFilter: 'blur(18px)',
      padding: '11px 24px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14,
    }}>
      <span style={{
        fontSize: 12.5,
        color: 'rgba(251,146,60,0.88)',
        fontFamily: "'Inter', sans-serif",
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <span style={{
          fontSize: 13,
          background: 'rgba(251,146,60,0.15)',
          border: '1px solid rgba(251,146,60,0.25)',
          borderRadius: 4,
          padding: '1px 6px',
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 700,
          letterSpacing: '0.05em',
        }}>⚠ IMPORTANTE</span>
        Necesitas conectar tu API de Groq para que el programa funcione
      </span>
      <button
        onClick={() => typeof window.__openSettings === 'function' && window.__openSettings()}
        style={{
          background: 'rgba(251,146,60,0.12)',
          border: '1px solid rgba(251,146,60,0.32)',
          borderRadius: 8,
          padding: '6px 14px',
          fontSize: 11.5,
          color: 'rgba(251,146,60,0.90)',
          cursor: 'pointer',
          fontFamily: "'Outfit', sans-serif",
          fontWeight: 700,
          letterSpacing: '0.06em',
          transition: 'all 0.15s',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(251,146,60,0.22)';
          e.currentTarget.style.color = '#fb923c';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(251,146,60,0.12)';
          e.currentTarget.style.color = 'rgba(251,146,60,0.90)';
        }}
      >
        Conectar API →
      </button>
    </div>
  );
}

/* ── Gear button trigger (used in Hero) ─────────────────────────────────────── */
function SettingsButton() {
  const [open, setOpen] = useStateS(false);

  // Exponer en window para que el banner pueda abrir el modal sin prop drilling
  useEffectS(() => {
    window.__openSettings = () => setOpen(true);
    return () => { window.__openSettings = null; };
  }, [setOpen]);

  // Only render if inside Electron OR the /api/settings endpoint is available
  // (in plain browser we still show it for dev convenience)
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="Configuración"
        style={{
          position: 'fixed',
          top: 18, right: 20,
          zIndex: 100,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: '50%',
          width: 38, height: 38,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#4a4e5a',
          cursor: 'pointer',
          transition: 'background 0.18s, color 0.18s, border-color 0.18s',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(94,106,210,0.15)';
          e.currentTarget.style.color = '#7C85E0';
          e.currentTarget.style.borderColor = 'rgba(94,106,210,0.30)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          e.currentTarget.style.color = '#4a4e5a';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
        }}
      >
        <IconGear size={16} />
      </button>

      <AnimatePresenceS>
        {open && <SettingsModal onClose={() => setOpen(false)} />}
      </AnimatePresenceS>
    </>
  );
}

window.SettingsButton    = SettingsButton;
window.SettingsModal     = SettingsModal;
window.GroqWarningBanner = GroqWarningBanner;

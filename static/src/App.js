// App entry
function App() {
  const { useState, useEffect } = React;

  const Hero              = window.Hero;
  const SettingsButton    = window.SettingsButton;
  const GroqWarningBanner = window.GroqWarningBanner;
  const Activation        = window.Activation;

  // null = checking, false = not activated, true = activated
  const [activated, setActivated] = useState(null);

  useEffect(() => {
    // If not running in Electron, skip activation gate
    if (!window.electronAPI?.activationCheck) {
      setActivated(true);
      return;
    }
    window.electronAPI.activationCheck().then(res => {
      setActivated(res?.activated === true);
    }).catch(() => {
      // On error, allow access so a server error doesn't brick the app
      setActivated(true);
    });
  }, []);

  // Still checking — render nothing (avoids flash of activation screen)
  if (activated === null) return null;

  // Not yet activated — show activation gate
  if (!activated) {
    return <Activation onActivated={() => setActivated(true)} />;
  }

  // Activated — normal app
  return (
    <main>
      <Hero />
      <SettingsButton />
      <GroqWarningBanner />
    </main>
  );
}

const rootEl = document.getElementById("root");
ReactDOM.createRoot(rootEl).render(<App />);

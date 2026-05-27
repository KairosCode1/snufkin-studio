// App entry
function App() {
  const Hero              = window.Hero;
  const SettingsButton    = window.SettingsButton;
  const GroqWarningBanner = window.GroqWarningBanner;
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

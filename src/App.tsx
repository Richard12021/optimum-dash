
import { useState } from "react";
import "./App.css";
import GameCanvas from "./components/GameCanvas";


type Screen = "home" | "game" | "how-to-play" | "leaderboard";


function App() {
  const [screen, setScreen] = useState<Screen>("home");

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <img
            src="/assets/branding/optimum-logo.jpg"
            alt="Optimum Logo"
            className="brand-logo"
          />
          <span>OPTIMUM</span>
        </div>

        <div className="version">COMMUNITY GAME V1.0</div>
      </header>

      <main className="main-content">
        {screen === "home" && (
          <section className="home-screen">
            <div className="game-label">THE NETWORK ADVENTURE</div>

            <h1 className="game-title">
              OPTIMUM <span>DASH</span>
            </h1>

            <p className="game-subtitle">
              RUN THE NETWORK. BEAT THE LATENCY.
            </p>

            <div className="mascot-container">
              <div className="mascot-glow" />
              <img
                src="/assets/mascot/optimum-mascot.jpg"
                alt="Optimum Mascot"
                className="mascot-image"
              />
            </div>

            <div className="menu-buttons">
              <button
                className="play-button"
                
onClick={() => setScreen("game")}

              >
                ▶ PLAY GAME
              </button>

              <button
                className="secondary-button"
                onClick={() => setScreen("leaderboard")}
              >
                🏆 LEADERBOARD
              </button>

              <button
                className="secondary-button"
                onClick={() => setScreen("how-to-play")}
              >
                🎮 HOW TO PLAY
              </button>
            </div>
          </section>
        )}

{screen === "game" && (
  <section className="game-screen">
    <div className="game-topbar">
      <div className="game-topbar-brand">
        <img
          src="/assets/branding/optimum-logo.jpg"
          alt="Optimum Logo"
          className="game-topbar-logo"
        />
        <span>OPTIMUM DASH</span>
      </div>

      <button
        className="game-back-button"
        onClick={() => setScreen("home")}
      >
        ← BACK HOME
      </button>
    </div>

    <GameCanvas />

    <div className="game-controls-hint">
      ← → / A D — MOVE BETWEEN LANES
    </div>
  </section>
)}

        {screen === "how-to-play" && (
          <section className="info-screen">
            <h2>HOW TO PLAY</h2>

            <p>Help the Optimum mascot survive the network!</p>

            <div className="instructions">
              <p>← → Move between lanes</p>
              <p>↑ / SPACE Jump</p>
              <p>↓ Slide</p>
              <p>Collect Data Shards to earn points</p>
              <p>Avoid Downtime and Congestion obstacles</p>
            </div>

            <button
              className="secondary-button"
              onClick={() => setScreen("home")}
            >
              ← BACK HOME
            </button>
          </section>
        )}

        {screen === "leaderboard" && (
          <section className="info-screen">
            <h2>LEADERBOARD</h2>

            <p>Community rankings are coming soon.</p>

            <button
              className="secondary-button"
              onClick={() => setScreen("home")}
            >
              ← BACK HOME
            </button>
          </section>
        )}
      </main>

      <footer className="footer">
        BUILT FOR THE OPTIMUM COMMUNITY
      </footer>
    </div>
  );
}

export default App;

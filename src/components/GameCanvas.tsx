
import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { gameConfig } from "../game/config";

export default function GameCanvas() {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) {
      return;
    }

    const game = new Phaser.Game({
      ...gameConfig,
      parent: containerRef.current,
    });

    gameRef.current = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div className="game-canvas-wrapper">
      <div
        ref={containerRef}
        className="game-canvas-container"
      />
    </div>
  );
}

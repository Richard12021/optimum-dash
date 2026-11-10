
import Phaser from "phaser";

export default class GameScene extends Phaser.Scene {
  
private player!: Phaser.GameObjects.Sprite;

  private roadGraphics!: Phaser.GameObjects.Graphics;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  
private keys!: {
  A: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
};


  private currentLane = 1;
  
private isJumping = false;

private isSliding = false;
private readonly SLIDE_DURATION = 650;
private readonly PLAYER_NORMAL_HEIGHT = 190;
private readonly PLAYER_SLIDE_HEIGHT = 105;

private jumpHeight = 0;
private readonly JUMP_DURATION = 650;
private readonly JUMP_HEIGHT = 95;

  private roadOffset = 0;



private obstacles: {
  type: "spike" | "jumpBarrier";
  lane: number;
  progress: number;
  graphics: Phaser.GameObjects.Graphics;
  waveId: number;
}[] = [];

private nextObstacleWaveId = 0;
private rewardedNearMissWaves = new Set<number>();



private obstacleSpeed = 0.00022;

private coins: {
  lane: number;
  progress: number;
  graphics: Phaser.GameObjects.Graphics;
}[] = [];

private coinSpeed = 0.00022;

private codeShards: {
  lane: number;
  progress: number;
  graphics: Phaser.GameObjects.Graphics;
}[] = [];

private shardSpeed = 0.00022;


private readonly LEVELS = [
  { level: 1, targetCoins: 30, timeLimit: 60, speed: 1.0 },
  { level: 2, targetCoins: 50, timeLimit: 55, speed: 1.2 },
  { level: 3, targetCoins: 60, timeLimit: 50, speed: 1.4 },
  { level: 4, targetCoins: 70, timeLimit: 45, speed: 1.65 },
  { level: 5, targetCoins: 80, timeLimit: 40, speed: 1.9 },
];


private currentLevel = 1;

private nearMissCombo = 0;
private readonly NEAR_MISS_EXIT = 0.94;
private readonly NEAR_MISS_JUMP_HEIGHT = 20;
private nearMissAwarded = new WeakSet<object>();

private nearMissJumpTracked = new WeakSet<object>();
private nearMissDamaged = new WeakSet<object>();

private perfectDodgeCombo = 0;

private perfectDodgeCandidates = new WeakSet<object>();

private readonly PERFECT_DODGE_MIN_PROGRESS = 0.88;
private readonly PERFECT_DODGE_MAX_PROGRESS = 0.92;

private isComboSpawning = false;

private hasWon = false;

private levelCoins = 0;
private timeRemaining = 60;

private levelTimerAccumulator = 0;

private levelText!: Phaser.GameObjects.Text;
private timerText!: Phaser.GameObjects.Text;
private targetText!: Phaser.GameObjects.Text;


private score = 0;
private coinsCollected = 0;
private codeShardsCollected = 0;

private readonly SHARDS_PER_LIFE = 3;
private readonly MAX_LIVES = 3;
private shardsForLife = 0;

private scoreText!: Phaser.GameObjects.Text;
private coinsText!: Phaser.GameObjects.Text;
private shardsText!: Phaser.GameObjects.Text;

private lives = 3;
private isInvulnerable = false;
private isGameOver = false;

private livesText!: Phaser.GameObjects.Text;


private readonly COLLISION_PROGRESS = 0.90;

private readonly INVULNERABILITY_DURATION = 1500;


  private readonly GAME_WIDTH = 960;
  private readonly GAME_HEIGHT = 600;

  private readonly HORIZON_Y = 170;
  private readonly ROAD_BOTTOM_Y = 600;

  
private readonly PLAYER_Y = 505;


  constructor() {
    super({ key: "GameScene" });
  }

  
preload() {
    
this.load.audio(
  "optimum-theme",
  "/assets/audio/optimum-theme.mp3"
);

  this.load.spritesheet(
    "runner",
    "/assets/mascot/optimum-runner.png",
    {
      frameWidth: 256,
      frameHeight: 512,
    }
  );
}



  create() {
    
    
    // Reset all gameplay state for a fresh run
    this.hasWon = false;
    this.isGameOver = false;
    this.isComboSpawning = false;
    this.isInvulnerable = false;

    this.currentLevel = 1;
    this.levelCoins = 0;
    this.coinsCollected = 0;
    this.score = 0;

    this.codeShardsCollected = 0;
    this.shardsForLife = 0;
    this.lives = this.MAX_LIVES;

    this.timeRemaining = this.LEVELS[0].timeLimit;
    this.levelTimerAccumulator = 0;

    this.nearMissCombo = 0;
    this.perfectDodgeCombo = 0;

    this.nextObstacleWaveId = 0;
    this.rewardedNearMissWaves.clear();

    this.nearMissAwarded = new WeakSet<object>();
    this.nearMissJumpTracked = new WeakSet<object>();
    this.nearMissDamaged = new WeakSet<object>();
    this.perfectDodgeCandidates = new WeakSet<object>();

    this.obstacles = [];
    this.coins = [];
    this.codeShards = [];


    const width = this.GAME_WIDTH;
    const height = this.GAME_HEIGHT;

    // Start background music
    const backgroundMusic = this.sound.add(
      "optimum-theme",
      {
        loop: true,
        volume: 0.25,
      }
    );

    backgroundMusic.play();

    // Clean up music when this scene restarts or shuts down
    this.events.once(
      Phaser.Scenes.Events.SHUTDOWN,
      () => {
        backgroundMusic.stop();
        backgroundMusic.destroy();
      }
    );

    
    // Speaker icon ON/OFF
    const speakerX = width - 35;
    const speakerY = 105;

    const soundButton = this.add.container(
      speakerX,
      speakerY
    );

    // Clickable background
    const soundBg = this.add.graphics();
    soundBg.fillStyle(0x15102b, 0.9);
    soundBg.fillRoundedRect(-22, -22, 44, 44, 10);

    // Speaker icon
    const speakerIcon = this.add.graphics();

    // Red diagonal line when muted
    const muteLine = this.add.graphics();

    const drawSpeaker = (muted: boolean) => {
      speakerIcon.clear();
      muteLine.clear();

      const color = muted ? 0x888888 : 0x00e5ff;

      // Speaker body
      speakerIcon.fillStyle(color, 1);
      speakerIcon.fillRect(-12, -5, 7, 10);

      // Speaker cone
      speakerIcon.fillTriangle(
        -5, -6,
        3, -13,
        3, 13
      );

      // Sound waves
      if (!muted) {
        speakerIcon.lineStyle(2, color, 1);

        speakerIcon.beginPath();
        speakerIcon.arc(3, 0, 9, -0.7, 0.7);
        speakerIcon.strokePath();

        speakerIcon.beginPath();
        speakerIcon.arc(3, 0, 15, -0.7, 0.7);
        speakerIcon.strokePath();
      } else {
        // Red slash across the speaker
        muteLine.lineStyle(3, 0xff3333, 1);
        muteLine.lineBetween(-15, 15, 15, -15);
      }
    };

    soundButton.add([
      soundBg,
      speakerIcon,
      muteLine,
    ]);

    soundButton.setDepth(50);
    soundButton.setSize(44, 44);
    soundButton.setInteractive({
      useHandCursor: true,
    });

    // Initial state
    drawSpeaker(false);

    soundButton.on("pointerdown", () => {
      if (backgroundMusic.isPlaying) {
        backgroundMusic.pause();
        drawSpeaker(true);
      } else {
        backgroundMusic.resume();
        drawSpeaker(false);
      }
    });


    // Background
    this.add.rectangle(
      width / 2,
      height / 2,
      width,
      height,
      0x080414
    );


    // Purple glow behind the road
    const glow = this.add.graphics();

    glow.fillStyle(0x52218c, 0.18);
    
glow.fillEllipse(
  width / 2,
  this.HORIZON_Y + 10,
  360,
  100
);


    // City skyline
    this.createCity();

    // Road graphics
    this.roadGraphics = this.add.graphics();

    // Draw initial road
    this.drawRoad();

    
// Player - Rear view running mascot
this.player = this.add.sprite(
  this.laneX(this.currentLane, this.PLAYER_Y),
  this.PLAYER_Y,
  "runner",
  0
);


this.player.setDisplaySize(110, 190);

this.player.setDepth(10);

// Running animation

if (!this.anims.exists("runner-run")) {
  this.anims.create({
    key: "runner-run",
    frames: this.anims.generateFrameNumbers("runner", {
      start: 0,
      end: 7,
    }),
    frameRate: 12,
    repeat: -1,
  });
}


// Start running
this.player.play("runner-run");


    // Keyboard controls
    if (!this.input.keyboard) {
      throw new Error("Keyboard input unavailable");
    }

    this.cursors = this.input.keyboard.createCursorKeys();

    
this.keys = this.input.keyboard.addKeys(
  "A,D,S"
) as {
  A: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
};


    // Title
    this.add.text(
      25,
      25,
      "OPTIMUM DASH",
      {
        fontFamily: "Arial",
        fontSize: "24px",
        color: "#ffffff",
        fontStyle: "bold"
      }
    ).setDepth(20);

    this.add.text(
      25,
      58,
      "NETWORK RUN // TEST MODE",
      {
        fontFamily: "Arial",
        fontSize: "12px",
        color: "#b78aff"
      }
    ).setDepth(20);
    
// Lives HUD

// Score HUD
this.scoreText = this.add.text(
  25,
  90,
  "SCORE: 0",
  {
    fontFamily: "Arial",
    fontSize: "14px",
    color: "#ffffff",
    fontStyle: "bold",
  }
).setDepth(20);

// Optimum Coins HUD
this.coinsText = this.add.text(
  25,
  120,
  "COINS: 0",
  {
    fontFamily: "Arial",
    fontSize: "13px",
    color: "#ffd700",
    fontStyle: "bold",
  }
).setDepth(20);

// Code Shards HUD
this.shardsText = this.add.text(
  25,
  150,
  "SHARDS: 0",
  {
    fontFamily: "Arial",
    fontSize: "13px",
    color: "#00e5ff",
    fontStyle: "bold",
  }
).setDepth(20);
this.updateScoreHUD();

// Initialize Level 1
const levelConfig = this.getCurrentLevelConfig();

this.timeRemaining = levelConfig.timeLimit;

// Level HUD
this.levelText = this.add.text(
  this.GAME_WIDTH / 2,
  20,
  `LEVEL ${this.currentLevel} / 5`,
  {
    fontFamily: "Arial",
    fontSize: "16px",
    color: "#ffffff",
    fontStyle: "bold",
  }
).setOrigin(0.5, 0).setDepth(20);

// Countdown HUD
this.timerText = this.add.text(
  this.GAME_WIDTH / 2,
  45,
  `TIME: ${this.timeRemaining}s`,
  {
    fontFamily: "Arial",
    fontSize: "14px",
    color: "#ffd166",
    fontStyle: "bold",
  }
).setOrigin(0.5, 0).setDepth(20);

// Level coin target HUD
this.targetText = this.add.text(
  this.GAME_WIDTH / 2,
  67,
  `TARGET: ${this.levelCoins}/${levelConfig.targetCoins}`,
  {
    fontFamily: "Arial",
    fontSize: "13px",
    color: "#00e5ff",
    fontStyle: "bold",
  }
).setOrigin(0.5, 0).setDepth(20);

this.livesText = this.add.text(
  this.GAME_WIDTH - 25,
  25,
  "♥ ♥ ♥",
  {
    fontFamily: "Arial",
    fontSize: "28px",
    color: "#ff4d7d",
    fontStyle: "bold",
  }
);

this.livesText
  .setOrigin(1, 0)
  .setDepth(20);

// Initialize Level HUD after all text objects exist
this.updateLevelHUD();

// Generate spike patterns every 2.5 seconds

// Alternate between spike traps and jump barriers

// Spawn coin trails every 3 seconds
this.time.addEvent({
  delay: 3000,
  callback: () => {
    if (!this.isGameOver) {
      this.spawnCoinPattern();
    }
  },
  loop: true,
});

// Spawn rare Code Shards every 8 seconds
this.time.addEvent({
  delay: 8000,
  callback: () => {
    if (!this.isGameOver) {
      this.spawnCodeShard();
    }
  },
  loop: true,
});



let obstacleWave = 0;

const scheduleNextObstacle = () => {
  
if (this.hasWon) {
  return;
}


  this.time.delayedCall(
    this.getObstacleSpawnDelay(),
    () => {
      
if (this.hasWon) {
  return;
}


      // Skip regular waves while a combo is active
      
if (!this.isGameOver && !this.isComboSpawning) {

        obstacleWave++;

        const level = this.currentLevel;

        if (level === 1) {
          if (obstacleWave % 3 === 0) {
            this.spawnJumpBarrier();
          } else {
            this.spawnSpikePattern();
          }
        } else {
          const comboChance = Math.min(
            0.25 + (level - 2) * 0.15,
            0.7
          );

          if (Math.random() < comboChance) {
            this.spawnComboPattern();
          } else if (obstacleWave % 3 === 0) {
            this.spawnJumpBarrier();
          } else {
            this.spawnSpikePattern();
          }
        }
      }

      scheduleNextObstacle();
    }
  );
};

scheduleNextObstacle();



  }

  
private createCity() {
  const graphics = this.add.graphics();

  // Keep city behind gameplay objects
  graphics.setDepth(0);

  const width = this.GAME_WIDTH;
  const horizon = this.HORIZON_Y;

  // =========================================
  // 1. Atmospheric horizon glow
  // =========================================

  
  // Compact atmospheric glow at the horizon
  graphics.fillStyle(0x7c3aed, 0.035);
  graphics.fillEllipse(
    width / 2,
    horizon - 8,
    350,
    85
  );

  graphics.fillStyle(0xa855f7, 0.055);
  graphics.fillEllipse(
    width / 2,
    horizon - 3,
    190,
    45
  );


  // =========================================
  // 2. Distant skyline
  // =========================================

  for (let i = 0; i < 42; i++) {
    const buildingWidth = 25;
    const x = i * 25;

    
    const buildingHeight =
      Phaser.Math.Between(20, 65);

    const y = horizon - buildingHeight + 8;

    // Darker distant buildings for depth
    graphics.fillStyle(0x10081e, 0.9);

    graphics.fillRect(
      x,
      y,
      buildingWidth,
      buildingHeight
    );

    // Subtle rooftop highlight
    graphics.lineStyle(
      1,
      0x6d28d9,
      0.25
    );

    graphics.lineBetween(
      x,
      y,
      x + buildingWidth,
      y
    );
  }

  // =========================================
  // 3. Main neon buildings
  // =========================================

  for (let i = 0; i < 32; i++) {
    const x = i * 35;

    const buildingWidth = 28;

    
    const buildingHeight =
      Phaser.Math.Between(65, 155);


    const y = horizon - buildingHeight;

    // Building body
    graphics.fillStyle(
      i % 2 === 0 ? 0x170b32 : 0x21103d,
      1
    );

    graphics.fillRect(
      x,
      y,
      buildingWidth,
      buildingHeight
    );

    // Soft outer neon edge
    graphics.lineStyle(
      4,
      0x7c3aed,
      0.12
    );

    graphics.strokeRect(
      x,
      y,
      buildingWidth,
      buildingHeight
    );

    // Sharp rooftop neon
    
    graphics.lineStyle(
      1.5,
      i % 3 === 0 ? 0xc084fc : 0x9333ea,
      0.9
    );


    graphics.lineBetween(
      x,
      y,
      x + buildingWidth,
      y
    );

    // Vertical neon edge
    if (i % 3 === 0) {
      graphics.lineStyle(
        1,
        0x9333ea,
        0.4
      );

      graphics.lineBetween(
        x + buildingWidth,
        y,
        x + buildingWidth,
        horizon
      );
    }

    // =====================================
    // 4. Glowing windows
    // =====================================

    for (let row = 0; row < 5; row++) {
      for (let col = 0; col < 2; col++) {
        const windowX =
          x + 6 + col * 11;

        const windowY =
          y + 12 + row * 22;

        if (windowY + 6 > horizon) {
          continue;
        }

        // Random illuminated windows
        if (Math.random() < 0.3) {
          continue;
        }

        const color =
          (row + col + i) % 3 === 0
            ? 0xe879f9
            : 0x8b5cf6;

        // Window glow
        graphics.fillStyle(color, 0.12);
        graphics.fillRect(
          windowX - 2,
          windowY - 2,
          8,
          10
        );

        // Bright window center
        graphics.fillStyle(color, 0.85);
        graphics.fillRect(
          windowX,
          windowY,
          4,
          6
        );
      }
    }

    // =====================================
    // 5. Rooftop antenna lights
    // =====================================

    if (i % 7 === 0) {
      const antennaX =
        x + buildingWidth / 2;

      graphics.lineStyle(
        1,
        0x9333ea,
        0.6
      );

      graphics.lineBetween(
        antennaX,
        y,
        antennaX,
        y - 12
      );

      graphics.fillStyle(0xf0abfc, 0.9);
      graphics.fillCircle(
        antennaX,
        y - 12,
        2
      );
    }
  }
}


  private roadHalfWidthAt(y: number): number {
    const progress = Phaser.Math.Clamp(
      (y - this.HORIZON_Y) /
        (this.ROAD_BOTTOM_Y - this.HORIZON_Y),
      0,
      1
    );

    return 35 + progress * 420;
  }

  private laneX(
    lane: number,
    y: number
  ): number {
    const center = this.GAME_WIDTH / 2;
    const halfWidth = this.roadHalfWidthAt(y);

    const laneWidth = (halfWidth * 2) / 3;

    return (
      center -
      halfWidth +
      laneWidth * (lane + 0.5)
    );
  }

  private drawRoad() {
    const graphics = this.roadGraphics;
    graphics.clear();

    const center = this.GAME_WIDTH / 2;
    const top = this.HORIZON_Y;
    const bottom = this.ROAD_BOTTOM_Y;

    const topHalf = this.roadHalfWidthAt(top);
    const bottomHalf = this.roadHalfWidthAt(bottom);

    // Road surface
    graphics.fillStyle(0x160b2e, 1);

    graphics.fillPoints(
      [
        new Phaser.Geom.Point(center - topHalf, top),
        new Phaser.Geom.Point(center + topHalf, top),
        new Phaser.Geom.Point(center + bottomHalf, bottom),
        new Phaser.Geom.Point(center - bottomHalf, bottom)
      ],
      true
    );

    // Road borders
  
graphics.lineStyle(7, 0x6d28d9, 0.45);


    graphics.lineBetween(
      center - topHalf,
      top,
      center - bottomHalf,
      bottom
    );

    graphics.lineBetween(
      center + topHalf,
      top,
      center + bottomHalf,
      bottom
    );

    // Lane separators
    graphics.lineStyle(2, 0x9861ff, 0.8);

    for (let separator = 1; separator <= 2; separator++) {
      const ratio = separator / 3;

      const startX =
        center - topHalf + ratio * topHalf * 2;

      const endX =
        center - bottomHalf + ratio * bottomHalf * 2;

      graphics.lineBetween(
        startX,
        top,
        endX,
        bottom
      );
    }

    // Moving horizontal lines
    for (let i = 0; i < 13; i++) {
      const normalized =
        ((i / 13 + this.roadOffset) % 1);

      const perspective = normalized * normalized;

      const y =
        top + perspective * (bottom - top);

      const halfWidth = this.roadHalfWidthAt(y);

      graphics.lineStyle(
        1 + perspective * 2,
        0x8d4bff,
        0.15 + perspective * 0.45
      );

      graphics.lineBetween(
        center - halfWidth,
        y,
        center + halfWidth,
        y
      );
    }
    

  }

private slide() {
  if (this.isSliding || this.isJumping) {
    return;
  }

  this.isSliding = true;

  // Pause running animation while sliding
  this.player.anims.pause();

  // Shrink the mascot from the bottom
  this.player.setOrigin(0.5, 1);

  this.tweens.add({
    targets: this.player,
    displayHeight: this.PLAYER_SLIDE_HEIGHT,
    duration: 130,
    ease: "Sine.easeOut",
    onComplete: () => {
      this.time.delayedCall(
        this.SLIDE_DURATION - 260,
        () => {
          this.tweens.add({
            targets: this.player,
            displayHeight: this.PLAYER_NORMAL_HEIGHT,
            duration: 130,
            ease: "Sine.easeIn",
            onComplete: () => {
              this.isSliding = false;
              this.player.setOrigin(0.5, 0.5);
              this.player.anims.resume();
            },
          });
        }
      );
    },
  });
}

private jump() {
  
if (this.isJumping || this.isSliding) {
  return;
}


  this.isJumping = true;

this.playJumpSound();

  this.tweens.add({
    targets: this,
    jumpHeight: this.JUMP_HEIGHT,
    duration: this.JUMP_DURATION / 2,
    ease: "Sine.easeOut",
    yoyo: true,
    onUpdate: () => {
      this.player.y = this.PLAYER_Y - this.jumpHeight;
    },
    onComplete: () => {
      this.isJumping = false;
      this.jumpHeight = 0;
      this.player.y = this.PLAYER_Y;
    },
  });
}

private checkJumpBarrierCollision(
  obstacle: {
    type: "spike" | "jumpBarrier";
    lane: number;
    progress: number;
    graphics: Phaser.GameObjects.Graphics;
    
    waveId: number;

  }
): boolean {
  // Only handle jump barriers
  if (obstacle.type !== "jumpBarrier") {
    return false;
  }

  // Check when barrier reaches the player
  if (
    obstacle.progress < this.COLLISION_PROGRESS ||
    obstacle.progress > 0.94
  ) {
    return false;
  }

  // Jumping high enough avoids the barrier
  
// Allow the player to clear the barrier earlier
if (this.isJumping && this.jumpHeight >= 20) {
  return false;
}


  // Barrier blocks all three lanes
  return true;
}


private playPerfectDodgeEffect() {
  const x = this.player.x;
  const y = this.player.y - 35;

  const burst = this.add.graphics();
  burst.setDepth(90);

  // Neon energy rings
  burst.lineStyle(5, 0x00f5ff, 1);
  burst.strokeCircle(0, 0, 38);

  burst.lineStyle(2, 0xa855f7, 0.9);
  burst.strokeCircle(0, 0, 28);

  burst.setPosition(x, y);
  burst.setScale(0.4);
  burst.setAlpha(1);

  this.tweens.add({
    targets: burst,
    scaleX: 2.4,
    scaleY: 2.4,
    alpha: 0,
    duration: 450,
    ease: "Cubic.easeOut",
    onComplete: () => {
      burst.destroy();
    },
  });
  

}

private checkNearMiss(
  obstacle: {
    type: "spike" | "jumpBarrier";
    lane: number;
    progress: number;
    graphics: Phaser.GameObjects.Graphics;
    waveId: number;
  }
) {
  if (this.isGameOver) return;

  // Track successful jumps throughout the collision zone
  const inCollisionZone =
    obstacle.progress >= this.COLLISION_PROGRESS &&
    obstacle.progress <= this.NEAR_MISS_EXIT;

  if (inCollisionZone && !this.isInvulnerable) {
    const jumpingHighEnough =
      this.isJumping &&
      this.jumpHeight >= this.NEAR_MISS_JUMP_HEIGHT;

    const jumpOverSpike =
      obstacle.type === "spike" &&
      obstacle.lane === this.currentLane &&
      jumpingHighEnough;

    const jumpOverBarrier =
      obstacle.type === "jumpBarrier" &&
      jumpingHighEnough;

    
    if (jumpOverSpike || jumpOverBarrier) {
      this.nearMissJumpTracked.add(obstacle);

      // Track a precisely timed jump
      const inPerfectWindow =
        obstacle.progress >= this.PERFECT_DODGE_MIN_PROGRESS &&
        obstacle.progress <= this.PERFECT_DODGE_MAX_PROGRESS;

      if (inPerfectWindow) {
        this.perfectDodgeCandidates.add(obstacle);
      }
    }

  }

  // Wait until the obstacle passes the collision zone
  if (obstacle.progress <= this.NEAR_MISS_EXIT) {
    return;
  }

  // Each obstacle can be evaluated only once
  if (this.nearMissAwarded.has(obstacle)) {
    return;
  }

  this.nearMissAwarded.add(obstacle);

  // Never reward damaged or untracked obstacles
  if (
    this.nearMissDamaged.has(obstacle) ||
    !this.nearMissJumpTracked.has(obstacle) ||
    this.isInvulnerable
  ) {
    return;
  }

  // Only one reward per wave
  if (this.rewardedNearMissWaves.has(obstacle.waveId)) {
    return;
  }

  this.rewardedNearMissWaves.add(obstacle.waveId);

  
  this.nearMissCombo++;

  const nearMissBonus =
    Math.min(this.nearMissCombo, 5) * 100;

  const isPerfect =
    this.perfectDodgeCandidates.has(obstacle);

  let perfectBonus = 0;

  
  if (isPerfect) {
    this.perfectDodgeCombo++;
    perfectBonus = 250;

    // Play neon burst on successful Perfect Dodge
    this.playPerfectDodgeEffect();
  } else {
    this.perfectDodgeCombo = 0;
  }


  const bonus = nearMissBonus + perfectBonus;

  this.score += bonus;
  this.updateScoreHUD();


  const comboText = this.add.text(
    this.GAME_WIDTH / 2,
    this.GAME_HEIGHT / 2 - 100,
    
    isPerfect
      ? `PERFECT DODGE! +${bonus}\nPERFECT COMBO x${this.perfectDodgeCombo}`
      : `NEAR MISS! +${bonus}\nCOMBO x${this.nearMissCombo}`,

    {
      fontFamily: "Arial",
      fontSize: "26px",
      
      color: isPerfect ? "#00f5ff" : "#ffd700",

      fontStyle: "bold",
      align: "center",
      stroke: "#000000",
      strokeThickness: 4,
    }
  )
    .setOrigin(0.5)
    .setDepth(100);

  this.tweens.add({
    targets: comboText,
    y: comboText.y - 55,
    alpha: 0,
    duration: 900,
    onComplete: () => comboText.destroy(),
  });
}


private checkSpikeCollision(
  
obstacle: {
  type: "spike" | "jumpBarrier";
  lane: number;
  progress: number;
  graphics: Phaser.GameObjects.Graphics;
  
    waveId: number;

}

): boolean {
    
// This function only handles spike traps
if (obstacle.type !== "spike") {
  return false;
}

  // Ignore obstacles outside the collision zone
  if (
    obstacle.progress < this.COLLISION_PROGRESS ||
    obstacle.progress > 0.94
  ) {
    return false;
  }

  // Safe if the player is in another lane
  if (obstacle.lane !== this.currentLane) {
    return false;
  }

  // Safe when jumping high enough
  
// More forgiving jump collision
if (this.isJumping && this.jumpHeight >= 20) {
  return false;
}


  return true;
}

private getCurrentLevelConfig() {
  return this.LEVELS[this.currentLevel - 1];
}

private updateLevelTimer(delta: number) {
  if (this.isGameOver || this.timeRemaining <= 0) {
    return;
  }

  this.levelTimerAccumulator += delta;

  while (this.levelTimerAccumulator >= 1000) {
    this.levelTimerAccumulator -= 1000;

    this.timeRemaining = Math.max(
      0,
      this.timeRemaining - 1
    );

    this.updateLevelHUD();

    if (this.timeRemaining <= 0) {
      break;
    }
  }
}

private clearLevelObjects() {
  // Remove all spike traps and jump barriers
  for (const obstacle of this.obstacles) {
    obstacle.graphics.destroy();
  }

  this.obstacles = [];

  // Remove remaining Optimum Coins
  for (const coin of this.coins) {
    coin.graphics.destroy();
  }

  this.coins = [];

  // Remove remaining Code Shards
  for (const shard of this.codeShards) {
    shard.graphics.destroy();
  }

  this.codeShards = [];
}

private completeLevel() {
  if (this.isGameOver) {
    return;
  }

  // Stop gameplay during level transition
  this.isGameOver = true;

  // Final victory: stop scheduled gameplay events
  if (this.hasWon) {
    this.time.removeAllEvents();
    this.player.anims.pause();
    this.player.setAlpha(1);
  }

// Clear objects from the completed level
this.clearLevelObjects();

  
  const isFinalLevel =
    this.hasWon ||
    this.currentLevel >= this.LEVELS.length;


  const overlay = this.add.rectangle(
    this.GAME_WIDTH / 2,
    this.GAME_HEIGHT / 2,
    this.GAME_WIDTH,
    this.GAME_HEIGHT,
    0x080414,
    0.8
  ).setDepth(100);

  const title = this.add.text(
    this.GAME_WIDTH / 2,
    245,
    isFinalLevel ? "VICTORY!" : "LEVEL COMPLETE!",
    {
      fontFamily: "Arial",
      fontSize: "42px",
      color: "#ffd700",
      fontStyle: "bold",
    }
  ).setOrigin(0.5).setDepth(101);

  
  if (isFinalLevel) {
    this.player.anims.pause();

    this.add.text(
      this.GAME_WIDTH / 2,
      310,
      `SCORE: ${this.score.toLocaleString()}  |  COINS: ${this.coinsCollected}`,
      {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#ffffff",
      }
    ).setOrigin(0.5).setDepth(101);

    this.add.text(
      this.GAME_WIDTH / 2,
      355,
      "Congratulations! You've conquered all 5 levels!",
      {
        fontFamily: "Arial",
        fontSize: "18px",
        color: "#c4b5fd",
      }
    ).setOrigin(0.5).setDepth(101);

    const share = this.add.text(
      this.GAME_WIDTH / 2,
      430,
      "SHARE VICTORY ON X",
      {
        fontFamily: "Arial",
        fontSize: "22px",
        color: "#ffffff",
        backgroundColor: "#6d28d9",
        padding: { x: 24, y: 14 },
      }
    )
      .setOrigin(0.5)
      .setDepth(101)
      .setInteractive({ useHandCursor: true });

    share.on("pointerdown", () => {
      this.shareResultOnX(true);
    });

    return;
  }


  this.time.delayedCall(1800, () => {
    overlay.destroy();
    title.destroy();

    
    this.currentLevel++;
    this.levelCoins = 0;

    // Reset Near Miss combo for the new level
    this.nearMissCombo = 0;


    // Reset Perfect Dodge combo
    this.perfectDodgeCombo = 0;

    const config = this.getCurrentLevelConfig();

    this.timeRemaining = config.timeLimit;
    this.levelTimerAccumulator = 0;

    this.isGameOver = false;

    this.updateLevelHUD();
  });
}


private checkLevelCompletion() {
  // Prevent duplicate completion or victory
  if (this.isGameOver || this.hasWon) {
    return;
  }

  const config = this.getCurrentLevelConfig();

  if (this.levelCoins < config.targetCoins) {
    return;
  }

  // Cap collected coins at the current target
  this.levelCoins = config.targetCoins;
  this.updateLevelHUD();

  // Final level: trigger victory
  if (this.currentLevel === this.LEVELS.length) {
    this.hasWon = true;
  }

  this.completeLevel();
}


private updateLevelHUD() {
  const config = this.getCurrentLevelConfig();

  this.levelText.setText(
    `LEVEL ${this.currentLevel} / ${this.LEVELS.length}`
  );

  this.timerText.setText(
    `TIME: ${Math.ceil(this.timeRemaining)}s`
  );

  this.targetText.setText(
    `TARGET: ${this.levelCoins}/${config.targetCoins}`
  );
}

private updateScoreHUD() {
  this.scoreText.setText(`SCORE: ${this.score}`);
  this.coinsText.setText(`COINS: ${this.coinsCollected}`);
  this.shardsText.setText(
    `SHARDS: ${this.codeShardsCollected}`
  );
}

private takeDamage() {
  if (this.isInvulnerable || this.isGameOver) {
    return;
  }

  
  this.lives--;

  
  // Reset dodge combos after taking damage
  this.nearMissCombo = 0;
  this.perfectDodgeCombo = 0;


  this.isInvulnerable = true;


  this.livesText.setText(
    "♥ ".repeat(Math.max(0, this.lives))
  );

  if (this.lives <= 0) {
    this.gameOver();
    return;
  }

  // Flash the mascot after taking damage
  this.tweens.add({
    targets: this.player,
    alpha: 0.25,
    duration: 120,
    yoyo: true,
    repeat: 5,
    onComplete: () => {
      this.player.setAlpha(1);
    },
  });

  this.time.delayedCall(
    this.INVULNERABILITY_DURATION,
    () => {
      this.isInvulnerable = false;
    }
  );
}

private shareResultOnX(isVictory: boolean) {
  const level = this.currentLevel;
  const score = this.score.toLocaleString("en-US");

  // Total coins collected throughout the run
  const coins = this.coinsCollected;

  const message = isVictory
    ? `🏆 I conquered all 5 levels of Optimum Dash!

⚡ Final Score: ${score}
🪙 Coins Collected: ${coins}

The ultimate run is complete. Can you beat my score? 🎮

#OptimumDash #Optimum`
    : `🎮 My Optimum Dash run ended at Level ${level}/5!

⚡ Score: ${score}
🪙 Coins Collected: ${coins}

Those obstacles got me this time. Think you can go further? 👀

#OptimumDash #Optimum`;

  const url =
    "https://twitter.com/intent/tweet?text=" +
    encodeURIComponent(message);

  window.open(url, "_blank", "noopener,noreferrer");
}


private gameOver() {
  if (this.isGameOver) return;

  this.isGameOver = true;

  this.player.anims.pause();
  this.player.setAlpha(1);

  this.time.removeAllEvents();

  this.add.rectangle(
    this.GAME_WIDTH / 2,
    this.GAME_HEIGHT / 2,
    this.GAME_WIDTH,
    this.GAME_HEIGHT,
    0x080414,
    0.88
  ).setDepth(100);

  this.add.text(
    this.GAME_WIDTH / 2,
    190,
    "GAME OVER",
    {
      fontFamily: "Arial",
      fontSize: "48px",
      color: "#ff4d7d",
      fontStyle: "bold",
    }
  ).setOrigin(0.5).setDepth(101);

  this.add.text(
    this.GAME_WIDTH / 2,
    265,
    `LEVEL ${this.currentLevel}/5  |  SCORE ${this.score.toLocaleString()}  |  COINS ${this.coinsCollected}`,
    {
      fontFamily: "Arial",
      fontSize: "20px",
      color: "#ffffff",
      fontStyle: "bold",
    }
  ).setOrigin(0.5).setDepth(101);

  const restart = this.add.text(
    this.GAME_WIDTH / 2,
    355,
    "▶ RESTART GAME",
    {
      fontFamily: "Arial",
      fontSize: "23px",
      color: "#ffffff",
      backgroundColor: "#6d28d9",
      padding: { x: 24, y: 14 },
    }
  )
    .setOrigin(0.5)
    .setDepth(101)
    .setInteractive({ useHandCursor: true });

  restart.on("pointerdown", () => {
    this.scene.restart();
  });

  const share = this.add.text(
    this.GAME_WIDTH / 2,
    430,
    "SHARE ON X",
    {
      fontFamily: "Arial",
      fontSize: "22px",
      color: "#ffffff",
      backgroundColor: "#27203f",
      padding: { x: 28, y: 14 },
    }
  )
    .setOrigin(0.5)
    .setDepth(101)
    .setInteractive({ useHandCursor: true });

  share.on("pointerdown", () => {
    this.shareResultOnX(false);
  });
}


private drawJumpBarrier(
  graphics: Phaser.GameObjects.Graphics,
  y: number,
  perspective: number
) {
  const center = this.GAME_WIDTH / 2;

  // Width covers the entire road
  const roadWidth = this.roadHalfWidthAt(y) * 2;

  const width = roadWidth * 0.92;
  const height = 12 + perspective * 55;

  const left = center - width / 2;
  const top = y - height;

  graphics.clear();

  // Main barrier body
  graphics.fillStyle(0xff6b35, 0.95);
  graphics.fillRoundedRect(
    left,
    top,
    width,
    height,
    5
  );

  // Neon border
  graphics.lineStyle(
    2 + perspective * 3,
    0xffd166,
    1
  );

  graphics.strokeRoundedRect(
    left,
    top,
    width,
    height,
    5
  );

  // Warning stripes
  const stripeCount = 12;
  const stripeWidth = width / stripeCount;

  for (let i = 0; i < stripeCount; i++) {
    if (i % 2 === 0) {
      graphics.fillStyle(0x2a1024, 0.85);

      graphics.fillRect(
        left + i * stripeWidth,
        top + height * 0.35,
        stripeWidth,
        height * 0.3
      );
    }
  }

  // Bright upper edge
  graphics.lineStyle(
    3,
    0xffe08a,
    0.95
  );

  graphics.lineBetween(
    left,
    top,
    left + width,
    top
  );
}

private handleShardLifeReward() {
  this.shardsForLife++;

  // Keep shards if lives are already full
  if (this.lives >= this.MAX_LIVES) {
    return;
  }

  // Exchange 3 shards for 1 life
  if (this.shardsForLife >= this.SHARDS_PER_LIFE) {
    this.shardsForLife -= this.SHARDS_PER_LIFE;

    this.lives = Math.min(
      this.lives + 1,
      this.MAX_LIVES
    );

    // Update lives HUD
    this.livesText.setText(
      `LIVES: ${this.lives}`
    );

    // Floating reward notification
    const rewardText = this.add.text(
      this.GAME_WIDTH / 2,
      this.GAME_HEIGHT / 2 - 100,
      "+1 LIFE!",
      {
        fontFamily: "Arial",
        fontSize: "32px",
        color: "#00ff99",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 4,
      }
    )
      .setOrigin(0.5)
      .setDepth(100);

    this.tweens.add({
      targets: rewardText,
      y: rewardText.y - 60,
      alpha: 0,
      duration: 1200,
      onComplete: () => rewardText.destroy(),
    });
  }
}

private playShardSound() {
  if (!(this.sound instanceof Phaser.Sound.WebAudioSoundManager)) {
    return;
  }

  const ctx = this.sound.context;

  if (ctx.state !== "running") return;

  const now = ctx.currentTime;

  const notes = [
    { frequency: 880, delay: 0 },
    { frequency: 1320, delay: 0.09 },
  ];

  for (const note of notes) {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    const start = now + note.delay;
    const end = start + 0.18;

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(
      note.frequency,
      start
    );

    gain.gain.setValueAtTime(0.001, start);
    gain.gain.linearRampToValueAtTime(
      0.09,
      start + 0.015
    );
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      end
    );

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(start);
    oscillator.stop(end);
  }
}

private playJumpSound() {
  if (!(this.sound instanceof Phaser.Sound.WebAudioSoundManager)) {
    return;
  }

  const ctx = this.sound.context;

  if (ctx.state !== "running") return;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  const now = ctx.currentTime;

  // Arcade-style jump sound
  oscillator.type = "triangle";

  oscillator.frequency.setValueAtTime(220, now);
  oscillator.frequency.exponentialRampToValueAtTime(
    650,
    now + 0.16
  );

  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.10, now + 0.02);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    now + 0.20
  );

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start(now);
  oscillator.stop(now + 0.20);
}

private playCoinSound() {
  
const audioContext = (
  this.sound as Phaser.Sound.WebAudioSoundManager
).context;


  if (!audioContext) return;

  const ctx = audioContext as AudioContext;

  if (ctx.state !== "running") return;

  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();

  oscillator.type = "sine";

  const now = ctx.currentTime;

  oscillator.frequency.setValueAtTime(700, now);
  oscillator.frequency.exponentialRampToValueAtTime(
    1100,
    now + 0.12
  );

  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(
    0.001,
    now + 0.18
  );

  oscillator.connect(gain);
  gain.connect(ctx.destination);

  oscillator.start(now);
  oscillator.stop(now + 0.18);
}

private collectCoin(
  coin: {
    lane: number;
    progress: number;
    graphics: Phaser.GameObjects.Graphics;
  }
) {
  // Increase coins and score
  
this.coinsCollected += 1;
this.levelCoins += 1;
this.score += 10;

this.playCoinSound();


  // Update HUD immediately
  
this.updateScoreHUD();
this.updateLevelHUD();
this.checkLevelCompletion();


  // Small floating score effect
  const collectText = this.add.text(
    this.player.x,
    this.PLAYER_Y - 130,
    "+10",
    {
      fontFamily: "Arial",
      fontSize: "20px",
      color: "#ffd700",
      fontStyle: "bold",
    }
  );

  collectText
    .setOrigin(0.5)
    .setDepth(30);

  this.tweens.add({
    targets: collectText,
    y: collectText.y - 45,
    alpha: 0,
    duration: 550,
    ease: "Cubic.easeOut",
    onComplete: () => {
      collectText.destroy();
    },
  });

  // Remove the collected coin
  coin.graphics.destroy();
}

private collectCodeShard(
  shard: {
    lane: number;
    progress: number;
    graphics: Phaser.GameObjects.Graphics;
  }
) {
  // Increase shards and score
  this.codeShardsCollected += 1;
  
this.handleShardLifeReward();

this.playShardSound();

  this.score += 50;

  // Update HUD
  this.updateScoreHUD();

  // Floating reward effect
  const rewardText = this.add.text(
    this.player.x,
    this.PLAYER_Y - 145,
    "+50 SHARD",
    {
      fontFamily: "Arial",
      fontSize: "20px",
      color: "#00e5ff",
      fontStyle: "bold",
    }
  );

  rewardText
    .setOrigin(0.5)
    .setDepth(30);

  this.tweens.add({
    targets: rewardText,
    y: rewardText.y - 50,
    alpha: 0,
    duration: 650,
    ease: "Cubic.easeOut",
    onComplete: () => {
      rewardText.destroy();
    },
  });

  // Remove collected shard
  shard.graphics.destroy();
}

private updateCodeShards(delta: number) {
  for (let i = this.codeShards.length - 1; i >= 0; i--) {
    const shard = this.codeShards[i];

    shard.progress += delta * this.shardSpeed;

    const graphics = shard.graphics;
    graphics.clear();

    if (shard.progress < 0) {
      continue;
    }

    const perspective = shard.progress * shard.progress;

    const y =
      this.HORIZON_Y +
      perspective * (this.ROAD_BOTTOM_Y - this.HORIZON_Y);

    const x = this.laneX(shard.lane, y);

    const size = 5 + perspective * 24;
    const centerY = y - size;

    // Cyan outer glow
    graphics.fillStyle(0x00e5ff, 0.18);
    graphics.fillCircle(x, centerY, size * 1.5);

    // Diamond body
    graphics.fillStyle(0x00d8ef, 1);

    graphics.fillTriangle(
      x, centerY - size,
      x - size * 0.7, centerY,
      x + size * 0.7, centerY
    );

    graphics.fillTriangle(
      x, centerY + size,
      x - size * 0.7, centerY,
      x + size * 0.7, centerY
    );

    // Crystal outline
    graphics.lineStyle(
      Math.max(1, perspective * 3),
      0xb4ffff,
      1
    );

    graphics.lineBetween(
      x, centerY - size,
      x - size * 0.7, centerY
    );

    graphics.lineBetween(
      x - size * 0.7, centerY,
      x, centerY + size
    );

    graphics.lineBetween(
      x, centerY + size,
      x + size * 0.7, centerY
    );

    graphics.lineBetween(
      x + size * 0.7, centerY,
      x, centerY - size
    );

    // Inner crystal detail
    graphics.lineBetween(
      x, centerY - size,
      x, centerY + size
    );

// Collect shard when it reaches the player
if (
  shard.progress >= 0.87 &&
  shard.progress <= 0.96 &&
  shard.lane === this.currentLane
) {
  this.collectCodeShard(shard);
  this.codeShards.splice(i, 1);
  continue;
}

    if (shard.progress >= 1) {
      graphics.destroy();
      this.codeShards.splice(i, 1);
    }
  }
}

private updateCoins(delta: number) {
  for (let i = this.coins.length - 1; i >= 0; i--) {
    const coin = this.coins[i];

    coin.progress += delta * this.coinSpeed;

    const graphics = coin.graphics;
    graphics.clear();

    // Coins waiting beyond the horizon
    if (coin.progress < 0) {
      continue;
    }

    const perspective = coin.progress * coin.progress;

    const y =
      this.HORIZON_Y +
      perspective * (this.ROAD_BOTTOM_Y - this.HORIZON_Y);

    const x = this.laneX(coin.lane, y);

    const radius = 4 + perspective * 19;

    // Outer glow
    graphics.fillStyle(0xffa500, 0.25);
    graphics.fillCircle(x, y - radius, radius * 1.35);

    // Golden coin
    graphics.fillStyle(0xffd700, 1);
    graphics.fillCircle(x, y - radius, radius);

    // Bright border
    graphics.lineStyle(
      Math.max(1, perspective * 3),
      0xfff3a0,
      1
    );

    graphics.strokeCircle(x, y - radius, radius);

    
// Optimum infinity symbol
const infinityCenterY = y - radius;

const infinityWidth = radius * 0.72;
const infinityHeight = radius * 0.34;

graphics.lineStyle(
  Math.max(1.5, perspective * 3.5),
  0x7a3b00,
  1
);

// Draw infinity using a smooth parametric curve
const infinityPoints: Phaser.Math.Vector2[] = [];

for (let i = 0; i <= 64; i++) {
  const t = (i / 64) * Math.PI * 2;

  const denominator = 1 + Math.pow(Math.cos(t), 2);

  const px =
    x +
    (infinityWidth * Math.sin(t)) / denominator;

  const py =
    infinityCenterY +
    (infinityHeight * Math.sin(t) * Math.cos(t)) /
      denominator;

  infinityPoints.push(
    new Phaser.Math.Vector2(px, py)
  );
}

graphics.strokePoints(infinityPoints, true);


// Collect coin when it reaches the player
if (
  coin.progress >= 0.87 &&
  coin.progress <= 0.96 &&
  coin.lane === this.currentLane
) {
  this.collectCoin(coin);
  this.coins.splice(i, 1);
  continue;
}

    // Remove coins after passing the camera
    if (coin.progress >= 1) {
      graphics.destroy();
      this.coins.splice(i, 1);
    }
  }
}

private updateObstacles(delta: number) {
  for (let i = this.obstacles.length - 1; i >= 0; i--) {
    const obstacle = this.obstacles[i];

    
    // Increase obstacle speed based on the current level
    const levelConfig = this.getCurrentLevelConfig();

    obstacle.progress +=
      delta * this.obstacleSpeed * levelConfig.speed;


  
    // Check collision before rewarding Near Miss
    const collided =
      this.checkSpikeCollision(obstacle) ||
      this.checkJumpBarrierCollision(obstacle);

    
    if (collided) {
      // Mark the obstacle as unsafe for Near Miss rewards
      this.nearMissDamaged.add(obstacle);

      this.takeDamage();
    }

    // Track successful jumps and evaluate rewards
    this.checkNearMiss(obstacle);




    const perspective = obstacle.progress * obstacle.progress;

    const y =
      this.HORIZON_Y +
      perspective * (this.ROAD_BOTTOM_Y - this.HORIZON_Y);

    const x = this.laneX(obstacle.lane, y);

    // Scale spikes according to perspective
    const laneWidth = (this.roadHalfWidthAt(y) * 2) / 3;
    const width = laneWidth * 0.75;
    const height = 8 + perspective * 65;

    const graphics = obstacle.graphics;
    
// Draw full-width jump barriers separately
if (obstacle.type === "jumpBarrier") {
  this.drawJumpBarrier(
    graphics,
    y,
    perspective
  );

  if (obstacle.progress >= 1) {
    graphics.destroy();
    this.obstacles.splice(i, 1);
  }

  continue;
}

    graphics.clear();

    
    // ===== NEON ENERGY SPIKE TRAP =====

    const baseHeight = Math.max(4, height * 0.22);
    const baseTop = y - baseHeight * 0.55;
    const edgeSize = Math.max(1, perspective * 3);
    const glowAlpha = 0.25 + perspective * 0.3;

    // Ground shadow
    graphics.fillStyle(0x05020d, 0.45);
    graphics.fillEllipse(
      x,
      y + baseHeight * 0.35,
      width * 1.15,
      baseHeight * 1.2
    );

    // Outer red energy glow
    graphics.fillStyle(0xff174d, glowAlpha * 0.35);
    graphics.fillRoundedRect(
      x - width * 0.55,
      baseTop - 3,
      width * 1.1,
      baseHeight + 6,
      5
    );

    // Metal platform body
    graphics.fillStyle(0x171c32, 1);
    graphics.fillRoundedRect(
      x - width / 2,
      baseTop,
      width,
      baseHeight,
      Math.max(2, perspective * 5)
    );

    // Top armor panel
    graphics.fillStyle(0x39435c, 1);
    graphics.fillRoundedRect(
      x - width * 0.46,
      baseTop,
      width * 0.92,
      baseHeight * 0.35,
      2
    );

    // Front metal face
    graphics.fillStyle(0x0b1022, 1);
    graphics.fillRect(
      x - width * 0.46,
      baseTop + baseHeight * 0.45,
      width * 0.92,
      baseHeight * 0.4
    );

    // Neon platform border
    graphics.lineStyle(
      edgeSize,
      0xff315f,
      0.95
    );
    graphics.strokeRoundedRect(
      x - width / 2,
      baseTop,
      width,
      baseHeight,
      Math.max(2, perspective * 5)
    );

    // Three dimensional energy spikes
    const spikeCount = 3;
    const spikeWidth = width / spikeCount;

    for (let s = 0; s < spikeCount; s++) {
      const left =
        x - width / 2 + s * spikeWidth;

      const right = left + spikeWidth;
      const middle = (left + right) / 2;

      const tipY = y - height;
      const bottomY = baseTop + baseHeight * 0.2;

      // Soft red glow behind spike
      graphics.fillStyle(
        0xff174d,
        glowAlpha
      );

      graphics.fillTriangle(
        left - spikeWidth * 0.07,
        bottomY,
        right + spikeWidth * 0.07,
        bottomY,
        middle,
        tipY - height * 0.06
      );

      // Dark side of the spike
      graphics.fillStyle(0x6c102e, 1);
      graphics.fillTriangle(
        left,
        bottomY,
        middle,
        bottomY,
        middle,
        tipY
      );

      // Bright front face
      graphics.fillStyle(0xff315f, 1);
      graphics.fillTriangle(
        middle,
        bottomY,
        right,
        bottomY,
        middle,
        tipY
      );

      // Energy core
      graphics.lineStyle(
        Math.max(1, perspective * 2),
        0xffb1c5,
        0.9
      );

      graphics.lineBetween(
        middle,
        tipY + height * 0.12,
        middle,
        bottomY - height * 0.08
      );

      // Sharp neon edges
      graphics.lineStyle(
        Math.max(1, perspective * 2.5),
        0xff6b91,
        1
      );

      graphics.strokeTriangle(
        left,
        bottomY,
        right,
        bottomY,
        middle,
        tipY
      );
    }

    // Front warning lights
    const lightRadius = Math.max(
      1,
      perspective * 3
    );

    for (const side of [-1, 1]) {
      const lightX = x + side * width * 0.4;
      const lightY = baseTop + baseHeight * 0.7;

      graphics.fillStyle(0xff174d, 0.3);
      graphics.fillCircle(
        lightX,
        lightY,
        lightRadius * 2
      );

      graphics.fillStyle(0xff6b91, 1);
      graphics.fillCircle(
        lightX,
        lightY,
        lightRadius
      );
    }

    // ===== END NEON ENERGY SPIKE TRAP =====


    // Neon glow along the base
    graphics.lineStyle(
      2 + perspective * 3,
      0xa855f7,
      0.9
    );

    graphics.lineBetween(
      x - width / 2,
      y,
      x + width / 2,
      y
    );

    // Remove obstacles after passing the camera
    if (obstacle.progress >= 1) {
      graphics.destroy();
      this.obstacles.splice(i, 1);
    }
  }
}


private spawnObstacle(lane: number, waveId: number) {
  const graphics = this.add.graphics();

  graphics.setDepth(5);

  this.obstacles.push({
    type: "spike",
    lane,
    progress: 0,
    graphics,
    waveId,
  });
}


private spawnCodeShard() {
  const lane = Phaser.Math.Between(0, 2);

  const graphics = this.add.graphics();
  graphics.setDepth(7);

  this.codeShards.push({
    lane,
    progress: 0,
    graphics,
  });
}

private spawnCoin(lane: number, progress = 0) {
  const graphics = this.add.graphics();

  graphics.setDepth(6);

  this.coins.push({
    lane,
    progress,
    graphics,
  });
}

private spawnCoinPattern() {
  // Choose a random lane
  const lane = Phaser.Math.Between(0, 2);

  // Create a short trail of 5 coins
  for (let i = 0; i < 5; i++) {
    this.spawnCoin(lane, -i * 0.12);
  }
}


private spawnJumpBarrier() {
  const graphics = this.add.graphics();

  graphics.setDepth(5);

  this.obstacles.push({
    type: "jumpBarrier",
    lane: 1,
    progress: 0,
    graphics,
    waveId: ++this.nextObstacleWaveId,
  });
}



private getObstacleSpawnDelay(): number {
  const delays = [
    2500, // Level 1
    2300, // Level 2
    2100, // Level 3
    1900, // Level 4
    1800, // Level 5
  ];

  return delays[this.currentLevel - 1] ?? 1800;
}


private spawnComboPattern() {
  if (this.isComboSpawning || this.isGameOver) {
    return;
  }

  this.isComboSpawning = true;

  const level = this.currentLevel;

  // Increase combo length at higher levels
  const comboLength =
    level >= 4 ? 3 : 2;

  // Allow more reaction time between combo obstacles
  // while keeping higher levels challenging
  const comboDelay =
    level >= 5 ? 1150 :
    level >= 4 ? 1250 :
    level >= 3 ? 1400 :
    1500;

  for (let i = 0; i < comboLength; i++) {
    this.time.delayedCall(i * comboDelay, () => {
      if (this.isGameOver || this.hasWon) {
        return;
      }

      if (i % 2 === 0) {
        this.spawnSpikePattern();
      } else {
        this.spawnJumpBarrier();
      }
    });
  }

  // Unlock after the combo sequence finishes
  this.time.delayedCall(
    comboLength * comboDelay,
    () => {
      this.isComboSpawning = false;
    }
  );
}




private spawnSpikePattern() {
  const waveId = ++this.nextObstacleWaveId;

  // Block one or two lanes, always leave a safe lane
  const blockedCount = Phaser.Math.Between(1, 2);
  const lanes = Phaser.Utils.Array.Shuffle([0, 1, 2]);

  for (let i = 0; i < blockedCount; i++) {
    this.spawnObstacle(lanes[i], waveId);
  }
}


  private moveLane(direction: number) {
    const nextLane = Phaser.Math.Clamp(
      this.currentLane + direction,
      0,
      2
    );

    if (nextLane === this.currentLane) {
      return;
    }

    this.currentLane = nextLane;

    this.tweens.add({
      targets: this.player,
      x: this.laneX(
        this.currentLane,
        this.PLAYER_Y
      ),
      duration: 160,
      ease: "Sine.easeOut"
    });
  }

  update(_time: number, delta: number) {
   
console.log("GAME UPDATE:", {
  delta,
  isGameOver: this.isGameOver,
  timeRemaining: this.timeRemaining,
});
 
if (this.isGameOver) {
  return;
}

    // Animate road
    this.roadOffset =
      (this.roadOffset + delta * 0.00035) % 1;

    this.drawRoad();
    
this.updateObstacles(delta);


this.updateCoins(delta);

this.updateCodeShards(delta);

this.updateLevelTimer(delta);

    // Keyboard movement
    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.left) ||
      Phaser.Input.Keyboard.JustDown(this.keys.A)
    ) {
      this.moveLane(-1);
    }

    if (
      Phaser.Input.Keyboard.JustDown(this.cursors.right) ||
      Phaser.Input.Keyboard.JustDown(this.keys.D)
    ) {
      this.moveLane(1);
    }
    
if (
  Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
  Phaser.Input.Keyboard.JustDown(this.cursors.space)
) {
  this.jump();
}

if (
  Phaser.Input.Keyboard.JustDown(this.cursors.down) ||
  Phaser.Input.Keyboard.JustDown(this.keys.S)
) {
  this.slide();
}

  }
}

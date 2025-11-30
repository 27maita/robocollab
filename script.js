const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const statusText = document.getElementById("statusText");
const scoreText = document.getElementById("score");
const resetBtn = document.getElementById("reset");

let WIDTH = 960;
let HEIGHT = 540;
let bgX1 = 0;
let bgX2 = WIDTH;
let bgSpeed = WIDTH * 0.002;

let state = "menu";
let score = 0;
let fullscreen = false;
let birdDead = false;
let showAnimation = false;
let lastTime = 0;

const gravity = 0.6;
let jumpForce = -HEIGHT * 0.02;
const birdStretchX = 1.4;
const confettiColors = ["#800080", "#00ff00"];
const explosionColors = ["#ff0000", "#ffa500", "#ffff00"];
let deathAnimation = "explosion"; // or "particles"

const colors = {
  bgTop: "#0b142b",
  bgBottom: "#050913",
  horizon: "rgba(92, 225, 230, 0.08)",
  pipeGreen: "#72e06a",
  pipePink: "#e46bd5",
  bot: "#f8f5ed",
  botAccent: "#f4a261",
  score: "#ffb347",
  trail: "#5ce1e6",
};

const bird = {
  x: WIDTH / 6,
  y: HEIGHT / 2,
  w: 0,
  h: 0,
  vy: 0,
  angle: 0,
};

let pipes = [];
let particles = [];
let explosionShards = [];
let trails = [];

let birdSize = 0;
let ballSize = 0;
let pipeWidth = 0;
let gap = 0;
let minPipeDistance = 0;

function setStatus(text) {
  statusText.textContent = text;
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  WIDTH = rect.width;
  HEIGHT = rect.height;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  birdSize = HEIGHT / 8;
  ballSize = HEIGHT / 12;
  pipeWidth = ballSize;
  gap = HEIGHT / 3;
  minPipeDistance = WIDTH * 0.35;
  bgSpeed = WIDTH * 0.002;
  jumpForce = -HEIGHT * 0.02;
  bird.w = birdSize * birdStretchX;
  bird.h = birdSize;
  if (state === "menu") {
    centerBird();
  }
}

function centerBird() {
  bird.x = WIDTH / 6;
  bird.y = HEIGHT / 2;
  bird.vy = 0;
  bird.angle = 0;
}

class ConfettiParticle {
  constructor(x, y) {
    this.x = x + randomRange(-10, 10);
    this.y = y + randomRange(-10, 10);
    this.size = randomInt(3, 8);
    this.color = confettiColors[randomInt(0, confettiColors.length - 1)];
    this.vx = randomRange(-3, 3);
    this.vy = randomRange(-6, -1);
    this.gravity = 0.25;
    this.lifetime = randomInt(20, 45);
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += this.gravity * dt;
    this.lifetime -= dt;
  }
  draw() {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.size, this.size);
  }
}

class ExplosionShard {
  constructor(x, y) {
    this.x = x + randomRange(-8, 8);
    this.y = y + randomRange(-8, 8);
    const baseScale = Math.max(6, birdSize / 6);
    this.size = baseScale;
    const angle = randomRange(0, Math.PI * 2);
    const speed = randomRange(3, 9);
    this.vx = Math.cos(angle) * speed + randomRange(-1, 1);
    this.vy = Math.sin(angle) * speed + randomRange(-2, 2);
    this.gravity = 0.35;
    this.rotation = randomRange(-10, 10);
    this.angle = randomRange(0, 360);
    this.lifetime = randomInt(60, 140);
    this.alpha = 255;
    this.color = explosionColors[randomInt(0, explosionColors.length - 1)];
  }
  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.vy += this.gravity * dt;
    this.angle = (this.angle + this.rotation * dt) % 360;
    this.lifetime -= dt;
    if (this.lifetime < 40) {
      this.alpha = Math.max(0, (255 * this.lifetime) / 40);
    }
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.angle * Math.PI) / 180);
    ctx.globalAlpha = this.alpha / 255;
    ctx.fillStyle = this.color;
    drawBoltShape(0, 0, this.size, this.size);
    ctx.restore();
  }
}

class TrailItem {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = randomRange(-3, -1);
    this.vy = randomRange(-0.5, 0.5);
    this.gravity = 0.22;
    this.rotation = randomRange(-5, 5);
    this.angle = 0;
    this.fallDelay = randomInt(18, 36);
    this.size = Math.max(8, birdSize / 4);
  }
  update(dt) {
    if (this.fallDelay > 0) {
      this.x += this.vx * dt;
      this.y += this.vy * dt;
      this.fallDelay -= dt;
    } else {
      this.vy += this.gravity * dt;
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }
    this.angle += this.rotation * dt;
  }
  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate((this.angle * Math.PI) / 180);
    ctx.fillStyle = colors.trail;
    drawBoltShape(0, 0, this.size, this.size);
    ctx.restore();
  }
}

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  gradient.addColorStop(0, colors.bgTop);
  gradient.addColorStop(1, colors.bgBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  for (let x = (bgX1 % 120) - 120; x < WIDTH + 120; x += 120) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - 40, HEIGHT);
    ctx.stroke();
  }

  ctx.fillStyle = colors.horizon;
  ctx.fillRect(0, HEIGHT * 0.75, WIDTH, HEIGHT * 0.25);
}

function drawBoltShape(x, y, w, h) {
  ctx.beginPath();
  ctx.moveTo(x - w * 0.4, y - h * 0.4);
  ctx.lineTo(x + w * 0.1, y - h * 0.4);
  ctx.lineTo(x - w * 0.2, y + h * 0.4);
  ctx.lineTo(x + w * 0.4, y + h * 0.4);
  ctx.lineTo(x, y - h * 0.2);
  ctx.closePath();
  ctx.fill();
}

function drawPipe(x, topH, bottomH, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, 0, pipeWidth, topH);
  ctx.fillRect(x, topH + gap, pipeWidth, bottomH);
  ctx.fillStyle = "rgba(255,255,255,0.1)";
  ctx.fillRect(x, 0, pipeWidth, 10);
  ctx.fillRect(x, topH + gap, pipeWidth, 10);
}

function drawBird() {
  ctx.save();
  ctx.translate(bird.x + bird.w / 2, bird.y + bird.h / 2);
  ctx.rotate((bird.angle * Math.PI) / 180);
  ctx.fillStyle = colors.bot;
  ctx.fillRect(-bird.w / 2, -bird.h / 2, bird.w, bird.h);
  ctx.fillStyle = colors.botAccent;
  ctx.fillRect(-bird.w / 2 + 6, -bird.h / 2 + 6, bird.w - 12, bird.h / 3);
  ctx.fillStyle = "rgba(0,0,0,0.18)";
  ctx.fillRect(-bird.w / 2 + 8, bird.h / 2 - 12, bird.w - 16, 8);
  ctx.restore();
}

function spawnPipe() {
  const maxH = ballSize * 3;
  const topH = randomInt(ballSize * 2, maxH);
  let bottomH = HEIGHT - (topH + gap);
  bottomH = Math.min(bottomH, maxH);
  const x = WIDTH;
  const col = Math.random() < 0.5 ? colors.pipeGreen : colors.pipePink;
  pipes.push({ x, topH, color: col, passed: false });
}

function canSpawnPipe() {
  if (!pipes.length) return true;
  return pipes.every((p) => WIDTH - p.x >= minPipeDistance);
}

function triggerDeathAnimation() {
  const cx = bird.x + bird.w / 2;
  const cy = bird.y + bird.h / 2;
  if (deathAnimation === "particles") {
    for (let i = 0; i < 60; i++) particles.push(new ConfettiParticle(cx, cy));
  } else {
    for (let i = 0; i < 20; i++) explosionShards.push(new ExplosionShard(cx, cy));
  }
}

function resetGame(message) {
  score = 0;
  birdDead = false;
  showAnimation = false;
  bird.angle = 0;
  trails = [];
  particles = [];
  explosionShards = [];
  pipes = [];
  bgX1 = 0;
  bgX2 = WIDTH;
  centerBird();
  spawnPipe();
  setStatus(message || "Press Space to launch from the hangar.");
  scoreText.textContent = "0";
  state = "menu";
}

function handleGameOver() {
  birdDead = true;
  showAnimation = true;
  bird.angle = 30;
  triggerDeathAnimation();
}

function updatePipes(dt) {
  for (const p of pipes) {
    p.x -= WIDTH * 0.004 * dt;
  }
  pipes = pipes.filter((p) => p.x > -pipeWidth);
  if (canSpawnPipe()) spawnPipe();
}

function checkCollisions() {
  if (birdDead) return;
  if (bird.y < 0 || bird.y + bird.h >= HEIGHT) {
    bird.y = Math.max(0, Math.min(bird.y, HEIGHT - bird.h));
    handleGameOver();
    return;
  }
  for (const pipe of pipes) {
    const bottomH = HEIGHT - (pipe.topH + gap);
    const topRect = { x: pipe.x, y: 0, w: pipeWidth, h: pipe.topH };
    const bottomRect = { x: pipe.x, y: pipe.topH + gap, w: pipeWidth, h: bottomH };
    if (rectOverlap(bird, topRect) || rectOverlap(bird, bottomRect)) {
      handleGameOver();
      break;
    }
    if (!pipe.passed && pipe.x + pipeWidth < bird.x) {
      pipe.passed = true;
      score += 1;
      scoreText.textContent = score;
    }
  }
}

function rectOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function updateParticles(dt) {
  particles.forEach((p) => p.update(dt));
  particles = particles.filter((p) => p.lifetime > 0 && p.y < HEIGHT + 200);

  explosionShards.forEach((s) => s.update(dt));
  explosionShards = explosionShards.filter((s) => s.lifetime > 0 && s.y < HEIGHT + 300);

  trails.forEach((t) => t.update(dt));
  trails = trails.filter((t) => t.y < HEIGHT + 200);
}

function drawParticles() {
  trails.forEach((t) => t.draw());
  explosionShards.forEach((s) => s.draw());
  particles.forEach((p) => p.draw());
}

function updateBackground(dt) {
  bgX1 -= bgSpeed * dt;
  bgX2 -= bgSpeed * dt;
  if (bgX1 <= -WIDTH) bgX1 = bgX2 + WIDTH;
  if (bgX2 <= -WIDTH) bgX2 = bgX1 + WIDTH;
}

function drawPipes() {
  for (const p of pipes) {
    const bottomH = HEIGHT - (p.topH + gap);
    drawPipe(p.x, p.topH, bottomH, p.color);
  }
}

function updateBird(dt) {
  bird.vy += gravity * dt;
  bird.y += bird.vy * dt;
  bird.angle = birdDead ? Math.min(90, bird.angle + 0.8 * dt) : Math.max(-20, bird.vy * -1.2);
}

function drawUIOverlay() {
  if (state === "menu" && !showAnimation) {
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = "#e6edff";
    ctx.textAlign = "center";
    ctx.font = `${Math.max(24, WIDTH * 0.03)}px 'Inter', sans-serif`;
    ctx.fillText("Press Space to launch", WIDTH / 2, HEIGHT / 2);
    ctx.font = `${Math.max(16, WIDTH * 0.02)}px 'Inter', sans-serif`;
    ctx.fillStyle = "rgba(230,237,255,0.75)";
    ctx.fillText("Dodge the reactor stacks and survive the shutdown sequence", WIDTH / 2, HEIGHT / 2 + 36);
  }
}

function loop(timestamp) {
  requestAnimationFrame(loop);
  const dt = Math.min(2, (timestamp - lastTime) / 16.67 || 1);
  lastTime = timestamp;

  drawBackground();
  updateBackground(dt);

  if (state === "game") {
    updateBird(dt);
    updatePipes(dt);
    checkCollisions();
    updateParticles(dt);
  } else {
    updateParticles(dt);
  }

  drawPipes();
  drawBird();
  drawParticles();
  drawUIOverlay();

  if (birdDead && particles.length === 0 && explosionShards.length === 0) {
    resetGame("Crash detected. Hangar doors reopened.");
  }
}

function startGame() {
  if (state === "menu") {
    state = "game";
    setStatus("Threading through reactor stacks...");
  }
  if (!birdDead) {
    bird.vy = jumpForce;
    trails.push(new TrailItem(bird.x + bird.w / 2, bird.y + bird.h / 2));
  }
}

function toggleFullscreen() {
  if (!document.fullscreenElement) {
    canvas.requestFullscreen().catch(() => {});
    fullscreen = true;
  } else {
    document.exitFullscreen();
    fullscreen = false;
  }
}

window.addEventListener("resize", resizeCanvas);
window.addEventListener("keydown", (e) => {
  if (e.code === "Space") {
    e.preventDefault();
    startGame();
  }
  if (e.code === "KeyF") toggleFullscreen();
  if (e.code === "Escape" && fullscreen) toggleFullscreen();
});

resetBtn.addEventListener("click", () => resetGame("Course reset: recalibrating motors."));

resizeCanvas();
resetGame();
requestAnimationFrame(loop);
const resetBtn = document.getElementById("reset");

const gravity = 0.6;
const friction = 0.75;

const colors = {
  spark: "#ff7b2f",
  wave: "#2fb3ff",
  platform: "#1e2b4f",
  platformEdge: "#31426d",
  hazard: "#c21d5d",
  hazardWater: "#2463b3",
  goal: "#52d273",
  gate: "#d9b64a",
  accent: "#ffbf3c",
};

const level = {
  platforms: [
    { x: 60, y: 480, w: 260, h: 32 },
    { x: 380, y: 430, w: 160, h: 24 },
    { x: 620, y: 470, w: 280, h: 28 },
    { x: 100, y: 360, w: 140, h: 22 },
    { x: 320, y: 320, w: 160, h: 20 },
    { x: 540, y: 300, w: 140, h: 20 },
    { x: 740, y: 280, w: 140, h: 20 },
    { x: 70, y: 240, w: 140, h: 18 },
    { x: 260, y: 200, w: 140, h: 18 },
    { x: 520, y: 190, w: 140, h: 18 },
  ],
  hazards: [
    { x: 320, y: 488, w: 60, h: 52, type: "fire" },
    { x: 480, y: 488, w: 60, h: 52, type: "water" },
    { x: 860, y: 496, w: 60, h: 44, type: "fire" },
  ],
  gates: [
    { x: 560, y: 430, w: 20, h: 70, open: false, id: "A" },
  ],
  switches: [
    { x: 430, y: 404, radius: 12, id: "A", held: false },
  ],
  goals: [
    { x: 770, y: 240, w: 60, h: 12, type: "spark" },
    { x: 610, y: 160, w: 60, h: 12, type: "wave" },
  ],
};

class Robot {
  constructor(x, y, color, controls, tag) {
    this.initial = { x, y };
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.w = 34;
    this.h = 46;
    this.color = color;
    this.controls = controls;
    this.tag = tag;
    this.onGround = false;
  }

  reset() {
    this.x = this.initial.x;
    this.y = this.initial.y;
    this.vx = 0;
    this.vy = 0;
    this.onGround = false;
  }
}

const robots = [
  new Robot(90, 430, colors.spark, { left: "KeyA", right: "KeyD", jump: "KeyW" }, "spark"),
  new Robot(180, 430, colors.wave, { left: "ArrowLeft", right: "ArrowRight", jump: "ArrowUp" }, "wave"),
];

let keys = {};
let messageTimer;
let winState = false;

function setStatus(message) {
  statusText.textContent = message;
  clearTimeout(messageTimer);
  if (message !== "Boot the prototypes and reach the pads.") {
    messageTimer = setTimeout(() => {
      if (!winState) {
        statusText.textContent = "Boot the prototypes and reach the pads.";
      }
    }, 2200);
  }
}

function drawPlatform(p) {
  ctx.fillStyle = colors.platform;
  ctx.fillRect(p.x, p.y, p.w, p.h);
  ctx.fillStyle = colors.platformEdge;
  ctx.fillRect(p.x, p.y, p.w, 6);
}

function drawHazard(h) {
  ctx.fillStyle = h.type === "fire" ? colors.hazard : colors.hazardWater;
  ctx.fillRect(h.x, h.y, h.w, h.h);
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(h.x, h.y, h.w, 6);
}

function drawGate(g) {
  ctx.fillStyle = g.open ? "rgba(217,182,74,0.2)" : colors.gate;
  ctx.fillRect(g.x, g.y, g.w, g.h);
  if (!g.open) {
    ctx.fillStyle = "rgba(0,0,0,0.35)";
    ctx.fillRect(g.x, g.y, g.w, 6);
  }
}

function drawSwitch(s) {
  ctx.beginPath();
  ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2);
  ctx.fillStyle = s.held ? colors.accent : "#6e7fb0";
  ctx.fill();
}

function drawGoal(g) {
  ctx.fillStyle = colors.goal;
  ctx.fillRect(g.x, g.y, g.w, g.h);
  ctx.fillStyle = g.type === "spark" ? colors.spark : colors.wave;
  ctx.fillRect(g.x, g.y - 4, g.w, 4);
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function updateSwitches() {
  let gateChanged = false;
  for (const s of level.switches) {
    s.held = robots.some((r) => {
      const dist = Math.hypot(r.x + r.w / 2 - s.x, r.y + r.h / 2 - s.y);
      return dist < s.radius + Math.min(r.w, r.h) / 2;
    });
    level.gates.forEach((g) => {
      if (g.id === s.id) {
        const nextOpen = s.held;
        gateChanged = gateChanged || g.open !== nextOpen;
        g.open = nextOpen;
      }
    });
  }

  if (gateChanged) {
    setStatus("Gate toggled: maintain pressure on the switch.");
  }
}

function applyPhysics(robot) {
  robot.vy += gravity;
  robot.x += robot.vx;
  robot.y += robot.vy;
  robot.vx *= friction;

  robot.onGround = false;
  for (const p of level.platforms) {
    if (
      robot.x < p.x + p.w &&
      robot.x + robot.w > p.x &&
      robot.y + robot.h > p.y &&
      robot.y + robot.h - robot.vy <= p.y + 6
    ) {
      robot.y = p.y - robot.h;
      robot.vy = 0;
      robot.onGround = true;
    }
  }

  for (const g of level.gates) {
    if (!g.open) {
      if (
        robot.x < g.x + g.w &&
        robot.x + robot.w > g.x &&
        robot.y + robot.h > g.y &&
        robot.y < g.y + g.h
      ) {
        if (robot.vx > 0) robot.x = g.x - robot.w;
        if (robot.vx < 0) robot.x = g.x + g.w;
        if (robot.vy > 0) {
          robot.y = g.y - robot.h;
          robot.vy = 0;
          robot.onGround = true;
        }
      }
    }
  }

  robot.y = Math.min(robot.y, canvas.height - robot.h);
  robot.x = Math.max(0, Math.min(robot.x, canvas.width - robot.w));
}

function checkHazards(robot) {
  if (winState) return;
  for (const h of level.hazards) {
    if (rectsOverlap(robot, h)) {
      if ((robot.tag === "spark" && h.type === "water") || (robot.tag === "wave" && h.type === "fire")) {
        resetGame("Hazard shutdown! Rerouting power.");
      }
    }
  }
}

function checkGoals() {
  if (winState) return;
  const sparkOnGoal = rectsOverlap(robots[0], level.goals[0]);
  const waveOnGoal = rectsOverlap(robots[1], level.goals[1]);
  if (sparkOnGoal && waveOnGoal) {
    winState = true;
    setStatus("Course cleared! Robots synced for the next decode season stage.");
  }
}

function drawRobot(r, accent) {
  ctx.fillStyle = r.color;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = accent;
  ctx.fillRect(r.x + 6, r.y + 8, r.w - 12, 10);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.fillRect(r.x + 8, r.y + r.h - 10, r.w - 16, 6);
}

function drawBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#101833");
  gradient.addColorStop(1, "#070b17");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.strokeStyle = "rgba(255,255,255,0.04)";
  for (let x = 0; x < canvas.width; x += 80) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x - 20, canvas.height);
    ctx.stroke();
  }
}

function update() {
  requestAnimationFrame(update);
  drawBackground();

  updateSwitches();

  level.platforms.forEach(drawPlatform);
  level.hazards.forEach(drawHazard);
  level.gates.forEach(drawGate);
  level.switches.forEach(drawSwitch);
  level.goals.forEach(drawGoal);

  robots.forEach((r) => {
    const c = r.controls;
    if (keys[c.left]) r.vx -= 0.5;
    if (keys[c.right]) r.vx += 0.5;
    if (keys[c.jump] && r.onGround) r.vy = -11;

    applyPhysics(r);
    checkHazards(r);
  });

  drawRobot(robots[0], "#f9d5be");
  drawRobot(robots[1], "#b5e5ff");

  checkGoals();
}

function resetGame(message) {
  robots.forEach((r) => r.reset());
  level.gates.forEach((g) => (g.open = false));
  level.switches.forEach((s) => (s.held = false));
  winState = false;
  if (message) {
    setStatus(message);
  } else {
    setStatus("Boot the prototypes and reach the pads.");
  }
}

window.addEventListener("keydown", (e) => {
  keys[e.code] = true;
});
window.addEventListener("keyup", (e) => {
  keys[e.code] = false;
});
resetBtn.addEventListener("click", () => resetGame("Course reset: recalibrating motors."));

resetGame();
update();

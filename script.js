const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const statusText = document.getElementById("statusText");
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
  for (const s of level.switches) {
    s.held = robots.some((r) => {
      const dist = Math.hypot(r.x + r.w / 2 - s.x, r.y + r.h / 2 - s.y);
      return dist < s.radius + Math.min(r.w, r.h) / 2;
    });
    if (s.held) {
      level.gates.forEach((g) => {
        if (g.id === s.id) g.open = true;
      });
    }
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
}

function checkHazards(robot) {
  for (const h of level.hazards) {
    if (rectsOverlap(robot, h)) {
      if ((robot.tag === "spark" && h.type === "water") || (robot.tag === "wave" && h.type === "fire")) {
        resetGame("Hazard shutdown! Rerouting power.");
      }
    }
  }
}

function checkGoals() {
  const sparkOnGoal = rectsOverlap(robots[0], level.goals[0]);
  const waveOnGoal = rectsOverlap(robots[1], level.goals[1]);
  if (sparkOnGoal && waveOnGoal) {
    statusText.textContent = "Course cleared! Robots synced for the next decode season stage.";
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
  if (message) {
    statusText.textContent = message;
    clearTimeout(messageTimer);
    messageTimer = setTimeout(() => {
      statusText.textContent = "Boot the prototypes and reach the pads.";
    }, 2000);
  } else {
    statusText.textContent = "Boot the prototypes and reach the pads.";
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

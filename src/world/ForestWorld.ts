import Phaser from 'phaser';

export const WORLD = { width: 2400, height: 1600 };
export const LANDMARKS = {
  board: { x: 560, y: 735 },
  feeding: { x: 860, y: 510 },
  lookout: { x: 1720, y: 680 },
};

function random(seed = 37): () => number {
  return () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
}

function texture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): void {
  if (scene.textures.exists(key)) return;
  const canvas = scene.textures.createCanvas(key, w, h)!;
  draw(canvas.context);
  canvas.refresh();
}

/** Small local pixel textures, created once and shared by menu and play scenes. */
export function ensureForestArt(scene: Phaser.Scene): void {
  texture(scene, 'terrain', 1200, 800, ctx => {
    const rng = random();
    ctx.fillStyle = '#284a37'; ctx.fillRect(0, 0, 1200, 800);
    const greens = ['#2c503b', '#31563b', '#234631', '#35573c', '#3b5c3e'];
    for (let i = 0; i < 24000; i++) {
      ctx.fillStyle = greens[Math.floor(rng() * greens.length)];
      ctx.fillRect(Math.floor(rng() * 600) * 2, Math.floor(rng() * 400) * 2, 2 + Math.floor(rng() * 3), 2);
    }
    // One winding trail, with a short branch into the feeding clearing.
    const trail = () => {
      ctx.beginPath(); ctx.moveTo(280, 530); ctx.bezierCurveTo(210, 380, 315, 370, 390, 325);
      ctx.bezierCurveTo(465, 290, 540, 325, 605, 330); ctx.bezierCurveTo(710, 365, 755, 345, 865, 345);
      ctx.bezierCurveTo(965, 345, 960, 420, 1030, 470);
    };
    ctx.lineCap = 'round'; ctx.strokeStyle = '#3b4b32'; ctx.lineWidth = 100; trail(); ctx.stroke();
    ctx.strokeStyle = '#65704a'; ctx.lineWidth = 68; trail(); ctx.stroke();
    ctx.strokeStyle = '#7b7954'; ctx.lineWidth = 44; trail(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(380, 326); ctx.quadraticCurveTo(410, 300, 430, 255);
    ctx.strokeStyle = '#667149'; ctx.lineWidth = 58; ctx.stroke();
    ctx.fillStyle = '#637449'; ctx.beginPath(); ctx.ellipse(430, 255, 104, 74, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#526640'; ctx.beginPath(); ctx.ellipse(280, 416, 110, 86, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7c7951'; ctx.beginPath(); ctx.ellipse(285, 433, 65, 55, 0, 0, Math.PI * 2); ctx.fill();
    // Stream banks and deep, layered water.
    const river = () => {
      ctx.beginPath(); ctx.moveTo(580, -50); ctx.bezierCurveTo(490, 150, 650, 190, 600, 330);
      ctx.bezierCurveTo(525, 460, 695, 550, 570, 850);
    };
    ctx.strokeStyle = '#253c30'; ctx.lineWidth = 128; river(); ctx.stroke();
    ctx.strokeStyle = '#507565'; ctx.lineWidth = 112; river(); ctx.stroke();
    ctx.strokeStyle = '#245b59'; ctx.lineWidth = 100; river(); ctx.stroke();
    ctx.strokeStyle = '#1d484c'; ctx.lineWidth = 65; river(); ctx.stroke();
    for (let i = 0; i < 190; i++) {
      const y = rng() * 800;
      const x = 588 + Math.sin(y / 90) * 19 + rng() * 25;
      ctx.fillStyle = i % 3 ? '#3e7771' : '#629088'; ctx.fillRect(x, y, 3 + rng() * 13, 1);
    }
    // The bridge crosses at the trail, with planks and rails.
    ctx.fillStyle = '#23342b'; ctx.fillRect(535, 308, 128, 53);
    for (let x = 537; x < 663; x += 9) {
      ctx.fillStyle = x % 3 ? '#9c8a5c' : '#b19a67'; ctx.fillRect(x, 311, 7, 47);
      ctx.fillStyle = '#736644'; ctx.fillRect(x + 2, 318, 1, 31);
    }
    ctx.fillStyle = '#544d33'; ctx.fillRect(532, 306, 135, 5); ctx.fillRect(532, 359, 135, 5);
    ctx.fillStyle = '#d0bd86'; ctx.fillRect(532, 305, 135, 2); ctx.fillRect(532, 358, 135, 2);
    // Scattered leaf litter and sunlight squares stay on the ground layer.
    for (let i = 0; i < 950; i++) {
      const x = rng() * 1200, y = rng() * 800;
      if (Math.abs(x - 590) < 85) continue;
      ctx.fillStyle = ['#87914d', '#997d42', '#506736', '#ad9a55'][i % 4];
      ctx.globalAlpha = .45; ctx.fillRect(x, y, 2 + rng() * 4, 1 + rng() * 2);
    }
    ctx.globalAlpha = 1;
  });

  texture(scene, 'tree', 112, 138, ctx => {
    const rng = random(26);
    ctx.fillStyle = '#122d24'; ctx.fillRect(45, 110, 26, 14);
    ctx.fillStyle = '#4c5031'; ctx.fillRect(49, 64, 14, 64);
    ctx.fillStyle = '#6e6740'; ctx.fillRect(50, 67, 5, 59);
    ctx.fillStyle = '#3e472e'; ctx.fillRect(45, 120, 27, 7);
    const leaves = ['#1a3c2d', '#214b32', '#2e5938', '#386641', '#497644', '#628449'];
    for (let layer = 0; layer < 4; layer++) {
      for (let i = 0; i < 80; i++) {
        const x = 56 + (rng() - .5) * (100 - layer * 10);
        const y = 51 + (rng() - .5) * (84 - layer * 10) - layer * 3;
        if ((x - 56) ** 2 / 2700 + (y - 48) ** 2 / 1800 > 1) continue;
        ctx.fillStyle = leaves[Math.min(5, layer + Math.floor(rng() * 3))];
        ctx.fillRect(Math.floor(x / 3) * 3, Math.floor(y / 3) * 3, 10 + rng() * 15, 7 + rng() * 8);
      }
    }
    ctx.fillStyle = '#91a659'; ctx.fillRect(36, 21, 6, 3); ctx.fillRect(61, 30, 8, 3);
  });
  texture(scene, 'fern', 40, 40, ctx => {
    ctx.fillStyle = '#203f2b'; ctx.fillRect(8, 32, 27, 5);
    for (let side = -1; side <= 1; side += 2) {
      for (let n = 0; n < 6; n++) {
        ctx.fillStyle = n % 2 ? '#56814a' : '#70934f';
        ctx.fillRect(20 + side * n * 2 - (side < 0 ? 7 : 0), 30 - n * 4, 9, 3);
        ctx.fillRect(20 + side * n * 2, 28 - n * 4, 3, 5);
      }
    }
    ctx.fillStyle = '#93ae61'; ctx.fillRect(19, 9, 2, 23);
  });
  texture(scene, 'rock', 40, 30, ctx => {
    ctx.fillStyle = '#243a32'; ctx.fillRect(3, 19, 34, 9);
    ctx.fillStyle = '#58695d'; ctx.fillRect(6, 8, 28, 16); ctx.fillRect(11, 4, 18, 5);
    ctx.fillStyle = '#879183'; ctx.fillRect(11, 5, 18, 4); ctx.fillRect(7, 9, 8, 5);
    ctx.fillStyle = '#3f5548'; ctx.fillRect(23, 14, 11, 9);
    ctx.fillStyle = '#618044'; ctx.fillRect(4, 21, 11, 4); ctx.fillRect(28, 17, 7, 4);
  });
  texture(scene, 'board', 58, 61, ctx => {
    ctx.fillStyle = '#31422d'; ctx.fillRect(5, 49, 50, 7);
    ctx.fillStyle = '#675036'; ctx.fillRect(12, 24, 5, 30); ctx.fillRect(42, 24, 5, 30);
    ctx.fillStyle = '#302d24'; ctx.fillRect(4, 5, 51, 31);
    ctx.fillStyle = '#987245'; ctx.fillRect(6, 7, 47, 26);
    ctx.fillStyle = '#c9b884'; ctx.fillRect(10, 11, 38, 18);
    ctx.fillStyle = '#72835a'; ctx.fillRect(13, 14, 12, 12);
    ctx.fillStyle = '#5c6345'; ctx.fillRect(29, 14, 14, 2); ctx.fillRect(29, 19, 11, 2); ctx.fillRect(29, 24, 13, 2);
    ctx.fillStyle = '#b39663'; ctx.fillRect(2, 2, 55, 5);
  });
  texture(scene, 'frog', 48, 48, ctx => {
    // Stylized brown frog illustration, not a scientific identification diagram.
    ctx.fillStyle = '#332b24'; ctx.fillRect(6, 26, 10, 12); ctx.fillRect(32, 26, 10, 12);
    ctx.fillStyle = '#8b7044'; ctx.fillRect(8, 25, 8, 11); ctx.fillRect(32, 25, 8, 11);
    ctx.fillStyle = '#b2965d'; ctx.fillRect(7, 34, 10, 3); ctx.fillRect(31, 34, 10, 3);
    ctx.fillStyle = '#4e422e'; ctx.fillRect(14, 12, 20, 24); ctx.fillRect(10, 11, 28, 12);
    ctx.fillStyle = '#9b8150'; ctx.fillRect(14, 11, 20, 21); ctx.fillRect(11, 13, 26, 8);
    ctx.fillStyle = '#b99c67'; ctx.fillRect(15, 12, 18, 8); ctx.fillRect(20, 17, 8, 13);
    ctx.fillStyle = '#685333'; ctx.fillRect(16, 20, 3, 10); ctx.fillRect(30, 19, 3, 10);
    ctx.fillStyle = '#d3b978'; ctx.fillRect(10, 9, 8, 7); ctx.fillRect(30, 9, 8, 7);
    ctx.fillStyle = '#151f1b'; ctx.fillRect(12, 9, 4, 4); ctx.fillRect(32, 9, 4, 4);
    ctx.fillStyle = '#e9deb1'; ctx.fillRect(12, 9, 2, 1); ctx.fillRect(32, 9, 2, 1);
    ctx.fillStyle = '#443d28'; ctx.fillRect(18, 14, 12, 1); ctx.fillRect(20, 23, 2, 2); ctx.fillRect(27, 28, 2, 2);
    ctx.fillStyle = '#987c49'; ctx.fillRect(7, 19, 5, 9); ctx.fillRect(36, 19, 5, 9);
    ctx.fillStyle = '#ccb079'; ctx.fillRect(6, 26, 7, 2); ctx.fillRect(35, 26, 7, 2);
  });
  texture(scene, 'insect', 16, 16, ctx => {
    ctx.fillStyle = '#24342a'; ctx.fillRect(3, 6, 10, 5);
    ctx.fillStyle = '#d5b66c'; ctx.fillRect(6, 5, 5, 5);
    ctx.fillStyle = '#8d6e36'; ctx.fillRect(7, 6, 2, 4);
    ctx.fillStyle = '#e6d494'; ctx.fillRect(3, 3, 5, 3); ctx.fillRect(10, 3, 4, 3);
  });
}

export function buildForest(scene: Phaser.Scene, collisions = true): Phaser.Physics.Arcade.StaticGroup {
  ensureForestArt(scene);
  scene.add.image(0, 0, 'terrain').setOrigin(0).setScale(2).setDepth(-100);
  const obstacles = scene.physics.add.staticGroup();
  const rng = random(83);
  const addObstacle = (x: number, y: number, w: number, h: number) => {
    if (!collisions) return;
    const zone = scene.add.zone(x, y, w, h);
    obstacles.add(zone);
  };
  for (let i = 0; i < 160; i++) {
    const x = 100 + rng() * 2200, y = 90 + rng() * 1420;
    const nearTrail = x > 390 && x < 2100 && y > 450 && y < 1050;
    if (nearTrail || Math.abs(x - 1190) < 160) continue;
    const tree = scene.add.image(x, y, 'tree').setOrigin(.5, .92).setScale(1.7 + rng() * .6).setDepth(y);
    addObstacle(x, y - 5, 32, 28);
    if (i % 3 === 0) tree.setTint(0xd3e6b3);
  }
  for (let i = 0; i < 160; i++) {
    const x = 90 + rng() * 2220, y = 130 + rng() * 1360;
    if (Math.abs(x - 1190) < 135 || (x > 440 && x < 720 && y > 710 && y < 980)) continue;
    scene.add.image(x, y, i % 5 ? 'fern' : 'rock').setOrigin(.5, .85).setScale(1.1 + rng()).setDepth(y);
    if (i % 5 === 0) addObstacle(x, y, 30, 20);
  }
  scene.add.image(LANDMARKS.board.x, LANDMARKS.board.y, 'board').setOrigin(.5, .86).setScale(2).setDepth(LANDMARKS.board.y);
  addObstacle(LANDMARKS.board.x, LANDMARKS.board.y - 28, 90, 24);
  scene.add.image(LANDMARKS.lookout.x, LANDMARKS.lookout.y, 'board').setOrigin(.5, .86).setScale(2).setDepth(LANDMARKS.lookout.y);
  addObstacle(LANDMARKS.lookout.x, LANDMARKS.lookout.y - 28, 90, 24);
  // Keep the stream impassable except for its visible bridge.
  addObstacle(1190, 300, 160, 600);
  addObstacle(1190, 1150, 180, 850);
  // A handful of moving water glints, kept below the bridge and foreground.
  for (let i = 0; i < 16; i++) {
    const y = 70 + i * 90;
    if (y > 590 && y < 750) continue;
    const x = 1190 + Math.sin(y / 190) * 28;
    const ripple = scene.add.rectangle(x, y, 18 + i % 4 * 5, 2, 0x86b2a0, .35).setDepth(-90);
    scene.tweens.add({ targets: ripple, y: y + 24, x: x + 9, alpha: .08, duration: 1800 + i * 80, yoyo: true, repeat: -1 });
  }
  for (let i = 0; i < 30; i++) {
    const mote = scene.add.rectangle(150 + rng() * 2100, 120 + rng() * 1320, 3, 3, 0xe5dca0, .45).setDepth(3000);
    scene.tweens.add({ targets: mote, x: mote.x + 30, y: mote.y - 36, alpha: .08, duration: 2800 + rng() * 3000, yoyo: true, repeat: -1 });
  }
  return obstacles;
}

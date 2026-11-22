// The renderer: one canvas, one logical 1280x720 room, scaled to the window.
// It paints the museum gallery, the thief, the guards and their vision cones,
// the wall cameras and their sweeps, the loot, the alarm meter and the screens.
import {
  CAMERA,
  EXIT,
  FIELD,
  FONT,
  GUARD,
  LOOT,
  OBSTACLES,
  PALETTE,
  VAULT,
  WALL,
} from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WIN = 'win';
export const SCREEN_OVER = 'over';

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

function formatMoney(value) {
  return `$${value.toLocaleString('en-US')}`;
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  function resize() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    scale = Math.min(width / FIELD.width, height / FIELD.height) * dpr;
    offsetX = (canvas.width - FIELD.width * scale) / 2;
    offsetY = (canvas.height - FIELD.height * scale) / 2;
  }
  window.addEventListener('resize', resize);
  resize();

  /** Convert a client (mouse) point to logical room coordinates. */
  function logicalFromClient(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width) / scale - offsetX / scale,
      y: (clientY - rect.top) * (canvas.height / rect.height) / scale - offsetY / scale,
    };
  }

  function sector(x, y, angle, halfAngle, range) {
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
    ctx.closePath();
  }

  function drawFloor() {
    ctx.fillStyle = PALETTE.floorA;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const tile = 80;
    for (let ty = 0; ty < FIELD.height / tile; ty += 1) {
      for (let tx = 0; tx < FIELD.width / tile; tx += 1) {
        if ((tx + ty) % 2 === 0) continue;
        ctx.fillStyle = PALETTE.floorB;
        ctx.fillRect(tx * tile, ty * tile, tile, tile);
      }
    }
    // A red carpet runner from the entrance to the vault.
    ctx.fillStyle = 'rgba(120, 30, 40, 0.35)';
    ctx.fillRect(600, WALL, 80, FIELD.height - WALL * 2);
    ctx.strokeStyle = 'rgba(242, 201, 76, 0.25)';
    ctx.lineWidth = 2;
    ctx.strokeRect(600, WALL, 80, FIELD.height - WALL * 2);
  }

  function drawWalls() {
    ctx.fillStyle = PALETTE.wall;
    ctx.fillRect(0, 0, FIELD.width, WALL);
    ctx.fillRect(0, FIELD.height - WALL, FIELD.width, WALL);
    ctx.fillRect(0, 0, WALL, FIELD.height);
    ctx.fillRect(FIELD.width - WALL, 0, WALL, FIELD.height);
    ctx.fillStyle = PALETTE.wallTop;
    ctx.fillRect(0, WALL - 4, FIELD.width, 4);
    ctx.fillRect(0, FIELD.height - WALL, FIELD.width, 4);
    ctx.fillRect(WALL - 4, 0, 4, FIELD.height);
    ctx.fillRect(FIELD.width - WALL, 0, 4, FIELD.height);
  }

  function drawVault(state) {
    ctx.fillStyle = PALETTE.vault;
    ctx.fillRect(VAULT.x, VAULT.y, VAULT.w, VAULT.h);
    ctx.fillStyle = PALETTE.vaultDoor;
    ctx.fillRect(VAULT.x + 8, VAULT.y + 6, VAULT.w - 16, VAULT.h - 12);
    ctx.strokeStyle = '#5e4a1e';
    ctx.lineWidth = 3;
    ctx.strokeRect(VAULT.x + 8, VAULT.y + 6, VAULT.w - 16, VAULT.h - 12);
    ctx.fillStyle = '#5e4a1e';
    ctx.beginPath();
    ctx.arc(VAULT.x + VAULT.w / 2, VAULT.y + VAULT.h / 2, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('V A U L T', VAULT.x + VAULT.w / 2, VAULT.y + VAULT.h + 18);
  }

  function drawExit(state) {
    const open = state.lootTaken === LOOT.length;
    ctx.fillStyle = open ? '#3fae6a' : PALETTE.exit;
    ctx.fillRect(EXIT.x, EXIT.y - 22, EXIT.w, 22);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(open ? 'EXIT — GO!' : 'EXIT', EXIT.x + EXIT.w / 2, EXIT.y - 6);
    if (open) {
      ctx.strokeStyle = 'rgba(94, 230, 160, 0.8)';
      ctx.lineWidth = 3;
      ctx.strokeRect(EXIT.x - 4, EXIT.y - 26, EXIT.w + 8, 30);
    }
  }

  function drawObstacles() {
    for (const obstacle of OBSTACLES) {
      ctx.fillStyle = PALETTE.caseGlass;
      ctx.fillRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.strokeStyle = PALETTE.caseEdge;
      ctx.lineWidth = 3;
      ctx.strokeRect(obstacle.x, obstacle.y, obstacle.w, obstacle.h);
      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(obstacle.x, obstacle.y + obstacle.h);
      ctx.lineTo(obstacle.x + obstacle.w, obstacle.y);
      ctx.stroke();
    }
  }

  function drawLootIcon(item) {
    const pulse = 0.75 + Math.sin(Date.now() / 280) * 0.25;
    ctx.save();
    ctx.shadowColor = item.colour;
    ctx.shadowBlur = 18 * pulse;
    if (item.id === 'diamond') {
      ctx.fillStyle = item.colour;
      ctx.beginPath();
      ctx.moveTo(item.x, item.y - 16);
      ctx.lineTo(item.x + 14, item.y);
      ctx.lineTo(item.x, item.y + 16);
      ctx.lineTo(item.x - 14, item.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.beginPath();
      ctx.moveTo(item.x, item.y - 16);
      ctx.lineTo(item.x + 14, item.y);
      ctx.lineTo(item.x, item.y);
      ctx.closePath();
      ctx.fill();
    } else if (item.id === 'idol') {
      ctx.fillStyle = item.colour;
      ctx.beginPath();
      ctx.arc(item.x, item.y, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7a5a12';
      ctx.beginPath();
      ctx.arc(item.x - 4, item.y - 3, 2.5, 0, Math.PI * 2);
      ctx.arc(item.x + 4, item.y - 3, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(item.x - 6, item.y + 4);
      ctx.lineTo(item.x + 6, item.y + 4);
      ctx.lineTo(item.x, item.y + 9);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.fillStyle = item.colour;
      for (let i = 0; i < 7; i += 1) {
        const a = Math.PI * (0.15 + (i / 6) * 0.7);
        ctx.beginPath();
        ctx.arc(item.x + Math.cos(a) * 14, item.y + Math.sin(a) * 10 - 4, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(item.x, item.y + 8, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCamera(camera) {
    sector(camera.x, camera.y, camera.angle, CAMERA.viewHalfAngle, CAMERA.viewRange);
    ctx.fillStyle = PALETTE.coneCamera;
    ctx.fill();
    ctx.fillStyle = '#20242e';
    ctx.beginPath();
    ctx.arc(camera.x, camera.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#78c8ff';
    ctx.beginPath();
    ctx.arc(camera.x + Math.cos(camera.angle) * 5, camera.y + Math.sin(camera.angle) * 5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#78c8ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(camera.x, camera.y);
    ctx.lineTo(camera.x + Math.cos(camera.angle) * 18, camera.y + Math.sin(camera.angle) * 18);
    ctx.stroke();
  }

  function drawGuard(guard) {
    sector(guard.x, guard.y, guard.angle, GUARD.viewHalfAngle, GUARD.viewRange);
    ctx.fillStyle = guard.alerted ? PALETTE.coneGuardHot : PALETTE.coneGuard;
    ctx.fill();
    ctx.fillStyle = PALETTE.guardUniform;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, GUARD.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.guard;
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PALETTE.text;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.angle) * 20, guard.y + Math.sin(guard.angle) * 20);
    ctx.stroke();
    if (guard.alerted) {
      ctx.fillStyle = '#ff5040';
      ctx.font = `bold 26px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('!', guard.x, guard.y - 26);
    }
  }

  function drawPlayer(player) {
    ctx.save();
    if (player.sneaking) {
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = 'rgba(232, 178, 58, 0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 7, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = PALETTE.playerCloak;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.player;
    ctx.beginPath();
    ctx.arc(player.x, player.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#20242e';
    ctx.fillRect(player.x - 5, player.y - 2, 10, 3);
    ctx.restore();
  }

  function drawHud(state) {
    // Top bar.
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(0, 0, FIELD.width, 46);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 17px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.fillText(`LOOT  ${state.lootTaken}/${LOOT.length}   ${formatMoney(state.score)}`, 16, 30);
    // Alarm meter, centre.
    const alarmX = 470;
    const alarmW = 340;
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `bold 15px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText('ALARM', alarmX - 10, 30);
    ctx.fillStyle = '#0d0f14';
    ctx.fillRect(alarmX, 14, alarmW, 18);
    const ratio = state.alarm / 100;
    ctx.fillStyle = ratio < 0.5 ? PALETTE.alarmLow : ratio < 0.8 ? PALETTE.alarmMid : PALETTE.alarmHigh;
    ctx.fillRect(alarmX, 14, alarmW * ratio, 18);
    ctx.strokeStyle = '#5a6274';
    ctx.lineWidth = 2;
    ctx.strokeRect(alarmX, 14, alarmW, 18);
    if (state.alarm >= 80) {
      ctx.fillStyle = PALETTE.alarmHigh;
      ctx.font = `bold 15px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.fillText('!!', alarmX + alarmW + 10, 30);
    }
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 17px ${FONT}`;
    ctx.textAlign = 'right';
    ctx.fillText(`TIME ${formatTime(state.time)}`, FIELD.width - 16, 30);
    // Objective line.
    ctx.fillStyle = PALETTE.muted;
    ctx.font = `15px ${FONT}`;
    ctx.textAlign = 'center';
    const objective = state.lootTaken === LOOT.length
      ? 'ALL LOOT TAKEN — reach the green EXIT!'
      : 'Steal all 3 loot, then slip out the EXIT.  WASD / arrows to move, SHIFT to sneak, click to walk.';
    ctx.fillText(objective, FIELD.width / 2, FIELD.height - 8);
    if (state.spotted) {
      ctx.fillStyle = '#ff5040';
      ctx.font = `bold 26px ${FONT}`;
      ctx.fillText('SPOTTED!', FIELD.width / 2, 640);
    }
  }

  function drawEffects(state) {
    for (const particle of state.particles) {
      ctx.globalAlpha = 1 - particle.age / particle.life;
      ctx.fillStyle = particle.colour;
      ctx.fillRect(particle.x - particle.size / 2, particle.y - particle.size / 2, particle.size, particle.size);
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 18px ${FONT}`;
    ctx.textAlign = 'center';
    for (const float of state.floats) {
      ctx.globalAlpha = 1 - float.age / float.life;
      ctx.strokeStyle = 'rgba(10, 12, 16, 0.9)';
      ctx.lineWidth = 4;
      ctx.strokeText(float.text, float.x, float.y - float.age * 30);
      ctx.fillText(float.text, float.x, float.y - float.age * 30);
    }
    ctx.globalAlpha = 1;
  }

  function drawPanel(title, lines, accent) {
    ctx.fillStyle = 'rgba(8, 10, 14, 0.72)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.panel;
    const w = 640;
    const h = 120 + lines.length * 34;
    ctx.fillRect((FIELD.width - w) / 2, (FIELD.height - h) / 2, w, h);
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    ctx.strokeRect((FIELD.width - w) / 2, (FIELD.height - h) / 2, w, h);
    ctx.fillStyle = accent;
    ctx.font = `bold 44px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(title, FIELD.width / 2, (FIELD.height - h) / 2 + 66);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `19px ${FONT}`;
    lines.forEach((line, index) => {
      ctx.fillText(line, FIELD.width / 2, (FIELD.height - h) / 2 + 112 + index * 34);
    });
  }

  function draw(state, screen, best) {
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    ctx.clearRect(-offsetX / scale, -offsetY / scale, canvas.width / scale, canvas.height / scale);
    drawFloor();
    drawWalls();
    drawVault(state);
    drawExit(state);
    drawObstacles();
    for (const item of state.loot) {
      if (!item.taken) drawLootIcon(item);
    }
    for (const camera of state.cameras) drawCamera(camera);
    for (const guard of state.guards) drawGuard(guard);
    drawPlayer(state.player);
    drawEffects(state);
    drawHud(state);
    if (screen === SCREEN_TITLE) {
      drawPanel('THE MIDNIGHT VAULT', [
        'One thief. Three guards. Three cameras. One diamond.',
        'Steal the Star Diamond, the Golden Idol and the Emerald Necklace,',
        'then slip out the EXIT before the alarm hits 100%.',
        'WASD / arrows to move  •  SHIFT to sneak  •  click to walk',
        'Press SPACE or click to start',
        best > 0 ? `Best haul: ${formatMoney(best)}` : 'No haul yet — the vault is waiting.',
      ], PALETTE.gold);
    } else if (screen === SCREEN_PAUSED) {
      drawPanel('PAUSED', ['The guards wait for no one — except now.', 'Press P or SPACE to keep sneaking.'], PALETTE.muted);
    } else if (screen === SCREEN_WIN) {
      drawPanel('CLEAN GETAWAY!', [
        `You stole every piece — haul ${formatMoney(state.score)}.`,
        `Time ${formatTime(state.time)}  •  Best ${formatMoney(Math.max(best, state.score))}`,
        'Press R or SPACE to run it again.',
      ], PALETTE.alarmLow);
    } else if (screen === SCREEN_OVER) {
      drawPanel('CAUGHT!', [
        'The alarm hit 100% and the guards closed in.',
        `Haul kept: ${formatMoney(state.score)}  •  Best ${formatMoney(best)}`,
        'Press R or SPACE to try again.',
      ], PALETTE.alarmHigh);
    }
  }

  return { draw, logicalFromClient };
}

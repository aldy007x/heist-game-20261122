// The heist simulation: one museum room, a thief, patrolling guards with
// vision cones, sweeping wall cameras, three loot targets and an alarm meter.
// A fixed 1/60 s step advances the world; the renderer only paints state.
import {
  ALARM_DECAY,
  CAMERA,
  CAMERA_MOUNTS,
  EXIT,
  FIELD,
  GUARD,
  GUARD_ROUTES,
  LOOT,
  OBSTACLES,
  PLAYER,
  VAULT,
  WALL,
} from './config.js';

export const EVENT_PICKUP = 1;
export const EVENT_SPOTTED = 2;
export const EVENT_CAUGHT = 4;
export const EVENT_WIN = 8;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function distance(ax, ay, bx, by) {
  return Math.hypot(ax - bx, ay - by);
}

/** Angle from (ax, ay) to (bx, by). */
function angleTo(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}

/** Smallest absolute difference between two angles. */
function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

/** True when segment (x1,y1)-(x2,y2) touches rectangle r. */
function segmentHitsRect(x1, y1, x2, y2, r) {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  if (maxX < r.x || minX > r.x + r.w || maxY < r.y || minY > r.y + r.h) return false;
  // Segment endpoint inside the rectangle.
  if (x1 >= r.x && x1 <= r.x + r.w && y1 >= r.y && y1 <= r.y + r.h) return true;
  if (x2 >= r.x && x2 <= r.x + r.w && y2 >= r.y && y2 <= r.y + r.h) return true;
  const dx = x2 - x1;
  const dy = y2 - y1;
  // Check each rectangle edge for a crossing.
  const edges = [
    [r.x, r.y, r.x + r.w, r.y],
    [r.x + r.w, r.y, r.x + r.w, r.y + r.h],
    [r.x + r.w, r.y + r.h, r.x, r.y + r.h],
    [r.x, r.y + r.h, r.x, r.y],
  ];
  for (const [ex1, ey1, ex2, ey2] of edges) {
    const denom = dx * (ey2 - ey1) - dy * (ex2 - ex1);
    if (denom === 0) continue;
    const t = ((ex1 - x1) * (ey2 - ey1) - (ey1 - y1) * (ex2 - ex1)) / denom;
    const u = ((ex1 - x1) * dy - (ey1 - y1) * dx) / denom;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1) return true;
  }
  return false;
}

/** True when nothing solid stands between the watcher and the thief. */
function hasLineOfSight(x1, y1, x2, y2) {
  for (const obstacle of OBSTACLES) {
    if (segmentHitsRect(x1, y1, x2, y2, obstacle)) return false;
  }
  return true;
}

/** Push a circle out of a rectangle it overlaps (axis-separated, so corners slide). */
function resolveCircleRect(circle, r) {
  const nearestX = clamp(circle.x, r.x, r.x + r.w);
  const nearestY = clamp(circle.y, r.y, r.y + r.h);
  const dx = circle.x - nearestX;
  const dy = circle.y - nearestY;
  const dist = Math.hypot(dx, dy);
  if (dist >= circle.radius || dist === 0) return;
  circle.x = nearestX + (dx / dist) * circle.radius;
  circle.y = nearestY + (dy / dist) * circle.radius;
}

export function createWorld(random) {
  const state = {
    time: 0,
    alarm: 0,
    score: 0,
    lootTaken: 0,
    spotted: false,
    wasSpotted: false,
    player: { x: 640, y: 640, radius: PLAYER.radius, sneaking: false },
    guards: [],
    cameras: [],
    loot: [],
    particles: [],
    floats: [],
  };

  function reset() {
    state.time = 0;
    state.alarm = 0;
    state.score = 0;
    state.lootTaken = 0;
    state.spotted = false;
    state.wasSpotted = false;
    state.particles = [];
    state.floats = [];
    state.player.x = 640;
    state.player.y = 640;
    state.player.sneaking = false;
    state.guards = GUARD_ROUTES.map((route, index) => ({
      x: route[0].x,
      y: route[0].y,
      radius: GUARD.radius,
      route,
      waypoint: 1,
      angle: angleTo(route[0].x, route[0].y, route[1].x, route[1].y),
      pause: 0,
      alerted: false,
      seed: index * 1.7,
    }));
    state.cameras = CAMERA_MOUNTS.map((mount, index) => ({
      ...mount,
      angle: mount.baseAngle,
      phase: index * 1.9,
    }));
    state.loot = LOOT.map((item) => ({ ...item, taken: false }));
  }

  function burst(x, y, colour, count) {
    for (let i = 0; i < count; i += 1) {
      const a = random() * Math.PI * 2;
      const speed = 40 + random() * 130;
      state.particles.push({
        x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed,
        life: 0.5 + random() * 0.4, age: 0, colour, size: 2 + random() * 3,
      });
    }
  }

  function stepGuards(dt) {
    for (const guard of state.guards) {
      if (guard.pause > 0) {
        guard.pause -= dt;
        continue;
      }
      const target = guard.route[guard.waypoint];
      const d = distance(guard.x, guard.y, target.x, target.y);
      const speed = guard.alerted ? GUARD.chaseSpeed : GUARD.patrolSpeed;
      if (d < 6) {
        guard.waypoint = (guard.waypoint + 1) % guard.route.length;
        guard.pause = 0.9;
        continue;
      }
      const wanted = angleTo(guard.x, guard.y, target.x, target.y);
      guard.angle = wanted;
      guard.x += (Math.cos(wanted) * speed * dt);
      guard.y += (Math.sin(wanted) * speed * dt);
    }
  }

  function stepCameras(dt) {
    for (const camera of state.cameras) {
      const t = state.time + camera.phase;
      camera.angle = camera.baseAngle + Math.sin((t / CAMERA.sweepSeconds) * Math.PI * 2) * camera.sweep;
    }
  }

  /** Does this watcher see the thief right now? */
  function sees(watcher, range, halfAngle) {
    const p = state.player;
    const d = distance(watcher.x, watcher.y, p.x, p.y);
    if (d > range) return false;
    if (angleDiff(angleTo(watcher.x, watcher.y, p.x, p.y), watcher.angle) > halfAngle) return false;
    return hasLineOfSight(watcher.x, watcher.y, p.x, p.y);
  }

  function stepAlarm(dt, sneaking) {
    let rate = 0;
    let seenByGuard = false;
    let seenByCamera = false;
    for (const guard of state.guards) {
      const seen = sees(guard, GUARD.viewRange, GUARD.viewHalfAngle);
      guard.alerted = seen;
      if (seen) {
        seenByGuard = true;
        rate += sneaking ? GUARD.sneakSpotRate : GUARD.spotRate;
        guard.angle = angleTo(guard.x, guard.y, state.player.x, state.player.y);
      }
    }
    for (const camera of state.cameras) {
      if (sees(camera, CAMERA.viewRange, CAMERA.viewHalfAngle)) {
        seenByCamera = true;
        rate += sneaking ? CAMERA.sneakSpotRate : CAMERA.spotRate;
      }
    }
    state.spotted = seenByGuard || seenByCamera;
    if (rate > 0) state.alarm = Math.min(100, state.alarm + rate * dt);
    else state.alarm = Math.max(0, state.alarm - ALARM_DECAY * dt);
    return state.spotted;
  }

  function stepPlayer(dt, moveX, moveY, sneaking) {
    const p = state.player;
    p.sneaking = sneaking;
    const length = Math.hypot(moveX, moveY);
    if (length === 0) return;
    const speed = sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
    p.x += (moveX / length) * speed * dt;
    p.y += (moveY / length) * speed * dt;
    p.x = clamp(p.x, WALL + p.radius, FIELD.width - WALL - p.radius);
    p.y = clamp(p.y, WALL + p.radius, FIELD.height - WALL - p.radius);
    for (const obstacle of OBSTACLES) resolveCircleRect(p, obstacle);
    resolveCircleRect(p, VAULT);
  }

  function stepLoot() {
    let events = 0;
    const p = state.player;
    for (const item of state.loot) {
      if (item.taken) continue;
      if (distance(p.x, p.y, item.x, item.y) < PLAYER.grabRadius + 16) {
        item.taken = true;
        state.lootTaken += 1;
        state.score += item.value;
        burst(item.x, item.y, item.colour, 26);
        state.floats.push({ x: item.x, y: item.y - 20, text: `+$${item.value.toLocaleString('en-US')}`, age: 0, life: 1.4 });
        events |= EVENT_PICKUP;
      }
    }
    return events;
  }

  function stepEffects(dt) {
    for (const particle of state.particles) {
      particle.age += dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vx *= 0.96;
      particle.vy *= 0.96;
    }
    state.particles = state.particles.filter((particle) => particle.age < particle.life);
    for (const float of state.floats) float.age += dt;
    state.floats = state.floats.filter((float) => float.age < float.life);
  }

  /**
   * Advance the world one fixed step. moveX/moveY is the steering direction
   * (-1..1 each); returns the events that happened, as EVENT_* flags.
   */
  function step(dt, moveX, moveY, sneaking) {
    state.time += dt;
    stepPlayer(dt, moveX, moveY, sneaking);
    stepGuards(dt);
    stepCameras(dt);
    const spotted = stepAlarm(dt, sneaking);
    let events = stepLoot();
    if (spotted && !state.wasSpotted) events |= EVENT_SPOTTED;
    state.wasSpotted = spotted;
    stepEffects(dt);
    if (state.alarm >= 100) return events | EVENT_CAUGHT;
    const inExit = state.player.x > EXIT.x - 6 && state.player.x < EXIT.x + EXIT.w + 6
      && state.player.y > EXIT.y - 34 && state.player.y < FIELD.height;
    if (state.lootTaken === LOOT.length && inExit) {
      state.score += Math.max(0, Math.round(20000 - state.time * 40));
      return events | EVENT_WIN;
    }
    return events;
  }

  reset();
  return { state, reset, step };
}

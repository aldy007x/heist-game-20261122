// The screenshot scenes behind ?shot=start|play|vault|end. Each one stages a
// real world state through the game's own reset/step/draw code and paints it,
// so the frame is what the game really looks like at that moment.
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';
import { STEP } from './config.js';

function placeGuard(state, index, x, y, angle, alerted) {
  const guard = state.guards[index];
  guard.x = x;
  guard.y = y;
  guard.angle = angle;
  guard.alerted = alerted;
  guard.pause = 999;
}

function placeCamera(state, index, angle) {
  const camera = state.cameras[index];
  camera.angle = angle;
}

/**
 * Stage `world` for the named scene and return the screen to draw over it
 * and the best score to show.
 */
export function stageShot(name, world) {
  world.reset();
  const state = world.state;
  if (name === 'play') {
    // Mid-heist: the idol is already pocketed, the thief creeps past a guard
    // toward the necklace case while a camera sweeps in and the alarm climbs.
    state.loot[1].taken = true;
    state.lootTaken = 1;
    state.score = 25000;
    state.time = 72;
    state.alarm = 38;
    state.player.x = 700;
    state.player.y = 430;
    state.player.sneaking = true;
    placeGuard(state, 0, 860, 300, Math.PI * 0.75, false);
    placeGuard(state, 1, 330, 470, -Math.PI / 2, false);
    placeGuard(state, 2, 1000, 470, Math.PI, false);
    placeCamera(state, 0, Math.PI / 2 + 0.5);
    placeCamera(state, 1, 0.25);
    placeCamera(state, 2, Math.PI - 0.3);
    state.spotted = true;
    state.wasSpotted = true;
    return { screen: SCREEN_PLAY, best: 0 };
  }
  if (name === 'vault') {
    // The big moment: the Star Diamond is just pocketed — all three pieces
    // taken — while a guard rounds the corner, alarm at 71%.
    state.loot[0].taken = true;
    state.loot[1].taken = true;
    state.loot[2].taken = true;
    state.lootTaken = 3;
    state.score = 93000;
    state.time = 148;
    state.alarm = 71;
    state.player.x = 640;
    state.player.y = 168;
    placeGuard(state, 0, 470, 230, Math.PI / 4, true);
    placeGuard(state, 1, 300, 300, 0, false);
    placeGuard(state, 2, 1050, 220, Math.PI * 0.8, false);
    placeCamera(state, 0, Math.PI / 2 - 0.4);
    placeCamera(state, 1, 0.1);
    placeCamera(state, 2, Math.PI - 0.2);
    state.spotted = true;
    state.wasSpotted = true;
    state.particles.push(
      { x: 640, y: 118, vx: 60, vy: -40, life: 1, age: 0.3, colour: '#7fe7ff', size: 4 },
      { x: 640, y: 118, vx: -70, vy: -20, life: 1, age: 0.3, colour: '#7fe7ff', size: 3 },
      { x: 640, y: 118, vx: 20, vy: 60, life: 1, age: 0.3, colour: '#7fe7ff', size: 4 },
    );
    state.floats.push({ x: 640, y: 96, text: '+$50,000', age: 0.2, life: 1.4 });
    return { screen: SCREEN_PLAY, best: 93000 };
  }
  if (name === 'end') {
    // Caught: the alarm hit 100% and a guard stands over the thief.
    state.loot[1].taken = true;
    state.lootTaken = 1;
    state.score = 25000;
    state.time = 96;
    state.alarm = 100;
    state.player.x = 640;
    state.player.y = 380;
    placeGuard(state, 0, 668, 380, Math.PI, true);
    placeGuard(state, 1, 420, 300, Math.PI / 3, false);
    placeGuard(state, 2, 980, 460, -Math.PI * 0.75, false);
    placeCamera(state, 0, Math.PI / 2 + 0.6);
    placeCamera(state, 1, 0.35);
    placeCamera(state, 2, Math.PI - 0.4);
    state.spotted = true;
    return { screen: SCREEN_OVER, best: 25000 };
  }
  // 'start' (and anything else): the title screen over the fresh room.
  for (let index = 0; index < 3 / STEP; index += 1) {
    world.step(STEP, 0, 0, false);
  }
  return { screen: SCREEN_TITLE, best: 0 };
}

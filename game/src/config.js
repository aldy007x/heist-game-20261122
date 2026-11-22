// Every tuning number, colour and the room layout in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to
// the window, so no rule below depends on the screen size.
export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second. */
export const STEP = 1 / 60;

/** Outer wall thickness; the playable floor is inside this border. */
export const WALL = 28;

export const PLAYER = {
  radius: 14,
  walkSpeed: 235,
  sneakSpeed: 125,
  grabRadius: 30,
};

export const GUARD = {
  radius: 15,
  patrolSpeed: 78,
  chaseSpeed: 132,
  viewRange: 255,
  /** Half-angle of a guard's vision cone, in radians. */
  viewHalfAngle: 0.56,
  /** Alarm points per second while a guard sees the thief. */
  spotRate: 46,
  sneakSpotRate: 22,
};

export const CAMERA = {
  viewRange: 305,
  viewHalfAngle: 0.44,
  /** Alarm points per second while a camera sees the thief. */
  spotRate: 34,
  sneakSpotRate: 17,
  /** Seconds for one full sweep of a camera. */
  sweepSeconds: 5.2,
};

/** Alarm drains this fast per second while nobody sees the thief. */
export const ALARM_DECAY = 9;

export const LOOT = [
  { id: 'diamond', name: 'Star Diamond', value: 50000, x: 640, y: 118, colour: '#7fe7ff' },
  { id: 'idol', name: 'Golden Idol', value: 25000, x: 218, y: 330, colour: '#f2c94c' },
  { id: 'necklace', name: 'Emerald Necklace', value: 18000, x: 1062, y: 330, colour: '#5ee6a0' },
];

/** Display cases and the central statue: solid rectangles that block movement and sight. */
export const OBSTACLES = [
  { x: 150, y: 260, w: 136, h: 140 }, // idol case
  { x: 994, y: 260, w: 136, h: 140 }, // necklace case
  { x: 560, y: 300, w: 160, h: 110 }, // central statue plinth
  { x: 150, y: 520, w: 136, h: 90 }, // lower-left bench case
  { x: 994, y: 520, w: 136, h: 90 }, // lower-right bench case
];

/** The vault: the diamond's case sits in front of it, top centre. */
export const VAULT = { x: 540, y: 44, w: 200, h: 52 };

/** The exit door the thief must reach after taking every loot. */
export const EXIT = { x: 600, y: 692, w: 80, h: 28 };

/** Guard patrol routes: each guard walks its waypoints in a loop. */
export const GUARD_ROUTES = [
  [ { x: 420, y: 220 }, { x: 860, y: 220 }, { x: 860, y: 470 }, { x: 420, y: 470 } ],
  [ { x: 180, y: 140 }, { x: 180, y: 560 }, { x: 330, y: 560 }, { x: 330, y: 140 } ],
  [ { x: 1100, y: 140 }, { x: 1100, y: 560 }, { x: 950, y: 560 }, { x: 950, y: 140 } ],
];

/** Wall cameras: position, the wall they hang on, and their sweep centre angle. */
export const CAMERA_MOUNTS = [
  { x: 640, y: 30, baseAngle: Math.PI / 2, sweep: 0.85 },
  { x: 60, y: 360, baseAngle: 0, sweep: 0.7 },
  { x: 1220, y: 360, baseAngle: Math.PI, sweep: 0.7 },
];

export const PALETTE = {
  floorA: '#20242e',
  floorB: '#232833',
  wall: '#3a4152',
  wallTop: '#4a5266',
  caseGlass: '#2c3444',
  caseEdge: '#6b7690',
  vault: '#8a6d2f',
  vaultDoor: '#b08d3e',
  exit: '#2e7d4f',
  player: '#e8b23a',
  playerCloak: '#2b2f3a',
  guard: '#d95f4b',
  guardUniform: '#5b3a3a',
  coneGuard: 'rgba(217, 95, 75, 0.20)',
  coneGuardHot: 'rgba(255, 60, 40, 0.34)',
  coneCamera: 'rgba(120, 200, 255, 0.16)',
  coneCameraHot: 'rgba(120, 200, 255, 0.32)',
  alarmLow: '#5ee6a0',
  alarmMid: '#f2c94c',
  alarmHigh: '#e5534b',
  text: '#eef1f5',
  muted: '#9aa3b5',
  panel: 'rgba(16, 19, 26, 0.88)',
  gold: '#f2c94c',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'midnight-vault.best';

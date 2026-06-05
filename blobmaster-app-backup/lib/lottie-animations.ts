/**
 * Shared Lottie JSON for agent visuals (force graph + economy React Flow nodes).
 * `hex` is reserved for future tinting; palette is fixed per role today.
 */

const PRODUCER_ANIM = {
  v: '5.7.4', fr: 30, ip: 0, op: 60, w: 100, h: 100, nm: 'producer', ddd: 0, assets: [],
  layers: [{ ddd: 0, ind: 1, ty: 4, nm: 'glow', sr: 1, ao: 0, ip: 0, op: 60, st: 0, bm: 0,
    ks: {
      o: { a: 1, k: [{ i: { x: [.5], y: [1] }, o: { x: [.5], y: [0] }, t: 0, s: [40] }, { i: { x: [.5], y: [1] }, o: { x: [.5], y: [0] }, t: 30, s: [100] }, { t: 60, s: [40] }] },
      r: { a: 0, k: 0 }, p: { a: 0, k: [50, 50, 0] }, a: { a: 0, k: [0, 0, 0] },
      s: { a: 1, k: [{ i: { x: [.5, .5, .5], y: [1, 1, 1] }, o: { x: [.5, .5, .5], y: [0, 0, 0] }, t: 0, s: [75, 75, 100] }, { i: { x: [.5, .5, .5], y: [1, 1, 1] }, o: { x: [.5, .5, .5], y: [0, 0, 0] }, t: 30, s: [115, 115, 100] }, { t: 60, s: [75, 75, 100] }] },
    },
    shapes: [
      { ty: 'gr', it: [{ ty: 'el', s: { a: 0, k: [38, 38] }, p: { a: 0, k: [0, 0] } }, { ty: 'fl', c: { a: 0, k: [0, 1, 0.53, 1] }, o: { a: 0, k: 100 } }] },
      { ty: 'gr', it: [{ ty: 'el', s: { a: 0, k: [58, 58] }, p: { a: 0, k: [0, 0] } }, { ty: 'st', c: { a: 0, k: [0, 1, 0.53, 1] }, o: { a: 0, k: 35 }, w: { a: 0, k: 2 } }, { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }] },
      { ty: 'gr', it: [{ ty: 'el', s: { a: 0, k: [74, 74] }, p: { a: 0, k: [0, 0] } }, { ty: 'st', c: { a: 0, k: [0, 1, 0.53, 1] }, o: { a: 0, k: 15 }, w: { a: 0, k: 1.5 } }, { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }] },
    ],
  }],
} as const

const CONSUMER_ANIM = {
  v: '5.7.4', fr: 30, ip: 0, op: 90, w: 100, h: 100, nm: 'consumer', ddd: 0, assets: [],
  layers: [{ ddd: 0, ind: 1, ty: 4, nm: 'pulse', sr: 1, ao: 0, ip: 0, op: 90, st: 0, bm: 0,
    ks: {
      o: { a: 1, k: [{ i: { x: [.5], y: [1] }, o: { x: [.5], y: [0] }, t: 0, s: [60] }, { i: { x: [.5], y: [1] }, o: { x: [.5], y: [0] }, t: 45, s: [100] }, { t: 90, s: [60] }] },
      r: { a: 1, k: [{ i: { x: [.5], y: [1] }, o: { x: [.5], y: [0] }, t: 0, s: [0] }, { t: 90, s: [360] }] },
      p: { a: 0, k: [50, 50, 0] }, a: { a: 0, k: [0, 0, 0] }, s: { a: 0, k: [100, 100, 100] },
    },
    shapes: [
      { ty: 'gr', it: [{ ty: 'el', s: { a: 0, k: [34, 34] }, p: { a: 0, k: [0, 0] } }, { ty: 'fl', c: { a: 0, k: [0.27, 0.53, 1, 1] }, o: { a: 0, k: 100 } }] },
      { ty: 'gr', it: [{ ty: 'el', s: { a: 0, k: [54, 54] }, p: { a: 0, k: [0, 0] } }, { ty: 'st', c: { a: 0, k: [0.27, 0.53, 1, 1] }, o: { a: 0, k: 45 }, w: { a: 0, k: 2 } }, { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }] },
      { ty: 'gr', it: [{ ty: 'el', s: { a: 0, k: [70, 70] }, p: { a: 0, k: [0, 0] } }, { ty: 'st', c: { a: 0, k: [0.27, 0.53, 1, 1] }, o: { a: 0, k: 20 }, w: { a: 0, k: 1.5 } }, { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }] },
    ],
  }],
} as const

const GUARDIAN_ANIM = {
  v: '5.7.4', fr: 30, ip: 0, op: 120, w: 100, h: 100, nm: 'guardian', ddd: 0, assets: [],
  layers: [{ ddd: 0, ind: 1, ty: 4, nm: 'diamond', sr: 1, ao: 0, ip: 0, op: 120, st: 0, bm: 0,
    ks: {
      o: { a: 1, k: [{ i: { x: [.5], y: [1] }, o: { x: [.5], y: [0] }, t: 0, s: [65] }, { i: { x: [.5], y: [1] }, o: { x: [.5], y: [0] }, t: 60, s: [100] }, { t: 120, s: [65] }] },
      r: { a: 1, k: [{ i: { x: [.5], y: [1] }, o: { x: [.5], y: [0] }, t: 0, s: [45] }, { t: 120, s: [405] }] },
      p: { a: 0, k: [50, 50, 0] }, a: { a: 0, k: [0, 0, 0] },
      s: { a: 1, k: [{ i: { x: [.5, .5, .5], y: [1, 1, 1] }, o: { x: [.5, .5, .5], y: [0, 0, 0] }, t: 0, s: [85, 85, 100] }, { i: { x: [.5, .5, .5], y: [1, 1, 1] }, o: { x: [.5, .5, .5], y: [0, 0, 0] }, t: 60, s: [110, 110, 100] }, { t: 120, s: [85, 85, 100] }] },
    },
    shapes: [
      { ty: 'gr', it: [{ ty: 'rc', s: { a: 0, k: [32, 32] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 3 } }, { ty: 'fl', c: { a: 0, k: [1, 0.53, 0, 1] }, o: { a: 0, k: 100 } }] },
      { ty: 'gr', it: [{ ty: 'rc', s: { a: 0, k: [50, 50] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 3 } }, { ty: 'st', c: { a: 0, k: [1, 0.53, 0, 1] }, o: { a: 0, k: 40 }, w: { a: 0, k: 2 } }, { ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } }] },
    ],
  }],
} as const

const DEAD_ANIM = {
  v: '5.7.4', fr: 30, ip: 0, op: 40, w: 60, h: 60, nm: 'dead', ddd: 0, assets: [],
  layers: [{
    ddd: 0, ind: 1, ty: 4, nm: 'cross', sr: 1, ao: 0, ip: 0, op: 40, st: 0, bm: 0,
    ks: {
      o: { a: 1, k: [{ i: { x: [.5], y: [1] }, o: { x: [.5], y: [0] }, t: 0, s: [100] }, { t: 40, s: [40] }] },
      r: { a: 0, k: 0 }, p: { a: 0, k: [30, 30, 0] }, a: { a: 0, k: [0, 0, 0] }, s: { a: 0, k: [100, 100, 100] },
    },
    shapes: [
      { ty: 'gr', it: [{ ty: 'rc', s: { a: 0, k: [14, 2] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 0 } }, { ty: 'fl', c: { a: 0, k: [0.35, 0.35, 0.38, 1] }, o: { a: 0, k: 100 } }] },
      { ty: 'gr', it: [{ ty: 'rc', s: { a: 0, k: [2, 14] }, p: { a: 0, k: [0, 0] }, r: { a: 0, k: 0 } }, { ty: 'fl', c: { a: 0, k: [0.35, 0.35, 0.38, 1] }, o: { a: 0, k: 100 } }] },
    ],
  }],
} as const

export function makePulseAnimation(_hex: string, role: 'producer' | 'consumer') {
  return role === 'producer' ? PRODUCER_ANIM : CONSUMER_ANIM
}

export function makeOrbitAnimation(_hex: string) {
  return GUARDIAN_ANIM
}

export function makeDeadAnimation() {
  return DEAD_ANIM
}

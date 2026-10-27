import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SKILL = "/Users/huangning/.hermes/profiles/study/skills/creative/anatomy";
const k = await import(`${SKILL}/kit/iso-kit.mjs`);
const A = await import(`${SKILL}/kit/audit.mjs`);
const { kitScript } = await import(`${SKILL}/scripts/inline-kit.mjs`);
const M = await import("./model.mjs");

const HERE = dirname(fileURLToPath(import.meta.url));
const theme = process.argv.includes("--light") ? "light" : "dark";

const WIDTH = 680;
const HEIGHT = 400;

// ---------------------------------------------------------------- layout
const PLATE = { x: -150, y: -72, w: 292, d: 144, r: 10 };
const PLATE_H = 12;
const FOOT_H = 5;

const PC = [40, 0];                       // platter centre
const BEZEL_R = 38, DISK_R = 32;
const BEZEL_Z = 0, BEZEL_H = 3;
const PLATTER_Z = 4.4, PLATTER_H = 3.6;
const PLATTER_TOP = PLATTER_Z + PLATTER_H;

const RAIL_Z = 18, RAIL_H = 4;            // bridge rails
const POSTS = [-8, 90];                    // bridge posts, y = 0
const HEAD_Z = PLATTER_TOP + 0.5;         // slider bottom

const RACK = { x: -142, y: -14, w: 78, d: 30, r: 3 };
const RACK_TOP = 6;
const CARD_PITCH = 7.25;
const CARD_X0 = -133;
const CARD_H = 8;
const CARD_TOP = RACK_TOP + CARD_H;
const CARD_LIFT = 2.6;
const SEL_Z = 24, SEL_H = 3;              // selector rail
const SEL_Y = -2;

const KNOB = [-36, 46];
const DIAL = [118, 50];
const DIAL_R = 17;
const DIAL_Z = 15, DIAL_H = 8;
const DIAL_TOP = DIAL_Z + DIAL_H;
const PER_TURN = 30;                      // 表盘一圈 = 30 格行程

const cardX = (i) => CARD_X0 + i * CARD_PITCH;
const xOfCyl = (cyl) => PC[0] + M.radiusOf(cyl);

// ---------------------------------------------------------------- camera
const P = k.fitProjection(
  [
    ...k.boxCorners(PLATE, -PLATE_H - FOOT_H, 0),
    [DIAL[0], DIAL[1], DIAL_TOP],
    [cardX(0), SEL_Y, 31],
    [POSTS[1], 0, 20],
    [PC[0], PC[1], PLATTER_TOP + 1],
  ],
  WIDTH,
  HEIGHT,
  { pad: 26, azimuth: 45 },
);

const at = (p) => k.iso(p, P);
const S = (paths, style) => k.solidSvg(paths, style);
const L = (d, style) => k.lineSvg(d, style);
const D = (pts, style) => k.dotsSvg(pts, style);
const byDepth = (pts) => [...pts].sort((a, b) => k.depthOf([a[0], a[1], 0], P) - k.depthOf([b[0], b[1], 0], P));

// ---------------------------------------------------------------- recorder
const R = A.recorder(P, {});
const body = [];

function put(name, svg, shapes = [], centre = [0, 0, 0]) {
  R.put({ name, at: centre, svg, shapes });
}

function group(name, inner, shapes, centre, rest = [0, 0, 0]) {
  // moving parts are built around the local origin; the rest offset puts them where
  // they stand in the still figure, and the audit records their true world position
  const moved = shapes.map((shape) => A.moved(shape, rest));
  const t = rest.some((v) => v !== 0) ? ` transform="${k.translateAlong(P, rest)}"` : "";
  put(name, `<g data-part="${name}"${t}>${inner}</g>`, moved, [centre[0] + rest[0], centre[1] + rest[1], centre[2] + rest[2]]);
}

// ---------------------------------------------------------------- base
function base() {
  const out = [`<path class="iso-halo" d="${k.haloOf(PLATE, -PLATE_H - FOOT_H, 0, P)}"/>`];
  for (const [x, y] of byDepth(k.corners(PLATE, 22))) {
    put(
      `stand.foot`,
      S(k.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, P, 28), { tone: "lo" }) +
        S(k.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6, P, 28), { tone: "mid" }),
      [A.cylinder(x, y, 7, -PLATE_H - FOOT_H, 1.6, { name: "stand.foot" }), A.cylinder(x, y, 5.4, -PLATE_H - FOOT_H + 1.6, FOOT_H - 1.6)],
      [x, y, -PLATE_H],
    );
  }
  put(
    "stand.plate",
    S(k.slabOf(PLATE, -PLATE_H, PLATE_H, P, 8, 1.6), { tone: "mid" }) +
      L(k.planOutline(k.insetPlan(PLATE, 5), 0, P), { tone: "lo" }) +
      L(k.corners(PLATE, 10).map(([x, y]) => k.ring(x, y, 2.2, 0, P, 16)).join(""), { tone: "lo" }) +
      D(k.corners(PLATE, 10).map(([x, y]) => at([x, y, 0])), { size: 0.5 }),
    [A.slab(PLATE, -PLATE_H, PLATE_H, { name: "stand.plate" })],
    [PLATE.x + PLATE.w / 2, PLATE.y + PLATE.d / 2, 0],
  );
  return out.join("");
}

// label plate + rule lines (stands for printed text: the one place a line may stop on a face)
function labelPlate() {
  const plan = { x: -126, y: 52, w: 50, d: 13, r: 2 };
  const out = [
    S(k.slabOf(plan, 0, 0.9, P, 4), { tone: "lo", crease: "none" }),
    L(k.planOutline(k.insetPlan(plan, 1.6), 0.9, P, 4), { tone: "faint" }),
  ];
  const screws = [[plan.x + 4, plan.y + 4], [plan.x + plan.w - 4, plan.y + plan.d - 4]];
  out.push(D(screws.map(([x, y]) => at([x, y, 0.9])), { size: 0.45, tone: "mid" }));
  out.push(
    k.faceTextSvg(k.topMatrix([plan.x + plan.w / 2, plan.y + plan.d / 2], 0.9, P, "x"), "SEEK 14–26", {
      size: 2.4,
      tone: "lo",
      anchor: "middle",
    }),
  );
  put("stand.label", out.join(""), [A.slab(plan, 0, 0.9, { name: "stand.label" })], [plan.x + plan.w / 2, plan.y + plan.d / 2, 0]);
}

// ---------------------------------------------------------------- platter
function platter() {
  const [cx, cy] = PC;
  const out = [];
  const shapes = [];

  // fixed bezel carrying the sector scale
  out.push(S(k.cylinder(cx, cy, BEZEL_R, BEZEL_Z, BEZEL_H, P, 96, 0.6), { tone: "mid", crease: "lo" }));
  out.push(L(k.sideArc(cx, cy, BEZEL_R, BEZEL_Z + 1.4, P, 48), { tone: "faint" }));
  shapes.push(A.cylinder(cx, cy, BEZEL_R, BEZEL_Z, BEZEL_H, { name: "platter.bezel" }));
  const sectorTicks = k.radialTicks(cx, cy, BEZEL_R - 4.5, 10, 5, BEZEL_Z + BEZEL_H, [2.2, 4.2], P, 0, Math.PI * 2);
  out.push(L(sectorTicks.minor, { tone: "lo" }), L(sectorTicks.major, { tone: "mid" }));
  out.push(L(k.ring(cx, cy, BEZEL_R - 1.4, BEZEL_Z + BEZEL_H, P, 96), { tone: "lo" }));

  // spindle nose and hub cap
  out.push(S(k.cylinder(cx, cy, 5.5, BEZEL_Z + BEZEL_H, 1.4, P, 40), { tone: "mid", crease: "none" }));
  shapes.push(A.cylinder(cx, cy, 5.5, BEZEL_Z + BEZEL_H, 1.4, { name: "platter.nose" }));

  // the platter itself: 12 track grooves, one per cylinder in the travel range
  out.push(S(k.cylinder(cx, cy, DISK_R, PLATTER_Z, PLATTER_H, P, 120, 0.6), { tone: "hi", crease: "lo" }));
  shapes.push(A.cylinder(cx, cy, DISK_R, PLATTER_Z, PLATTER_H, { name: "platter.disc" }));
  const tracks = [];
  for (let cyl = M.DISK[0]; cyl <= M.DISK[1]; cyl++) {
    const r = M.radiusOf(cyl);
    tracks.push(k.ring(cx, cy, r, PLATTER_TOP, P, 96));
  }
  out.push(L(tracks.join(""), { tone: "faint" }));                       // every cylinder
  const majors = [];
  for (const cyl of [14, 17, 20, 23, 26]) majors.push(k.ring(cx, cy, M.radiusOf(cyl), PLATTER_TOP, P, 96));
  out.push(L(majors.join(""), { tone: "lo" }));
  out.push(L(k.ring(cx, cy, DISK_R - 1, PLATTER_TOP, P, 120), { tone: "lo" }));
  out.push(S(k.cylinder(cx, cy, 6, PLATTER_TOP, 1.2, P, 40), { tone: "mid", crease: "none" }));
  out.push(L(k.knurl(cx, cy, 6, PLATTER_TOP + 0.2, PLATTER_TOP + 1.2, 30, P), { tone: "lo" }));
  out.push(L(k.ring(cx, cy, 3.4, PLATTER_TOP + 1.2, P, 24), { tone: "lo" }));
  shapes.push(A.cylinder(cx, cy, 6, PLATTER_TOP, 1.2, { name: "platter.hub" }));

  // the sectors painted on the platter: rebuilt each frame by the live code
  out.push(`<g data-part="spinset">${spinSet(0, M.REQUESTS[3].sector)}</g>`);

  put("platter", out.join(""), shapes, [cx, cy, PLATTER_TOP]);
}

function spinSet(angle, target) {
  // ten sector marks painted on the platter, the one being waited for lit
  const [cx, cy] = PC;
  const dots = [];
  for (let s = 1; s <= 10; s++) {
    const a = angle + M.sectorAngle(s);
    const p = at([cx + Math.cos(a) * (DISK_R - 4), cy + Math.sin(a) * (DISK_R - 4), PLATTER_TOP]);
    dots.push([p[0], p[1], s === target ? 1 : 0.45]);
  }
  const a = angle + M.sectorAngle(target);
  const line = k.lineOnTop(
    [cx + Math.cos(a) * 6, cy + Math.sin(a) * 6],
    [cx + Math.cos(a) * (DISK_R - 1), cy + Math.sin(a) * (DISK_R - 1)],
    PLATTER_TOP + 0.1,
    P,
  );
  return `${k.lineSvg(line, { tone: "lit", className: "iso-index" })}${k.dotsSvg(dots, { size: 0.9, tone: "mid" })}`;
}

// ---------------------------------------------------------------- bridge + head
function bridge() {
  // every bracket is its own item: a single wide item cannot be in front of the
  // platter at one end and behind it at the other (the audit calls that a cycle)
  POSTS.forEach((x, i) => {
    const split = PLATTER_Z + PLATTER_H;
    const o = [
      S(k.cylinder(x, 0, 5, 0, 2.5, P, 32), { tone: "mid" }),
      S(k.cylinder(x, 0, 3.6, 2.5, PLATTER_Z - 2.5, P, 32), { tone: "mid", crease: "none" }),
    ];
    put(`bridge.post${i}.low`, o.join(""), [
      A.cylinder(x, 0, 5, 0, 2.5, { name: "bridge.collar" }),
      A.cylinder(x, 0, 3.6, 2.5, PLATTER_Z - 2.5, { name: "bridge.post.low" }),
    ], [x, 0, 2]);
    const up = [
      S(k.cylinder(x, 0, 3.6, PLATTER_Z, split - PLATTER_Z, P, 32), { tone: "mid", crease: "none" }),
      L(k.sideArc(x, 0, 3.6, split + 2, P, 20), { tone: "faint" }),
      S(k.cylinder(x, 0, 3.6, split, 16 - split, P, 32), { tone: "mid", crease: "none" }),
      S(k.cylinder(x, 0, 4.6, 16, RAIL_Z - 16, P, 32), { tone: "mid" }),
      D([at([x, 0, RAIL_Z])], { size: 0.5, tone: "mid" }),
    ];
    put(`bridge.post${i}.high`, up.join(""), [
      A.cylinder(x, 0, 3.6, PLATTER_Z, 16 - PLATTER_Z, { name: "bridge.post.high" }),
      A.cylinder(x, 0, 4.6, 16, RAIL_Z - 16, { name: "bridge.cap" }),
    ], [x, 0, 14]);
  });
  POSTS.forEach((x, i) => {
    const plan = { x: x - 3, y: -11, w: 6, d: 22, r: 1 };
    put(`bridge.cross${i}`,
      S(k.slabOf(plan, RAIL_Z, RAIL_H, P, 3, 0.5), { tone: "mid" }) +
        D([at([x - 1, -8, RAIL_Z + RAIL_H]), at([x + 1, 8, RAIL_Z + RAIL_H])], { size: 0.4, tone: "lo" }),
      [A.slab(plan, RAIL_Z, RAIL_H, { name: "bridge.crossbar" })], [x, 0, RAIL_Z]);
  });
  [-13, 9].forEach((y, i) => {
    const plan = { x: POSTS[0] + 3, y, w: POSTS[1] - POSTS[0] - 6, d: 4, r: 1 };
    put(`bridge.rail${i}`,
      S(k.slabOf(plan, RAIL_Z, RAIL_H, P, 3, 0.4), { tone: "mid" }) +
        L(k.lineOnTop([plan.x, y + 2], [plan.x + plan.w, y + 2], RAIL_Z + RAIL_H, P), { tone: "faint" }) +
        D([at([plan.x + 1, y + 2, RAIL_Z + RAIL_H]), at([plan.x + plan.w - 1, y + 2, RAIL_Z + RAIL_H])], { size: 0.4, tone: "lo" }),
      [A.slab(plan, RAIL_Z, RAIL_H, { name: "bridge.rail" })], [POSTS[0] + 40, y + 2, RAIL_Z]);
  });
  // end stops: the head cannot leave 14 … 26
  [[M.DISK[0], -5.2], [M.DISK[1], 5.2]].forEach(([cyl, off], k0) => {
    const x = xOfCyl(cyl) + off;
    [-11, 11].forEach((y, j) => {
      const plan = { x: x - 1.4, y: y - 2.6, w: 2.8, d: 5.2, r: 0.8 };
      put(`bridge.stop${k0}${j}`,
        S(k.slabOf(plan, RAIL_Z + RAIL_H, 2.4, P, 2, 0.4), { tone: "mid" }),
        [A.slab(plan, RAIL_Z + RAIL_H, 2.4, { name: "bridge.stop" })], [x, y, RAIL_Z]);
    });
  });
}

function head() {
  const x = xOfCyl(M.START);
  const deckZ = RAIL_Z + RAIL_H;
  const deck = { x: -9, y: -13, w: 18, d: 26, r: 2 };
  const deckSvg = [
    S(k.slabOf(deck, deckZ, 4, P, 5, 0.6), { tone: "mid" }),
    ...[-11, 11].map((y) => S(k.slabOf({ x: -5, y: y - 2.4, w: 10, d: 4.8, r: 1 }, deckZ, 1.4, P, 3, 0.3), { tone: "mid" })),
    L(k.lineOnTop([deck.x, -4], [deck.x + deck.w, -4], deckZ + 4, P), { tone: "faint" }),
    L(k.lineOnTop([deck.x, 4], [deck.x + deck.w, 4], deckZ + 4, P), { tone: "faint" }),
    D([at([deck.x + 2.4, deck.y + 2.4, deckZ + 4]), at([deck.x + deck.w - 2.4, deck.y + 2.4, deckZ + 4])], { size: 0.45, tone: "mid" }),
    S(k.cylinder(deck.x + deck.w - 3, 0, 2.2, deckZ + 4, 2.4, P, 20), { tone: "mid" }),
    L(k.knurl(deck.x + deck.w - 3, 0, 2.2, deckZ + 4, deckZ + 6.4, 18, P), { tone: "lo" }),
  ];
  group("head", deckSvg.join(""), [
    A.slab(deck, deckZ, 4, { name: "head.deck" }),
    ...[-11, 11].map((y) => A.slab({ x: -5, y: y - 2.4, w: 10, d: 4.8, r: 1 }, deckZ, 1.4)),
    A.cylinder(deck.x + deck.w - 3, 0, 2.2, deckZ + 4, 2.4, { name: "head.screw" }),
  ], [x, 0, deckZ], [x, 0, 0]);
  // The arm leaves the deck's near edge as a bracket and runs under the bridge on the
  // near side, where the reader can see it, then drops the head onto the platter.
  const bracket = { x: -2.5, y: 13, w: 5, d: 4.5, r: 1 };
  group("head.bracket",
    S(k.slabOf(bracket, 10.2, deckZ - 10.2, P, 3, 0.4), { tone: "mid", crease: "none" }),
    [A.slab(bracket, 10.2, deckZ - 10.2, { name: "head.bracket" })], [x, 15, 16], [x, 0, 0]);
  // the arm crosses under the near rail, so it is cut there: a piece that runs under
  // another part and on past it can't be ordered against it
  const armIn = { x: -2, y: 2, w: 4, d: 7.2, r: 0.8 };
  group("head.arm.in",
    S(k.slabOf(armIn, 10.2, 3, P, 3, 0.4), { tone: "mid" }) +
      L(k.lineOnTop([armIn.x, 5.5], [armIn.x + armIn.w, 5.5], 13.2, P), { tone: "faint" }),
    [A.slab(armIn, 10.2, 3, { name: "head.arm.in" })], [x, 5, 12], [x, 0, 0]);
  const armCross = { x: -2, y: 9.2, w: 4, d: 3.8, r: 0.8 };
  group("head.arm.cross",
    S(k.slabOf(armCross, 10.2, 3, P, 2, 0.3), { tone: "mid", crease: "none" }),
    [A.slab(armCross, 10.2, 3, { name: "head.arm.cross" })], [x, 11, 12], [x, 0, 0]);
  // wider than the arm it hangs from, so its silhouette reads below the arm
  const slider = { x: -4.2, y: 0.2, w: 8.4, d: 6.4, r: 1.2 };
  group("head.slider",
    S(k.slabOf(slider, HEAD_Z, 10.2 - HEAD_Z, P, 3, 0.5), { tone: "hi", lit: true }) +
      L(k.planOutline(k.insetPlan(slider, 1), 10.2, P, 3), { tone: "lo" }),
    [A.slab(slider, HEAD_Z, 10.2 - HEAD_Z, { name: "head.slider" })], [x, 0, HEAD_Z], [x, 0, 0]);
  return x;
}

// ---------------------------------------------------------------- request rack
let rackPockets = "";
function rack() {
  const pockets = [];
  for (let i = 0; i < M.REQUESTS.length; i++) {
    const cx = cardX(i);
    pockets.push(k.planOutline({ x: cx - 2.9, y: -11.6, w: 5.8, d: 24.6, r: 0.9 }, RACK_TOP + 0.02, P, 3));
  }
  rackPockets = pockets.join("");
  put("rack.body",
    S(k.slabOf(RACK, 0, RACK_TOP, P, 6, 0.8), { tone: "mid" }) +
      L(k.planOutline(k.insetPlan(RACK, 2.4), RACK_TOP, P, 6), { tone: "faint" }) +
      D(k.corners(RACK, 4).map(([x, y]) => at([x, y, RACK_TOP])), { size: 0.45, tone: "mid" }) +
      rackPockets,
    [A.slab(RACK, 0, RACK_TOP, { name: "rack.body" })], [RACK.x + RACK.w / 2, RACK.y + RACK.d / 2, 0]);
  // the backstop is behind the cards
  const back = { x: RACK.x, y: 13, w: RACK.w, d: 3, r: 0.8 };
  put("rack.back",
    S(k.slabOf(back, RACK_TOP, 14, P, 3, 0.4), { tone: "mid" }) + L(k.sideSeam(back, RACK_TOP + 7, P, 3), { tone: "faint" }),
    [A.slab(back, RACK_TOP, 14, { name: "rack.back" })], [RACK.x + RACK.w / 2, 14.5, RACK_TOP]);
  // and the front lip is in front of them
  const lip = { x: RACK.x, y: -13, w: RACK.w, d: 2.4, r: 0.8 };
  put("rack.lip",
    S(k.slabOf(lip, RACK_TOP, 3.5, P, 3, 0.4), { tone: "mid" }),
    [A.slab(lip, RACK_TOP, 3.5, { name: "rack.lip" })], [RACK.x + RACK.w / 2, -11.8, RACK_TOP]);
  // the card pockets are milled grooves, drawn as closed outlines on the rack top:
  // a physical wall between two cards would cross the cards' depth and no single
  // painter's key can order it (the audit calls that an interlock)

  // the nine request cards, each in its own group so it can lift when served
  M.REQUESTS.forEach((req, i) => {
    const cx = cardX(i);
    const plan = { x: cx - 2.5, y: -10.5, w: 5, d: 23, r: 0.8 };
    const inner =
      S(k.slabOf(plan, RACK_TOP, CARD_H, P, 3, 0.5), { tone: "hi", crease: "lo" }) +
      L(k.planOutline(k.insetPlan(plan, 1.1), RACK_TOP + CARD_H, P, 3), { tone: "faint" }) +
      k.faceTextSvg(k.topMatrix([cx, 0], CARD_TOP, P, "y"), M.CIRCLED[req.id - 1], { size: 5.2, tone: "mid", anchor: "middle" });
    group(`card${i}`, inner, [A.slab(plan, RACK_TOP, CARD_H, { name: `card${i}` })], [cx, 1, CARD_TOP]);
  });
  return cardX;
}

function selector() {
  // posts, rail and carriage are separate items: one item spanning post + rail
  // crosses the cards' depth and can't be ordered against them
  [-140, -66].forEach((x, i) => {
    put(`sel.post${i}`,
      S(k.cylinder(x, SEL_Y, 4, RACK_TOP, 2.4, P, 32), { tone: "mid" }) +
        S(k.cylinder(x, SEL_Y, 2.6, RACK_TOP + 2.4, SEL_Z - 1.8 - RACK_TOP - 2.4, P, 28), { tone: "mid", crease: "none" }) +
        S(k.cylinder(x, SEL_Y, 3.4, SEL_Z - 1.8, 1.8, P, 28), { tone: "mid" }),
      [
        A.cylinder(x, SEL_Y, 4, RACK_TOP, 2.4, { name: "sel.collar" }),
        A.cylinder(x, SEL_Y, 2.6, RACK_TOP + 2.4, SEL_Z - 1.8 - RACK_TOP - 2.4, { name: "sel.post" }),
        A.cylinder(x, SEL_Y, 3.4, SEL_Z - 1.8, 1.8, { name: "sel.cap" }),
      ],
      [x, SEL_Y, SEL_Z / 2]);
  });
  const rail = { x: -140, y: SEL_Y - 2, w: 74, d: 4, r: 1 };
  put("sel.rail",
    S(k.slabOf(rail, SEL_Z, SEL_H, P, 3, 0.4), { tone: "mid" }) +
      L(k.lineOnTop([rail.x, SEL_Y], [rail.x + rail.w, SEL_Y], SEL_Z + SEL_H, P), { tone: "faint" }),
    [A.slab(rail, SEL_Z, SEL_H, { name: "sel.rail" })], [-103, SEL_Y, SEL_Z]);

  // the reading head over the rack: its finger points at the card being served
  const x = cardX(0);
  const o = [];
  const sh = [];
  const deck = { x: -5, y: -6, w: 10, d: 12, r: 2 };
  const skid = { x: -5, y: SEL_Y - 2, w: 10, d: 4, r: 1 };
  o.push(S(k.slabOf(skid, SEL_Z + SEL_H, 1.2, P, 3, 0.3), { tone: "mid" }));
  sh.push(A.slab(skid, SEL_Z + SEL_H, 1.2, { name: "sel.skid" }));
  o.push(S(k.slabOf(deck, SEL_Z + SEL_H, 3, P, 4, 0.5), { tone: "mid" }));
  sh.push(A.slab(deck, SEL_Z + SEL_H, 3, { name: "sel.deck" }));
  const bracket = { x: -3, y: -1, w: 6, d: 8, r: 1 };
  o.push(S(k.slabOf(bracket, SEL_Z + SEL_H + 3, 1.6, P, 3, 0.3), { tone: "mid" }));
  sh.push(A.slab(bracket, SEL_Z + SEL_H + 3, 1.6, { name: "sel.bracket" }));
  const finger = { x: -1.6, y: 3, w: 3.2, d: 5, r: 0.8 };
  o.push(S(k.slabOf(finger, SEL_Z, SEL_Z + SEL_H + 3 - SEL_Z, P, 2, 0.3), { tone: "mid", crease: "none" }));
  const tip = { x: -2.4, y: 2.2, w: 4.8, d: 6.6, r: 1 };

  o.push(D([at([deck.x + 2, deck.y + 2, SEL_Z + SEL_H + 3]), at([deck.x + deck.w - 2, deck.y + 2, SEL_Z + SEL_H + 3])], { size: 0.45, tone: "mid" }));
  group("selector", o.join(""), sh, [x, SEL_Y, SEL_Z + SEL_H], [x, 0, 0]);
  // the finger below the rail is its own item: it hangs in front of the cards
  group("sel.finger",
    S(k.slabOf(finger, 17.4, SEL_Z - 17.4, P, 2, 0.3), { tone: "mid", crease: "none" }) +
      S(k.slabOf(tip, 16.6, 1.6, P, 3, 0.5), { tone: "hi", lit: true }) +
      L(k.planOutline(k.insetPlan(tip, 0.9), 18.2, P, 3), { tone: "lo" }),
    [A.slab(finger, 17.4, SEL_Z - 17.4, { name: "sel.finger" }), A.slab(tip, 16.6, 1.6, { name: "sel.tip" })],
    [x, SEL_Y + 5, 20], [x, 0, 0]);
  return x;
}

// ---------------------------------------------------------------- knob (three detents)
function knob() {
  const [x, y] = KNOB;
  const out = [];
  const shapes = [];
  const house = { x: x - 11, y: y - 11, w: 22, d: 22, r: 3 };
  out.push(S(k.slabOf(house, 0, 3, P, 5, 0.6), { tone: "mid" }));
  shapes.push(A.slab(house, 0, 3, { name: "knob.house" }));
  out.push(L(k.planOutline(k.insetPlan(house, 1.4), 3, P, 5), { tone: "faint" }));
  // three detent marks = FCFS / SSTF / SCAN
  const marks = [Math.PI * 0.75, Math.PI * 1.0, Math.PI * 1.25];
  for (const a of marks) {
    out.push(L(k.lineOnTop([x + Math.cos(a) * 8.4, y - Math.sin(a) * 8.4], [x + Math.cos(a) * 10.6, y - Math.sin(a) * 10.6], 3, P), { tone: "mid" }));
  }
  out.push(D(marks.map((a) => at([x + Math.cos(a) * 10.6, y - Math.sin(a) * 10.6, 3])), { size: 0.6, tone: "mid" }));
  out.push(S(k.cylinder(x, y, 7, 3, 4, P, 40), { tone: "hi", crease: "lo" }));
  out.push(L(k.knurl(x, y, 7, 3.2, 6.8, 44, P), { tone: "lo" }));
  out.push(L(k.ring(x, y, 2.4, 7, P, 20), { tone: "lo" }));
  shapes.push(A.cylinder(x, y, 7, 3, 4, { name: "knob.body" }));
  out.push(`<g data-part="knobpointer">${pointerLine(Math.PI * 1.0)}</g>`);
  put("knob", out.join(""), shapes, [x, y, 3]);
}

function pointerLine(a) {
  // the knob's pointer points at the selected detent
  const [x, y] = KNOB;
  return k.lineSvg(k.lineOnTop([x + Math.cos(a) * 2.4, y - Math.sin(a) * 2.4], [x + Math.cos(a) * 6.9, y - Math.sin(a) * 6.9], 7.1, P), {
    tone: "lit",
    className: "iso-index",
  });
}

// ---------------------------------------------------------------- dial (travel account)
function dial() {
  const [x, y] = DIAL;
  const out = [];
  const shapes = [];
  out.push(S(k.cylinder(x, y, 4.2, 0, 2.2, P, 28), { tone: "mid" }));
  out.push(S(k.cylinder(x, y, 2.8, 2.2, DIAL_Z - 2.2, P, 24), { tone: "mid", crease: "none" }));
  out.push(L(k.sideArc(x, y, 2.8, 9, P, 16), { tone: "faint" }));
  shapes.push(A.cylinder(x, y, 4.2, 0, 2.2, { name: "dial.collar" }));
  shapes.push(A.cylinder(x, y, 2.8, 2.2, DIAL_Z - 2.2, { name: "dial.post" }));
  // lug joining the post to the dial
  out.push(S(k.slabOf({ x: x - DIAL_R - 4, y: y - 3.4, w: 7, d: 6.8, r: 1.4 }, DIAL_Z, DIAL_H, P, 3, 0.4), { tone: "mid" }));
  shapes.push(A.slab({ x: x - DIAL_R - 4, y: y - 3.4, w: 7, d: 6.8, r: 1.4 }, DIAL_Z, DIAL_H, { name: "dial.lug" }));
  out.push(S(k.cylinder(x, y, DIAL_R, DIAL_Z, DIAL_H, P, 72, 0.8), { tone: "hi", crease: "lo" }));
  shapes.push(A.cylinder(x, y, DIAL_R, DIAL_Z, DIAL_H, { name: "dial.puck" }));
  out.push(L(k.knurl(x, y, DIAL_R, DIAL_TOP - 2.8, DIAL_TOP, 96, P, 0.3), { tone: "lo" }));
  out.push(L(k.sideArc(x, y, DIAL_R, DIAL_TOP - 2.8, P, 48), { tone: "faint" }));
  out.push(L(k.ring(x, y, DIAL_R - 2.2, DIAL_TOP, P, 72), { tone: "lo" }));
  const ticks = k.radialTicks(x, y, DIAL_R - 3, PER_TURN, 5, DIAL_TOP, [1.2, 2.6], P, 0, Math.PI * 2);
  out.push(L(ticks.minor, { tone: "lo" }), L(ticks.major, { tone: "mid" }));
  out.push(L(k.ring(x, y, 1.8, DIAL_TOP, P, 20), { tone: "mid" }));
  // crown (a knob on the side) and two lug screws
  out.push(S(k.slabOf({ x: x + DIAL_R - 1.5, y: y - 2.4, w: 4.2, d: 4.8, r: 1 }, DIAL_Z + 1.2, 4.6, P, 2, 0.4), { tone: "mid" }));
  out.push(S(k.cylinder(x + DIAL_R + 2.4, y, 2.6, DIAL_Z + 1.6, 5.4, P, 20), { tone: "mid" }));
  out.push(L(k.knurl(x + DIAL_R + 2.4, y, 2.6, DIAL_Z + 1.6, DIAL_Z + 7, 18, P), { tone: "lo" }));
  shapes.push(A.slab({ x: x + DIAL_R - 1.5, y: y - 2.4, w: 4.2, d: 4.8, r: 1 }, DIAL_Z + 1.2, 4.6, { name: "dial.crownlug" }));
  shapes.push(A.cylinder(x + DIAL_R + 2.4, y, 2.6, DIAL_Z + 1.6, 5.4, { name: "dial.crown" }));
  out.push(`<path data-part="needle" class="iso-line" data-tone="lit" data-free="start" d="${needlePath(0)}" style="stroke-width:1.1"/>`);
  put("dial", out.join(""), shapes, [x, y, DIAL_Z]);
}

function needlePath(turns) {
  const angle = turns * Math.PI * 2;
  const [x, y] = DIAL;
  return k.lineOnTop(
    [x - Math.sin(angle) * 3.6, y + Math.cos(angle) * 3.6],
    [x + Math.sin(angle) * (DIAL_R - 4.5), y - Math.cos(angle) * (DIAL_R - 4.5)],
    DIAL_TOP + 0.2,
    P,
  );
}

// ---------------------------------------------------------------- terminal block
function terminals() {
  const block = { x: 84, y: -62, w: 26, d: 13, r: 2 };
  const out = [S(k.slabOf(block, 0, 3.4, P, 4, 0.5), { tone: "mid" })];
  const shapes = [A.slab(block, 0, 3.4, { name: "term.block" })];
  out.push(L(k.planOutline(k.insetPlan(block, 1.2), 3.4, P, 4), { tone: "faint" }));
  for (const dx of [-8, 0, 8]) {
    const x = block.x + block.w / 2 + dx, y = block.y + block.d / 2;
    out.push(S(k.cylinder(x, y, 2.2, 3.4, 2.6, P, 20), { tone: "hi" }));
    out.push(L(k.ring(x, y, 1.2, 6, P, 12), { tone: "lo" }));
    shapes.push(A.cylinder(x, y, 2.2, 3.4, 2.6, { name: "term.post" }));
  }
  put("term", out.join(""), shapes, [block.x + block.w / 2, block.y + block.d / 2, 3.4]);
}

// ---------------------------------------------------------------- build
const halo = base();
labelPlate();
platter();
bridge();
const restHeadX = head();
rack();
const restSelX = selector();
knob();
dial();
terminals();

A.settle(R, P);
R.items.sort((a, b) => a.key - b.key);
const art = R.items.map((i) => i.svg).join("");
A.auditOrExit(R, P);

const svg = k.figureSvg({
  width: WIDTH,
  height: HEIGHT,
  label:
    "一只寻道顺序试验台。左边九张请求卡站在卡架里，一只读数头沿卡架上方的导轨跳来跳去，它停在哪一张卡，就表示下一个服务哪个请求；" +
    "中间是一块转动的盘片，盘面刻着 12 条柱面轨道，桥架上的滑架带着读头沿半径进进出出（移臂），盘片把要读的扇区转到读头下（旋转）；" +
    "右边的表盘是行程账单，它只累计机械臂一共走了多少格。旋钮有三档：先来先服务、最短寻道优先、电梯（扫描）。",
  body: [halo, art],
});

// ---------------------------------------------------------------- live
const DATA = {
  P,
  PC,
  start: M.START,
  disk: M.DISK,
  requests: M.REQUESTS,
  circled: M.CIRCLED,
  modes: M.MODES,
  orders: Object.fromEntries(M.MODES.map((key) => [key, M.ORDERS[key]])),
  radius: [M.HEAD_R0, M.HEAD_R1],
  headZ: HEAD_Z,
  platterTop: PLATTER_TOP,
  diskR: DISK_R,
  cardX: M.REQUESTS.map((_, i) => cardX(i)),
  cardLift: CARD_LIFT,
  dial: DIAL,
  dialR: DIAL_R,
  dialTop: DIAL_TOP,
  perTurn: PER_TURN,
  knob: KNOB,
  restHeadX,
  restSelX,
};

const live = `
const D = ${JSON.stringify(DATA)};
const P = D.P;
const stage = document.querySelector(".iso-stage");
const svg = stage.querySelector("svg");
const headG = svg.querySelector('[data-part="head"]');
const selG = svg.querySelector('[data-part="selector"]');
const cards = D.cardX.map((_, i) => svg.querySelector('[data-part="card' + i + '"]'));
const spins = svg.querySelector('[data-part="spinset"]');
const needle = svg.querySelector('[data-part="needle"]');
const knobPointer = svg.querySelector('[data-part="knobpointer"]');
const readout = document.querySelector("[data-readout]");
const still = matchMedia("(prefers-reduced-motion: reduce)");

const radiusOf = (cyl) => D.radius[0] + ((cyl - D.disk[0]) / (D.disk[1] - D.disk[0])) * (D.radius[1] - D.radius[0]);
const xOfCyl = (cyl) => D.PC[0] + radiusOf(cyl);
const sectorAngle = (s) => ((s - 1) / 10) * Math.PI * 2;
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

let mode = "sstf";
let plan = D.orders[mode];
let stopAt = 0;          // index of the stop we are heading for
let travelNow = 0;       //格, shown on the dial
let spin = 0;            // radians, the platter is always turning
let headX = D.restHeadX, headT = D.restHeadX;
let selX = D.restSelX, selT = D.restSelX;
let lifts = D.cardX.map(() => 0);
let dwell = 0, phase = "seek", prevSpin = 0, tour = true, paused = false;
let visible = false, frame = 0, last = 0, idle = 0;
const SPIN_RATE = 3.0;   // rad/s — the platter never stops, that is the point

function spinSet(angle, target) {
  const [cx, cy] = D.PC;
  const dots = [];
  for (let s = 1; s <= 10; s++) {
    const a = angle + sectorAngle(s);
    const p = iso([cx + Math.cos(a) * (D.diskR - 4), cy + Math.sin(a) * (D.diskR - 4), D.platterTop], P);
    dots.push([p[0], p[1], s === target ? 1 : 0.4]);
  }
  const a = angle + sectorAngle(target);
  const line = lineOnTop(
    [cx + Math.cos(a) * 9, cy + Math.sin(a) * 9],
    [cx + Math.cos(a) * (D.diskR - 2.5), cy + Math.sin(a) * (D.diskR - 2.5)],
    D.platterTop + 0.1, P);
  return lineSvg(line, { tone: "lit", className: "iso-index" }) + dotsSvg(dots, { size: 0.9, tone: "mid" });
}

function needlePath(turns) {
  const a = turns * Math.PI * 2, [x, y] = D.dial;
  return lineOnTop([x - Math.sin(a) * 3.6, y + Math.cos(a) * 3.6], [x + Math.sin(a) * (D.dialR - 4.5), y - Math.cos(a) * (D.dialR - 4.5)], D.dialTop + 0.2, P);
}

function advance() {
  const stop = plan.stops[stopAt];
  if (!stop) return;
  travelNow += Math.abs(stop.cyl - (plan.stops[stopAt - 1] || { cyl: D.start }).cyl);
  stopAt += 1;
  dwell = 0;
  phase = "seek";
  targets();
}

const cycle = ["fcfs", "sstf", "scan"];
function setMode(next) {
  mode = next;
  plan = D.orders[mode];
  stopAt = 0; travelNow = 0; dwell = 0; phase = "seek"; tour = false;
  lifts = D.cardX.map(() => 0);
  knobPointer.innerHTML = pointerHtml(cycle.indexOf(mode));
  run();
}
function pointerHtml(index) {
  const a = [Math.PI * 0.75, Math.PI, Math.PI * 1.25][index] ?? Math.PI;
  const [x, y] = D.knob;
  return lineSvg(lineOnTop([x + Math.cos(a) * 2.4, y - Math.sin(a) * 2.4], [x + Math.cos(a) * 6.9, y - Math.sin(a) * 6.9], 7.1, P), { tone: "lit", className: "iso-index" });
}

function targets() {
  const stop = plan.stops[stopAt];
  headT = stop ? xOfCyl(stop.cyl) : headX;
  selT = stop && stop.id ? D.cardX[stop.id - 1] : selX;
}
targets();
headX = headT; selX = selT;

function label() {
  const stop = plan.stops[stopAt];
  const parts = [plan.name, "行程 " + travelNow + " 格"];
  if (stop && stop.id) parts.push(D.circled[stop.id - 1] + " 柱面" + stop.cyl + "/扇区" + stop.sector);
  else if (stop) parts.push("空驶到 " + stop.cyl);
  else parts.push("完毕 · 共 " + plan.travel + " 格");
  return parts.join(" · ");
}

window.__state = () => ({ phase, stopAt, spin: +spin.toFixed(2), prevSpin: +prevSpin.toFixed(2), headX: +headX.toFixed(1), headT: +headT.toFixed(1), selX: +selX.toFixed(1), selT: +selT.toFixed(1), travelNow, dwell: +dwell.toFixed(2), paused, tour });

function draw() {
  const dx = headX - D.restHeadX, sx = selX - D.restSelX;
  headG.setAttribute("transform", translateAlong(P, [D.restHeadX + dx, 0, 0]));
  ["head.bracket", "head.arm.in", "head.arm.cross", "head.slider"].forEach((part) => {
    const el = svg.querySelector('[data-part="' + part + '"]');
    if (el) el.setAttribute("transform", translateAlong(P, [D.restHeadX + dx, 0, 0]));
  });
  selG.setAttribute("transform", translateAlong(P, [D.restSelX + sx, 0, 0]));
  const finger = svg.querySelector('[data-part="sel.finger"]');
  if (finger) finger.setAttribute("transform", translateAlong(P, [D.restSelX + sx, 0, 0]));
  cards.forEach((g, i) => g.setAttribute("transform", translateAlong(P, [0, 0, lifts[i]])));
  const stop = plan.stops[stopAt];
  spins.innerHTML = spinSet(spin, stop && stop.id ? stop.sector : 1);
  needle.setAttribute("d", needlePath(travelNow / D.perTurn));
  const text = label();
  if (readout.textContent !== text) readout.textContent = text;
  stage.setAttribute("aria-valuetext", text);
}

function step(dt, calm) {
  const stop = plan.stops[stopAt];
  if (paused) return;
  prevSpin = spin;
  spin += SPIN_RATE * dt;
  if (spin > Math.PI * 2) { spin -= Math.PI * 2; }
  headX = calm ? headT : headX + (headT - headX) * (1 - Math.exp(-dt / 0.22));
  selX = calm ? selT : selX + (selT - selX) * (1 - Math.exp(-dt / 0.16));
  lifts = lifts.map((v, i) => {
    const want = plan.stops.findIndex((s, j) => j < stopAt && s.id === i + 1) >= 0 ? D.cardLift : 0;
    return calm ? want : v + (want - v) * (1 - Math.exp(-dt / 0.1));
  });

  const seated = Math.abs(headX - headT) < 0.05 && Math.abs(selX - selT) < 0.05;
  const TWO = Math.PI * 2;
  if (stop) {
    if (stop.id) {
      // 移臂先到位, 再等扇区转过来: the wanted sector has to pass under the head.
      // Detect the crossing, not a window — at 3 rad/s the window is only 60 ms.
      if (phase === "seek" && seated) phase = "wait";
      if (phase === "wait") {
        const nowAngle = (spin + sectorAngle(stop.sector)) % TWO;
        const wasAngle = (prevSpin + sectorAngle(stop.sector)) % TWO;
        if (wasAngle > nowAngle) { phase = "serve"; dwell = 0; }
      }
      if (phase === "serve") {
        dwell += dt;
        if (dwell > 0.2) advance();
      }
    } else if (seated) {
      dwell += dt;
      if (dwell > 0.7) advance();
    }
  } else {
    dwell += dt;
    if (dwell > 2.2 && tour) { idle += dt; if (idle > 0.6) { idle = 0; setModeAfterTour(); } }
  }
}

function tick(now) {
  if (deterministic) { frame = 0; return; }
  const dt = last ? Math.min((now - last) / 1000, 1 / 12) : 1 / 60;
  last = now;
  step(dt, still.matches);
  draw();
  frame = visible ? requestAnimationFrame(tick) : 0;
}

// --- deterministic replay, for rendering a video frame by frame -------------
function resetSim(next = "fcfs") {
  simTime = 0;
  mode = next;
  plan = D.orders[mode];
  stopAt = 0; travelNow = 0; dwell = 0; idle = 0; phase = "seek"; spin = 0; prevSpin = 0;
  lifts = D.cardX.map(() => 0);
  knobPointer.innerHTML = pointerHtml(cycle.indexOf(mode));
  targets();
  headX = headT; selX = selT;
}
let simTime = 0, deterministic = false;
window.__seek = (seconds) => {
  // 逐帧出图时必须独占时钟：页面的 rAF 循环也在推进同一个仿真，
  // 让它继续跑就等于两个时钟叠加，画面会比时间戳跑得快好几倍。
  if (!deterministic) { deterministic = true; if (frame) cancelAnimationFrame(frame); frame = 0; paused = false; }
  // 帧是按时间递增取的，所以只往前推，不每帧从头重放（否则 O(t²)）
  const safe = Math.max(0, Math.min(seconds, 400));
  if (safe <= 1e-6 || safe < simTime - 1e-6) { resetSim(window.__demoMode || "fcfs"); simTime = 0; }
  const n = Math.round((safe - simTime) * 60);
  for (let i = 0; i < n; i++) step(1 / 60, false);
  simTime += n / 60;
  draw();
  return label();
};
window.__trace = (seconds = 6) => {
  resetSim(window.__demoMode || "fcfs");
  const out = []; let last = -1;
  for (let i = 0; i < seconds * 60; i++) {
    step(1 / 60, false);
    if (stopAt !== last) { out.push([+(i / 60).toFixed(2), stopAt, plan.stops[Math.max(0, stopAt - 1)].cyl, phase, +spin.toFixed(2), +(headX - headT).toFixed(2)]); last = stopAt; }
  }
  return out;
};
window.__span = (limit = 300) => {
  deterministic = true; if (frame) cancelAnimationFrame(frame); frame = 0;
  resetSim("fcfs");
  let t = 0, seen = 1, was = mode;
  for (t = 0; t < limit; t += 1 / 60) {
    step(1 / 60, false);
    if (mode !== was) { seen += 1; was = mode; }
    if (seen >= 4) break;
  }
  return Math.round((t + 1.2) * 20) / 20;
};

function setModeAfterTour() {
  mode = cycle[(cycle.indexOf(mode) + 1) % cycle.length];
  plan = D.orders[mode];
  stopAt = 0; travelNow = 0; dwell = 0; phase = "seek";
  lifts = D.cardX.map(() => 0);
  knobPointer.innerHTML = pointerHtml(cycle.indexOf(mode));
  targets();
}

const run = () => { if (!frame && visible && !deterministic) { last = 0; frame = requestAnimationFrame(tick); } };
new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; if (visible) run(); }, { rootMargin: "120px 0px" }).observe(stage);
if (still.matches) tour = false;
stage.addEventListener("keydown", (e) => {
  const keys = { "1": "fcfs", "2": "sstf", "3": "scan" };
  if (keys[e.key]) { e.preventDefault(); setMode(keys[e.key]); return; }
  if (e.key === " ") { e.preventDefault(); paused = !paused; run(); }
  if (e.key === "r" || e.key === "R") { e.preventDefault(); setMode(mode); }
});
svg.addEventListener("click", () => {
  const next = cycle[(cycle.indexOf(mode) + 1) % cycle.length];
  setMode(next);
});
draw();
`;

const card = k.plateHtml({
  fig: "Fig 1",
  title: "Seek order test stand",
  hint: "点图或按 1 / 2 / 3 换算法",
  readout: `${M.ORDERS.sstf.name} · 行程 0 格`,
  keys: [
    { mark: "lit", label: "读头与卡片指针：当前服务的是哪一个请求" },
    { mark: "raised", label: "九张请求卡：被服务过的会抬起来" },
    { mark: "hi", label: "盘片：盘面一圈圈就是柱面，10 个扇区随盘转" },
    { mark: "flat", label: "桥架滑架：沿半径进出＝移臂调度" },
    { mark: "dim", label: "表盘：只累计机械臂一共走了多少格" },
  ],
  caption:
    "同一批九个请求，三种排队方式：先来先服务来回甩（26 格）、最短寻道每次挑最近的（8 格）、电梯一路走到盘边再折返（16 格，多跑的是空驶）。" +
    "序列就是 2022 年下半年上午卷第 4 题的答案 C：④⑥⑨⑤⑦①②⑧③。",
  body: `<div class="iso-stage" tabindex="0" role="application" aria-label="寻道顺序试验台：1 先来先服务，2 最短寻道优先，3 电梯" aria-valuetext="最短寻道优先 · 行程 0 格">${svg}</div>`,
});

const file = theme === "light" ? "disk-scheduler-light.html" : "disk-scheduler.html";
writeFileSync(join(HERE, file), k.pageHtml({ title: "Seek order test stand", theme, body: card, script: kitScript() + live }));
console.log("wrote", file);

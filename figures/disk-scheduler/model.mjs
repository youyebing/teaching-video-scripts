// The model, in one pure module. Every number the figure shows comes from here.
// Requests are the 2022 下半年 系统架构设计师 上午卷第（4）题 table (verified against the paper).

export const START = 20;              // 移臂起点柱面
export const DISK = [14, 26];         // 台架的行程范围（26 = 磁盘最外圈，SCAN 要走到这里）

export const REQUESTS = [
  { id: 1, cyl: 18, head: 8, sector: 6 },
  { id: 2, cyl: 16, head: 6, sector: 3 },
  { id: 3, cyl: 16, head: 9, sector: 6 },
  { id: 4, cyl: 21, head: 10, sector: 5 },
  { id: 5, cyl: 18, head: 8, sector: 4 },
  { id: 6, cyl: 21, head: 3, sector: 10 },
  { id: 7, cyl: 18, head: 7, sector: 6 },
  { id: 8, cyl: 16, head: 10, sector: 4 },
  { id: 9, cyl: 22, head: 10, sector: 8 },
];

export const CIRCLED = ["①", "②", "③", "④", "⑤", "⑥", "⑦", "⑧", "⑨"];

// Within one cylinder: sector ascending, then head ascending. That is what the
// paper's answer key does (① 和 ⑦ 同为 18 柱面、扇区 6, ⑦ 的磁头 7 在 ① 的磁头 8 前).
const within = (a, b) => a.sector - b.sector || a.head - b.head;

const travel = (stops) => stops.slice(1).reduce((s, stop, i) => s + Math.abs(stop.cyl - stops[i].cyl), 0);
const seqOf = (stops) => stops.filter((s) => s.id).map((r) => CIRCLED[r.id - 1]).join("");

// A turn stop that lands on the cylinder the head is already on costs nothing, so drop it.
const clean = (stops) => stops.filter((s, i) => !(i > 0 && !s.id && s.cyl === stops[i - 1].cyl));

const build = (key, name, stops) => {
  const list = clean([{ cyl: START, id: null }, ...stops]);
  return { key, name, stops: list, travel: travel(list), seq: seqOf(list) };
};

// FCFS: arrival order ①②③④⑤⑥⑦⑧⑨.
export function fcfs() {
  return build("fcfs", "FCFS · 先来先服务", [...REQUESTS].sort((a, b) => a.id - b.id));
}

// SSTF: nearest cylinder each step, then sector order inside it.
export function sstf() {
  const left = [...REQUESTS], out = [];
  let at = START;
  while (left.length) {
    const d = Math.min(...left.map((r) => Math.abs(r.cyl - at)));
    const done = left.filter((r) => Math.abs(r.cyl - at) === d && r.cyl === Math.min(...left.filter((q) => Math.abs(q.cyl - at) === d).map((q) => q.cyl)));
    done.sort(within).forEach((r) => { out.push(r); left.splice(left.indexOf(r), 1); });
    at = done[0].cyl;
  }
  return build("sstf", "SSTF · 最短寻道优先", out);
}

// SCAN (elevator): out to the disk's outer edge, then back down.
// No request lives past 22, so the head runs empty 22 → 26: the trip is longer
// than SSTF here, which is the honest price of a bounded wait.
export function scan() {
  const up = REQUESTS.filter((r) => r.cyl >= START).sort((a, b) => a.cyl - b.cyl || within(a, b));
  const down = REQUESTS.filter((r) => r.cyl < START).sort((a, b) => b.cyl - a.cyl || within(a, b));
  return build("scan", "SCAN · 电梯", [...up, { cyl: DISK[1], id: null }, ...down]);
}

export const ORDERS = { fcfs: fcfs(), sstf: sstf(), scan: scan() };
export const MODES = ["fcfs", "sstf", "scan"];

// Where the head sits on the platter for a cylinder: 14 → r 10, 26 → r 28.
export const HEAD_R0 = 10;
export const HEAD_R1 = 28;
export const radiusOf = (cyl) => HEAD_R0 + ((cyl - DISK[0]) / (DISK[1] - DISK[0])) * (HEAD_R1 - HEAD_R0);

// Sector 1..10 → angle in radians, 0 along +x.
export const sectorAngle = (sector) => ((sector - 1) / 10) * Math.PI * 2;

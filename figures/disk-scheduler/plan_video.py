#!/usr/bin/env python3
"""把旁白与仿真编排成一支片子。

规则：每一拍（一张请求卡）的画面长度 = 那一拍的语音长度 + 留白；
画面内容 = 仿真里该拍对应的区间 [start, end] 被拉伸到这段长度。
所以图和话不会错位——话长，画就慢。

输出：plan.json（分镜）、actions.json（drive.mjs 的逐帧动作）
"""
import json, subprocess, os

HERE = os.path.dirname(os.path.abspath(__file__))
FPS = 20
HOLD_PAD = 0.55          # 一拍语音结束后留的呼吸
HOLD_MIN = 3.2           # 再短的语音也要让画面停够看
INTRO_PAD, END_PAD = 1.0, 1.5

# 仿真里每一拍的时间区间（由 __beats 量出来的，见 README）
SPANS = {
    "fcfs": [[0, 1.6], [1.6, 6.983], [6.983, 12.083], [12.083, 14.833], [14.833, 23.083],
             [23.083, 31.333], [31.333, 36.833], [36.833, 42.333], [42.333, 47.033], [47.033, 53.317]],
    "sstf": [[0, 1.6], [1.6, 7.367], [7.367, 13.267], [13.267, 17.983], [17.983, 23.483],
             [23.483, 26.617], [26.617, 30.55], [30.55, 35.65], [35.65, 39.183], [39.183, 42.333]],
    "scan": [[0, 1.6], [1.6, 7.367], [7.367, 13.267], [13.267, 17.983], [17.983, 22.017],
             [22.017, 31.333], [31.333, 34.467], [34.467, 38.4], [38.4, 43.5], [43.5, 47.033],
             [47.033, 50.183]],
}

man = json.load(open(os.path.join(HERE, "audio/manifest.json")))
plan, actions = [], []
frame = 0

for mode in ("fcfs", "sstf", "scan"):
    beats = man[mode]
    spans = SPANS[mode]
    assert len(beats) == len(spans) + 1, (mode, len(beats), len(spans))
    for i, beat in enumerate(beats):
        kind = "intro" if i == 0 else ("end" if beat["beat"] == "end" else "motion")
        dur = beat["dur"] + (INTRO_PAD if kind == "intro" else END_PAD if kind == "end" else HOLD_PAD)
        if kind == "motion":
            dur = max(dur, HOLD_MIN)
        n = int(round(dur * FPS))
        if kind == "motion":
            a, b = spans[i]
            # 该拍的仿真区间被拉伸到 n 帧上；不落在右端点，免得跨到下一拍
            for j in range(n):
                t = a + (b - a) * (j + 1) / n
                actions.append(["eval", f"window.__seekMode('{mode}',{t:.4f})"])
                actions.append(["shot", f"frames/{frame:05d}.png"])
                frame += 1
            src = {"kind": "motion", "sim": [a, b], "frames": [frame - n, n]}
        else:
            t = 0.8 if kind == "intro" else spans[-1][1]
            actions.append(["eval", f"window.__seekMode('{mode}',{t:.4f})"])
            actions.append(["shot", f"frames/{frame:05d}.png"])
            src = {"kind": "hold", "sim": t, "frames": [frame, 1]}
            frame += 1
        plan.append({"mode": mode, "beat": beat["beat"], "text": beat["text"], "audio": beat["file"],
                     "dur": round(dur, 3), "fps": FPS, **src})

json.dump(plan, open(os.path.join(HERE, "plan.json"), "w"), ensure_ascii=False, indent=1)
json.dump(actions, open("/tmp/actions.json", "w"))
print(f"拍数 {len(plan)} · 总时长 {sum(p['dur'] for p in plan):.1f}s · 需出帧 {frame} 张")

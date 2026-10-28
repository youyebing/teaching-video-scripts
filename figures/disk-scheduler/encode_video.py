#!/usr/bin/env python3
"""把 plan.json 编成带旁白的片子。

每个分镜单独编码（运动拍用真帧序列、静帧拍用单帧循环），再拼接画面、
拼接「每拍语音 + 补到该拍长度的静音」，最后合流。
所有分段用同一套编码参数，拼接才能 -c copy。
"""
import json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else "磁盘调度-试验台演示（带旁白）.mp4"
plan = json.load(open(os.path.join(HERE, "plan.json")))
SEG = os.path.join(HERE, "seg")
os.makedirs(SEG, exist_ok=True)
for f in os.listdir(SEG):
    os.remove(os.path.join(SEG, f))

VCODEC = ["-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p"]

def run(args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"FAIL: {' '.join(args[:6])}…\n{r.stderr[-800:]}")

vlist, alist = [], []
for i, p in enumerate(plan):
    seg = os.path.join(SEG, f"v{i:03d}.mp4")
    n = p["frames"][1]
    if p["kind"] == "motion":
        run(["ffmpeg", "-y", "-framerate", str(p["fps"]), "-start_number", str(p["frames"][0]),
             "-i", os.path.join(HERE, "frames", "%05d.png"), "-frames:v", str(n), *VCODEC,
             "-r", str(p["fps"]), seg])
    else:
        still = os.path.join(HERE, "frames", f"{p['frames'][0]:05d}.png")
        run(["ffmpeg", "-y", "-loop", "1", "-framerate", str(p["fps"]), "-i", still,
             "-t", f"{p['dur']:.3f}", *VCODEC, "-r", str(p["fps"]), seg])
    vlist.append(seg)

    wav = os.path.join(SEG, f"a{i:03d}.wav")
    run(["ffmpeg", "-y", "-i", os.path.join(HERE, p["audio"]), "-af", "apad",
         "-t", f"{p['dur']:.3f}", "-ar", "44100", "-ac", "1", wav])
    alist.append(wav)
    print(f"  {i:02d} {p['mode']:5s} {p['beat']:6s} {p['kind']:6s} {p['dur']:6.2f}s  {n:4d} 帧")

def concat(files, out, extra=()):
    lst = os.path.join(SEG, "list.txt")
    with open(lst, "w") as fh:
        for f in files:
            fh.write(f"file '{f}'\n")
    run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lst, *extra, out])

silent = os.path.join(SEG, "silent.mp4")
concat(vlist, silent, ["-c", "copy"])
narration = os.path.join(SEG, "narration.wav")
concat(alist, narration, ["-c", "copy"])

final = os.path.join(HERE, OUT)
run(["ffmpeg", "-y", "-i", silent, "-i", narration, "-c:v", "copy", "-c:a", "aac",
     "-b:a", "128k", "-shortest", "-movflags", "+faststart", final])

def dur(path):
    return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                 "-of", "csv=p=0", path], capture_output=True, text=True).stdout.strip())

print(f"\n完成：{OUT}  画面 {dur(silent):.2f}s  旁白 {dur(narration):.2f}s  成片 {dur(final):.2f}s")

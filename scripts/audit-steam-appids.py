#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""核对 resources.json 里每个 steamAppID 的 Steam 官方名是否与标题对得上。

用法：
  python3 scripts/audit-steam-appids.py            # 只报告
  python3 scripts/audit-steam-appids.py --json     # 机器可读
"""
from __future__ import annotations

import json
import re
import sys
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "public/data/resources.json"
API = "https://store.steampowered.com/api/appdetails?appids={}&l=schinese"

CJK = re.compile(r"[\u4e00-\u9fff]")
NOISE = re.compile(
    r"(build\.?\d+|v\d+(\.\d+)*|ver\.?\d+(\.\d+)*|"
    r"中文版|豪华版|终极版|完整版|全dlc|含全dlc|金手指|内置菜单|"
    r"联机版|手机版|win版|pc版|重制版|重置版|最终版|决定版|"
    r"去广告|无限金币版|mod版|整合版|绿色版|免安装版|中文)",
    re.I,
)


def clean(s: str) -> str:
    s = NOISE.sub(" ", s or "")
    s = re.sub(r"[^\w\u4e00-\u9fff]+", " ", s)
    return re.sub(r"\s+", " ", s).strip().casefold()


def cjk_ok(title: str, official: str) -> bool:
    """中文标题：官方名里的中文串与标题中文串有足够重叠。"""
    tc = "".join(CJK.findall(clean(title)))
    oc = "".join(CJK.findall(clean(official)))
    if not tc or not oc:
        return False
    # 取标题最长的连续中文片段，按 2 字滑窗比对
    if tc in oc or oc in tc:
        return True
    grams = {tc[i:i + 2] for i in range(len(tc) - 1)}
    hit = sum(1 for g in grams if g in oc)
    return hit / max(1, len(grams)) >= 0.5


def latin_ok(title: str, official: str) -> bool:
    t = set(re.findall(r"[a-z0-9]{3,}", clean(title)))
    o = set(re.findall(r"[a-z0-9]{3,}", clean(official)))
    t -= {"the", "and", "of", "for", "edition", "dlc", "game"}
    o -= {"the", "and", "of", "for", "edition", "dlc", "game"}
    if not t or not o:
        return False
    return len(t & o) / max(1, min(len(t), len(o))) >= 0.4


def fetch(appids):
    url = API.format(",".join(str(a) for a in appids))
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=40) as r:
        return json.loads(r.read().decode("utf-8"))


def main() -> int:
    data = json.loads(DATA.read_text(encoding="utf-8"))
    rows = [r for r in data if r.get("steamAppID")]
    uniq = sorted({int(r["steamAppID"]) for r in rows})
    names: dict[int, str] = {}
    for i in range(0, len(uniq), 40):
        chunk = uniq[i:i + 40]
        try:
            payload = fetch(chunk)
        except Exception as exc:  # noqa: BLE001
            print(f"[warn] batch {i} failed: {exc}", file=sys.stderr)
            continue
        for a in chunk:
            item = payload.get(str(a)) or {}
            if item.get("success"):
                names[a] = (item.get("data") or {}).get("name", "")
        time.sleep(1)

    bad = []
    for r in rows:
        a = int(r["steamAppID"])
        official = names.get(a)
        if official is None:
            continue
        ok = cjk_ok(r["title"], official) or latin_ok(r["title"], official)
        if not ok:
            bad.append({
                "id": r["id"],
                "title": r["title"],
                "appid": a,
                "official": official,
                "cover": r.get("cover", ""),
            })

    if "--json" in sys.argv:
        print(json.dumps(bad, ensure_ascii=False, indent=2))
    else:
        print(f"检查 {len(rows)} 条（{len(uniq)} 个 appid），可疑 {len(bad)} 条")
        for b in bad:
            print(f"  {b['id']:>18}  {b['appid']:>8}  {b['official'][:28]:<28} ← {b['title'][:36]}")
    return 0 if not bad else 2


if __name__ == "__main__":
    sys.exit(main())

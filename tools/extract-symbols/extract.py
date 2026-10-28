#!/usr/bin/env python3
"""Lấy ký hiệu từ DWG mẫu ra dữ liệu TypeScript (src/drawing/symbols/data).

Chạy:  yarn gen:symbols   (xem README.md)
Cấu hình: symbols.config.json (cùng thư mục).
"""

from __future__ import annotations

import fnmatch
import json
import math
import re
import subprocess
import sys
import unicodedata
import warnings
from collections import defaultdict
from pathlib import Path

import ezdxf
from ezdxf.math import Matrix44, Vec3
from ezdxf.recover import readfile

warnings.filterwarnings("ignore")

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
OUT = HERE / ".out"
DATA = ROOT / "src" / "drawing" / "symbols" / "data"
CONFIG = HERE / "symbols.config.json"

EPS = 1e-6
SKIP_TYPES = {
    "TEXT", "MTEXT", "ATTRIB", "ATTDEF", "DIMENSION", "LEADER", "MULTILEADER",
    "HATCH", "REGION", "SOLID", "OLE2FRAME", "IMAGE", "WIPEOUT", "POINT",
    "VIEWPORT", "TOLERANCE", "3DSOLID", "BODY", "SURFACE",
}

# Nét sau khi bung block, tọa độ nguồn (y hướng lên):
#   ('l', [(x, y), ...], closed)
#   ('a', cx, cy, r, a0, a1)   góc độ, ngược chiều kim đồng hồ từ a0 tới a1 (a1 > a0)
#   ('c', cx, cy, r)
Prim = tuple


# ---------------------------------------------------------------- đọc DXF


def find_dwg(pattern: str) -> Path:
    # macOS lưu tên file dạng NFD nên so khớp sau khi chuẩn hóa NFC.
    norm = lambda t: unicodedata.normalize("NFC", t)
    files = sorted(p for p in (ROOT / ".external").glob("*.dwg") if fnmatch.fnmatch(norm(p.name), norm(pattern)))
    if not files:
        sys.exit(f"Không thấy file DWG khớp '{pattern}' trong .external/ - hỏi phiên chính.")
    return files[0]


def ensure_dxf(dwg: Path) -> Path:
    dxf = OUT / "ref.dxf"
    OUT.mkdir(exist_ok=True)
    if dxf.exists() and dxf.stat().st_mtime >= dwg.stat().st_mtime:
        return dxf
    print(f"dwg2dxf {dwg.name} ...")
    # Cảnh báo DIMASSOC là vô hại.
    subprocess.run(["dwg2dxf", "-y", "-o", str(dxf), str(dwg)], check=True,
                   stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    return dxf


def load(dxf: Path):
    doc, _ = readfile(str(dxf))
    return doc


# ---------------------------------------------------------------- bung nét


def _xy(m: Matrix44, v) -> tuple[float, float]:
    p = m.transform(Vec3(v))
    return (p.x, p.y)


def _circle3(p0, p1, p2):
    """Tâm, bán kính của đường tròn qua 3 điểm; None nếu thẳng hàng."""
    ax, ay = p0
    bx, by = p1
    cx, cy = p2
    d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by))
    if abs(d) < 1e-9:
        return None
    ux = ((ax**2 + ay**2) * (by - cy) + (bx**2 + by**2) * (cy - ay) + (cx**2 + cy**2) * (ay - by)) / d
    uy = ((ax**2 + ay**2) * (cx - bx) + (bx**2 + by**2) * (ax - cx) + (cx**2 + cy**2) * (bx - ax)) / d
    return (ux, uy), math.hypot(ax - ux, ay - uy)


def _arc_prim(ps, pm, pe) -> Prim:
    """Cung đi s -> m -> e (đã ở hệ tọa độ đích) thành ('a', ...) ngược chiều kim đồng hồ."""
    c = _circle3(ps, pm, pe)
    if c is None:
        return ("l", [ps, pe], False)
    (cx, cy), r = c
    cross = (pm[0] - ps[0]) * (pe[1] - pm[1]) - (pm[1] - ps[1]) * (pe[0] - pm[0])
    if cross < 0:  # đi theo chiều kim đồng hồ: đảo đầu cuối
        ps, pe = pe, ps
    a0 = math.degrees(math.atan2(ps[1] - cy, ps[0] - cx))
    a1 = math.degrees(math.atan2(pe[1] - cy, pe[0] - cx))
    while a1 <= a0:
        a1 += 360
    return ("a", cx, cy, r, a0, a1)


def _uniform(m: Matrix44) -> bool:
    ux, uy = m.transform_direction(Vec3(1, 0, 0)), m.transform_direction(Vec3(0, 1, 0))
    return abs(ux.magnitude - uy.magnitude) < 1e-6 * max(1, ux.magnitude) and abs(ux.dot(uy)) < 1e-6 * max(1, ux.magnitude**2)


def prims_of(e, m: Matrix44) -> list[Prim]:
    t = e.dxftype()
    out: list[Prim] = []
    if t == "LINE":
        out.append(("l", [_xy(m, e.dxf.start), _xy(m, e.dxf.end)], False))
    elif t == "LWPOLYLINE":
        ocs = e.ocs()
        has_bulge = any(abs(b) > 1e-9 for *_, b in e.get_points("xyb"))
        if not has_bulge:
            z = e.dxf.elevation
            pts = [_xy(m, ocs.to_wcs(Vec3(x, y, z))) for x, y in e.get_points("xy")]
            out.append(("l", pts, bool(e.closed)))
        else:
            for v in e.virtual_entities():
                out.extend(prims_of(v, m))
    elif t == "POLYLINE":
        if e.is_2d_polyline or e.is_3d_polyline:
            pts = [_xy(m, v.dxf.location) for v in e.vertices]
            if len(pts) >= 2:
                out.append(("l", pts, bool(e.is_closed)))
    elif t == "ARC":
        ocs = e.ocs()
        c, r = Vec3(e.dxf.center), e.dxf.radius
        a0, a1 = e.dxf.start_angle, e.dxf.end_angle
        while a1 <= a0:
            a1 += 360
        pts = []
        for a in (a0, (a0 + a1) / 2, a1):
            ar = math.radians(a)
            p = c + Vec3(r * math.cos(ar), r * math.sin(ar), 0)
            pts.append(_xy(m, ocs.to_wcs(p)))
        if _uniform(m):
            out.append(_arc_prim(*pts))
        else:  # co giãn không đều: nắn thành polyline
            n = max(8, int((a1 - a0) / 5))
            ps = []
            for i in range(n + 1):
                ar = math.radians(a0 + (a1 - a0) * i / n)
                ps.append(_xy(m, ocs.to_wcs(c + Vec3(r * math.cos(ar), r * math.sin(ar), 0))))
            out.append(("l", ps, False))
    elif t == "CIRCLE":
        ocs = e.ocs()
        c, r = Vec3(e.dxf.center), e.dxf.radius
        if _uniform(m):
            cx, cy = _xy(m, ocs.to_wcs(c))
            sc = m.transform_direction(Vec3(1, 0, 0)).magnitude
            out.append(("c", cx, cy, r * sc))
        else:
            ps = []
            for i in range(73):
                ar = math.radians(i * 5)
                ps.append(_xy(m, ocs.to_wcs(c + Vec3(r * math.cos(ar), r * math.sin(ar), 0))))
            out.append(("l", ps, True))
    elif t in ("ELLIPSE", "SPLINE"):
        pts = [_xy(m, v) for v in e.flattening(0.25)]
        if len(pts) >= 2:
            out.append(("l", pts, bool(getattr(e, "closed", False))))
    return out


def expand(doc, block_name: str, m: Matrix44 | None = None, depth: int = 0) -> list[Prim]:
    """Bung toàn bộ nét của block (kể cả block lồng nhau) sang hệ tọa độ đích."""
    m = m or Matrix44()
    block = doc.blocks.get(block_name)
    out: list[Prim] = []
    for e in block:
        t = e.dxftype()
        if t in SKIP_TYPES:
            continue
        if t == "INSERT":
            if depth > 8:
                continue
            inserts = e.multi_insert() if (e.dxf.row_count > 1 or e.dxf.column_count > 1) else [e]
            for ins in inserts:
                if doc.blocks.get(ins.dxf.name) is None:
                    print(f"  cảnh báo: INSERT trỏ tới block không có: {ins.dxf.name}")
                    continue
                # matrix44() already subtracts the block's base point.
                out.extend(expand(doc, ins.dxf.name, ins.matrix44() @ m, depth + 1))
            continue
        out.extend(prims_of(e, m))
    return out


# ---------------------------------------------------------------- hình học


def arc_box(cx, cy, r, a0, a1):
    pts = [(cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a))) for a in (a0, a1)]
    for q in range(-8, 9):
        a = q * 90
        # góc a nằm trong (a0, a1) theo modulo 360
        t = (a - a0) % 360
        if 0 < t < (a1 - a0):
            pts.append((cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a))))
    return pts


def prim_points(p: Prim):
    if p[0] == "l":
        return list(p[1])
    if p[0] == "c":
        _, cx, cy, r = p
        return [(cx - r, cy - r), (cx + r, cy + r)]
    _, cx, cy, r, a0, a1 = p
    return arc_box(cx, cy, r, a0, a1)


def bbox_of(prims: list[Prim]):
    pts = [q for p in prims for q in prim_points(p)]
    xs = [q[0] for q in pts]
    ys = [q[1] for q in pts]
    return min(xs), min(ys), max(xs), max(ys)


def inside(p: Prim, box, tol=0.5) -> bool:
    x0, y0, x1, y1 = box
    return all(x0 - tol <= x <= x1 + tol and y0 - tol <= y <= y1 + tol for x, y in prim_points(p))


# ---------------------------------------------------------------- làm gọn


def r2(v: float) -> float:
    v = round(v + 0.0, 2)
    return 0.0 if v == 0 else v


def clean(prims: list[Prim]) -> list[Prim]:
    """Làm tròn 0,01 mm, bỏ nét dài 0, gộp nét trùng, nối LINE chung đầu mút."""
    edges: dict[tuple, None] = {}
    others: dict[tuple, Prim] = {}

    def add_edge(a, b):
        a = (r2(a[0]), r2(a[1]))
        b = (r2(b[0]), r2(b[1]))
        if a == b:
            return
        edges[(a, b) if a <= b else (b, a)] = None

    for p in prims:
        if p[0] == "l":
            pts = p[1]
            for i in range(len(pts) - 1):
                add_edge(pts[i], pts[i + 1])
            if p[2] and len(pts) > 2:
                add_edge(pts[-1], pts[0])
        elif p[0] == "c":
            q = ("c", r2(p[1]), r2(p[2]), r2(p[3]))
            if q[3] > 0:
                others[q] = q
        else:
            _, cx, cy, r, a0, a1 = p
            if a1 - a0 < 1e-3 or r < 0.005:
                continue
            a0n = a0 % 360
            q = ("a", r2(cx), r2(cy), r2(r), r2(a0n), r2(a0n + (a1 - a0)))
            others[q] = q

    # nối cạnh qua các nút bậc 2
    adj: dict[tuple, list[tuple]] = defaultdict(list)
    for e in edges:
        adj[e[0]].append(e)
        adj[e[1]].append(e)
    used: set[tuple] = set()
    chains: list[tuple[list, bool]] = []

    def walk(start, first_edge):
        pts = [start]
        cur, e = start, first_edge
        while True:
            used.add(e)
            nxt = e[1] if e[0] == cur else e[0]
            pts.append(nxt)
            cur = nxt
            if len(adj[cur]) != 2:
                break
            e2 = adj[cur][0] if adj[cur][0] != e else adj[cur][1]
            if e2 in used:
                break
            e = e2
        return pts

    for node, es in adj.items():
        if len(es) == 2:
            continue
        for e in es:
            if e not in used:
                chains.append((walk(node, e), False))
    for e in list(edges):
        if e in used:
            continue
        pts = walk(e[0], e)
        closed = len(pts) > 2 and pts[0] == pts[-1]
        if closed:
            pts = pts[:-1]
        chains.append((pts, closed))

    out: list[Prim] = []
    for pts, closed in chains:
        pts = drop_collinear(pts, closed)
        out.append(("l", pts, closed))
    out.extend(others.values())
    return out


def drop_collinear(pts, closed):
    if len(pts) < 3:
        return pts
    res = []
    n = len(pts)
    for i, p in enumerate(pts):
        if not closed and i in (0, n - 1):
            res.append(p)
            continue
        a, b = pts[i - 1], pts[(i + 1) % n]
        cross = (p[0] - a[0]) * (b[1] - p[1]) - (p[1] - a[1]) * (b[0] - p[0])
        dot = (p[0] - a[0]) * (b[0] - p[0]) + (p[1] - a[1]) * (b[1] - p[1])
        if abs(cross) < 0.02 and dot > 0:
            continue
        res.append(p)
    return res


# ---------------------------------------------------------------- gốc, lật y, ghi


def pick_origin(prims: list[Prim], spec) -> tuple[float, float]:
    x0, y0, x1, y1 = bbox_of(prims)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    if "xy" in spec:  # null = lấy tâm bbox theo trục đó
        x, y = spec["xy"]
        return (cx if x is None else x, cy if y is None else y)
    a = spec.get("anchor", "c")
    pt = {"c": (cx, cy), "bc": (cx, y0), "tc": (cx, y1), "lc": (x0, cy), "rc": (x1, cy),
          "bl": (x0, y0), "br": (x1, y0), "tl": (x0, y1), "tr": (x1, y1)}[a]
    off = spec.get("offset", [0, 0])
    return (pt[0] + off[0], pt[1] + off[1])


def to_sheet(prims: list[Prim], origin) -> list[Prim]:
    """Dời gốc về điểm chèn và lật y (y hướng xuống)."""
    ox, oy = origin
    out: list[Prim] = []
    for p in prims:
        if p[0] == "l":
            out.append(("l", [(x - ox, -(y - oy)) for x, y in p[1]], p[2]))
        elif p[0] == "c":
            out.append(("c", p[1] - ox, -(p[2] - oy), p[3]))
        else:
            _, cx, cy, r, a0, a1 = p
            s = (-a1) % 360
            out.append(("a", cx - ox, -(cy - oy), r, s, s + (a1 - a0)))
    return out


def num(v: float) -> str:
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


def camel(id_: str) -> str:
    parts = id_.split("-")
    return parts[0] + "".join(p[:1].upper() + p[1:] for p in parts[1:])


def ts_seg(p: Prim) -> str:
    if p[0] == "l":
        flat = ", ".join(f"{num(x)}, {num(y)}" for x, y in p[1])
        return f"{{ t: 'l', p: [{flat}]{', z: true' if p[2] else ''} }}"
    if p[0] == "c":
        return f"{{ t: 'c', c: [{num(p[1])}, {num(p[2])}], r: {num(p[3])} }}"
    return f"{{ t: 'a', c: [{num(p[1])}, {num(p[2])}], r: {num(p[3])}, s: {num(p[4])}, e: {num(p[5])} }}"


def check_stretch(sym: dict, prims: list[Prim]) -> None:
    """Arcs and circles move rigidly when stretched: none may straddle a stretch line."""
    for line in sym.get("stretch", []):
        axis, at, d = line["axis"], line["at"], line["dir"]
        k = 0 if axis == "x" else 1
        for p in prims:
            if p[0] == "a":
                _, cx, cy, r, a0, a1 = p
                pts = [(cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a)))
                       for a in (a0, (a0 + a1) / 2, a1)]
            elif p[0] == "c":
                _, cx, cy, r = p
                c = (cx, cy)[k]
                if abs(c - at) < r - 0.01:
                    raise ValueError(f"đường tròn tâm ({cx}, {cy}) cắt đường kéo giãn {axis}={at}")
                continue
            else:
                continue
            sides = {1 if (q[k] - at) * d > 0.01 else -1 if (q[k] - at) * d < -0.01 else 0 for q in pts}
            if {1, -1} <= sides:
                raise ValueError(f"cung tâm ({cx}, {cy}) vắt qua đường kéo giãn {axis}={at}")


def write_ts(sym: dict, prims: list[Prim]) -> int:
    x0, y0, x1, y1 = bbox_of(prims)
    bx, by = math.floor(x0 * 100) / 100, math.floor(y0 * 100) / 100
    bw, bh = math.ceil((x1 - bx) * 100) / 100, math.ceil((y1 - by) * 100) / 100
    stretch = ", ".join(
        f"{{ axis: '{s['axis']}', at: {num(s['at'])}, dir: {s['dir']} }}"
        for s in sym.get("stretch", [])
    )
    label = sym["label"].replace("'", "\\'")
    chunk = 150  # mảng quá lớn làm TS báo TS2590 (union quá phức tạp): tách thành nhiều const có kiểu
    parts = [prims[i:i + chunk] for i in range(0, len(prims), chunk)]
    small = len(parts) <= 1
    head = ("// Generated by tools/extract-symbols — do not edit\n"
            f"import type {{ {'SymbolData' if small else 'Seg, SymbolData'} }} from '#/drawing/symbols/types'\n\n")
    name = camel(sym["id"])
    if small:
        body = ",\n".join("    " + ts_seg(p) for p in prims)
        segs_src = f"  segs: [\n{body},\n  ],\n"
        pre = ""
    else:
        pre = "".join(
            f"const {name}Segs{i}: Array<Seg> = [\n" + ",\n".join("  " + ts_seg(p) for p in part) + ",\n]\n\n"
            for i, part in enumerate(parts)
        )
        segs_src = "  segs: [" + ", ".join(f"...{name}Segs{i}" for i in range(len(parts))) + "],\n"
    text = (
        head + pre +
        f"export const {name}: SymbolData = {{\n"
        f"  id: '{sym['id']}',\n"
        f"  label: '{label}',\n"
        f"  bbox: {{ x: {num(bx)}, y: {num(by)}, w: {num(bw)}, h: {num(bh)} }},\n"
        f"  stretch: [{stretch}],\n"
        + segs_src +
        "}\n"
    )
    (DATA / f"{sym['id']}.ts").write_text(text, encoding="utf-8")
    return len(text.encode())


def write_index(symbols: list[dict]) -> None:
    imports = "\n".join(f"import {{ {camel(s['id'])} }} from '#/drawing/symbols/data/{s['id']}'" for s in symbols)
    entries = "\n".join(f"  '{s['id']}': {camel(s['id'])}," for s in symbols)
    text = (
        "// Generated by tools/extract-symbols — do not edit\n"
        f"{imports}\n\n"
        f"export const SYMBOL_DATA = {{\n{entries}\n}} as const\n\n"
        "export type SymbolId = keyof typeof SYMBOL_DATA\n"
    )
    (DATA / "index.ts").write_text(text, encoding="utf-8")


# ---------------------------------------------------------------- xem thử (.out)


def preview(sym_id: str, prims: list[Prim]) -> None:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    from matplotlib.patches import Arc, Circle

    x0, y0, x1, y1 = bbox_of(prims)
    w, h = x1 - x0, y1 - y0
    pad = 0.04 * max(w, h) + 5
    # SVG xem thử
    lines = []
    for p in prims:
        if p[0] == "l":
            d = "M " + " L ".join(f"{x:.2f} {y:.2f}" for x, y in p[1]) + (" Z" if p[2] else "")
            lines.append(f'<path d="{d}"/>')
        elif p[0] == "c":
            lines.append(f'<circle cx="{p[1]:.2f}" cy="{p[2]:.2f}" r="{p[3]:.2f}"/>')
        else:
            _, cx, cy, r, s, e = p
            sx, sy = cx + r * math.cos(math.radians(s)), cy + r * math.sin(math.radians(s))
            ex, ey = cx + r * math.cos(math.radians(e)), cy + r * math.sin(math.radians(e))
            large = 1 if e - s > 180 else 0
            lines.append(f'<path d="M {sx:.2f} {sy:.2f} A {r:.2f} {r:.2f} 0 {large} 1 {ex:.2f} {ey:.2f}"/>')
    sw = max(w, h) / 600
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x0 - pad:.2f} {y0 - pad:.2f} {w + 2 * pad:.2f} {h + 2 * pad:.2f}" '
           f'fill="none" stroke="#000" stroke-width="{sw:.2f}">' + "".join(lines) + "</svg>")
    (OUT / f"{sym_id}.svg").write_text(svg)
    # PNG xem thử (y hướng xuống: đảo trục y)
    size = 9
    asp = (w + 2 * pad) / (h + 2 * pad)
    fig, ax = plt.subplots(figsize=(size * min(asp, 1.6) if asp > 1 else size * asp * 0.9 + 2, size if asp <= 1 else size / asp * min(asp, 1.6) + 1))
    for p in prims:
        if p[0] == "l":
            xs = [q[0] for q in p[1]] + ([p[1][0][0]] if p[2] else [])
            ys = [q[1] for q in p[1]] + ([p[1][0][1]] if p[2] else [])
            ax.plot(xs, ys, "k-", lw=0.6)
        elif p[0] == "c":
            ax.add_patch(Circle((p[1], p[2]), p[3], fill=False, lw=0.6))
        else:
            _, cx, cy, r, s, e = p
            ax.add_patch(Arc((cx, cy), 2 * r, 2 * r, theta1=s, theta2=e, lw=0.6))
    ax.plot([0], [0], "r+", ms=12)
    ax.set_xlim(x0 - pad, x1 + pad)
    ax.set_ylim(y1 + pad, y0 - pad)
    ax.set_aspect("equal")
    ax.grid(True, lw=0.2)
    ax.set_title(f"{sym_id}  {w:.0f} x {h:.0f} mm", fontsize=9)
    fig.savefig(OUT / f"{sym_id}.png", dpi=110, bbox_inches="tight")
    plt.close(fig)


# ---------------------------------------------------------------- chính


def build(doc, sym: dict) -> list[Prim]:
    prims = expand(doc, sym["block"])
    if "region" in sym:
        prims = [p for p in prims if inside(p, sym["region"], sym.get("tol", 0.5))]
    for box in sym.get("exclude", []):
        prims = [p for p in prims if not inside(p, box, 0.5)]
    prims = clean(prims)
    if not prims:
        raise RuntimeError("không còn nét nào")
    origin = pick_origin(prims, sym["origin"])
    prims = to_sheet(prims, origin)
    return prims


def main() -> None:
    cfg = json.loads(CONFIG.read_text(encoding="utf-8"))
    only = set(sys.argv[1:])
    dwg = find_dwg(cfg["dwg"])
    doc = load(ensure_dxf(dwg))
    DATA.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(exist_ok=True)
    total = 0
    failed = []
    for sym in cfg["symbols"]:
        if only and sym["id"] not in only:
            continue
        try:
            prims = build(doc, sym)
            check_stretch(sym, prims)
        except Exception as ex:  # báo lỗi từng ký hiệu, chạy hết mẻ rồi mới thoát lỗi
            print(f"LỖI {sym['id']}: {ex}")
            failed.append(sym["id"])
            continue
        size = write_ts(sym, prims)
        preview(sym["id"], prims)
        x0, y0, x1, y1 = bbox_of(prims)
        total += size
        print(f"{sym['id']:22s} {x1 - x0:8.1f} x {y1 - y0:8.1f} mm   {len(prims):5d} nét  {size / 1024:7.1f} KB   bbox x[{x0:.1f},{x1:.1f}] y[{y0:.1f},{y1:.1f}]")
    if failed:
        sys.exit(f"{len(failed)} ký hiệu lỗi: {', '.join(failed)} — dữ liệu cũ của chúng vẫn giữ nguyên.")
    if not only:
        write_index(cfg["symbols"])
        print(f"Tổng {total / 1024:.1f} KB")


if __name__ == "__main__":
    main()

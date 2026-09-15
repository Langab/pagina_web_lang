"""Lee export.xml de Apple Health línea a línea y escribe un CSV por tipo de dato.

Uso:
    python parse.py ruta/a/apple_health_export/export.xml [carpeta_salida]

El archivo puede pesar más de 1 GB: no se carga entero en memoria.
"""
import csv
import html
import os
import re
import sys

if len(sys.argv) < 2:
    sys.exit(__doc__)

SRC = sys.argv[1]
OUT = sys.argv[2] if len(sys.argv) > 2 else "datos"
os.makedirs(OUT, exist_ok=True)

attr_re = re.compile(r'(\w+)="([^"]*)"')
hw_re = re.compile(r"hardware:([^,]+)")

writers, files = {}, {}


def writer(name, header):
    if name not in writers:
        f = open(os.path.join(OUT, name + ".csv"), "w", newline="", encoding="utf-8")
        w = csv.writer(f)
        w.writerow(header)
        writers[name], files[name] = w, f
    return writers[name]


REC_HDR = ["source", "hw", "start", "end", "value", "unit"]
WK_HDR = ["type", "source", "start", "end", "duration_min", "dist_km", "active_kcal"]

cur_rec, cur_wk, n = None, None, 0
with open(SRC, "r", encoding="utf-8") as fh:
    for line in fh:
        s = line.lstrip()
        if s.startswith("<Record "):
            if cur_rec:
                writer(cur_rec[0], REC_HDR).writerow(cur_rec[1])
            a = dict(attr_re.findall(s))
            t = (a.get("type", "")
                 .replace("HKQuantityTypeIdentifier", "")
                 .replace("HKCategoryTypeIdentifier", "cat_")
                 .replace("HKDataType", "dt_"))
            hw = hw_re.search(a.get("device", ""))
            row = [html.unescape(a.get("sourceName", "")), hw.group(1) if hw else "",
                   a.get("startDate", ""), a.get("endDate", ""), a.get("value", ""), a.get("unit", "")]
            if s.rstrip().endswith("/>"):
                writer(t, REC_HDR).writerow(row)
                cur_rec = None
            else:
                cur_rec = (t, row)
            n += 1
            if n % 500_000 == 0:
                print(f"{n:,} registros…", file=sys.stderr, flush=True)
        elif s.startswith("</Record>"):
            if cur_rec:
                writer(cur_rec[0], REC_HDR).writerow(cur_rec[1])
                cur_rec = None
        elif s.startswith("<Workout "):
            a = dict(attr_re.findall(s))
            cur_wk = {"type": a.get("workoutActivityType", "").replace("HKWorkoutActivityType", ""),
                      "source": html.unescape(a.get("sourceName", "")),
                      "start": a.get("startDate", ""), "end": a.get("endDate", ""),
                      "duration_min": a.get("duration", "")}
        elif cur_wk is not None and s.startswith("<WorkoutStatistics"):
            a = dict(attr_re.findall(s))
            ty = a.get("type", "")
            if ty.endswith("ActiveEnergyBurned"):
                cur_wk["active_kcal"] = a.get("sum")
            elif "Distance" in ty:
                cur_wk["dist_km"] = a.get("sum")
        elif s.startswith("</Workout>") and cur_wk is not None:
            writer("workouts", WK_HDR).writerow([cur_wk.get(k, "") for k in WK_HDR])
            cur_wk = None

if cur_rec:
    writer(cur_rec[0], REC_HDR).writerow(cur_rec[1])
for f in files.values():
    f.close()
print(f"Listo: {n:,} registros en {len(files)} archivos dentro de {OUT}/")

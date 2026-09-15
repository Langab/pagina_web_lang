"""Resume los CSV que genera parse.py: pasos por año, distancia y entrenamientos.

Uso:
    python resumen.py [carpeta_con_csv]

Requiere pandas. Escribe resumen.json y muestra los números en pantalla.
"""
import json
import os
import sys

import pandas as pd

D = sys.argv[1] if len(sys.argv) > 1 else "datos"


def hourly_max(name):
    """iPhone y reloj cuentan los mismos pasos: por cada hora se queda la fuente que más contó."""
    path = os.path.join(D, f"{name}.csv")
    if not os.path.exists(path):
        return pd.Series(dtype=float)
    df = pd.read_csv(path, usecols=["source", "start", "value", "unit"])
    if name == "DistanceWalkingRunning":
        df.loc[df.unit == "mi", "value"] *= 1.60934
    df["hour"] = pd.to_datetime(df.start.str[:13], format="%Y-%m-%d %H")
    return df.groupby(["hour", "source"]).value.sum().groupby("hour").max()


steps = hourly_max("StepCount")
daily = steps.groupby(steps.index.normalize()).sum()
per_year = daily.groupby(daily.index.year)
steps_year = {int(y): int(s.median()) for y, s in per_year if len(s) >= 20}

km = float(hourly_max("DistanceWalkingRunning").sum())

workouts = {}
wk_path = os.path.join(D, "workouts.csv")
if os.path.exists(wk_path):
    w = pd.read_csv(wk_path)
    w["year"] = w.start.str[:4].astype(int)
    w["kind"] = w.type.where(w.type.isin(["Walking", "Cycling", "Running"]), "Other")
    workouts = {int(y): g.kind.value_counts().to_dict() for y, g in w.groupby("year")}

summary = {
    "pasos_totales": int(daily.sum()),
    "km_caminados_o_corridos": round(km),
    "mediana_pasos_diarios_por_anio": steps_year,
    "entrenamientos_por_anio": workouts,
}
with open("resumen.json", "w", encoding="utf-8") as f:
    json.dump(summary, f, ensure_ascii=False, indent=2)

print(f"Pasos totales: {summary['pasos_totales']:,}")
print(f"Kilómetros:    {summary['km_caminados_o_corridos']:,}")
for year, value in steps_year.items():
    print(f"  {year}: {value:,} pasos al día (mediana)")
print("Guardado en resumen.json")

"""
Script para convertir tablita_V2.csv a epea_data.json
Ejecutar con: python convert_csv_to_json.py
"""

import csv
import json
import os
from datetime import date
from collections import OrderedDict

script_dir = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.join(script_dir, 'tablita_V2.csv')
json_path = os.path.join(script_dir, 'epea_data.json')

# Columnas de variables en orden
VAR_COLUMNS = ['Temp', 'Sal', 'NTS', 'OD', 'pH', 'AT', 'Cla', 'ABSO', 'CDOM', 'PP', 'BACT', 'FITO', 'ZOO', 'ICTIO']
MONTH_ORDER = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

# Leer CSV
rows = []
with open(csv_path, 'r', encoding='utf-8-sig') as f:
    reader = csv.DictReader(f)
    for row in reader:
        variables = []
        for var in VAR_COLUMNS:
            val = row.get(var, 'NA').strip()
            if val and val != 'NA':
                variables.append(var)
        
        rows.append({
            'epea_nro': row['EPEA_Nro'].strip(),
            'cruise': row['Cruise'].strip(),
            'year': int(row['Year'].strip()),
            'month_num': row['Month'].strip(),
            'day': row['Day'].strip(),
            'tipo': row['Tipo_visita'].strip(),
            'month_key': row['Month_'].strip(),
            'barco': row['Barco'].strip(),
            'variables': variables
        })

# Agrupar por year + month_key
grouped = {}
for row in rows:
    key = f"{row['year']}-{row['month_key']}"
    if key not in grouped:
        grouped[key] = {
            'year': row['year'],
            'month': row['month_key'],
            'visits': []
        }
    
    # Solo agregar visita si tiene datos (no es fila NA)
    if row['epea_nro'] != 'NA' and row['barco'] != 'NA':
        grouped[key]['visits'].append({
            'barco_code': row['barco'],
            'tipo': row['tipo'],
            'variables': row['variables']
        })

# Obtener rango de años
all_years = sorted(set(r['year'] for r in rows))

# Construir campañas
campañas = []
for year in all_years:
    for month in MONTH_ORDER:
        key = f"{year}-{month}"
        group = grouped.get(key)
        
        if not group or len(group['visits']) == 0:
            campañas.append({
                'year': year,
                'month': month,
                'nro_visitas': None,
                'tipo': 'NA',
                'barcos': [],
                'variables': [],
                'visitas': []
            })
        else:
            visits = group['visits']
            nro_visitas = 'unica' if len(visits) == 1 else 'multiple'
            
            # Tipo general
            tipos = list(dict.fromkeys(v['tipo'] for v in visits))  # unique preserving order
            tipo_general = tipos[0] if len(tipos) == 1 else '_'.join(tipos)
            
            # Barcos
            barcos = [{'code': v['barco_code'], 'tipo': v['tipo']} for v in visits]
            
            # Variables combinadas (unión)
            all_vars = set()
            for v in visits:
                all_vars.update(v['variables'])
            ordered_vars = [v for v in VAR_COLUMNS if v in all_vars]
            
            # Visitas detalladas
            visitas = [{
                'barco': {'code': v['barco_code'], 'tipo': v['tipo']},
                'variables': v['variables']
            } for v in visits]
            
            campañas.append({
                'year': year,
                'month': month,
                'nro_visitas': nro_visitas,
                'tipo': tipo_general,
                'barcos': barcos,
                'variables': ordered_vars,
                'visitas': visitas
            })

# Leer JSON existente para preservar config
with open(json_path, 'r', encoding='utf-8') as f:
    existing = json.load(f)

# Construir JSON final
output = {
    'metadata': {
        'lastUpdated': date.today().isoformat(),
        'yearRange': [all_years[0], all_years[-1]],
        'months': MONTH_ORDER
    },
    'config': existing['config'],
    'campañas': campañas
}

# Escribir JSON
with open(json_path, 'w', encoding='utf-8') as f:
    json.dump(output, f, indent=2, ensure_ascii=False)
    f.write('\n')

print(f"OK - Generado {json_path}")
print(f"   Años: {all_years[0]}-{all_years[-1]}")
print(f"   Total campañas: {len(campañas)}")
print(f"   Con datos: {sum(1 for c in campañas if c['variables'])}")
print(f"   Sin datos: {sum(1 for c in campañas if not c['variables'])}")

// Script para convertir tablita.csv a epea_data.json
// Agrupa filas por año+mes, generando visitas individuales por cada fila

const fs = require('fs');
const path = require('path');

const dataDir = __dirname;
const csvPath = path.join(dataDir, 'tablita.csv');
const jsonPath = path.join(dataDir, 'epea_data.json');

// Leer CSV
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n').filter(line => line.trim());
const headers = lines[0].split(';');

// Leer JSON existente para mantener config
const existingJson = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

// Columnas de variables
const varColumns = ['Temp', 'Sal', 'NTS', 'OD', 'pH', 'AT', 'Cla', 'ABSO', 'CDOM', 'PP', 'BACT', 'FITO', 'ZOO', 'ICTIO'];

// Paso 1: Parsear todas las filas del CSV
const rawRows = [];
for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(';');
    if (values.length < 5) continue;

    const row = {};
    headers.forEach((h, idx) => {
        row[h.trim()] = values[idx] ? values[idx].trim() : '';
    });

    const year = parseInt(row.Year);
    const month = row.Month;
    const nroVisitas = row.Nro_visitas === 'NA' ? null : row.Nro_visitas;
    const tipoVisita = row.Tipo_visita === 'NA' ? 'NA' : row.Tipo_visita;
    const barcoCode = row.Barco && row.Barco !== 'NA' ? row.Barco.trim() : null;

    // Procesar variables de esta fila
    const variables = [];
    varColumns.forEach(varName => {
        const value = row[varName];
        if (value && value !== 'NA') {
            variables.push(value);
        }
    });

    rawRows.push({
        year,
        month,
        nroVisitas,
        tipoVisita,
        barcoCode,
        variables
    });
}

// Paso 2: Agrupar por year+month
const grouped = new Map();
for (const row of rawRows) {
    const key = `${row.year}-${row.month}`;
    if (!grouped.has(key)) {
        grouped.set(key, []);
    }
    grouped.get(key).push(row);
}

// Paso 3: Construir campañas con visitas
const campañas = [];
for (const [key, rows] of grouped) {
    const first = rows[0];

    // Si es NA (sin datos), crear entrada vacía
    if (first.nroVisitas === null && first.tipoVisita === 'NA') {
        campañas.push({
            year: first.year,
            month: first.month,
            nro_visitas: null,
            tipo: 'NA',
            barcos: [],
            variables: [],
            visitas: []
        });
        continue;
    }

    // Construir visitas individuales
    const visitas = [];
    const allBarcos = [];
    const allVariablesSet = new Set();
    const tipos = new Set();

    for (const row of rows) {
        const barco = row.barcoCode ? {
            code: row.barcoCode,
            tipo: row.tipoVisita
        } : null;

        if (barco) {
            allBarcos.push(barco);
        }

        row.variables.forEach(v => allVariablesSet.add(v));
        if (row.tipoVisita !== 'NA') tipos.add(row.tipoVisita);

        visitas.push({
            barco: barco,
            variables: row.variables
        });
    }

    // Determinar tipo combinado
    const tiposArray = [...tipos];
    let tipoCombinado;
    if (tiposArray.length === 1) {
        tipoCombinado = tiposArray[0];
    } else {
        tipoCombinado = tiposArray.join('_');
    }

    campañas.push({
        year: first.year,
        month: first.month,
        nro_visitas: first.nroVisitas,
        tipo: tipoCombinado,
        barcos: allBarcos,
        variables: [...allVariablesSet],  // Unión de todas las variables
        visitas: visitas
    });
}

// Actualizar metadata
const years = campañas.map(c => c.year);
const minYear = Math.min(...years);
const maxYear = Math.max(...years);

existingJson.metadata.yearRange = [minYear, maxYear];
existingJson.metadata.lastUpdated = new Date().toISOString().split('T')[0];

// Reemplazar campañas
existingJson.campañas = campañas;

// Guardar
fs.writeFileSync(jsonPath, JSON.stringify(existingJson, null, 2), 'utf-8');

console.log('✅ Conversión completada!');
console.log(`   - Campañas (meses únicos): ${campañas.length}`);
console.log(`   - Rango de años: ${minYear} - ${maxYear}`);
console.log(`   - Archivo guardado: ${jsonPath}`);

// Mostrar ejemplo con múltiples visitas
const ejemplo = campañas.find(c => c.visitas.length > 1);
if (ejemplo) {
    console.log('\n📋 Ejemplo de campaña con múltiples visitas:');
    console.log(JSON.stringify(ejemplo, null, 2));
}

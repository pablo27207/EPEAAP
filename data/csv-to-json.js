// Script para convertir tablita.csv a epea_Data.json
// Con estructura de barcos que incluye tipo individual por cada barco

const fs = require('fs');
const path = require('path');

const dataDir = __dirname;
const csvPath = path.join(dataDir, 'tablita.csv');
const jsonPath = path.join(dataDir, 'epea_Data.json');

// Leer CSV
const csvContent = fs.readFileSync(csvPath, 'utf-8');
const lines = csvContent.split('\n').filter(line => line.trim());
const headers = lines[0].split(';');

// Leer JSON existente para mantener config
const existingJson = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));

// Columnas de variables
const varColumns = ['Temp', 'Sal', 'NTS', 'OD', 'pH', 'AT', 'Cla', 'ABSO', 'CDOM', 'PP', 'BACT', 'FITO', 'ZOO', 'ICTIO'];

// Procesar cada fila
const campañas = [];

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
    const tipo = row.Tipo_visita === 'NA' ? 'NA' : row.Tipo_visita;

    // Procesar barcos con tipos individuales
    const barcos = [];
    if (row.Barco && row.Barco !== 'NA') {
        const barcosCodes = row.Barco.split('-').map(b => b.trim());
        const tiposVisita = (row.Tipo_visita || '').split('_').map(t => t.trim());

        barcosCodes.forEach((barcoCode, idx) => {
            // Determinar tipo individual
            let tipoIndividual;
            if (tiposVisita.length === 1) {
                tipoIndividual = tiposVisita[0];
            } else if (idx < tiposVisita.length) {
                tipoIndividual = tiposVisita[idx];
            } else {
                tipoIndividual = tiposVisita[tiposVisita.length - 1];
            }

            barcos.push({
                code: barcoCode,
                tipo: tipoIndividual
            });
        });
    }

    // Procesar variables
    const variables = [];
    varColumns.forEach(varName => {
        const value = row[varName];
        if (value && value !== 'NA') {
            variables.push(value);
        }
    });

    campañas.push({
        year,
        month,
        nro_visitas: nroVisitas,
        tipo,
        barcos,
        variables
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
console.log(`   - Campañas procesadas: ${campañas.length}`);
console.log(`   - Rango de años: ${minYear} - ${maxYear}`);
console.log(`   - Archivo guardado: ${jsonPath}`);

// Mostrar ejemplo de la nueva estructura
const ejemplo = campañas.find(c => c.barcos.length > 1);
if (ejemplo) {
    console.log('\n📋 Ejemplo de nueva estructura (campaña con múltiples barcos):');
    console.log(JSON.stringify(ejemplo, null, 2));
}

import { getBrushIcon } from './icons.js';

/**
 * Construye el HTML para las etiquetas de parámetros agrupadas por familia.
 * @param {Object} familyGroups - Objeto con familias y sus arrays de parámetros
 * @param {Object} campaña - Datos de la campaña actual
 * @param {string} side - Lado de visualización ('left' o 'right')
 * @param {Object} config - Configuración global (colores, nombres)
 * @param {string} lang - Idioma actual ('es' o 'en')
 * @param {Object} t - Traducciones
 * @returns {string} - HTML generado
 */
export function buildGroupedLabels(familyGroups, campaña, side, config, lang = 'es', t = {}) {
    const { parametros, familias, barcos } = config;
    let html = '';

    Object.entries(familyGroups).forEach(([familiaKey, paramIds]) => {
        const familiaConfig = familias[familiaKey];
        if (!familiaConfig) return;

        // Solo mostrar familia si tiene al menos un parámetro activo
        const famParams = paramIds.map(id => ({
            id,
            config: parametros[id],
            isActive: campaña.variables.includes(parametros[id]?.key)
        })).filter(p => p.config);

        if (famParams.length === 0) return;

        // Limpiar título y traducir
        let familyName = lang === 'en' ? (familiaConfig.nombre_en || familiaConfig.nombre) : familiaConfig.nombre;
        // Limpiar "PROPIEDADES " solo para español si está presente, o limpieza genérica para inglés
        if (lang === 'es') {
            familyName = familyName.replace(/^PROPIEDADES\s+/i, '');
        } else {
            familyName = familyName.replace(/Properties/i, '').trim();
        }

        html += `<div class="family-group" data-familia="${familiaKey}">`;
        html += `<div class="family-header">${familyName}</div>`;
        html += `<div class="family-params">`;

        famParams.forEach(({ id, config: paramConfig, isActive }) => {
            html += createLabelHTML(id, paramConfig, isActive, lang);
        });

        html += `</div></div>`;
    });

    // Agregar buques de investigación solo en el lado derecho
    if (side === 'right' && campaña.barcos && campaña.barcos.length > 0) {
        const shipsTitle = t.shipsTitle || 'BUQUES DE INVESTIGACIÓN';

        // Etiquetas para tipos de visita (elimina mixed que no se usa)
        const visitTypeLabels = t.visitType || { directed: 'Dirigida', opportunistic: 'Oportunista' };

        // Función para obtener etiqueta del tipo individual de cada barco
        const getShipTypeLabel = (tipoBarco) => {
            const tipoLower = (tipoBarco || '').toLowerCase();
            if (tipoLower.includes('propia') || tipoLower.includes('dirigida')) {
                return visitTypeLabels.directed;
            } else if (tipoLower.includes('oportunista')) {
                return visitTypeLabels.opportunistic;
            }
            return '';
        };

        html += `<div class="ships-section">`;
        html += `<h4>${shipsTitle}</h4>`;

        campaña.barcos.forEach(barcoItem => {
            // Soportar ambos formatos: nuevo (objeto con code y tipo) y antiguo (string)
            const barcoCode = typeof barcoItem === 'object' ? barcoItem.code : barcoItem;
            const barcoTipo = typeof barcoItem === 'object' ? barcoItem.tipo : campaña.tipo;

            const barco = barcos[barcoCode];
            if (barco) {
                // Determinar si este barco específico es dirigido
                const isDirected = barcoTipo && (
                    barcoTipo.toLowerCase().includes('propia') ||
                    barcoTipo.toLowerCase().includes('dirigida')
                );

                const shipTypeLabel = getShipTypeLabel(barcoTipo);

                html += `
                    <div class="ship-item" data-ship-id="${barcoCode}">
                        <span class="ship-color ${isDirected ? 'directed' : ''}" style="background: ${barco.color}"></span>
                        <span class="ship-name">${barco.nombre}</span>
                        <span class="ship-type-badge">${shipTypeLabel}</span>
                    </div>
                `;
            }
        });
        html += '</div>';
    }

    // Agregar contenedor de descripción en el lado izquierdo
    if (side === 'left') {
        html += '<div id="param-description" class="param-description"></div>';
    }

    return html;
}

/**
 * Genera el HTML para una etiqueta individual de parámetro.
 * @param {string} paramId - ID del parámetro
 * @param {Object} paramConfig - Configuración del parámetro
 * @param {boolean} isActive - Si el parámetro está activo en la campaña
 * @param {string} lang - Idioma actual
 * @returns {string} - HTML de la etiqueta
 */
function createLabelHTML(paramId, paramConfig, isActive, lang = 'es') {
    // Caso especial para PP: usar patrón de puntos triangulares
    const isPP = paramId === 'parametro-pp';
    let colorIndicator;

    if (isPP) {
        colorIndicator = `<span class="param-color pp-indicator"></span>`;
    } else {
        colorIndicator = `
            <div class="param-color-wrapper">
                ${getBrushIcon(paramConfig.color)}
            </div>
        `;
    }

    const paramName = lang === 'en' ? (paramConfig.nombre_en || paramConfig.nombre) : paramConfig.nombre;

    return `
        <div class="param-label ${isActive ? '' : 'inactive'}" 
             data-param-id="${paramId}" 
             data-familia="${paramConfig.familia}"
             data-active="${isActive}">
            ${colorIndicator}
            <span class="param-name">${paramName}</span>
        </div>
    `;
}

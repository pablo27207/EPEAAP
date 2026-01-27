import { BRUSH_PATH_DATA } from './constants.js';

export function buildGroupedLabels(familyGroups, campaña, side, config, lang = 'es', t = {}) {
    const { parametros, familias, barcos } = config;
    let html = '';

    Object.entries(familyGroups).forEach(([familiaKey, paramIds]) => {
        const familiaConfig = familias[familiaKey];
        if (!familiaConfig) return;

        // Solo mostrar familia si tiene al menos un parámetro
        const famParams = paramIds.map(id => ({
            id,
            config: parametros[id],
            isActive: campaña.variables.includes(parametros[id]?.key)
        })).filter(p => p.config);

        if (famParams.length === 0) return;

        // Limpiar título y traducir
        let familyName = lang === 'en' ? (familiaConfig.nombre_en || familiaConfig.nombre) : familiaConfig.nombre;
        // Clean "PROPIEDADES " only for Spanish if present, or generic cleaning. 
        // English names are "Physical Properties", maybe they want "Physical".
        // Spanish logic was to remove "PROPIEDADES ".
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

        html += `<div class="ships-section"><h4>${shipsTitle}</h4>`;

        // Determinar si es visita dirigida (tiene punto)
        const isDirected = campaña.tipo && (
            campaña.tipo.toLowerCase().includes('propia') ||
            campaña.tipo.toLowerCase().includes('dirigida')
        );

        campaña.barcos.forEach(barcoKey => {
            const barco = barcos[barcoKey];
            if (barco) {
                html += `
                    <div class="ship-item" data-ship-id="${barcoKey}">
                        <span class="ship-color ${isDirected ? 'directed' : ''}" style="background: ${barco.color}"></span>
                        <span class="ship-name">${barco.nombre}</span>
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

function createLabelHTML(paramId, paramConfig, isActive, lang = 'es') {
    // Caso especial para PP: usar patrón de puntos triangulares
    const isPP = paramId === 'parametro-pp';
    let colorIndicator;

    if (isPP) {
        colorIndicator = `<span class="param-color pp-indicator"></span>`;
    } else {
        colorIndicator = `
            <div class="param-color-wrapper">
                <svg class="param-color-svg brush-svg" viewBox="0 0 35 15" preserveAspectRatio="xMidYMid meet">
                    <g transform="translate(-525, -495)">
                        <path d="${BRUSH_PATH_DATA}" fill="${paramConfig.color}" />
                    </g>
                </svg>
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

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



        // Labels para tipos de visita
        const visitTypeLabels = t.visitType || { directed: 'Dirigida', opportunistic: 'Oportunista', mixed: 'Dirigida + Oportunista' };

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

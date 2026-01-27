/**
 * Interactions Module
 * Handles user interactions (hover, click) and SVG highlighting
 */

export function setupLabelInteractions(config, lang = 'es') {
    document.querySelectorAll('.param-label[data-active="true"]').forEach(label => {
        label.addEventListener('mouseenter', () => {
            highlightWithFamily(label.dataset.paramId, label.dataset.familia, true, config, lang);
        });
        label.addEventListener('mouseleave', () => {
            highlightWithFamily(label.dataset.paramId, label.dataset.familia, false, config, lang);
        });
    });
}

export function setupShipInteractions(config, lang = 'es') {
    const descContainer = document.getElementById('param-description');
    const { barcos } = config;

    document.querySelectorAll('.ship-item').forEach(item => {
        item.addEventListener('mouseenter', () => {
            const shipId = item.dataset.shipId;
            const barcoConfig = barcos[shipId];

            if (descContainer && barcoConfig) {
                const desc = lang === 'en' ? (barcoConfig.descripcion_en || barcoConfig.descripcion) : barcoConfig.descripcion;
                if (desc) {
                    descContainer.textContent = desc;
                    descContainer.classList.add('visible');
                }
            }
        });

        item.addEventListener('mouseleave', () => {
            if (descContainer) {
                descContainer.textContent = '';
                descContainer.classList.remove('visible');
            }
        });
    });
}

/**
 * Resalta con dos niveles:
 * - Nivel 1 (familia): parámetros de la misma familia semi-resaltados
 * - Nivel 2 (específico): el parámetro seleccionado completamente resaltado
 */
function highlightWithFamily(paramId, familia, highlight, config, lang = 'es') {
    const svg = document.getElementById('modal-epea-svg');
    const { parametros } = config;

    if (!svg) return;

    if (highlight) {
        // Clase para el estado activo del SVG
        svg.classList.add('highlighting-active');

        // Identificar elementos a resaltar (Nivel 1 y 2)
        const familyParamIds = Object.entries(parametros)
            .filter(([id, paramConfig]) => paramConfig.familia === familia)
            .map(([id]) => id);

        // Limpiar clases previas
        clearSvgHighlights(svg);

        // Aplicar estado 'dimmed' (atenuado) a TODOS los paths relevantes primero
        // Seleccionamos solo PATHs para evitar bordes de grupos
        const allPaths = svg.querySelectorAll('path[id^="param-"], path[id^="parametro-"], g[id^="param-"] path, g[id^="parametro-"] path');
        allPaths.forEach(el => el.classList.add('svg-dimmed'));

        // NIVEL 1: Resaltar familia (quitar dimmed, agregar family-active)
        familyParamIds.forEach(fpId => {
            // Buscar por ID directo en path o grupo contenedor
            const elements = svg.querySelectorAll(`#${fpId}, #${fpId} path`);
            elements.forEach(el => {
                if (el.tagName.toLowerCase() === 'path') {
                    el.classList.remove('svg-dimmed');
                    el.classList.add('svg-family-highlight');
                }
            });

            // Resaltar etiqueta HTML
            const familyLabel = document.querySelector(`.param-label[data-param-id="${fpId}"]`);
            if (familyLabel && !familyLabel.classList.contains('inactive')) {
                familyLabel.classList.add('family-highlighted');
            }
        });

        // NIVEL 2: Resaltar parámetro específico (quitar family, agregar specific-active)
        const targetElements = svg.querySelectorAll(`#${paramId}, #${paramId} path`);
        targetElements.forEach(el => {
            if (el.tagName.toLowerCase() === 'path') {
                el.classList.remove('svg-dimmed', 'svg-family-highlight');
                el.classList.add('svg-highlighted');
            }
        });

        const label = document.querySelector(`.param-label[data-param-id="${paramId}"]`);
        if (label) {
            label.classList.remove('family-highlighted');
            label.classList.add('highlighted');
        }

        // Mostrar descripción si existe
        const descContainer = document.getElementById('param-description');
        const paramConfig = parametros[paramId];
        if (descContainer && paramConfig) {
            const desc = lang === 'en' ? (paramConfig.descripcion_en || paramConfig.descripcion) : paramConfig.descripcion;
            if (desc) {
                descContainer.textContent = desc;
                descContainer.classList.add('visible');
            }
        }

    } else {
        svg.classList.remove('highlighting-active');
        clearSvgHighlights(svg);

        document.querySelectorAll('.param-label').forEach(label => {
            label.classList.remove('highlighted', 'family-highlighted');
        });

        // Ocultar descripción
        const descContainer = document.getElementById('param-description');
        if (descContainer) {
            descContainer.textContent = '';
            descContainer.classList.remove('visible');
        }
    }
}

function clearSvgHighlights(svg) {
    const all = svg.querySelectorAll('.svg-dimmed, .svg-family-highlight, .svg-highlighted');
    all.forEach(el => el.classList.remove('svg-dimmed', 'svg-family-highlight', 'svg-highlighted'));
}

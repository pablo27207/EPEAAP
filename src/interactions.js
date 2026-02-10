/**
 * Módulo de Interacciones
 * Maneja las interacciones del usuario (hover, click) y el resaltado de SVGs
 */

/**
 * Configura los eventos de mouse (hover) para las etiquetas de parámetros.
 * @param {Object} config - Configuración global
 * @param {string} lang - Idioma actual
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

/**
 * Configura los eventos de mouse para las etiquetas de barcos (mostrar descripción).
 * @param {Object} config - Configuración global
 * @param {string} lang - Idioma actual
 */
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
 * Resalta los SVGs según el parámetro seleccionado y su familia.
 * @param {string} paramId - ID del parámetro seleccionado
 * @param {string} familia - ID de la familia del parámetro
 * @param {boolean} highlight - true para resaltar, false para limpiar
 * @param {Object} config - Configuración global
 * @param {string} lang - Idioma actual
 */
function highlightWithFamily(paramId, familia, highlight, config, lang = 'es') {
    // Buscar todos los SVGs del modal (modo disco único o multi-disco)
    const svgs = getModalSvgs();
    const { parametros } = config;

    if (svgs.length === 0) return;

    if (highlight) {
        // Identificar parámetros de la familia
        const familyParamIds = Object.entries(parametros)
            .filter(([id, paramConfig]) => paramConfig.familia === familia)
            .map(([id]) => id);

        // Aplicar highlighting a TODOS los SVGs
        svgs.forEach(svg => {
            svg.classList.add('highlighting-active');
            clearSvgHighlights(svg);

            // Atenuado: atenuar todos los paths paramétricos
            const allPaths = svg.querySelectorAll('path[id^="param-"], path[id^="parametro-"], g[id^="param-"] path, g[id^="parametro-"] path');
            allPaths.forEach(el => el.classList.add('svg-dimmed'));

            // NIVEL 1: Resaltar familia
            familyParamIds.forEach(fpId => {
                const elements = svg.querySelectorAll(`#${fpId}, #${fpId} path`);
                elements.forEach(el => {
                    if (el.tagName.toLowerCase() === 'path') {
                        el.classList.remove('svg-dimmed');
                        el.classList.add('svg-family-highlight');
                    }
                });
            });

            // NIVEL 2: Resaltar parámetro específico
            const targetElements = svg.querySelectorAll(`#${paramId}, #${paramId} path`);
            targetElements.forEach(el => {
                if (el.tagName.toLowerCase() === 'path') {
                    el.classList.remove('svg-dimmed', 'svg-family-highlight');
                    el.classList.add('svg-highlighted');
                }
            });
        });

        // Resaltar etiquetas HTML de la familia
        familyParamIds.forEach(fpId => {
            const familyLabel = document.querySelector(`.param-label[data-param-id="${fpId}"]`);
            if (familyLabel && !familyLabel.classList.contains('inactive')) {
                familyLabel.classList.add('family-highlighted');
            }
        });

        const label = document.querySelector(`.param-label[data-param-id="${paramId}"]`);
        if (label) {
            label.classList.remove('family-highlighted');
            label.classList.add('highlighted');
        }

        // Mostrar descripción
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
        svgs.forEach(svg => {
            svg.classList.remove('highlighting-active');
            clearSvgHighlights(svg);
        });

        document.querySelectorAll('.param-label').forEach(label => {
            label.classList.remove('highlighted', 'family-highlighted');
        });

        const descContainer = document.getElementById('param-description');
        if (descContainer) {
            descContainer.textContent = '';
            descContainer.classList.remove('visible');
        }
    }
}

/**
 * Busca todos los elementos SVG de campaña en el modal (modo disco único o multi-disco).
 * @returns {Array<SVGElement>} - Array de elementos SVG encontrados
 */
function getModalSvgs() {
    // Intentar disco único primero
    const single = document.getElementById('modal-epea-svg');
    if (single) return [single];

    // Multi-disco: buscar todos los modal-epea-svg-N
    const multi = document.querySelectorAll('[id^="modal-epea-svg-"]');
    return [...multi];
}

/**
 * Limpia todas las clases de resaltado de un SVG dado.
 * @param {SVGElement} svg - Elemento SVG a limpiar
 */
function clearSvgHighlights(svg) {
    const all = svg.querySelectorAll('.svg-dimmed, .svg-family-highlight, .svg-highlighted');
    all.forEach(el => el.classList.remove('svg-dimmed', 'svg-family-highlight', 'svg-highlighted'));
}


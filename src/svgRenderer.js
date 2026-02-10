/**
 * EPEAAPV2 - SVG Renderer
 * Renderiza círculos EPEA usando completo_organizado.svg como plantilla
 */

/**
 * Renderiza un círculo SVG según los datos de campaña
 * @param {SVGElement} svgTemplate - Template SVG clonado
 * @param {Object} campaña - Datos de la campaña
 * @param {Object} config - Configuración de parámetros y barcos desde JSON
 * @returns {SVGElement} - SVG configurado
 */
function renderCircle(svgTemplate, campaña, config) {
    const svg = svgTemplate.cloneNode(true);

    // Si no hay datos (NA), ocultar todo excepto estructura
    if (!campaña.variables || campaña.variables.length === 0) {
        // Ocultar todos los parámetros
        Object.keys(config.parametros).forEach(paramId => {
            svg.style.setProperty(`--ver-${paramId}`, 0);
        });
        // Ocultar ojos
        [1, 2, 3].forEach(i => {
            svg.style.setProperty(`--ver-ojo-${i}`, 0);
            svg.style.setProperty(`--ver-pupila-${i}`, 0);
        });
        return svg;
    }

    // 1. Configurar visibilidad de parámetros según variables presentes
    Object.entries(config.parametros).forEach(([paramId, paramConfig]) => {
        const visible = campaña.variables.includes(paramConfig.key) ? 1 : 0;
        svg.style.setProperty(`--ver-${paramId}`, visible);
    });

    // 2. Configurar ojos según barcos
    const barcos = campaña.barcos || [];
    [1, 2, 3].forEach(i => {
        if (i <= barcos.length) {
            // Soportar ambos formatos: objeto {code, tipo} y string
            const barcoItem = barcos[i - 1];
            const barcoCode = typeof barcoItem === 'object' ? barcoItem.code : barcoItem;
            const barcoTipo = typeof barcoItem === 'object' ? barcoItem.tipo : campaña.tipo;
            const barcoConfig = config.barcos[barcoCode];

            svg.style.setProperty(`--ver-ojo-${i}`, 1);

            // Cambiar color del ojo
            const ellipse = svg.querySelector(`#ojo-${i} ellipse`);
            if (ellipse && barcoConfig) {
                ellipse.style.fill = barcoConfig.color;
                ellipse.setAttribute('data-color', barcoConfig.color);
            }

            // 3. Configurar pupila por barco según su tipo individual
            // Propia/Dirigida = con pupila, Oportunista = sin pupila
            const tipoLower = (barcoTipo || '').toLowerCase();
            const conPupila = tipoLower.includes('propia') || tipoLower.includes('dirigida') ? 1 : 0;
            svg.style.setProperty(`--ver-pupila-${i}`, conPupila);
        } else {
            svg.style.setProperty(`--ver-ojo-${i}`, 0);
            svg.style.setProperty(`--ver-pupila-${i}`, 0);
        }
    });

    return svg;
}

/**
 * Carga el template SVG desde un archivo
 * @param {string} url - URL del archivo SVG
 * @returns {Promise<SVGElement>} - Elemento SVG
 */
async function loadSVGTemplate(url) {
    const response = await fetch(url);
    const text = await response.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(text, 'image/svg+xml');
    return doc.documentElement;
}

export { renderCircle, loadSVGTemplate };

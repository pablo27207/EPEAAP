/**
 * EPEAAPV2 - Lógica Principal de la Aplicación
 * Orquesta la carga de datos, inicialización de UI y manejo de eventos.
 */

import { renderCircle, loadSVGTemplate } from './svgRenderer.js';
import { buildGroupedLabels } from './uiBuilder.js';
import { setupLabelInteractions, setupShipInteractions } from './interactions.js';
import { translations } from './translations.js';

let svgTemplate = null;
let epeaData = null;
let currentLanguage = 'es';
let currentCampaña = null; // Almacena la campaña actual para re-renderizar el modal

// Parámetros agrupados por familia para cada lado
const LEFT_FAMILIES = {
    'fisicas': ['param-temperatura', 'param-salinidad'],
    'biogeoquimicas': ['param-oxigeno', 'param-nutrientes', 'param-carbonatos'],
    'bioopticas': ['param-clorofila', 'param-absorcion-particulado', 'param-CDOM']
};

const RIGHT_FAMILIES = {
    'biologicas': ['param-fitoplancton', 'param-zooplankton', 'param-ictioplankton', 'param-bacterioplankton', 'parametro-pp']
};

/**
 * Inicializa la aplicación: carga datos y configura la UI.
 */
async function init() {
    try {
        const [dataResponse, template] = await Promise.all([
            fetch('./data/epea_data.json'),
            loadSVGTemplate('./assets/img/completo_organizado.svg')
        ]);

        epeaData = await dataResponse.json();
        svgTemplate = template;

        // Configurar selectores de idioma
        setupLanguageControls();

        // Calcular años y texto inicial
        updateUITexts();

        generateGrid();
        setupModal();
        animateOnLoad();

    } catch (error) {
        console.error('Error inicializando:', error);
        document.getElementById('grid-container').innerHTML =
            '<p class="error">Error cargando datos. Verifica la consola.</p>';
    }
}

/**
 * Configura los manejadores de eventos para los botones de idioma.
 */
function setupLanguageControls() {
    const btns = document.querySelectorAll('.lang-btn');
    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.dataset.lang;
            if (lang !== currentLanguage) {
                setLanguage(lang);
            }
        });
    });
}

/**
 * Cambia el idioma actual y actualiza la interfaz.
 * @param {string} lang - Código de idioma ('es' o 'en')
 */
function setLanguage(lang) {
    currentLanguage = lang;

    // Actualizar estado del botón activo
    document.querySelectorAll('.lang-btn').forEach(btn => {
        if (btn.dataset.lang === lang) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    // Actualizar textos estáticos
    updateUITexts();

    // Re-renderizar grilla (para encabezados de mes)
    generateGrid();

    // Re-renderizar modal si está abierto
    const modal = document.getElementById('modal');
    if (modal && !modal.classList.contains('hidden') && currentCampaña) {
        // Re-renderizado simple sin animación
        renderModalContent(currentCampaña);
    }
}

/**
 * Actualiza los textos estáticos de la interfaz según el idioma.
 */
function updateUITexts() {
    const t = translations[currentLanguage];

    // Encabezado
    const h1 = document.querySelector('header h1');
    // Preservar span si es posible, o reconstruir

    if (currentLanguage === 'es') {
        h1.innerHTML = `${t.headerTitle} <span class="coordinates">(EPEA, 38°28′ S - 57°41′ O)</span>`;
    } else {
        h1.innerHTML = `${t.headerTitle} <span class="coordinates">(EPEA, 38°28′ S - 57°41′ W)</span>`;
    }
    // Subtítulo
    const { yearRange } = epeaData.metadata;
    const years = yearRange[1] - yearRange[0] + 1;
    const subtitleEl = document.getElementById('main-subtitle');

    if (currentLanguage === 'es') {
        subtitleEl.innerHTML = `Este recorrido brinda contexto sobre las visitas y la información recolectada durante ${years} años<br>a una de las series temporales ecológicas marinas más longevas del Atlántico Sudoccidental.`;
    } else {
        subtitleEl.innerHTML = `This visualization provides insight into the visits and information gathered over ${years} years<br>to one of the longest-running marine ecological time series in the Southwestern Atlantic.`;
    }
}

/**
 * Ejecuta las animaciones de entrada al cargar la página.
 */
function animateOnLoad() {
    anime({
        targets: 'header h1',
        opacity: [0, 1],
        translateY: [-30, 0],
        duration: 1000,
        easing: 'easeOutExpo'
    });

    anime({
        targets: 'header .subtitle',
        opacity: [0, 1],
        translateY: [-20, 0],
        duration: 800,
        delay: 200,
        easing: 'easeOutExpo'
    });

    const cells = document.querySelectorAll('.data-cell.has-data');
    anime({
        targets: cells,
        opacity: [0, 1],
        scale: [0.5, 1],
        delay: anime.stagger(15, { grid: [12, 25], from: 'first' }),
        duration: 600,
        easing: 'easeOutElastic(1, .8)'
    });
}

/**
 * Genera la grilla principal de campañas (años x meses).
 */
function generateGrid() {
    const container = document.getElementById('grid-container');
    container.innerHTML = ''; // Limpiar existente

    const { yearRange } = epeaData.metadata;
    const t = translations[currentLanguage];

    const headerRow = document.createElement('div');
    headerRow.className = 'grid-row header';
    headerRow.innerHTML = '<div class="cell year-cell"></div>';

    t.months.forEach(month => {
        const cell = document.createElement('div');
        cell.className = 'cell month-header';
        cell.textContent = month;
        headerRow.appendChild(cell);
    });
    container.appendChild(headerRow);

    // Mapa auxiliar para coincidir claves de mes de datos (siempre es) con índice de visualización
    const monthKeys = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

    for (let year = yearRange[0]; year <= yearRange[1]; year++) {
        const row = document.createElement('div');
        row.className = 'grid-row';

        const yearCell = document.createElement('div');
        yearCell.className = 'cell year-cell';
        yearCell.textContent = year;
        row.appendChild(yearCell);

        monthKeys.forEach((monthKey, index) => {
            const cell = document.createElement('div');
            cell.className = 'cell data-cell';
            cell.dataset.year = year;
            cell.dataset.month = monthKey;

            const campaña = epeaData.campañas.find(
                c => c.year === year && c.month === monthKey
            );

            if (campaña && campaña.variables && campaña.variables.length > 0) {
                const svg = renderCircle(svgTemplate, campaña, epeaData.config);
                svg.classList.add('epea-circle');
                cell.appendChild(svg);
                cell.classList.add('has-data');

                cell.addEventListener('mouseenter', () => animateCellHover(cell, true));
                cell.addEventListener('mouseleave', () => animateCellHover(cell, false));
                cell.addEventListener('click', () => openModal(campaña));
            } else {
                // Renderizar solo el círculo exterior (sin líneas internas)
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.setAttribute('viewBox', '0 0 64 64');
                svg.classList.add('epea-circle');
                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', '32');
                circle.setAttribute('cy', '32');
                circle.setAttribute('r', '30');
                circle.setAttribute('fill', 'none');
                circle.setAttribute('stroke', '#000000');
                circle.setAttribute('stroke-width', '0.8');
                svg.appendChild(circle);
                cell.appendChild(svg);
                cell.classList.add('no-data');
                cell.title = currentLanguage === 'es' ? 'No visitado' : 'Not visited';
            }

            row.appendChild(cell);
        });

        container.appendChild(row);
    }
}

/**
 * Anima una celda de la grilla al pasar el mouse.
 * @param {HTMLElement} cell - Elemento de la celda
 * @param {boolean} isEntering - true si el mouse entra, false si sale
 */
function animateCellHover(cell, isEntering) {
    anime.remove(cell);
    anime({
        targets: cell,
        scale: isEntering ? 1.8 : 1,
        duration: isEntering ? 300 : 400,
        easing: isEntering ? 'easeOutBack' : 'easeOutElastic(1, .6)'
    });
}

/**
 * Configura los eventos globales del modal (cerrar).
 */
function setupModal() {
    const closeBtn = document.getElementById('modal-close');
    const overlay = document.getElementById('modal-overlay');

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

/**
 * Abre el modal con los detalles de una campaña específica.
 * @param {Object} campaña - Datos de la campaña a mostrar
 */
function openModal(campaña) {
    currentCampaña = campaña;
    const modal = document.getElementById('modal');

    renderModalContent(campaña);

    modal.classList.remove('hidden');

    // Animaciones
    anime({
        targets: '.modal-overlay',
        opacity: [0, 1],
        duration: 300,
        easing: 'easeOutQuad'
    });

    anime({
        targets: '.modal-content',
        opacity: [0, 1],
        scale: [0.95, 1],
        duration: 350,
        easing: 'easeOutQuad'
    });

    anime({
        targets: '.modal-svg svg',
        scale: [0.9, 1],
        opacity: [0, 1],
        duration: 500,
        easing: 'easeOutQuad'
    });

    anime({
        targets: '.family-group',
        opacity: [0, 1],
        translateX: (el) => el.closest('.modal-labels-left') ? [-20, 0] : [20, 0],
        delay: anime.stagger(60, { start: 100 }),
        duration: 300,
        easing: 'easeOutQuad'
    });
}

/**
 * Renderiza el contenido interno del modal (títulos, diagrama, etiquetas).
 * @param {Object} campaña - Datos de la campaña
 */
function renderModalContent(campaña) {
    const titleEl = document.getElementById('modal-title');
    const subtitleEl = document.getElementById('modal-subtitle');
    const diagramContainer = document.getElementById('modal-diagram');
    const labelsLeft = document.getElementById('modal-labels-left');
    const labelsRight = document.getElementById('modal-labels-right');

    // Mapeo completo de nombres de meses
    const fullMonths = {
        es: { 'ene': 'Enero', 'feb': 'Febrero', 'mar': 'Marzo', 'abr': 'Abril', 'may': 'Mayo', 'jun': 'Junio', 'jul': 'Julio', 'ago': 'Agosto', 'sep': 'Septiembre', 'oct': 'Octubre', 'nov': 'Noviembre', 'dic': 'Diciembre' },
        en: { 'ene': 'January', 'feb': 'February', 'mar': 'March', 'abr': 'April', 'may': 'May', 'jun': 'June', 'jul': 'July', 'ago': 'August', 'sep': 'September', 'oct': 'October', 'nov': 'November', 'dic': 'December' }
    };

    const monthName = fullMonths[currentLanguage][campaña.month];
    titleEl.textContent = `${monthName} ${campaña.year}`;
    subtitleEl.textContent = '';

    // Agregar o actualizar etiqueta "Propiedades estudiadas" debajo del divisor
    const modalContent = document.querySelector('.modal-content');
    let propsLabel = document.getElementById('modal-props-label');
    if (!propsLabel) {
        propsLabel = document.createElement('p');
        propsLabel.id = 'modal-props-label';
        propsLabel.className = 'modal-props-label';
        const modalBody = document.querySelector('.modal-body');
        modalContent.insertBefore(propsLabel, modalBody);
    }
    propsLabel.textContent = currentLanguage === 'en' ? 'STUDIED PROPERTIES' : 'PROPIEDADES ESTUDIADAS';

    // Limpiar área del diagrama
    diagramContainer.innerHTML = '';

    const visitas = campaña.visitas || [];
    const hasMultipleVisits = visitas.length > 1;

    if (hasMultipleVisits) {
        // Modo multi-disco: renderizar discos individuales por visita
        diagramContainer.classList.add('multi-disc');


        visitas.forEach((visita, index) => {
            const discWrapper = document.createElement('div');
            discWrapper.className = 'disc-wrapper';

            // Crear campaña por visita para renderizado de SVG (barco único, variables específicas de la visita)
            const visitCampaña = {
                year: campaña.year,
                month: campaña.month,
                nro_visitas: 'unica',
                tipo: visita.barco ? visita.barco.tipo : 'NA',
                barcos: visita.barco ? [visita.barco] : [],
                variables: visita.variables
            };

            const svgWrapper = document.createElement('div');
            svgWrapper.className = 'modal-svg';
            const svg = renderCircle(svgTemplate, visitCampaña, epeaData.config);
            svg.setAttribute('id', `modal-epea-svg-${index}`);
            svg.classList.add('modal-visit-svg');
            svgWrapper.appendChild(svg);
            discWrapper.appendChild(svgWrapper);

            diagramContainer.appendChild(discWrapper);
        });
    } else {
        // Modo disco único: renderizar como antes
        diagramContainer.classList.remove('multi-disc');

        const svgWrapper = document.createElement('div');
        svgWrapper.className = 'modal-svg';
        svgWrapper.id = 'modal-svg';
        const svg = renderCircle(svgTemplate, campaña, epeaData.config);
        svg.setAttribute('id', 'modal-epea-svg');
        svgWrapper.appendChild(svg);
        diagramContainer.appendChild(svgWrapper);
    }

    // Etiquetas con idioma (usar siempre datos combinados de campaña, incluyendo barcos en panel derecho)
    labelsLeft.innerHTML = buildGroupedLabels(LEFT_FAMILIES, campaña, 'left', epeaData.config, currentLanguage, translations[currentLanguage]);
    labelsRight.innerHTML = buildGroupedLabels(RIGHT_FAMILIES, campaña, 'right', epeaData.config, currentLanguage, translations[currentLanguage]);

    setTimeout(() => {
        setupLabelInteractions(epeaData.config, currentLanguage);
        setupShipInteractions(epeaData.config, currentLanguage);
    }, 50);
}

/**
 * Cierra el modal con animación.
 */
function closeModal() {
    currentCampaña = null;
    anime({
        targets: '.modal-content',
        opacity: [1, 0],
        scale: [1, 0.95],
        duration: 200,
        easing: 'easeInQuad'
    });

    anime({
        targets: '.modal-overlay',
        opacity: [1, 0],
        duration: 250,
        easing: 'easeInQuad',
        complete: () => {
            document.getElementById('modal').classList.add('hidden');
        }
    });
}

document.addEventListener('DOMContentLoaded', init);

/**
 * EPEAAPV2 - Main Application Logic
 * Orchestrates data loading, UI initialization, and event handling.
 */

import { renderCircle, loadSVGTemplate } from './svgRenderer.js';
import { buildGroupedLabels } from './uiBuilder.js';
import { setupLabelInteractions, setupShipInteractions } from './interactions.js';
import { translations } from './translations.js';

let svgTemplate = null;
let epeaData = null;
let currentLanguage = 'es';
let currentCampaña = null; // Store current campaign for re-rendering modal

// Parametros agrupados por familia para cada lado
const LEFT_FAMILIES = {
    'fisicas': ['param-temperatura', 'param-salinidad'],
    'biogeoquimicas': ['param-oxigeno', 'param-nutrientes', 'param-carbonatos'],
    'produccion': ['parametro-pp']
};

const RIGHT_FAMILIES = {
    'bioopticas': ['param-clorofila', 'param-absorcion-particulado', 'param-CDOM'],
    'biologicas': ['param-fitoplancton', 'param-zooplankton', 'param-ictioplankton', 'param-bacterioplankton']
};

async function init() {
    try {
        const [dataResponse, template] = await Promise.all([
            fetch('./data/epea_data.json'),
            loadSVGTemplate('./assets/img/completo_organizado.svg')
        ]);

        epeaData = await dataResponse.json();
        svgTemplate = template;

        // Setup Language Toggles
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

function setLanguage(lang) {
    currentLanguage = lang;

    // Update active button state
    document.querySelectorAll('.lang-btn').forEach(btn => {
        if (btn.dataset.lang === lang) btn.classList.add('active');
        else btn.classList.remove('active');
    });

    // Update static texts
    updateUITexts();

    // Re-render grid (for month headers)
    generateGrid();

    // Re-render modal if open
    const modal = document.getElementById('modal');
    if (modal && !modal.classList.contains('hidden') && currentCampaña) {
        // Simple re-render without animation
        renderModalContent(currentCampaña);
    }
}

function updateUITexts() {
    const t = translations[currentLanguage];

    // Header
    const h1 = document.querySelector('header h1');
    // Preserve span if possible, or just rebuild
    h1.innerHTML = `${t.headerTitle} <span class="coordinates">(EPEA, 38°28′ S - 57°41′ O)</span>`;

    // Subtitle
    const { yearRange } = epeaData.metadata;
    const years = yearRange[1] - yearRange[0] + 1;
    const subtitleEl = document.getElementById('main-subtitle');

    if (currentLanguage === 'es') {
        subtitleEl.innerHTML = `Un recorrido que brinda contexto sobre las visitas y la información recolectada durante ${years} años<br>a una de las series temporales ecológicas marinas más longevas del Atlántico Suboccidental.`;
    } else {
        subtitleEl.innerHTML = `A tour that provides context on the visits and information collected over ${years} years<br>to one of the longest-running marine ecological time series in the Subwestern Atlantic.`;
    }
}

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

function generateGrid() {
    const container = document.getElementById('grid-container');
    container.innerHTML = ''; // Clear existing

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

    // Helper map to match data month keys (always es) to display index
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
                cell.classList.add('no-data');
            }

            row.appendChild(cell);
        });

        container.appendChild(row);
    }
}

function animateCellHover(cell, isEntering) {
    anime.remove(cell);
    anime({
        targets: cell,
        scale: isEntering ? 1.8 : 1,
        duration: isEntering ? 300 : 400,
        easing: isEntering ? 'easeOutBack' : 'easeOutElastic(1, .6)'
    });
}

function setupModal() {
    const closeBtn = document.getElementById('modal-close');
    const overlay = document.getElementById('modal-overlay');

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });
}

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

function renderModalContent(campaña) {
    const titleEl = document.getElementById('modal-title');
    const subtitleEl = document.getElementById('modal-subtitle');
    const svgContainer = document.getElementById('modal-svg');
    const labelsLeft = document.getElementById('modal-labels-left');
    const labelsRight = document.getElementById('modal-labels-right');

    // Full month names mapping
    const fullMonths = {
        es: { 'ene': 'Enero', 'feb': 'Febrero', 'mar': 'Marzo', 'abr': 'Abril', 'may': 'Mayo', 'jun': 'Junio', 'jul': 'Julio', 'ago': 'Agosto', 'sep': 'Septiembre', 'oct': 'Octubre', 'nov': 'Noviembre', 'dic': 'Diciembre' },
        en: { 'ene': 'January', 'feb': 'February', 'mar': 'March', 'abr': 'April', 'may': 'May', 'jun': 'June', 'jul': 'July', 'ago': 'August', 'sep': 'September', 'oct': 'October', 'nov': 'November', 'dic': 'December' }
    };

    const monthName = fullMonths[currentLanguage][campaña.month];
    titleEl.textContent = `${monthName} ${campaña.year}`;
    subtitleEl.textContent = ''; // Clear subtitle

    // Re-render SVG
    svgContainer.innerHTML = '';
    const svg = renderCircle(svgTemplate, campaña, epeaData.config);
    svg.setAttribute('id', 'modal-epea-svg');
    svgContainer.appendChild(svg);

    // Labels with Language
    labelsLeft.innerHTML = buildGroupedLabels(LEFT_FAMILIES, campaña, 'left', epeaData.config, currentLanguage, translations[currentLanguage]);
    labelsRight.innerHTML = buildGroupedLabels(RIGHT_FAMILIES, campaña, 'right', epeaData.config, currentLanguage, translations[currentLanguage]);

    setTimeout(() => {
        setupLabelInteractions(epeaData.config, currentLanguage); // Pass lang
        setupShipInteractions(epeaData.config, currentLanguage); // Pass lang
    }, 50); // Shorter delay since we might re-render
}

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

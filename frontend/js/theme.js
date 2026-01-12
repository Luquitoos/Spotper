// js/theme.js - Sistema de temas (dark/light)

/**
 * Inicializa o sistema de temas
 */
function initTheme() {
    // Respeita preferência salva ou do sistema
    const saved = localStorage.getItem('spotper-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const currentTheme = saved || (prefersDark ? 'dark' : 'light');
    applyTheme(currentTheme);
}

/**
 * Aplica um tema específico
 */
function applyTheme(theme) {
    const html = document.documentElement;

    // Remove classes antigas e aplica nova
    html.classList.remove('dark', 'light');
    html.classList.add(theme);

    // Atualiza atributo no body para CSS de fallback (não dependemos dele, mas ajuda em seletores globais)
    document.body.setAttribute('data-theme', theme);

    // Persistência
    localStorage.setItem('spotper-theme', theme);

    // Atualiza UI dos toggles
    updateToggleUI(theme);
}

/**
 * Alterna entre dark e light
 */
function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';
    
    applyTheme(newTheme);
}

/**
 * Atualiza a UI dos botões de toggle de tema
 */
function updateToggleUI(theme) {
    // Botão padrão do header
    const toggleDot = document.getElementById('theme-toggle-dot');
    if (toggleDot) {
        const onX = 24; // distância para o lado direito
        const isLight = theme === 'light';
        toggleDot.style.transform = `translateX(${isLight ? onX : 0}px)`;
        toggleDot.classList.toggle('bg-primary', isLight);
        toggleDot.classList.toggle('bg-[#8e8672]', !isLight);
    }

    // Outros toggles em componentes dinâmicos
    const toggles = document.querySelectorAll('[aria-label="Toggle Theme"]');
    toggles.forEach(toggle => {
        const dot = toggle.querySelector('.size-4, [class*="size-"]');
        if (!dot || dot.id === 'theme-toggle-dot') return;
        const onX = 24;
        const isLight = theme === 'light';
        dot.style.transform = `translateX(${isLight ? onX : 0}px)`;
        dot.classList.toggle('bg-primary', isLight);
        dot.classList.toggle('bg-[#8e8672]', !isLight);
    });
}

/**
 * Obtém o tema atual
 */
function getCurrentTheme() {
    return localStorage.getItem('spotper-theme') || 'dark';
}

/**
 * Verifica se o tema atual é dark
 */
function isDarkTheme() {
    return getCurrentTheme() === 'dark';
}

// Inicializa o tema quando o script carrega
initTheme();

// Atualiza UI quando componentes são carregados dinamicamente
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('spotper-theme') || 'dark';
    updateToggleUI(savedTheme);
});

// Observa mudanças no DOM para atualizar toggles em componentes carregados dinamicamente
const observer = new MutationObserver(() => {
    const savedTheme = localStorage.getItem('spotper-theme') || 'dark';
    updateToggleUI(savedTheme);
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});

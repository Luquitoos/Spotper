function initTheme() {
    const saved = localStorage.getItem('spotper-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    const currentTheme = saved || (prefersDark ? 'dark' : 'light');
    applyTheme(currentTheme);
}
function applyTheme(theme) {
    const html = document.documentElement;
    html.classList.remove('dark', 'light');
    html.classList.add(theme);
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('spotper-theme', theme);
    updateToggleUI(theme);
}
function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';
    applyTheme(newTheme);
}
function updateToggleUI(theme) {
    const toggleDot = document.getElementById('theme-toggle-dot');
    if (toggleDot) {
        const onX = 24; 
        const isLight = theme === 'light';
        toggleDot.style.transform = `translateX(${isLight ? onX : 0}px)`;
        toggleDot.classList.toggle('bg-primary', isLight);
        toggleDot.classList.toggle('bg-[#8e8672]', !isLight);
    }
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
function getCurrentTheme() {
    return localStorage.getItem('spotper-theme') || 'dark';
}
function isDarkTheme() {
    return getCurrentTheme() === 'dark';
}
initTheme();
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('spotper-theme') || 'dark';
    updateToggleUI(savedTheme);
});
const observer = new MutationObserver(() => {
    const savedTheme = localStorage.getItem('spotper-theme') || 'dark';
    updateToggleUI(savedTheme);
});
observer.observe(document.body, {
    childList: true,
    subtree: true
});

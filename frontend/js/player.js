let currentPlayer = null;
let currentTrack = null;
let isPlaying = false;
async function loadPlayer(type) {
    const container = document.getElementById('music-player-container');
    if (!container) {
        console.warn('Container do player não encontrado');
        return;
    }
    if (!currentTrack) {
        container.innerHTML = '';
        container.classList.add('hidden');
        currentPlayer = null;
        return;
    }
    const playerType = normalizePlayerType(type);
    try {
        const response = await fetch(`components/players/${playerType}-player.html`);
        if (!response.ok) {
            throw new Error(`Player ${playerType} não encontrado`);
        }
        const html = await response.text();
        container.innerHTML = html;
        container.classList.remove('hidden');
        currentPlayer = playerType;
        setTimeout(() => {
            initPlayerControls();
            updatePlayerUI();
        }, 50);
        console.log(`SpotPer: Player ${playerType.toUpperCase()} carregado`);
    } catch (err) {
        console.error("Erro ao carregar o player:", err);
        container.innerHTML = '';
        container.classList.add('hidden');
        currentPlayer = null;
    }
}
function normalizePlayerType(type) {
    if (!type) return 'digital';
    const normalized = String(type).toLowerCase();
    if (normalized === 'vinil' || normalized === 'vinyl') return 'vinyl';
    if (normalized === 'cd') return 'cd';
    if (normalized === 'download' || normalized === 'digital') return 'digital';
    return 'digital'; 
}
function initPlayerControls() {
    const playButtons = document.querySelectorAll('[data-player-action="play"], [data-player-action="pause"]');
    playButtons.forEach(btn => {
        btn.addEventListener('click', togglePlayPause);
    });
    const prevButtons = document.querySelectorAll('[data-player-action="prev"]');
    prevButtons.forEach(btn => {
        btn.addEventListener('click', playPrevious);
    });
    const nextButtons = document.querySelectorAll('[data-player-action="next"]');
    nextButtons.forEach(btn => {
        btn.addEventListener('click', playNext);
    });
    const openers = document.querySelectorAll('[data-player-open]');
    openers.forEach(btn => {
        btn.addEventListener('click', openExternalPlayerPage);
    });
    updatePlayPauseButton();
}
function openExternalPlayerPage() {
    if (!currentPlayer) return;
    const theme = (typeof getCurrentTheme === 'function' ? getCurrentTheme() : (document.documentElement.classList.contains('dark') ? 'dark' : 'light'));
    let page = '';
    if (currentPlayer === 'digital') {
        page = theme === 'dark' ? 'components/players-pages/digital-dark.html' : 'components/players-pages/digital-light.html';
    } else if (currentPlayer === 'cd') {
        page = theme === 'dark' ? 'components/players-pages/cd-dark.html' : 'components/players-pages/cd-light.html';
    } else if (currentPlayer === 'vinyl') {
        page = theme === 'dark' ? 'components/players-pages/vinyl-dark.html' : 'components/players-pages/vinyl-light.html';
    }
    if (page) window.open(page, '_blank');
}
function togglePlayPause() {
    if (!currentTrack) return;
    isPlaying = !isPlaying;
    updatePlayPauseButton();
    if (isPlaying) {
        console.log('Reproduzindo:', currentTrack);
    } else {
        console.log('Pausado');
    }
}
function updatePlayPauseButton() {
    const playButtons = document.querySelectorAll('[data-player-action="play"]');
    const pauseButtons = document.querySelectorAll('[data-player-action="pause"]');
    if (isPlaying) {
        playButtons.forEach(btn => btn.classList.add('hidden'));
        pauseButtons.forEach(btn => btn.classList.remove('hidden'));
    } else {
        playButtons.forEach(btn => btn.classList.remove('hidden'));
        pauseButtons.forEach(btn => btn.classList.add('hidden'));
    }
}
function playPrevious() {
    console.log('Faixa anterior');
}
function playNext() {
    console.log('Próxima faixa');
}
function updatePlayerUI() {
    if (!currentTrack) return;
    const titleElements = document.querySelectorAll('[data-track-title]');
    titleElements.forEach(el => {
        el.textContent = currentTrack.descricao || currentTrack.nome || 'Sem título';
    });
    const artistElements = document.querySelectorAll('[data-track-artist]');
    artistElements.forEach(el => {
        el.textContent = currentTrack.interprete || (currentTrack.album && currentTrack.album.interprete) || 'Desconhecido';
    });
    const trackNumberElements = document.querySelectorAll('[data-track-number]');
    trackNumberElements.forEach(el => {
        el.textContent = currentTrack.numero_faixa || '00';
    });
    const timeElements = document.querySelectorAll('[data-track-time]');
    timeElements.forEach(el => {
        el.textContent = formatTrackTime(currentTrack.tempo_execucao || 0);
    });
    const coverElements = document.querySelectorAll('[data-track-cover]');
    coverElements.forEach(el => {
        const cover = (currentTrack.album && currentTrack.album.img) || currentTrack.img;
        if (cover) {
            el.style.backgroundImage = `url('${cover}')`;
        }
    });
    const recordingTypeElements = document.querySelectorAll('[data-recording-type]');
    recordingTypeElements.forEach(el => {
        el.textContent = currentTrack.tipo_gravacao || '';
    });
}
function formatTrackTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}
function setCurrentTrack(track, album = null) {
    currentTrack = {
        ...track,
        album: album
    };
    const chosenType = (album && album.tipo_midia) ? album.tipo_midia : 'digital';
    loadPlayer(chosenType);
    setTimeout(() => {
        updatePlayerUI();
        isPlaying = true;
        updatePlayPauseButton();
    }, 100);
}
function updateProgress(percentage) {
    const progressBars = document.querySelectorAll('[data-progress-bar]');
    progressBars.forEach(bar => {
        bar.style.width = `${percentage}%`;
    });
}
function switchPlayerStyle(style) {
    if (!currentTrack) return; 
    loadPlayer(style);
    console.log(`SpotPer: Sistema de áudio alterado para modo ${style.toUpperCase()}`);
}
document.addEventListener('DOMContentLoaded', () => {
    const container = document.getElementById('music-player-container');
    if (container) {
        container.classList.add('hidden');
        container.innerHTML = '';
    }
});

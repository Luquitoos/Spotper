// js/api.js - Módulo para comunicação com o backend

const API_BASE_URL = 'http://localhost:8080/api'; // Será configurado quando o backend estiver pronto

/**
 * Classe para gerenciar chamadas de API
 */
class SpotPerAPI {
    constructor(baseURL = API_BASE_URL) {
        this.baseURL = baseURL;
    }

    /**
     * Método genérico para fazer requisições
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(url, config);

            if (!response.ok) {
                const error = await response.json().catch(() => ({ message: 'Erro desconhecido' }));
                throw new Error(error.message || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error(`[API Error] ${endpoint}:`, error);
            throw error;
        }
    }

    // ========== ÁLBUNS ==========
    async listAlbums() {
        return this.request('/albums');
    }

    async getAlbum(codAlbum) {
        return this.request(`/albums/${codAlbum}`);
    }

    async createAlbum(albumData) {
        return this.request('/albums', {
            method: 'POST',
            body: JSON.stringify(albumData)
        });
    }

    async updateAlbum(codAlbum, albumData) {
        return this.request(`/albums/${codAlbum}`, {
            method: 'PUT',
            body: JSON.stringify(albumData)
        });
    }

    async deleteAlbum(codAlbum) {
        return this.request(`/albums/${codAlbum}`, {
            method: 'DELETE'
        });
    }

    async getAlbumTracks(codAlbum) {
        return this.request(`/albums/${codAlbum}/tracks`);
    }

    // ========== FAIXAS ==========
    async createTrack(trackData) {
        return this.request('/tracks', {
            method: 'POST',
            body: JSON.stringify(trackData)
        });
    }

    async updateTrack(codAlbum, numeroUnidade, numeroFaixa, trackData) {
        return this.request(`/tracks/${codAlbum}/${numeroUnidade}/${numeroFaixa}`, {
            method: 'PUT',
            body: JSON.stringify(trackData)
        });
    }

    async deleteTrack(codAlbum, numeroUnidade, numeroFaixa) {
        return this.request(`/tracks/${codAlbum}/${numeroUnidade}/${numeroFaixa}`, {
            method: 'DELETE'
        });
    }

    // ========== COMPOSITORES ==========
    async listComposers() {
        return this.request('/composers');
    }

    async getComposer(codCompositor) {
        return this.request(`/composers/${codCompositor}`);
    }

    async createComposer(composerData) {
        return this.request('/composers', {
            method: 'POST',
            body: JSON.stringify(composerData)
        });
    }

    async searchComposersByName(nome) {
        return this.request(`/composers/search?nome=${encodeURIComponent(nome)}`);
    }

    async getComposerAlbums(nomeCompositor) {
        return this.request(`/composers/albums?nome=${encodeURIComponent(nomeCompositor)}`);
    }

    // ========== INTÉRPRETES ==========
    async listInterpreters() {
        return this.request('/interpreters');
    }

    async createInterpreter(interpreterData) {
        return this.request('/interpreters', {
            method: 'POST',
            body: JSON.stringify(interpreterData)
        });
    }

    // ========== GRAVADORAS ==========
    async listLabels() {
        return this.request('/labels');
    }

    async getLabel(codGravadora) {
        return this.request(`/labels/${codGravadora}`);
    }

    async createLabel(labelData) {
        return this.request('/labels', {
            method: 'POST',
            body: JSON.stringify(labelData)
        });
    }

    async updateLabel(codGravadora, labelData) {
        return this.request(`/labels/${codGravadora}`, {
            method: 'PUT',
            body: JSON.stringify(labelData)
        });
    }

    // ========== PERÍODOS MUSICAIS ==========
    async listPeriods() {
        return this.request('/periods');
    }

    async createPeriod(periodData) {
        return this.request('/periods', {
            method: 'POST',
            body: JSON.stringify(periodData)
        });
    }

    // ========== TIPOS DE COMPOSIÇÃO ==========
    async listCompositionTypes() {
        return this.request('/composition-types');
    }

    // ========== PLAYLISTS ==========
    async listPlaylists() {
        return this.request('/playlists');
    }

    async getPlaylist(codPlaylist) {
        return this.request(`/playlists/${codPlaylist}`);
    }

    async createPlaylist(playlistData) {
        return this.request('/playlists', {
            method: 'POST',
            body: JSON.stringify(playlistData)
        });
    }

    async updatePlaylist(codPlaylist, playlistData) {
        return this.request(`/playlists/${codPlaylist}`, {
            method: 'PUT',
            body: JSON.stringify(playlistData)
        });
    }

    async deletePlaylist(codPlaylist) {
        return this.request(`/playlists/${codPlaylist}`, {
            method: 'DELETE'
        });
    }

    async getPlaylistTracks(codPlaylist) {
        return this.request(`/playlists/${codPlaylist}/tracks`);
    }

    async addTrackToPlaylist(codPlaylist, trackData) {
        return this.request(`/playlists/${codPlaylist}/tracks`, {
            method: 'POST',
            body: JSON.stringify(trackData)
        });
    }

    async removeTrackFromPlaylist(codPlaylist, codAlbum, numeroUnidade, numeroFaixa) {
        return this.request(`/playlists/${codPlaylist}/tracks/${codAlbum}/${numeroUnidade}/${numeroFaixa}`, {
            method: 'DELETE'
        });
    }

    async registerPlayback(codPlaylist, codAlbum, numeroUnidade, numeroFaixa) {
        return this.request(`/playlists/${codPlaylist}/tracks/${codAlbum}/${numeroUnidade}/${numeroFaixa}/playback`, {
            method: 'POST'
        });
    }

    // ========== ASSOCIAÇÕES ==========
    async associateComposerToTrack(codAlbum, numeroUnidade, numeroFaixa, codCompositor) {
        return this.request(`/tracks/${codAlbum}/${numeroUnidade}/${numeroFaixa}/composers`, {
            method: 'POST',
            body: JSON.stringify({ cod_compositor: codCompositor })
        });
    }

    async associateInterpreterToTrack(codAlbum, numeroUnidade, numeroFaixa, codInterprete) {
        return this.request(`/tracks/${codAlbum}/${numeroUnidade}/${numeroFaixa}/interpreters`, {
            method: 'POST',
            body: JSON.stringify({ cod_interprete: codInterprete })
        });
    }

    // ========== CONSULTAS ESPECIAIS ==========
    async getAlbumsAboveAverage() {
        return this.request('/queries/albums-above-average');
    }

    async getLabelWithMostDvorakPlaylists() {
        return this.request('/queries/label-most-dvorak-playlists');
    }

    async getComposerWithMostPlaylistTracks() {
        return this.request('/queries/composer-most-playlist-tracks');
    }

    async getPlaylistsConcertoBarroco() {
        return this.request('/queries/playlists-concerto-barroco');
    }

    async getDDDAverage() {
        return this.request('/queries/ddd-average');
    }

    // ========== TIPOS DE COMPOSIÇÃO ==========
    async createCompositionType(data) {
        return this.request('/composition-types', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
}

// Instância global da API
const api = new SpotPerAPI();

// Exportar para uso global
window.SpotPerAPI = SpotPerAPI;
window.api = api;

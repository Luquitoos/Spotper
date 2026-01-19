const API_BASE_URL = 'http://localhost:5001/api';
// quando o senhor for rodar, pode ser necessário a troca a porta para outra, pois dependendo do computador não vai rodar, pois a porta pode estar ocupada, aqui deve ser sempre a porta do backend
// então se necessario mude a porta do back e dps mude a porta aqui
class SpotPerAPI {
    constructor(baseURL = API_BASE_URL) {
        this.baseURL = baseURL;
    }
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
    async listTracks(filters = {}) {
        const params = new URLSearchParams();
        if (filters.tipoMidia && filters.tipoMidia !== 'ALL') params.append('tipo_midia', filters.tipoMidia);
        if (filters.periodId) params.append('cod_periodo', filters.periodId);
        if (filters.composerId) params.append('cod_compositor', filters.composerId);
        if (filters.interpreterId) params.append('cod_interprete', filters.interpreterId);
        const queryString = params.toString();
        const endpoint = queryString ? `/tracks?${queryString}` : '/tracks';
        return this.request(endpoint);
    }
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
    async updateComposer(codCompositor, composerData) {
        return this.request(`/composers/${codCompositor}`, {
            method: 'PUT',
            body: JSON.stringify(composerData)
        });
    }
    async searchComposersByName(nome) {
        return this.request(`/composers/search?nome=${encodeURIComponent(nome)}`);
    }
    async getComposerAlbums(nomeCompositor) {
        return this.request(`/composers/albums?nome=${encodeURIComponent(nomeCompositor)}`);
    }
    async listInterpreters() {
        return this.request('/interpreters');
    }
    async createInterpreter(interpreterData) {
        return this.request('/interpreters', {
            method: 'POST',
            body: JSON.stringify(interpreterData)
        });
    }
    async updateInterpreter(codInterprete, interpreterData) {
        return this.request(`/interpreters/${codInterprete}`, {
            method: 'PUT',
            body: JSON.stringify(interpreterData)
        });
    }
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
    async listPeriods() {
        return this.request('/periods');
    }
    async createPeriod(periodData) {
        return this.request('/periods', {
            method: 'POST',
            body: JSON.stringify(periodData)
        });
    }
    async updatePeriod(codPeriodo, periodData) {
        return this.request(`/periods/${codPeriodo}`, {
            method: 'PUT',
            body: JSON.stringify(periodData)
        });
    }
    async listCompositionTypes() {
        return this.request('/composition-types');
    }
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
    async createCompositionType(data) {
        return this.request('/composition-types', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }
    async populateDatabase() {
        return this.request('/populate', {
            method: 'POST'
        });
    }
}
const api = new SpotPerAPI();
window.SpotPerAPI = SpotPerAPI;
window.api = api;

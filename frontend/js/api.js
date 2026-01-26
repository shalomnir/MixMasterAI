/**
 * AI Cocktail Mixer - API Client
 * ================================
 * Handles all communication with the backend REST API.
 * Manages JWT token storage and automatic header injection.
 */

// Production API URL - Backend running on Raspberry Pi via Cloudflare Tunnel
const API_BASE_URL = 'https://api.mixmasterai.app';

class CocktailAPI {
    constructor() {
        // Always use the production API URL
        this.baseUrl = API_BASE_URL;
        this.tokenKey = 'cocktail_auth_token';
        this.userKey = 'cocktail_user';
    }

    // =========================================================================
    // TOKEN MANAGEMENT
    // =========================================================================

    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    setToken(token) {
        localStorage.setItem(this.tokenKey, token);
    }

    removeToken() {
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.userKey);
    }

    getUser() {
        const user = localStorage.getItem(this.userKey);
        return user ? JSON.parse(user) : null;
    }

    setUser(user) {
        localStorage.setItem(this.userKey, JSON.stringify(user));
    }

    isAuthenticated() {
        return !!this.getToken();
    }

    isAdmin() {
        const user = this.getUser();
        return user && user.is_admin === true;
    }

    // =========================================================================
    // HTTP REQUEST HELPER
    // =========================================================================

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;

        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };

        // Add auth token if available
        const token = this.getToken();
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const config = {
            ...options,
            headers
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                // Handle token expiration
                if (response.status === 401) {
                    this.removeToken();
                    window.dispatchEvent(new CustomEvent('auth:expired'));
                }
                throw new Error(data.message || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error(`API Error (${endpoint}):`, error);
            throw error;
        }
    }

    async get(endpoint) {
        return this.request(endpoint, { method: 'GET' });
    }

    async post(endpoint, data) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    }

    async put(endpoint, data) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    async delete(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    }

    // =========================================================================
    // AUTH API
    // =========================================================================

    async register(nickname) {
        const response = await this.post('/api/auth/register', { nickname });
        if (response.status === 'success') {
            this.setToken(response.token);
            this.setUser(response.user);
        }
        return response;
    }

    async login(nickname, password = null) {
        const data = { nickname };
        if (password) data.password = password;

        const response = await this.post('/api/auth/login', data);
        if (response.status === 'success') {
            this.setToken(response.token);
            if (response.is_admin) {
                this.setUser({ is_admin: true, nickname: 'Admin' });
            } else {
                this.setUser(response.user);
            }
        }
        return response;
    }

    async recover(recoveryKey) {
        const response = await this.post('/api/auth/recovery', { recovery_key: recoveryKey });
        if (response.status === 'success') {
            this.setToken(response.token);
            this.setUser(response.user);
        }
        return response;
    }

    async getCurrentUser() {
        return this.get('/api/auth/me');
    }

    logout() {
        this.removeToken();
        window.location.href = '/';
    }

    // =========================================================================
    // RECIPES API
    // =========================================================================

    async getRecipes() {
        return this.get('/api/recipes');
    }

    async getRecipe(id) {
        return this.get(`/api/recipes/${id}`);
    }

    // =========================================================================
    // PUMPS API
    // =========================================================================

    async getPumps() {
        return this.get('/api/pumps');
    }

    // =========================================================================
    // POUR API
    // =========================================================================

    async pourCocktail(recipeId, options = {}) {
        return this.post(`/api/pour/${recipeId}`, {
            is_strong: options.isStrong || false,
            is_taste: options.isTaste || false
        });
    }

    // =========================================================================
    // STATUS API
    // =========================================================================

    async getMachineStatus() {
        return this.get('/api/status');
    }

    // =========================================================================
    // LEADERBOARD API
    // =========================================================================

    async getLeaderboard() {
        return this.get('/api/leaderboard');
    }

    async getUserStatistics(userId) {
        return this.get(`/api/user/${userId}/statistics`);
    }

    async getGlobalStatistics() {
        return this.get('/api/statistics/global');
    }

    // =========================================================================
    // ADMIN API
    // =========================================================================

    async adminGetPumps() {
        return this.get('/api/admin/pumps');
    }

    async adminUpdatePump(pumpId, data) {
        return this.put(`/api/admin/pumps/${pumpId}`, data);
    }

    async adminGetRecipes() {
        return this.get('/api/admin/recipes');
    }

    async adminCreateRecipe(data) {
        return this.post('/api/admin/recipes', data);
    }

    async adminUpdateRecipe(recipeId, data) {
        return this.put(`/api/admin/recipes/${recipeId}`, data);
    }

    async adminDeleteRecipe(recipeId) {
        return this.delete(`/api/admin/recipes/${recipeId}`);
    }

    async adminGetUsers() {
        return this.get('/api/admin/users');
    }

    async adminDeleteUser(userId) {
        return this.delete(`/api/admin/users/${userId}`);
    }

    async adminGetMachineState() {
        return this.get('/api/admin/machine-state');
    }

    async adminUpdateMachineState(data) {
        return this.put('/api/admin/machine-state', data);
    }
}

// Create global API instance
window.api = new CocktailAPI();

// Handle auth expiration globally
window.addEventListener('auth:expired', () => {
    alert('Your session has expired. Please log in again.');
    window.location.href = '/';
});

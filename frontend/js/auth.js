// --- Token & Session Helpers ---
const Auth = {
    get token() { return localStorage.getItem('token'); },
    get username() { return localStorage.getItem('username'); },
    get isAdmin() { return localStorage.getItem('is_admin') === 'true'; },

    headers() {
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    },

    authHeaders() {
        // For multipart/form-data (no Content-Type override)
        return { 'Authorization': `Bearer ${this.token}` };
    },

    logout() {
        localStorage.clear();
        window.location.href = '/';
    },

    requireAuth() {
        if (!this.token) {
            window.location.href = '/';
            throw new Error('Unauthorized');
        }
    },

    requireAdmin() {
        if (!this.token || !this.isAdmin) {
            window.location.href = '/';
            throw new Error('Unauthorized');
        }
    },
    
    async fetchWithAuth(url, options = {}) {
        options.headers = { ...this.headers(), ...options.headers };
        const res = await fetch(url, options);
        if (res.status === 401 || res.status === 403) {
            this.logout(); // Redirects to login if token is expired/invalid
        }
        return res;
    }
};

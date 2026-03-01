// --- Token & Session Helpers ---
const Auth = {
    token: localStorage.getItem('token'),
    username: localStorage.getItem('username'),
    isAdmin: localStorage.getItem('is_admin') === 'true',

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
    }
};

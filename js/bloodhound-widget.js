/**
 * BloodHound Widget - Active Directory Security Analysis
 * Fetches and displays BloodHound data from REST API
 */

class BloodHoundWidget {
    constructor(config) {
        this.apiUrl = config.apiUrl || 'http://192.168.1.7:5000';
        this.apiKey = config.apiKey || 'change_me_in_production';
        this.refreshInterval = config.refreshInterval || 30000; // 30 seconds
        this.autoRefresh = config.autoRefresh !== false;
        this.refreshTimer = null;
        this.isConnected = false;
        this.lastUpdate = null;
    }

    /**
     * Initialize the widget
     */
    async init() {
        console.log('[BloodHound Widget] Initializing...');
        await this.fetchAllData();

        if (this.autoRefresh) {
            this.startAutoRefresh();
        }
    }

    /**
     * Fetch all BloodHound data
     */
    async fetchAllData() {
        try {
            this.updateConnectionStatus('connecting');

            // Fetch all data in parallel
            const [stats, domainAdmins, highValueTargets, kerberoastable, asreproastable, unconstrainedDelegation] = await Promise.all([
                this.fetchStats(),
                this.fetchDomainAdmins(),
                this.fetchHighValueTargets(),
                this.fetchKerberoastable(),
                this.fetchASREPRoastable(),
                this.fetchUnconstrainedDelegation()
            ]);

            // Store data
            this.data = {
                stats,
                domainAdmins,
                highValueTargets,
                kerberoastable,
                asreproastable,
                unconstrainedDelegation
            };

            this.isConnected = true;
            this.lastUpdate = new Date();
            this.updateConnectionStatus('connected');
            this.render();

        } catch (error) {
            console.error('[BloodHound Widget] Error fetching data:', error);
            this.isConnected = false;
            this.updateConnectionStatus('error');
            this.renderError(error.message);
        }
    }

    /**
     * Make API request with authentication
     */
    async apiRequest(endpoint) {
        const url = `${this.apiUrl}${endpoint}`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'X-API-Key': this.apiKey,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Fetch overall statistics
     */
    async fetchStats() {
        return await this.apiRequest('/api/stats');
    }

    /**
     * Fetch domain administrators
     */
    async fetchDomainAdmins() {
        return await this.apiRequest('/api/domain-admins');
    }

    /**
     * Fetch high value targets
     */
    async fetchHighValueTargets() {
        return await this.apiRequest('/api/high-value-targets');
    }

    /**
     * Fetch kerberoastable users
     */
    async fetchKerberoastable() {
        return await this.apiRequest('/api/kerberoastable');
    }

    /**
     * Fetch AS-REP roastable users
     */
    async fetchASREPRoastable() {
        return await this.apiRequest('/api/asreproastable');
    }

    /**
     * Fetch computers with unconstrained delegation
     */
    async fetchUnconstrainedDelegation() {
        return await this.apiRequest('/api/computers-unconstrained-delegation');
    }

    /**
     * Find shortest attack path
     */
    async findShortestPath(sourceNode, targetNode) {
        const url = `${this.apiUrl}/api/shortest-path`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'X-API-Key': this.apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                source: sourceNode,
                target: targetNode
            })
        });

        if (!response.ok) {
            throw new Error(`Path query failed: ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Execute custom Cypher query
     */
    async customQuery(cypherQuery) {
        const url = `${this.apiUrl}/api/custom-query`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'X-API-Key': this.apiKey,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                query: cypherQuery
            })
        });

        if (!response.ok) {
            throw new Error(`Custom query failed: ${response.status}`);
        }

        return await response.json();
    }

    /**
     * Update connection status indicator
     */
    updateConnectionStatus(status) {
        const statusElement = document.getElementById('bh-connection-status');
        const statusDot = document.getElementById('bh-status-dot');
        const statusText = document.getElementById('bh-status-text');

        if (!statusElement) return;

        if (status === 'connected') {
            statusDot.className = 'live-dot';
            statusText.textContent = 'Connected';
            statusElement.style.background = 'rgba(16, 185, 129, 0.1)';
            statusElement.style.borderColor = 'rgba(16, 185, 129, 0.3)';
            statusElement.style.color = '#10b981';
        } else if (status === 'connecting') {
            statusDot.className = 'live-dot';
            statusText.textContent = 'Connecting...';
            statusElement.style.background = 'rgba(251, 191, 36, 0.1)';
            statusElement.style.borderColor = 'rgba(251, 191, 36, 0.3)';
            statusElement.style.color = '#fbbf24';
        } else if (status === 'error') {
            statusDot.className = 'live-dot';
            statusDot.style.background = '#ef4444';
            statusText.textContent = 'Connection Error';
            statusElement.style.background = 'rgba(239, 68, 68, 0.1)';
            statusElement.style.borderColor = 'rgba(239, 68, 68, 0.3)';
            statusElement.style.color = '#ef4444';
        }
    }

    /**
     * Render the complete widget
     */
    render() {
        this.renderStats();
        this.renderDomainAdmins();
        this.renderHighValueTargets();
        this.renderKerberoastable();
        this.renderASREPRoastable();
        this.renderUnconstrainedDelegation();
        this.updateLastRefreshTime();
    }

    /**
     * Render statistics cards
     */
    renderStats() {
        const stats = this.data.stats;

        this.updateStatValue('bh-total-users', stats.total_users);
        this.updateStatValue('bh-total-computers', stats.total_computers);
        this.updateStatValue('bh-total-groups', stats.total_groups);
        this.updateStatValue('bh-domain-admins', stats.domain_admins);
        this.updateStatValue('bh-high-value-targets', stats.high_value_targets);
        this.updateStatValue('bh-kerberoastable', stats.kerberoastable_users);
    }

    /**
     * Update a stat value element
     */
    updateStatValue(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value || '0';
        }
    }

    /**
     * Render domain administrators list
     */
    renderDomainAdmins() {
        const container = document.getElementById('bh-domain-admins-list');
        if (!container) return;

        const admins = this.data.domainAdmins.domain_admins || [];

        if (admins.length === 0) {
            container.innerHTML = '<div class="empty-state">No domain administrators found</div>';
            return;
        }

        const html = admins.map(admin => `
            <div class="bh-list-item">
                <div class="bh-item-icon">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                    </svg>
                </div>
                <div class="bh-item-content">
                    <div class="bh-item-name">${this.escapeHtml(admin.name || admin)}</div>
                    <div class="bh-item-meta">Domain Administrator</div>
                </div>
                <div class="bh-item-badge badge-critical">Critical</div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    /**
     * Render high value targets list
     */
    renderHighValueTargets() {
        const container = document.getElementById('bh-high-value-list');
        if (!container) return;

        const targets = this.data.highValueTargets.high_value_targets || [];

        if (targets.length === 0) {
            container.innerHTML = '<div class="empty-state">No high value targets found</div>';
            return;
        }

        const html = targets.map(target => `
            <div class="bh-list-item">
                <div class="bh-item-icon">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                    </svg>
                </div>
                <div class="bh-item-content">
                    <div class="bh-item-name">${this.escapeHtml(target.name || target)}</div>
                    <div class="bh-item-meta">${this.escapeHtml(target.type || 'Asset')}</div>
                </div>
                <div class="bh-item-badge badge-high">High Value</div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    /**
     * Render kerberoastable users list
     */
    renderKerberoastable() {
        const container = document.getElementById('bh-kerberoastable-list');
        if (!container) return;

        const users = this.data.kerberoastable.kerberoastable_users || [];

        if (users.length === 0) {
            container.innerHTML = '<div class="empty-state">No kerberoastable users found</div>';
            return;
        }

        const html = users.map(user => `
            <div class="bh-list-item">
                <div class="bh-item-icon">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                </div>
                <div class="bh-item-content">
                    <div class="bh-item-name">${this.escapeHtml(user.name || user)}</div>
                    <div class="bh-item-meta">Kerberoastable</div>
                </div>
                <div class="bh-item-badge badge-high">High Risk</div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    /**
     * Render AS-REP roastable users list
     */
    renderASREPRoastable() {
        const container = document.getElementById('bh-asreproastable-list');
        if (!container) return;

        const users = this.data.asreproastable.asreproastable_users || [];

        if (users.length === 0) {
            container.innerHTML = '<div class="empty-state">No AS-REP roastable users found</div>';
            return;
        }

        const html = users.map(user => `
            <div class="bh-list-item">
                <div class="bh-item-icon">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path>
                    </svg>
                </div>
                <div class="bh-item-content">
                    <div class="bh-item-name">${this.escapeHtml(user.name || user)}</div>
                    <div class="bh-item-meta">AS-REP Roastable</div>
                </div>
                <div class="bh-item-badge badge-high">High Risk</div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    /**
     * Render unconstrained delegation computers list
     */
    renderUnconstrainedDelegation() {
        const container = document.getElementById('bh-unconstrained-list');
        if (!container) return;

        const computers = this.data.unconstrainedDelegation.computers || [];

        if (computers.length === 0) {
            container.innerHTML = '<div class="empty-state">No unconstrained delegation found</div>';
            return;
        }

        const html = computers.map(computer => `
            <div class="bh-list-item">
                <div class="bh-item-icon">
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
                    </svg>
                </div>
                <div class="bh-item-content">
                    <div class="bh-item-name">${this.escapeHtml(computer.name || computer)}</div>
                    <div class="bh-item-meta">Unconstrained Delegation</div>
                </div>
                <div class="bh-item-badge badge-critical">Critical</div>
            </div>
        `).join('');

        container.innerHTML = html;
    }

    /**
     * Render error message
     */
    renderError(message) {
        const errorContainer = document.getElementById('bh-error-container');
        if (errorContainer) {
            errorContainer.style.display = 'block';
            errorContainer.innerHTML = `
                <div class="error-message">
                    <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <div>
                        <strong>Connection Error</strong>
                        <p>${this.escapeHtml(message)}</p>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Update last refresh time
     */
    updateLastRefreshTime() {
        const element = document.getElementById('bh-last-update');
        if (element && this.lastUpdate) {
            element.textContent = this.formatTime(this.lastUpdate);
        }
    }

    /**
     * Format time for display
     */
    formatTime(date) {
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${hours}:${minutes}:${seconds}`;
    }

    /**
     * Start auto-refresh timer
     */
    startAutoRefresh() {
        console.log(`[BloodHound Widget] Auto-refresh enabled (${this.refreshInterval}ms)`);

        this.refreshTimer = setInterval(() => {
            console.log('[BloodHound Widget] Auto-refreshing data...');
            this.fetchAllData();
        }, this.refreshInterval);
    }

    /**
     * Stop auto-refresh timer
     */
    stopAutoRefresh() {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = null;
            console.log('[BloodHound Widget] Auto-refresh disabled');
        }
    }

    /**
     * Manual refresh
     */
    async refresh() {
        console.log('[BloodHound Widget] Manual refresh triggered');
        await this.fetchAllData();
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Destroy the widget
     */
    destroy() {
        this.stopAutoRefresh();
        console.log('[BloodHound Widget] Destroyed');
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BloodHoundWidget;
}

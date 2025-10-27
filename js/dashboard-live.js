// dashboard-live.js - GitHub Pages version with API proxy
// This connects to your ES proxy API on port254.com

// Configuration
const API_CONFIG = {
    // Change this after you deploy the ES proxy API
    apiHost: 'https://dashboard.port254.com',  // Your API endpoint
    refreshInterval: 30000  // 30 seconds
};

// Global state
let timelineChart = null;
let protocolChart = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    setInterval(refreshDashboard, API_CONFIG.refreshInterval);
});

function initDashboard() {
    console.log('🚀 Initializing dashboard...');
    initCharts();
    refreshDashboard();
}

async function refreshDashboard() {
    try {
        await Promise.all([
            fetchStats(),
            fetchTopIPs(),
            fetchTopUsernames(),
            fetchTopPasswords(),
            fetchTimeline(),
            fetchProtocolDistribution(),
            fetchRecentEvents()
        ]);
        
        // Update honeypot status
        document.getElementById('honeypotStatus').textContent = 'Online';
    } catch (error) {
        console.error('Error refreshing dashboard:', error);
        document.getElementById('honeypotStatus').textContent = 'Error';
        document.getElementById('honeypotStatus').style.color = '#ef4444';
    }
}

// API query function
async function esQuery(query) {
    try {
        const response = await fetch(`${API_CONFIG.apiHost}/api/search`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('API query failed:', error);
        throw error;
    }
}

// Fetch overall stats
async function fetchStats() {
    const query = {
        size: 0,
        query: { range: { "@timestamp": { gte: "now-24h" } } },
        aggs: {
            unique_ips: { cardinality: { field: "src_ip.keyword" } },
            ssh_attempts: {
                filter: {
                    bool: {
                        should: [
                            { term: { "eventid": "cowrie.login.failed" } },
                            { term: { "eventid": "cowrie.login.success" } }
                        ]
                    }
                }
            },
            critical_events: {
                filter: { term: { "eventid": "cowrie.login.success" } }
            }
        }
    };

    const data = await esQuery(query);
    
    document.getElementById('totalEvents').textContent = data.hits.total.value.toLocaleString();
    document.getElementById('events24h').textContent = data.hits.total.value.toLocaleString();
    document.getElementById('uniqueIPs').textContent = data.aggregations.unique_ips.value;
    document.getElementById('sshAttempts').textContent = data.aggregations.ssh_attempts.doc_count;
    document.getElementById('criticalEvents').textContent = data.aggregations.critical_events.doc_count;
}

// Fetch top attacking IPs
async function fetchTopIPs() {
    const query = {
        size: 0,
        query: { range: { "@timestamp": { gte: "now-24h" } } },
        aggs: {
            top_ips: {
                terms: { field: "src_ip.keyword", size: 10 }
            }
        }
    };

    const data = await esQuery(query);
    const topIPs = data.aggregations.top_ips.buckets;
    
    const html = topIPs.map((bucket, idx) => `
        <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: ${idx % 2 === 0 ? '#1a1a1a' : '#252525'}; border-radius: 0.25rem; margin-bottom: 0.25rem;">
            <span style="color: #e5e7eb;">${bucket.key}</span>
            <span style="color: #ff6b6b; font-weight: 600;">${bucket.doc_count}</span>
        </div>
    `).join('');
    
    document.getElementById('topIPsList').innerHTML = html || '<p style="color: #6b7280;">No data</p>';
}

// Fetch top usernames
async function fetchTopUsernames() {
    const query = {
        size: 0,
        query: { range: { "@timestamp": { gte: "now-24h" } } },
        aggs: {
            top_usernames: {
                terms: { field: "username.keyword", size: 10 }
            }
        }
    };

    const data = await esQuery(query);
    const topUsernames = data.aggregations.top_usernames.buckets;
    
    const html = topUsernames.map(bucket => `
        <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: #252525; border-radius: 0.25rem; margin-bottom: 0.5rem;">
            <span style="color: #fbbf24; font-family: monospace;">${bucket.key}</span>
            <span style="color: #9ca3af;">${bucket.doc_count}</span>
        </div>
    `).join('');
    
    document.getElementById('topUsernames').innerHTML = html || '<p style="color: #6b7280;">No data</p>';
}

// Fetch top passwords
async function fetchTopPasswords() {
    const query = {
        size: 0,
        query: { range: { "@timestamp": { gte: "now-24h" } } },
        aggs: {
            top_passwords: {
                terms: { field: "password.keyword", size: 10 }
            }
        }
    };

    const data = await esQuery(query);
    const topPasswords = data.aggregations.top_passwords.buckets;
    
    const html = topPasswords.map(bucket => `
        <div style="display: flex; justify-content: space-between; padding: 0.5rem; background: #252525; border-radius: 0.25rem; margin-bottom: 0.5rem;">
            <span style="color: #fbbf24; font-family: monospace;">${bucket.key}</span>
            <span style="color: #9ca3af;">${bucket.doc_count}</span>
        </div>
    `).join('');
    
    document.getElementById('topPasswords').innerHTML = html || '<p style="color: #6b7280;">No data</p>';
}

// Fetch timeline data
async function fetchTimeline() {
    const query = {
        size: 0,
        query: { range: { "@timestamp": { gte: "now-24h" } } },
        aggs: {
            timeline: {
                date_histogram: {
                    field: "@timestamp",
                    fixed_interval: "1h"
                }
            }
        }
    };

    const data = await esQuery(query);
    const buckets = data.aggregations.timeline.buckets;
    
    const labels = buckets.map(b => new Date(b.key).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    const values = buckets.map(b => b.doc_count);
    
    updateTimelineChart(labels, values);
}

// Fetch protocol distribution
async function fetchProtocolDistribution() {
    const query = {
        size: 0,
        query: { range: { "@timestamp": { gte: "now-24h" } } },
        aggs: {
            protocols: {
                terms: { field: "protocol.keyword", size: 5 }
            }
        }
    };

    const data = await esQuery(query);
    const buckets = data.aggregations.protocols.buckets;
    
    const labels = buckets.map(b => b.key);
    const values = buckets.map(b => b.doc_count);
    
    updateProtocolChart(labels, values);
}

// Fetch recent events
async function fetchRecentEvents() {
    const query = {
        size: 20,
        query: { range: { "@timestamp": { gte: "now-24h" } } },
        sort: [{ "@timestamp": "desc" }]
    };

    const data = await esQuery(query);
    
    const html = data.hits.hits.map(hit => {
        const source = hit._source;
        const time = new Date(source['@timestamp']).toLocaleTimeString('en-GB');
        const eventType = source.eventid || 'unknown';
        const ip = source.src_ip || 'unknown';
        
        return `<div style="color: #6b7280; margin-bottom: 0.25rem;">[${time}] ${eventType} from ${ip}</div>`;
    }).join('');
    
    document.getElementById('recentEvents').innerHTML = html || '<p style="color: #6b7280;">No events</p>';
}

// Initialize charts
function initCharts() {
    const timelineCtx = document.getElementById('timelineChart');
    const protocolCtx = document.getElementById('protocolChart');
    
    if (timelineCtx) {
        timelineChart = new Chart(timelineCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Events',
                    data: [],
                    borderColor: '#60a5fa',
                    backgroundColor: 'rgba(96, 165, 250, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false }
                },
                scales: {
                    y: { 
                        beginAtZero: true,
                        grid: { color: '#2a2a2a' },
                        ticks: { color: '#9ca3af' }
                    },
                    x: {
                        grid: { color: '#2a2a2a' },
                        ticks: { color: '#9ca3af' }
                    }
                }
            }
        });
    }
    
    if (protocolCtx) {
        protocolChart = new Chart(protocolCtx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#60a5fa',
                        '#10b981',
                        '#fbbf24',
                        '#f87171',
                        '#a78bfa'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { color: '#9ca3af' }
                    }
                }
            }
        });
    }
}

// Update charts
function updateTimelineChart(labels, data) {
    if (timelineChart) {
        timelineChart.data.labels = labels;
        timelineChart.data.datasets[0].data = data;
        timelineChart.update();
    }
}

function updateProtocolChart(labels, data) {
    if (protocolChart) {
        protocolChart.data.labels = labels;
        protocolChart.data.datasets[0].data = data;
        protocolChart.update();
    }
}

console.log('✅ Dashboard script loaded');

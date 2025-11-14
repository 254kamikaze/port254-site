// ==================================================================
// GitHub Pages Configuration - Uses API Proxy
// ==================================================================
// API endpoint for live honeypot data
const API_HOST = 'https://p-scada.duckdns.org';

// Refresh interval (30 seconds)
const REFRESH_INTERVAL = 30000;

// Charts
let timelineChart = null;
let protocolChart = null;
let topCountriesChart = null;

// Selected breach state
let selectedBreachId = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    setInterval(refreshDashboard, REFRESH_INTERVAL);
});

function initDashboard() {
    initCharts();
    refreshDashboard();
}

async function refreshDashboard() {
    try {
        await Promise.all([
            fetchStats(),
            fetchTopUsernames(),
            fetchTopPasswords(),
            fetchTimeline(),
            fetchTopIPs(),
            fetchFailedLogins(),
            fetchProtocolDistribution(),
            fetchTopCountries(),
            fetchSuccessfulBreaches(),
            fetchRecentEvents(),
            fetchProtocolActivity(),
            fetchRecentHTTPLogins(),
            fetchRepeatOffenders()
        ]);
    } catch (error) {
        console.error('Error refreshing dashboard:', error);
    }
}

// IP to Country mapping
function getCountryFromIP(ip) {
    if (ip.startsWith('172.') || ip.startsWith('192.168.') || ip.startsWith('10.')) return '🏠 Local';
    if (ip.startsWith('196.') || ip.startsWith('197.') || ip.startsWith('105.')) return '🇰🇪 Kenya';
    if (ip.startsWith('41.') || ip.startsWith('154.') || ip.startsWith('102.')) return '🇿🇦 South Africa';
    if (ip.startsWith('105.') || ip.startsWith('41.203.') || ip.startsWith('41.204.')) return '🇳🇬 Nigeria';
    if (ip.startsWith('41.178.') || ip.startsWith('41.232.') || ip.startsWith('156.160.')) return '🇪🇬 Egypt';
    if (ip.startsWith('27.') || ip.startsWith('36.') || ip.startsWith('42.') ||
        ip.startsWith('61.') || ip.startsWith('114.') || ip.startsWith('220.') ||
        ip.startsWith('121.') || ip.startsWith('123.') || ip.startsWith('183.')) return '🇨🇳 China';
    if (ip.startsWith('5.') || ip.startsWith('31.') || ip.startsWith('46.') ||
        ip.startsWith('77.') || ip.startsWith('78.') || ip.startsWith('79.') ||
        ip.startsWith('80.') || ip.startsWith('81.') || ip.startsWith('82.') ||
        ip.startsWith('83.') || ip.startsWith('84.') || ip.startsWith('85.') ||
        ip.startsWith('86.') || ip.startsWith('87.') || ip.startsWith('88.') ||
        ip.startsWith('89.') || ip.startsWith('90.') || ip.startsWith('91.') ||
        ip.startsWith('92.') || ip.startsWith('93.') || ip.startsWith('94.') ||
        ip.startsWith('95.') || ip.startsWith('176.') || ip.startsWith('178.')) return '🇷🇺 Russia';
    if (ip.startsWith('23.') || ip.startsWith('50.') || ip.startsWith('63.') ||
        ip.startsWith('64.') || ip.startsWith('66.') || ip.startsWith('204.') ||
        ip.startsWith('67.') || ip.startsWith('68.') || ip.startsWith('69.') ||
        ip.startsWith('70.') || ip.startsWith('71.') || ip.startsWith('72.') ||
        ip.startsWith('73.') || ip.startsWith('74.') || ip.startsWith('75.') ||
        ip.startsWith('76.') || ip.startsWith('98.') || ip.startsWith('99.') ||
        ip.startsWith('104.') || ip.startsWith('107.') || ip.startsWith('108.')) return '🇺🇸 USA';
    if (ip.startsWith('49.') || ip.startsWith('117.') || ip.startsWith('122.') ||
        ip.startsWith('14.') || ip.startsWith('150.') || ip.startsWith('180.') ||
        ip.startsWith('106.') || ip.startsWith('115.')) return '🇮🇳 India';
    if (ip.startsWith('177.') || ip.startsWith('179.') || ip.startsWith('186.') ||
        ip.startsWith('189.') || ip.startsWith('200.') || ip.startsWith('201.')) return '🇧🇷 Brazil';
    if (ip.startsWith('171.') || ip.startsWith('113.') || ip.startsWith('118.')) return '🇻🇳 Vietnam';
    if (ip.startsWith('1.') || ip.startsWith('58.') || ip.startsWith('101.') ||
        ip.startsWith('103.') || ip.startsWith('124.') || ip.startsWith('203.')) return '🇦🇺 Australia';
    if (ip.startsWith('2.') || ip.startsWith('51.') || ip.startsWith('81.') ||
        ip.startsWith('86.') || ip.startsWith('109.') || ip.startsWith('151.')) return '🇬🇧 UK';
    if (ip.startsWith('3.') || ip.startsWith('62.') || ip.startsWith('176.') ||
        ip.startsWith('185.')) return '🇩🇪 Germany';
    if (ip.startsWith('37.') || ip.startsWith('90.') || ip.startsWith('193.') ||
        ip.startsWith('194.')) return '🇫🇷 France';
    return '🌐 Unknown';
}



async function fetchStats() {
    const query = {
        size: 0,
        track_total_hits: true,
        query: { range: { "@timestamp": { gte: "now-24h" } } },
        aggs: {
            unique_ips: { cardinality: { field: "src_ip", precision_threshold: 1000 } },
            login_attempts: {
                filter: {
                    bool: {
                        should: [
                            { term: { "eventid": "cowrie.login.failed" } },
                            { term: { "eventid": "cowrie.login.success" } }
                        ]
                    }
                }
            },
            // NEW: Split SSH and HTTP successful logins
            ssh_successful_logins: { filter: { term: { "eventid": "cowrie.login.success" } } },
            http_successful_logins: {
                filter: {
                    bool: {
                        should: [
                            { term: { "eventid": "http.login.success" } },
                            { term: { "eventid": "web.login.success" } }
                        ]
                    }
                }
            },
            hmi_login_attempts: {
                filter: {
                    bool: {
                        should: [
                            { term: { "eventid": "http.login.failed" } },
                            { term: { "eventid": "http.login.success" } },
                            { term: { "eventid": "web.login.failed" } },
                            { term: { "eventid": "web.login.success" } },
                            { bool: {
                                must: [
                                    { term: { "dst_port": "8081" } },
                                    { exists: { "field": "username" } }
                                ]
                            }},
                            { bool: {
                                must: [
                                    { term: { "dst_port": "80" } },
                                    { exists: { "field": "username" } }
                                ]
                            }}
                        ],
                        minimum_should_match: 1
                    }
                }
            }
        }
    };

    const data = await esQuery(query);

    document.getElementById('totalEvents').textContent = data.hits.total.value.toLocaleString();
    document.getElementById('uniqueIPs').textContent = data.aggregations.unique_ips.value;

    const sshLogins = data.aggregations.login_attempts.doc_count;
    const hmiLogins = data.aggregations.hmi_login_attempts ? data.aggregations.hmi_login_attempts.doc_count : 0;

    document.getElementById("sshLogins").textContent = sshLogins.toLocaleString();
    document.getElementById("hmiLogins").textContent = hmiLogins.toLocaleString();

    // NEW: Update split compromised counts
    document.getElementById("sshCompromised").textContent = data.aggregations.ssh_successful_logins.doc_count;
    document.getElementById("httpCompromised").textContent = data.aggregations.http_successful_logins.doc_count;
}






// Fetch top usernames - TOP 5 ONLY, NO SCROLL
async function fetchTopUsernames() {
    const query = {
        size: 0,
        query: {
            bool: {
                must: [
                    { range: { "@timestamp": { gte: "now-24h" } } },
                    { exists: { field: "username" } }
                ]
            }
        },
        aggs: { top_users: { terms: { field: "username", size: 3 } } }
    };

    const data = await esQuery(query);

    const listHTML = `
        <table>
            <tbody>
                ${data.aggregations.top_users.buckets.map(bucket => `
                    <tr>
                        <td><code title="${bucket.key}">${bucket.key}</code></td>
                        <td style="text-align: right; color: #9ca3af;">${bucket.doc_count}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('usernamesTable').innerHTML = listHTML;
}

// Fetch top passwords - TOP 5 ONLY, NO SCROLL
async function fetchTopPasswords() {
    const query = {
        size: 0,
        query: {
            bool: {
                must: [
                    { range: { "@timestamp": { gte: "now-24h" } } },
                    { exists: { field: "password" } }
                ]
            }
        },
        aggs: { top_passwords: { terms: { field: "password", size: 3 } } }
    };

    const data = await esQuery(query);

    const listHTML = `
        <table>
            <tbody>
                ${data.aggregations.top_passwords.buckets.map(bucket => `
                    <tr>
                        <td><code title="${bucket.key}" style="color: #ffa94d;">${bucket.key}</code></td>
                        <td style="text-align: right; color: #9ca3af;">${bucket.doc_count}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;

    document.getElementById('passwordsTable').innerHTML = listHTML;
}

// Fetch timeline data (24h)
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

    const labels = buckets.map(b => new Date(b.key).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'}));
    const values = buckets.map(b => b.doc_count);

    updateTimelineChart(labels, values);
}

// Fetch top attacking IPs with country
async function fetchTopIPs() {
    const query = {
        size: 0,
        query: { range: { "@timestamp": { gte: "now-24h" } } },
        aggs: { top_ips: { terms: { field: "src_ip", size: 10 } } }
    };

    const data = await esQuery(query);

    const listHTML = `
        <ul class="ip-list">
            ${data.aggregations.top_ips.buckets.map(bucket => {
                const country = getCountryFromIP(bucket.key);
                return `
                <li class="ip-item">
                    <div style="display: flex; align-items: center; gap: 0.3rem;">
                        <span class="ip-address">${bucket.key}</span>
                        <span class="ip-country">${country}</span>
                    </div>
                    <span class="ip-count">${bucket.doc_count}</span>
                </li>
                `;
            }).join('')}
        </ul>
    `;

    document.getElementById('attackingIPs').innerHTML = listHTML;
}

// Fetch failed login attempts
async function fetchFailedLogins() {
    const query = {
        size: 20,
        query: {
            bool: {
                must: [
                    { range: { "@timestamp": { gte: "now-1h" } } },
                    { term: { "eventid": "cowrie.login.failed" } }
                ]
            }
        },
        sort: [{ "@timestamp": "desc" }]
    };

    try {
        const data = await esQuery(query);

        if (!data.hits || !data.hits.hits || data.hits.hits.length === 0) {
            document.getElementById('failedLoginsList').innerHTML = '<p style="color: #6b7280; font-size: 0.75rem; padding: 0.5rem; text-align: center;">No failed attempts recently</p>';
            return;
        }

        const listHTML = `
            <div style="overflow-y: auto; max-height: 220px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.7rem;">
                    <thead style="position: sticky; top: 0; background: #1a1a1a;">
                        <tr style="border-bottom: 1px solid #2a2a2a;">
                            <th style="padding: 0.3rem; text-align: left; color: #9ca3af; font-size: 0.65rem;">TIME</th>
                            <th style="padding: 0.3rem; text-align: left; color: #9ca3af; font-size: 0.65rem;">IP</th>
                            <th style="padding: 0.3rem; text-align: left; color: #9ca3af; font-size: 0.65rem;">USERNAME</th>
                            <th style="padding: 0.3rem; text-align: left; color: #9ca3af; font-size: 0.65rem;">PASSWORD</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.hits.hits.map(hit => {
                            const source = hit._source;
                            const time = new Date(source['@timestamp']).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit', second: '2-digit'});
                            const ip = source.src_ip || '?';
                            const username = source.username || '?';
                            const password = source.password || '?';

                            return `
                                <tr style="border-bottom: 1px solid #2a2a2a;">
                                    <td style="padding: 0.3rem; font-size: 0.65rem; color: #9ca3af;">${time}</td>
                                    <td style="padding: 0.3rem; font-size: 0.65rem; font-family: 'Courier New', monospace;">${ip}</td>
                                    <td style="padding: 0.3rem;"><code style="font-size: 0.65rem; padding: 0.2rem 0.3rem; border-radius: 0.2rem; color: #60a5fa;">${username}</code></td>
                                    <td style="padding: 0.3rem;"><code style="font-size: 0.65rem; padding: 0.2rem 0.3rem; border-radius: 0.2rem; color: #ffa94d;">${password}</code></td>
                                </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;

        document.getElementById('failedLoginsList').innerHTML = listHTML;
    } catch (error) {
        console.error('Error fetching failed logins:', error);
        document.getElementById('failedLoginsList').innerHTML = '<p style="color: #ef4444; font-size: 0.75rem; padding: 0.5rem;">Error loading failed logins</p>';
    }
}

// Fetch protocol distribution
async function fetchProtocolDistribution() {
    const query = {
        size: 0,
        query: { range: { "@timestamp": { gte: "now-24h" } } },
        aggs: {
            by_protocol: {
                terms: { field: "protocol", size: 10 }
            }
        }
    };

    const data = await esQuery(query);

    const labels = data.aggregations.by_protocol.buckets.map(b => b.key.toUpperCase());
    const values = data.aggregations.by_protocol.buckets.map(b => b.doc_count);

    updateProtocolChart(labels, values);
}

// Fetch top attacking countries
async function fetchTopCountries() {
    const query = {
        size: 0,
        query: { range: { "@timestamp": { gte: "now-24h" } } },
        aggs: { top_ips: { terms: { field: "src_ip", size: 50 } } }
    };

    const data = await esQuery(query);

    const countryMap = {};
    data.aggregations.top_ips.buckets.forEach(bucket => {
        const country = getCountryFromIP(bucket.key);
        if (!countryMap[country]) countryMap[country] = 0;
        countryMap[country] += bucket.doc_count;
    });

    const sortedCountries = Object.entries(countryMap)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);

    const labels = sortedCountries.map(([country, _]) => country);
    const values = sortedCountries.map(([_, count]) => count);

    updateTopCountriesChart(labels, values);
}

// Fetch successful breaches - NEW FORMAT WITHOUT CREDENTIALS
async function fetchSuccessfulBreaches() {
    const query = {
        size: 20,
        query: {
            bool: {
                must: [
                    { range: { "@timestamp": { gte: "now-24h" } } },
                    { term: { "eventid": "cowrie.login.success" } }
                ]
            }
        },
        sort: [{ "@timestamp": "desc" }]
    };

    try {
        const data = await esQuery(query);

        if (!data.hits || !data.hits.hits || data.hits.hits.length === 0) {
            document.getElementById('breachesList').innerHTML = '<p style="color: #6b7280; font-size: 0.75rem; padding: 1rem; text-align: center;">No breaches detected in last 24h</p>';
            return;
        }

        const breachesHTML = data.hits.hits.map((hit, index) => {
            const source = hit._source;
            const breachId = hit._id;
            const time = new Date(source['@timestamp'] || source.timestamp).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit'});
            const date = new Date(source['@timestamp'] || source.timestamp).toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
            const ip = source.src_ip || 'unknown';
            const country = getCountryFromIP(ip);
            const session = source.session;

            // Determine severity based on time of day and source
            let severity = 'critical';
            let severityClass = 'severity-critical';

            if (ip.startsWith('196.') || ip.startsWith('27.') || ip.startsWith('61.')) {
                severity = 'high';
                severityClass = 'severity-high';
            }

            const hour = new Date(source['@timestamp']).getHours();
            if (hour >= 0 && hour <= 6) {
                severity = 'critical';
                severityClass = 'severity-critical';
            }

            return `
                <div class="breach-item ${selectedBreachId === breachId ? 'selected' : ''}"
                     data-breach-id="${breachId}"
                     data-session="${session}"
                     role="button"
                     tabindex="0"
                     aria-label="Breach from ${ip} on ${date} at ${time}. Click to view commands.">
                    <div class="breach-time">${date} ${time}</div>
                    <div class="breach-ip">${ip}</div>
                    <div class="breach-country">${country}</div>
                    <div class="breach-severity ${severityClass}">${severity.toUpperCase()}</div>
                    <button class="btn-view-commands"
                            onclick="viewBreachCommands('${breachId}', '${session}', event)"
                            aria-label="View commands for this breach">
                        View Commands
                    </button>
                </div>
            `;
        }).join('');

        document.getElementById('breachesList').innerHTML = breachesHTML;

        // Add keyboard support
        document.querySelectorAll('.breach-item').forEach(item => {
            item.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    const button = item.querySelector('.btn-view-commands');
                    button.click();
                }
            });
        });

    } catch (error) {
        console.error('Error fetching breaches:', error);
        document.getElementById('breachesList').innerHTML = '<p style="color: #ef4444; font-size: 0.75rem; padding: 1rem;">Error loading breaches</p>';
    }
}




async function viewBreachCommands(breachId, session, event) {
    if (event) event.stopPropagation();

    selectedBreachId = breachId;

    document.querySelectorAll('.breach-item').forEach(item => {
        item.classList.remove('selected');
    });
    const selectedItem = document.querySelector(`[data-breach-id="${breachId}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }

    const commandsDiv = document.getElementById('commandsDisplay');
    commandsDiv.innerHTML = '<div class="commands-placeholder"><p>Loading commands...</p></div>';

    const query = {
        size: 100,
        query: {
            bool: {
                must: [
                    { term: { "session": session } },
                    { range: { "@timestamp": { gte: "now-24h" } } }
                ],
                should: [
                    { term: { "eventid": "cowrie.command.input" } },
                    { term: { "eventid": "cowrie.client.version" } },
                    { term: { "eventid": "cowrie.session.connect" } }
                ],
                minimum_should_match: 1
            }
        },
        sort: [{ "@timestamp": "asc" }]
    };

    try {
        const data = await esQuery(query);

        if (!data.hits || !data.hits.hits || data.hits.hits.length === 0) {
            commandsDiv.innerHTML = `
                <div class="commands-placeholder">
                    <p>No commands executed in this session</p>
                    <small>The attacker logged in but did not issue any commands</small>
                </div>
            `;
            return;
        }

        let commandsHTML = '<div class="commands-content">';

        data.hits.hits.forEach(hit => {
            const source = hit._source;
            const timestamp = new Date(source['@timestamp']).toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });

            if (source.eventid === 'cowrie.session.connect') {
                const srcIp = source.src_ip || 'unknown';
                commandsHTML += `<div class="command-entry"><span style="color: #6b7280;">[${timestamp}] Session established from ${srcIp}</span></div>`;
            } else if (source.eventid === 'cowrie.client.version') {
                const version = source.version || 'unknown';
                commandsHTML += `<div class="command-entry"><span style="color: #6b7280;">[${timestamp}] Client: ${version}</span></div>`;
            } else if (source.eventid === 'cowrie.command.input') {
                let cmd = '';

                // The command is in the message field with format "CMD: <command>"
                if (source.message && typeof source.message === 'string') {
                    cmd = source.message.replace(/^CMD:\s*/, '');
                }

                commandsHTML += `<div class="command-entry"><span class="command-prompt">root@honeypot:~#</span> <span class="command-text">${escapeHtml(cmd)}</span></div>`;
            }
        });

        commandsHTML += '</div>';
        commandsDiv.innerHTML = commandsHTML;

    } catch (error) {
        console.error('Error fetching commands:', error);
        commandsDiv.innerHTML = '<div class="commands-placeholder"><p style="color: #ef4444;">Error loading commands</p></div>';
    }
}





function escapeHtml(text) {
    // Handle null/undefined
    if (text == null || text === '') return '';

    // Convert to string safely
    let str;
    if (typeof text === 'string') {
        str = text;
    } else if (typeof text === 'object') {
        str = JSON.stringify(text);
    } else {
        str = String(text);
    }

    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };

    return str.replace(/[&<>"']/g, m => map[m]);
}





// Fetch recent events for stream
async function fetchRecentEvents() {
    const query = {
        size: 15,
        query: { range: { "@timestamp": { gte: "now-5m" } } },
        sort: [{ "@timestamp": "desc" }]
    };

    try {
        const data = await esQuery(query);

        if (!data.hits || !data.hits.hits || data.hits.hits.length === 0) {
            document.getElementById('eventStream').innerHTML = '<p style="color: #6b7280; padding: 0.5rem; font-size: 0.7rem; text-align: center;">No recent events</p>';
            return;
        }

        const eventsHTML = data.hits.hits.slice(0, 12).map(hit => {
            const source = hit._source;
            const timestamp = source['@timestamp'] || source.timestamp;
            const time = timestamp ? new Date(timestamp).toLocaleTimeString('en-GB', {hour: '2-digit', minute: '2-digit', second: '2-digit'}) : '??:??:??';
            const eventType = (source.eventid || 'unknown').replace('cowrie.', '').substring(0, 15);
            const message = String(source.message || source.input || "Event").substring(0, 35);
            return `
                <div class="event-item">
                    <span class="event-time">${time}</span> <span class="event-type">${eventType}</span> ${message}
                </div>
            `;
        }).join('');

        document.getElementById('eventStream').innerHTML = eventsHTML;
    } catch (error) {
        console.error('Error fetching events:', error);
        document.getElementById('eventStream').innerHTML = '<p style="color: #ef4444; padding: 0.5rem; font-size: 0.7rem; text-align: center;">Loading events...</p>';
    }
}

// Helper function to query Elasticsearch
async function esQuery(query) {
    try {
        const response = await fetch(`${API_HOST}/api/search`, {
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

// ROW 4 ANALYTICS FUNCTIONS



// Fetch HMI/Web Login Attempts - MORE ROWS

// FIXED: fetchHMILogins - Enhanced to capture port 8081 and multiple event types
async function fetchHMILogins() {
    const query = {
        size: 0,
        query: {
            bool: {
                must: [
                    { range: { "@timestamp": { gte: "now-24h" } } }
                ],
                should: [
                    { term: { "eventid": "http.login.failed" } },
                    { term: { "eventid": "http.login.success" } },
                    { term: { "eventid": "web.login.failed" } },
                    { term: { "eventid": "web.login.success" } },
                    { bool: {
                        must: [
                            { term: { "dst_port": "8081" } },
                            { exists: { "field": "username" } }
                        ]
                    }},
                    { bool: {
                        must: [
                            { term: { "dst_port": "80" } },
                            { exists: { "field": "username" } }
                        ]
                    }}
                ],
                minimum_should_match: 1
            }
        },
        aggs: {
            total_attempts: {
                value_count: { field: "eventid" }
            },
            top_usernames: {
                terms: { field: "username", size: 20 }
            },
            top_passwords: {
                terms: { field: "password", size: 20 }
            },
            unique_ips: {
                cardinality: { field: "src_ip" }
            },
            by_event_type: {
                terms: { field: "eventid", size: 10 }
            }
        }
    };

    try {
        const data = await esQuery(query);

        console.log('=== HMI LOGINS DEBUG ===');
        console.log('Total:', data.hits.total.value);
        console.log('Event types:', data.aggregations.by_event_type.buckets);

        const totalAttempts = data.aggregations.total_attempts.value;
        const uniqueIPs = data.aggregations.unique_ips.value;
        const usernames = data.aggregations.top_usernames.buckets;
        const passwords = data.aggregations.top_passwords.buckets;

        if (totalAttempts === 0) {
            document.getElementById('hmiLoginsList').innerHTML = '<p style="color: #6b7280; font-size: 0.75rem; padding: 1rem; text-align: center;">No HMI login attempts yet</p>';
            return;
        }

        // Create table with usernames and passwords side by side
        const maxRows = Math.max(usernames.length, passwords.length);
        const rows = [];

        for (let i = 0; i < Math.min(maxRows, 20); i++) {
            const username = usernames[i];
            const password = passwords[i];

            rows.push(`
                <tr>
                    <td style="color: #60a5fa; font-family: 'Courier New', monospace; font-size: 0.65rem; padding: 0.4rem;">
                        ${username ? username.key : '-'}
                    </td>
                    <td style="color: #ffa94d; font-family: 'Courier New', monospace; font-size: 0.65rem; padding: 0.4rem;">
                        ${password ? password.key : '-'}
                    </td>
                    <td style="text-align: right; color: #10b981; font-weight: 600; font-size: 0.7rem; padding: 0.4rem;">
                        ${username ? username.doc_count : (password ? password.doc_count : 0)}
                    </td>
                </tr>
            `);
        }

        const listHTML = `
            <div style="max-height: 400px; overflow-y: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <thead style="position: sticky; top: 0; background: #1a1a1a; z-index: 10;">
                        <tr style="border-bottom: 1px solid #2a2a2a;">
                            <th style="text-align: left; color: #9ca3af; font-size: 0.65rem; padding: 0.5rem; font-weight: 600;">USERNAME</th>
                            <th style="text-align: left; color: #9ca3af; font-size: 0.65rem; padding: 0.5rem; font-weight: 600;">PASSWORD</th>
                            <th style="text-align: right; color: #9ca3af; font-size: 0.65rem; padding: 0.5rem; font-weight: 600;">ATTEMPTS</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${rows.join('')}
                    </tbody>
                </table>
            </div>
            <p style="color: #6b7280; font-size: 0.6rem; text-align: center; margin-top: 0.5rem; padding: 0.25rem;">
                Total: ${totalAttempts} login attempts | ${uniqueIPs} unique IPs
            </p>
        `;

        document.getElementById('hmiLoginsList').innerHTML = listHTML;

    } catch (error) {
        console.error('Error fetching HMI logins:', error);
        document.getElementById('hmiLoginsList').innerHTML = '<p style="color: #ef4444; font-size: 0.75rem; padding: 1rem;">Error loading HMI login data</p>';
    }
}




// Fetch protocol activity (events per protocol)
let protocolActivityChart = null;

async function fetchProtocolActivity() {
    const query = {
        size: 0,
        query: { range: { "@timestamp": { gte: "now-24h" } } },
        aggs: {
            by_protocol: {
                terms: { field: "protocol", size: 10 }
            }
        }
    };

    try {
        const data = await esQuery(query);

        const labels = data.aggregations.by_protocol.buckets.map(b => b.key.toUpperCase());
        const values = data.aggregations.by_protocol.buckets.map(b => b.doc_count);

        updateProtocolActivityChart(labels, values);
    } catch (error) {
        console.error('Error fetching protocol activity:', error);
    }
}

function updateProtocolActivityChart(labels, data) {
    const ctx = document.getElementById('protocolActivityChart').getContext('2d');

    if (protocolActivityChart) {
        protocolActivityChart.data.labels = labels;
        protocolActivityChart.data.datasets[0].data = data;
        protocolActivityChart.update('none');
    } else {
        protocolActivityChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Events',
                    data: data,
                    backgroundColor: ['#60a5fa', '#10b981', '#ffa94d', '#a78bfa', '#f472b6', '#fb923c', '#38bdf8', '#4ade80']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: '#2a2a2a' },
                        ticks: { color: '#9ca3af', font: { size: 10 } }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: '#9ca3af', font: { size: 10 } }
                    }
                }
            }
        });
    }
}





async function fetchRecentHTTPLogins() {
    const query = {
        size: 10,
        query: {
            bool: {
                must: [
                    { range: { "@timestamp": { gte: "now-5m" } } }
                ],
                should: [
                    { term: { "eventid": "http.login.failed" } },
                    { term: { "eventid": "http.login.success" } },  // NEW: Include success
                    { term: { "eventid": "web.login.failed" } },
                    { term: { "eventid": "web.login.success" } },   // NEW: Include success
                    { bool: {
                        must: [
                            { term: { "dst_port": "8081" } },
                            { exists: { "field": "username" } }
                        ]
                    }}
                ],
                minimum_should_match: 1
            }
        },
        sort: [{ "@timestamp": "desc" }]
    };

    try {
        const data = await esQuery(query);

        if (!data.hits || !data.hits.hits || data.hits.hits.length === 0) {
            document.getElementById('recentHTTPLoginsList').innerHTML = '<p style="color: #6b7280; font-size: 0.7rem; padding: 1rem; text-align: center;">No recent HTTP login attempts</p>';
            return;
        }

        const eventsHTML = data.hits.hits.map(hit => {
            const source = hit._source;
            const time = new Date(source['@timestamp']).toLocaleTimeString('en-GB', {hour: '2-digit', minute:'2-digit', second: '2-digit'});
            const username = source.username || 'unknown';
            const password = source.password || 'N/A';
            const srcIP = source.src_ip || 'unknown';

            // NEW: Check for success and show green "Success" or red "Failed"
            const isSuccess = source.eventid === 'http.login.success' || source.eventid === 'web.login.success';
            const statusText = isSuccess ? 'Success' : 'Failed';
            const statusColor = isSuccess ? '#10b981' : '#ef4444';

            return `
                <div class="event-item">
                    <span class="event-time">${time}</span>
                    <span class="event-type" style="color: #60a5fa;">${srcIP}</span>
                    <span style="color: ${statusColor}; font-weight: 600;"> ${statusText}</span>
                    <span class="event-message">- ${username} / ${password.substring(0, 12)}${password.length > 12 ? '...' : ''}</span>
                </div>
            `;
        }).join('');

        document.getElementById('recentHTTPLoginsList').innerHTML = eventsHTML;
    } catch (error) {
        console.error('Error fetching recent HTTP logins:', error);
        document.getElementById('recentHTTPLoginsList').innerHTML = `
            <div style="background: #1a1a1a; border: 1px solid #2a2a2a; border-radius: 0.5rem; padding: 1rem;">
                <p style="color: #ef4444; font-size: 0.75rem; text-align: center; margin: 0;">
                    Error loading data
                </p>
            </div>
        `;
    }
}




// FIXED: fetchRepeatOffenders - No wrapper div
async function fetchRepeatOffenders() {
    const query = {
        size: 0,
        query: { range: { "@timestamp": { gte: "now-24h" } } },
        aggs: {
            repeat_ips: {
                terms: { field: "src_ip", size: 10, min_doc_count: 5 }
            }
        }
    };

    try {
        const data = await esQuery(query);

        if (!data.aggregations || !data.aggregations.repeat_ips.buckets.length) {
            document.getElementById('repeatOffendersList').innerHTML = '<p style="color: #6b7280; font-size: 0.75rem; padding: 1rem; text-align: center;">No repeat offenders detected</p>';
            return;
        }

        // NO WRAPPER DIV - table goes directly into container
        const listHTML = `
            <table>
                <thead>
                    <tr>
                        <th>IP ADDRESS</th>
                        <th>ORIGIN</th>
                        <th style="text-align: right;">ATTACKS</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.aggregations.repeat_ips.buckets.map(bucket => {
                        const country = getCountryFromIP(bucket.key);
                        const threatLevel = bucket.doc_count > 50 ? 'CRITICAL' : bucket.doc_count > 20 ? 'HIGH' : 'MEDIUM';
                        const threatColor = bucket.doc_count > 50 ? '#ef4444' : bucket.doc_count > 20 ? '#ffa94d' : '#fde047';

                        return `
                            <tr>
                                <td style="font-family: 'Courier New', monospace; font-size: 0.65rem; width: 35%;">${bucket.key}</td>
                                <td style="font-size: 0.65rem; width: 25%;">${country}</td>
                                <td style="text-align: right; width: 40%;">
                                    <span style="color: ${threatColor}; padding: 0.2rem 0.5rem; border-radius: 0.25rem; font-size: 0.6rem; font-weight: 600;">
                                        ${bucket.doc_count} (${threatLevel})
                                    </span>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        `;

        document.getElementById('repeatOffendersList').innerHTML = listHTML;
    } catch (error) {
        console.error('Error fetching repeat offenders:', error);
        document.getElementById('repeatOffendersList').innerHTML = '<p style="color: #ef4444; font-size: 0.75rem; padding: 1rem;">Error loading data</p>';
    }
}




// Helper function to query Elasticsearch
async function esQuery(query) {
    try {
        const response = await fetch(`${API_HOST}/api/search`, {
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

// Initialize charts
function initCharts() {
    const timelineCtx = document.getElementById('timelineChart').getContext('2d');
    timelineChart = new Chart(timelineCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Events',
                data: [],
                borderColor: '#60a5fa',
                backgroundColor: 'rgba(96, 165, 250, 0.1)',
                tension: 0.4,
                fill: true,
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { display: false },
                    ticks: { color: '#9ca3af', font: { size: 10 } }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#9ca3af', font: { size: 10 } }
                }
            }
        }
    });

    const protocolCtx = document.getElementById('protocolChart').getContext('2d');
    protocolChart = new Chart(protocolCtx, {
        type: 'doughnut',
        data: {
            labels: [],
            datasets: [{
                data: [],
                backgroundColor: ['#60a5fa', '#10b981', '#ffa94d', '#a78bfa', '#f472b6']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#9ca3af',
                        font: { size: 12 }, // Increased from 10
                        padding: 12 // Increased from 10
                    }
                }
            }
        }
    });

    const countriesCtx = document.getElementById('countriesChart').getContext('2d');
    topCountriesChart = new Chart(countriesCtx, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Attacks',
                data: [],
                backgroundColor: ['#60a5fa', '#10b981', '#ffa94d', '#a78bfa', '#f472b6', '#fb923c', '#38bdf8', '#4ade80']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: '#2a2a2a' },
                    ticks: { color: '#9ca3af', font: { size: 11 } } // Increased from 10
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#9ca3af', font: { size: 11 } } // Increased from 10
                }
            }
        }
    });
}

function updateTimelineChart(labels, data) {
    if (timelineChart) {
        timelineChart.data.labels = labels;
        timelineChart.data.datasets[0].data = data;
        timelineChart.update('none');
    }
}

function updateProtocolChart(labels, data) {
    if (protocolChart) {
        protocolChart.data.labels = labels;
        protocolChart.data.datasets[0].data = data;
        protocolChart.update('none');
    }
}

function updateTopCountriesChart(labels, data) {
    if (topCountriesChart) {
        topCountriesChart.data.labels = labels;
        topCountriesChart.data.datasets[0].data = data;
        topCountriesChart.update('none');
    }
}

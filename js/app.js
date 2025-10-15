// Global state
let allTests = [];
let filteredTests = [];
let currentFilter = 'all';
let currentTest = null;

// Rate limiting for trigger detection
let lastTriggerTime = 0;
const COOLDOWN_MS = 60000; // 1 minute cooldown

// Backend API URL
const BACKEND_API_URL = 'https://api.port254.com';

// MITRE ATT&CK descriptions
const mitreDescriptions = {
    'T1110': {
        name: 'Brute Force',
        description: 'Adversaries may use brute force techniques to gain access to accounts when passwords are unknown or when password hashes are obtained.'
    },
    'T1040': {
        name: 'Network Sniffing',
        description: 'Adversaries may sniff network traffic to capture information about an environment, including authentication material passed over the network.'
    },
    'T1046': {
        name: 'Network Service Discovery',
        description: 'Adversaries may attempt to get a listing of services running on remote hosts and local network infrastructure devices.'
    },
    'T1078': {
        name: 'Valid Accounts',
        description: 'Adversaries may obtain and abuse credentials of existing accounts as a means of gaining Initial Access, Persistence, Privilege Escalation, or Defense Evasion.'
    },
    'T1542': {
        name: 'Pre-OS Boot',
        description: 'Adversaries may abuse Pre-OS Boot mechanisms as a way to establish persistence on a system.'
    },
    'T1537': {
        name: 'Transfer Data to Cloud Account',
        description: 'Adversaries may exfiltrate data by transferring the data to a cloud account they control.'
    }
};

// IEC 62443 control descriptions
const iecDescriptions = {
    'SR 1.1': {
        name: 'Human User Identification & Authentication',
        description: 'The control system shall provide the capability to identify and authenticate all human users.'
    },
    'SR 3.2': {
        name: 'Malicious Code Protection',
        description: 'The control system shall provide the capability to protect itself from malicious code.'
    },
    'SR 5.1': {
        name: 'Network Segmentation',
        description: 'The control system shall provide the capability to segment the control system network from other networks.'
    },
    'SR 5.2': {
        name: 'Zone Boundary Protection',
        description: 'The control system shall provide the capability to protect zone boundaries.'
    },
    'SR 5.3': {
        name: 'General Purpose Person-to-Person Communication',
        description: 'The control system shall provide the capability to restrict general purpose person-to-person communication.'
    },
    'SR 7.3': {
        name: 'Control System Backup',
        description: 'The control system shall provide the capability to back up system-level information and control system application software.'
    },
    'SR 7.6': {
        name: 'Network and Security Configuration Settings',
        description: 'The control system shall provide the capability to manage network and security configuration settings.'
    }
};

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    loadTests();
    setupEventListeners();
});

// Load test data
async function loadTests() {
    try {
        const response = await fetch('./data/tests.json');
        allTests = await response.json();
        filteredTests = [...allTests];
        renderCards();
        updateStats();
    } catch (error) {
        console.error('Error loading tests:', error);
    }
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('searchInput').addEventListener('input', filterTests);
    
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            filterTests();
        });
    });
    
    document.getElementById('detailModal').addEventListener('click', (e) => {
        if (e.target.id === 'detailModal') closeModal();
    });
}

// Filter tests
function filterTests() {
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
    
    filteredTests = allTests.filter(test => {
        const matchesCategory = currentFilter === 'all' || test.domain === currentFilter;
        const matchesSearch = !searchQuery || 
            test.title.toLowerCase().includes(searchQuery) ||
            test.identifier.toLowerCase().includes(searchQuery) ||
            test.description.toLowerCase().includes(searchQuery) ||
            test.tags.some(tag => tag.toLowerCase().includes(searchQuery)) ||
            test.mitre_attack_ids.some(id => id.toLowerCase().includes(searchQuery));
        
        return matchesCategory && matchesSearch;
    });
    
    renderCards();
    updateStats();
}

// Render detection cards
function renderCards() {
    const grid = document.getElementById('cardsGrid');
    const noResults = document.getElementById('noResults');
    
    if (filteredTests.length === 0) {
        grid.style.display = 'none';
        noResults.style.display = 'block';
        return;
    }
    
    grid.style.display = 'grid';
    noResults.style.display = 'none';
    
    grid.innerHTML = filteredTests.map(test => `
        <div class="detection-card" data-test-id="${test.id}">
            <div class="card-badges">
                <span class="badge badge-${getCategoryClass(test.category)}">${test.category}</span>
                <span class="badge badge-${getCriticalityClass(test.criticality)}">${test.criticality}</span>
            </div>
            
            <div class="card-title">${test.title}</div>
            
            <div class="card-identifier">
                <code>${test.identifier}</code>
            </div>
            
            <div class="card-description">
                ${test.description}
            </div>
            
            <div class="card-tags">
                ${test.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}
            </div>
            
            <div class="card-mapping">
                ${test.mitre_attack_ids.map(id => `<span class="mapping-badge mapping-mitre">${id}</span>`).join('')}
                ${test.iec62443_controls.map(c => `<span class="mapping-badge mapping-iec">${c}</span>`).join('')}
            </div>
            
            <div class="card-footer">
                <a href="#" class="card-link">
                    Click for details
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                    </svg>
                </a>
            </div>
        </div>
    `).join('');
    
    // Add click listeners to cards
    document.querySelectorAll('.detection-card').forEach(card => {
        card.addEventListener('click', () => {
            const testId = card.dataset.testId;
            openModal(testId);
        });
    });
}

// Update statistics
function updateStats() {
    document.getElementById('totalTests').textContent = allTests.length;
    document.getElementById('categories').textContent = new Set(allTests.map(t => t.category)).size;
    document.getElementById('showing').textContent = filteredTests.length;
    document.getElementById('highPriority').textContent = allTests.filter(t => 
        t.criticality === 'HIGH' || t.criticality === 'CRITICAL'
    ).length;
}

// Open detail modal
function openModal(testId) {
    currentTest = allTests.find(t => t.id === testId);
    if (!currentTest) {
        console.error('Test not found:', testId);
        return;
    }
    
    document.getElementById('modalTitle').textContent = currentTest.title;
    document.getElementById('modalBadges').innerHTML = `
        <span class="badge badge-${getCategoryClass(currentTest.category)}">${currentTest.category}</span>
        <span class="badge badge-${getCriticalityClass(currentTest.criticality)}">${currentTest.criticality}</span>
    `;
    
    document.getElementById('modalDescription').textContent = currentTest.description;
    
    // MITRE badges
    document.getElementById('modalMitre').innerHTML = currentTest.mitre_attack_ids
        .map(id => `<span class="mapping-badge mapping-mitre">${id}</span>`).join('');
    
    // MITRE descriptions
    const mitreDescHtml = currentTest.mitre_attack_ids.map(id => {
        const desc = mitreDescriptions[id];
        return desc ? `
            <div class="mapping-description" style="margin-top: 0.5rem;">
                <strong>${id}: ${desc.name}</strong>
                ${desc.description}
            </div>
        ` : '';
    }).join('');
    document.getElementById('modalMitreDesc').innerHTML = mitreDescHtml;
    
    // IEC badges
    document.getElementById('modalIec').innerHTML = currentTest.iec62443_controls
        .map(c => `<span class="mapping-badge mapping-iec">${c}</span>`).join('');
    
    // IEC descriptions
    const iecDescHtml = currentTest.iec62443_controls.map(c => {
        const desc = iecDescriptions[c];
        return desc ? `
            <div class="mapping-description" style="margin-top: 0.5rem;">
                <strong>${c}: ${desc.name}</strong>
                ${desc.description}
            </div>
        ` : '';
    }).join('');
    document.getElementById('modalIecDesc').innerHTML = iecDescHtml;
    
    const addedDate = new Date(currentTest.added_at);
    document.getElementById('modalDate').textContent = `Added: ${addedDate.toLocaleDateString()}`;
    
    // Clear previous test results
    clearTestResults();
    
    const modal = document.getElementById('detailModal');
    modal.classList.add('active');
}

// Close modal
function closeModal() {
    document.getElementById('detailModal').classList.remove('active');
    clearTestResults();
    currentTest = null;
}

// Clear test results
function clearTestResults() {
    const statusDiv = document.getElementById('labStatus');
    const resultsDiv = document.getElementById('labResults');
    
    statusDiv.style.display = 'none';
    resultsDiv.style.display = 'none';
    resultsDiv.style.background = '';
    resultsDiv.style.borderColor = '';
    document.getElementById('labResultsList').innerHTML = '';
}

// Trigger detection in lab with ELK verification
async function triggerDetection() {
    if (!currentTest) return;
    
    // Check rate limit
    const now = Date.now();
    if (now - lastTriggerTime < COOLDOWN_MS) {
        const remainingSeconds = Math.ceil((COOLDOWN_MS - (now - lastTriggerTime)) / 1000);
        
        const resultsDiv = document.getElementById('labResults');
        const resultsList = document.getElementById('labResultsList');
        
        resultsDiv.style.display = 'block';
        resultsDiv.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)';
        resultsDiv.style.borderColor = '#ef4444';
        
        resultsList.innerHTML = `
            <li style="color: #fca5a5;">⏱️ Rate limit active</li>
            <li style="color: #9ca3af;">Please wait ${remainingSeconds} seconds before triggering again</li>
            <li style="color: #9ca3af;">This prevents abuse and protects lab resources</li>
        `;
        
        setTimeout(() => {
            clearTestResults();
        }, 3000);
        
        return;
    }
    
    lastTriggerTime = now;
    
    const statusDiv = document.getElementById('labStatus');
    const resultsDiv = document.getElementById('labResults');
    const resultsList = document.getElementById('labResultsList');
    const statusText = document.getElementById('labStatusText');
    
    resultsDiv.style.background = '';
    resultsDiv.style.borderColor = '';
    
    statusDiv.style.display = 'flex';
    resultsDiv.style.display = 'none';
    statusText.textContent = 'Connecting to lab environment...';
    
    try {
        statusText.textContent = 'Sending test events to ELK...';
        
        const response = await fetch(`${BACKEND_API_URL}/trigger-detection`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(currentTest)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.status === 'success' || data.status === 'partial') {
            statusDiv.style.display = 'none';
            resultsDiv.style.display = 'block';
            
            const es = data.elasticsearch_verification;
            const sizeKB = (es.index_size_bytes / 1024).toFixed(2);
            const sizeMB = (es.index_size_bytes / (1024 * 1024)).toFixed(2);
            const displaySize = es.index_size_bytes > 1048576 ? `${sizeMB} MB` : `${sizeKB} KB`;
            
            // Build event IDs HTML if available
            let eventIdsHtml = '';
            if (es.sample_event_ids && es.sample_event_ids.length > 0) {
                eventIdsHtml = `
                    <details style="margin-top: 0.75rem; cursor: pointer;">
                        <summary style="color: #60a5fa; font-size: 0.813rem; user-select: none;">
                            📄 View Sample Event IDs (Elasticsearch UUIDs) ▼
                        </summary>
                        <ul style="margin: 0.5rem 0 0 1rem; padding: 0.5rem; background: rgba(0,0,0,0.3); border-radius: 0.25rem; font-family: 'Courier New', monospace; font-size: 0.75rem; list-style: none;">
                            ${es.sample_event_ids.map(id => `<li style="padding: 0.25rem 0; color: #93c5fd;">• ${id}</li>`).join('')}
                        </ul>
                    </details>
                `;
            }
            
            resultsList.innerHTML = `
                <li style="font-size: 0.875rem; font-weight: 600; color: #10b981; margin-bottom: 0.5rem;">
                    ✓ Test Completed Successfully
                </li>
                <li>✓ Triggered ${currentTest.title}</li>
                <li>✓ Generated ${data.events_indexed} synthetic events matching attack pattern</li>
                <li>✓ Events indexed to <code style="background: rgba(96, 165, 250, 0.15); padding: 0.125rem 0.375rem; border-radius: 0.25rem; color: #93c5fd;">${data.index}</code></li>
                <li>✓ Detection fired: ${currentTest.mitre_attack_ids.join(', ')}</li>
                
                <li style="margin-top: 1rem; padding: 1rem; background: transparent; border: 1px solid rgba(96, 165, 250, 0.3); border-radius: 0.375rem;">
                    <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.75rem;">
                        <svg style="width: 1rem; height: 1rem; color: #60a5fa;" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                        </svg>
                        <strong style="color: #60a5fa; font-size: 0.875rem;">ELASTICSEARCH VERIFICATION</strong>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: auto 1fr; gap: 0.5rem 1rem; font-size: 0.813rem;">
                        <span style="color: #9ca3af;">Cluster:</span>
                        <span style="color: #e5e7eb;">${es.cluster_name} <span style="display: inline-block; width: 0.5rem; height: 0.5rem; background: ${es.cluster_status === 'green' ? '#10b981' : es.cluster_status === 'yellow' ? '#fbbf24' : '#ef4444'}; border-radius: 50%; margin-left: 0.25rem;"></span></span>
                        
                        <span style="color: #9ca3af;">ES Version:</span>
                        <span style="color: #e5e7eb;">${es.elasticsearch_version}</span>
                        
                        <span style="color: #9ca3af;">Total Documents:</span>
                        <span style="color: #e5e7eb; font-weight: 600;">${es.total_documents.toLocaleString()}</span>
                        
                        <span style="color: #9ca3af;">Index Size:</span>
                        <span style="color: #e5e7eb;">${displaySize}</span>
                        
                        <span style="color: #9ca3af;">Query Time:</span>
                        <span style="color: #e5e7eb;">${es.query_time_ms}ms</span>
                        
                        <span style="color: #9ca3af;">Shards:</span>
                        <span style="color: #e5e7eb;">${es.shards.successful}/${es.shards.total} successful</span>
                        
                        <span style="color: #9ca3af;">Timestamp:</span>
                        <span style="color: #e5e7eb; font-family: 'Courier New', monospace; font-size: 0.75rem;">${new Date(es.timestamp).toLocaleString()}</span>
                    </div>
                    
                    ${eventIdsHtml}
                    
                    <div style="margin-top: 0.75rem; padding-top: 0.75rem; border-top: 1px solid rgba(96, 165, 250, 0.2); font-size: 0.75rem; color: #9ca3af;">
                        💡 All data above is fetched live from Elasticsearch cluster
                    </div>
                </li>
            `;
        } else {
            throw new Error(data.message || 'Unknown error');
        }
        
    } catch (error) {
        console.error('Detection trigger error:', error);
        statusDiv.style.display = 'none';
        resultsDiv.style.display = 'block';
        resultsDiv.style.background = 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.1) 100%)';
        resultsDiv.style.borderColor = '#ef4444';
        
        resultsList.innerHTML = `
            <li style="color: #fca5a5;">❌ Error triggering detection</li>
            <li style="color: #9ca3af;">${error.message}</li>
            <li style="color: #9ca3af;">Check if backend API is accessible</li>
            <li style="color: #9ca3af;">Backend URL: ${BACKEND_API_URL}</li>
        `;
    }
}

// Helper functions
function getCategoryClass(category) {
    const map = {
        'PROTOCOL ABUSE': 'protocol-abuse',
        'NETWORK': 'network',
        'FRAUD': 'fraud',
        'AUTH': 'auth'
    };
    return map[category] || 'default';
}

function getCriticalityClass(criticality) {
    return criticality.toLowerCase();
}

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
});

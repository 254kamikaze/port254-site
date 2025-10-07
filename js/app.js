// Add MITRE descriptions
    const mitreDescHtml = currentTest.mitre_attack_ids.map(id => {
        const desc = mitreDescriptions[id];
        if (desc) {
            return `<div style="margin-bottom: 0.75rem; padding: 0.75rem; background: #0a0a0a; border-radius: 0.375rem;">
                <strong style="color: #60a5fa; display: block; margin-bottom: 0.5rem;">${id}: ${desc.name}</strong>
                <div style="color: #9ca3af; font-size: 0.813rem; line-height: 1.6;">${desc.description}</div>
            </div>`;
        }
        return '';
    }).join('');
    document.getElementById('modalMitreDesc').innerHTML = mitreDescHtml;
    
    document.getElementById('modalIec').innerHTML = currentTest.iec62443_controls
        .map(c => `<span class="mapping-badge mapping-iec">${c}</span>`)
        .join('');
    
    // Add IEC descriptions
    const iecDescHtml = currentTest.iec62443_controls.map(c => {
        const desc = iecDescriptions[c];
        if (desc) {
            return `<div style="margin-bottom: 0.75rem; padding: 0.75rem; background: #0a0a0a; border-radius: 0.375rem;">
                <strong style="color: #c084fc; display: block; margin-bottom: 0.5rem;">${c}: ${desc.name}</strong>
                <div style="color: #9ca3af; font-size: 0.813rem; line-height: 1.6;">${desc.description}</div>
            </div>`;
        }
        return '';
    }).join('');
    document.getElementById('modalIecDesc').innerHTML = iecDescHtml;
    
    document.getElementById('modalTags').innerHTML = currentTest.tags
        .map(tag => `<span class="tag">${tag}</span>`)
        .join('');// Global state
let allTests = [];
let filteredTests = [];
let currentFilter = 'all';
let currentTest = null;

// MITRE ATT&CK descriptions
const mitreDescriptions = {
    'T1110': {
        name: 'Brute Force',
        description: 'Adversaries may use brute force techniques to gain access to accounts when passwords are unknown or when password hashes are obtained. Without knowledge of the password for an account or set of accounts, an adversary may systematically guess the password using a repetitive or iterative mechanism.'
    },
    'T1040': {
        name: 'Network Sniffing',
        description: 'Adversaries may sniff network traffic to capture information about an environment, including authentication material passed over the network. Network sniffing refers to using the network interface on a system to monitor or capture information sent over a wired or wireless connection.'
    },
    'T1046': {
        name: 'Network Service Discovery',
        description: 'Adversaries may attempt to get a listing of services running on remote hosts and local network infrastructure devices, including those that may be vulnerable to remote software exploitation.'
    },
    'T1078': {
        name: 'Valid Accounts',
        description: 'Adversaries may obtain and abuse credentials of existing accounts as a means of gaining Initial Access, Persistence, Privilege Escalation, or Defense Evasion. Compromised credentials may be used to bypass access controls placed on various resources.'
    },
    'T1542': {
        name: 'Pre-OS Boot',
        description: 'Adversaries may abuse Pre-OS Boot mechanisms as a way to establish persistence on a system. During the booting process of a computer, firmware and various startup services are loaded before the operating system.'
    },
    'T1537': {
        name: 'Transfer Data to Cloud Account',
        description: 'Adversaries may exfiltrate data by transferring the data to a cloud account they control. This could be done through various cloud storage services or by abusing legitimate cloud APIs.'
    }
};

// IEC 62443 control descriptions
const iecDescriptions = {
    'SR 1.1': {
        name: 'Human User Identification & Authentication',
        description: 'The control system shall provide the capability to identify and authenticate all human users. This requirement applies to all types of users, including operators, administrators, and maintenance personnel.'
    },
    'SR 3.2': {
        name: 'Malicious Code Protection',
        description: 'The control system shall provide the capability to protect itself from malicious code. This includes protection against viruses, worms, Trojan horses, and other forms of malware.'
    },
    'SR 5.1': {
        name: 'Network Segmentation',
        description: 'The control system shall provide the capability to segment the control system network from other networks. This includes logical or physical separation of control system networks from business networks.'
    },
    'SR 5.2': {
        name: 'Zone Boundary Protection',
        description: 'The control system shall provide the capability to protect zone boundaries. This includes monitoring and controlling communications at zone boundaries to enforce security policies.'
    },
    'SR 7.3': {
        name: 'Control System Backup',
        description: 'The control system shall provide the capability to back up system-level information and control system application software and configuration settings.'
    },
    'SR 7.6': {
        name: 'Network and Security Configuration Settings',
        description: 'The control system shall provide the capability to manage network and security configuration settings. This includes the ability to configure security parameters and audit security settings.'
    }
};

// Initialize app when DOM is ready
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
        // Fallback to empty state
        allTests = [];
        filteredTests = [];
        renderCards();
        updateStats();
    }
}

// Setup event listeners
function setupEventListeners() {
    // Search input
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', (e) => {
        filterTests();
    });

    // Filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Update active state
            filterButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            
            // Update filter
            currentFilter = e.target.dataset.filter;
            filterTests();
        });
    });

    // Modal close on outside click
    const modal = document.getElementById('detailModal');
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });

    const youtubeModal = document.getElementById('youtubeModal');
    youtubeModal.addEventListener('click', (e) => {
        if (e.target === youtubeModal) {
            closeYouTubeModal();
        }
    });
}

// Filter tests based on search and category
function filterTests() {
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
    
    filteredTests = allTests.filter(test => {
        // Category filter
        const matchesCategory = currentFilter === 'all' || test.domain === currentFilter;
        
        // Search filter
        const matchesSearch = !searchQuery || 
            test.title.toLowerCase().includes(searchQuery) ||
            test.identifier.toLowerCase().includes(searchQuery) ||
            test.description.toLowerCase().includes(searchQuery) ||
            test.tags.some(tag => tag.toLowerCase().includes(searchQuery)) ||
            test.mitre_attack_ids.some(id => id.toLowerCase().includes(searchQuery)) ||
            test.iec62443_controls.some(c => c.toLowerCase().includes(searchQuery));
        
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
        <div class="detection-card" onclick="openModal('${test.id}')">
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
                <a href="#" class="card-link" onclick="event.stopPropagation();">
                    Click for details
                    <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
                    </svg>
                </a>
            </div>
        </div>
    `).join('');
}

// Update statistics
function updateStats() {
    document.getElementById('totalTests').textContent = allTests.length;
    document.getElementById('categories').textContent = new Set(allTests.map(t => t.category)).size;
    document.getElementById('showing').textContent = filteredTests.length;
    
    const highPriority = allTests.filter(t => 
        t.criticality === 'HIGH' || t.criticality === 'CRITICAL'
    ).length;
    document.getElementById('highPriority').textContent = highPriority;
}

// Open detail modal
function openModal(testId) {
    currentTest = allTests.find(t => t.id === testId);
    if (!currentTest) return;
    
    // Populate modal
    document.getElementById('modalTitle').textContent = currentTest.title;
    
    document.getElementById('modalBadges').innerHTML = `
        <span class="badge badge-${getCategoryClass(currentTest.category)}">${currentTest.category}</span>
        <span class="badge badge-${getCriticalityClass(currentTest.criticality)}">${currentTest.criticality}</span>
    `;
    
    document.getElementById('modalDescription').textContent = currentTest.description;
    
    document.getElementById('modalMitre').innerHTML = currentTest.mitre_attack_ids
        .map(id => `<span class="mapping-badge mapping-mitre">${id}</span>`)
        .join('');
    
    // Add MITRE descriptions
    const mitreDescHtml = currentTest.mitre_attack_ids.map(id => {
        const desc = mitreDescriptions[id];
        if (desc) {
            return `<div style="margin-bottom: 0.75rem;"><strong>${id}: ${desc.name}</strong><div style="margin-top: 0.25rem;">${desc.description}</div></div>`;
        }
        return '';
    }).join('');
    document.getElementById('modalMitreDesc').innerHTML = mitreDescHtml;
    
    document.getElementById('modalIec').innerHTML = currentTest.iec62443_controls
        .map(c => `<span class="mapping-badge mapping-iec">${c}</span>`)
        .join('');
    
    // Add IEC descriptions
    const iecDescHtml = currentTest.iec62443_controls.map(c => {
        const desc = iecDescriptions[c];
        if (desc) {
            return `<div style="margin-bottom: 0.75rem;"><strong>${c}: ${desc.name}</strong><div style="margin-top: 0.25rem;">${desc.description}</div></div>`;
        }
        return '';
    }).join('');
    document.getElementById('modalIecDesc').innerHTML = iecDescHtml;
    
    document.getElementById('modalTags').innerHTML = currentTest.tags
        .map(tag => `<span class="tag">${tag}</span>`)
        .join('');
    
    // Set up resource iframes and links
    // Kibana
    const kibanaUrl = currentTest.kibana_url;
    document.getElementById('kibanaFrame').src = kibanaUrl !== '#' ? kibanaUrl : '';
    document.getElementById('kibanaOpenLink').href = kibanaUrl;
    
    // YouTube - embed directly
    const youtubeEmbedUrl = `https://www.youtube.com/embed/${currentTest.youtube_video_id}?rel=0`;
    document.getElementById('youtubeFrame').src = youtubeEmbedUrl;
    document.getElementById('youtubeOpenLink').href = `https://www.youtube.com/watch?v=${currentTest.youtube_video_id}`;
    
    // KML
    document.getElementById('kmlDownloadLink').href = currentTest.kml_url;
    const kmlSiteName = currentTest.domain === 'ot' ? 'Industrial Plant Locations' : 'Financial Branch Network';
    document.getElementById('kmlSiteName').textContent = kmlSiteName;
    
    const addedDate = new Date(currentTest.added_at);
    document.getElementById('modalDate').textContent = `Added: ${addedDate.toLocaleDateString()}`;
    
    // Show modal
    document.getElementById('detailModal').classList.add('active');
}

// Close detail modal
function closeModal() {
    document.getElementById('detailModal').classList.remove('active');
    // Stop videos when closing
    document.getElementById('youtubeFrame').src = '';
    document.getElementById('kibanaFrame').src = '';
    currentTest = null;
}

// Open YouTube modal (removed - now using inline embed)
function openYouTubeModal() {
    // Not needed anymore - YouTube is embedded directly
}

// Close YouTube modal (removed - now using inline embed)
function closeYouTubeModal() {
    // Not needed anymore
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
    if (e.key === 'Escape') {
        closeModal();
        closeYouTubeModal();
    }
});

// Trigger detection in lab
async function triggerDetection() {
    if (!currentTest) return;
    
    const statusDiv = document.getElementById('labStatus');
    const resultsDiv = document.getElementById('labResults');
    const resultsList = document.getElementById('labResultsList');
    const statusText = document.getElementById('labStatusText');
    
    // Show status
    statusDiv.style.display = 'flex';
    resultsDiv.style.display = 'none';
    statusText.textContent = 'Sending test events to ELK...';
    
    // Simulate API call to trigger detection
    // In production, replace with actual API endpoint
    try {
        // Mock API call - replace with your actual endpoint
        // const response = await fetch('/api/trigger-detection', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({
        //         detection_id: currentTest.id,
        //         test_id: `test-${Date.now()}`
        //     })
        // });
        
        // Simulate delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        statusText.textContent = 'Generating synthetic events...';
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        statusText.textContent = 'Indexing to Elasticsearch...';
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Hide status, show results
        statusDiv.style.display = 'none';
        resultsDiv.style.display = 'block';
        
        // Populate results
        resultsList.innerHTML = `
            <li>✓ Triggered ${currentTest.title}</li>
            <li>✓ Generated 15 synthetic events matching attack pattern</li>
            <li>✓ Events indexed to regseek-events-${new Date().toISOString().split('T')[0]}</li>
            <li>✓ Detection fired: ${currentTest.mitre_attack_ids.join(', ')}</li>
            <li>✓ View results in <a href="${currentTest.kibana_url}" target="_blank" style="color: #60a5fa;">Kibana Dashboard →</a></li>
        `;
        
    } catch (error) {
        statusDiv.style.display = 'none';
        alert('Error triggering detection. Please check your ELK connection.');
        console.error('Trigger error:', error);
    }
}

/* 
Production Implementation Guide:

Replace the mock triggerDetection() with actual API:

async function triggerDetection() {
    const response = await fetch('https://your-api.example.com/api/v1/trigger-detection', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer YOUR_API_KEY'
        },
        body: JSON.stringify({
            detection_id: currentTest.id,
            identifier: currentTest.identifier,
            test_count: 15,
            target_index: 'regseek-events-*'
        })
    });
    
    const result = await response.json();
    // Handle response and show results
}

Backend API endpoint should:
1. Receive detection ID
2. Generate synthetic events matching the attack pattern
3. Send to Logstash/Elasticsearch
4. Trigger the detection rule
5. Return results with Kibana dashboard URL
*/

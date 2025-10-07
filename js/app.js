// Global state
let allTests = [];
let filteredTests = [];
let currentFilter = 'all';
let currentTest = null;

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
    
    document.getElementById('modalIec').innerHTML = currentTest.iec62443_controls
        .map(c => `<span class="mapping-badge mapping-iec">${c}</span>`)
        .join('');
    
    document.getElementById('modalTags').innerHTML = currentTest.tags
        .map(tag => `<span class="tag">${tag}</span>`)
        .join('');
    
    document.getElementById('modalKibana').href = currentTest.kibana_url;
    document.getElementById('modalKml').href = currentTest.kml_url;
    
    const addedDate = new Date(currentTest.added_at);
    document.getElementById('modalDate').textContent = `Added: ${addedDate.toLocaleDateString()}`;
    
    // Show modal
    document.getElementById('detailModal').classList.add('active');
}

// Close detail modal
function closeModal() {
    document.getElementById('detailModal').classList.remove('active');
    currentTest = null;
}

// Open YouTube modal
function openYouTubeModal() {
    if (!currentTest) return;
    
    const youtubeUrl = `https://www.youtube.com/embed/${currentTest.youtube_video_id}?autoplay=1`;
    document.getElementById('youtubePlayer').src = youtubeUrl;
    document.getElementById('youtubeModal').classList.add('active');
}

// Close YouTube modal
function closeYouTubeModal() {
    document.getElementById('youtubeModal').classList.remove('active');
    document.getElementById('youtubePlayer').src = '';
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

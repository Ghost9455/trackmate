// STATE MANAGEMENT
let subjects = JSON.parse(localStorage.getItem('trackMate_subjects')) || [];
let overallChart = null;

// DOM Elements
const form = document.getElementById('add-subject-form');
const gridContainer = document.getElementById('subjects-grid');
const safeCountEl = document.getElementById('safe-count');
const criticalCountEl = document.getElementById('critical-count');
const radarCanvas = document.getElementById('overallRadarChart');
const themeToggle = document.getElementById('theme-toggle');
const themeLabel = document.getElementById('theme-label');

// Initialize Application
init();

function init() {
    setupTheme();
    renderSubjects();
    updateAnalytics();
    initializeChart();

    form.addEventListener('submit', handleFormSubmit);
    themeToggle.addEventListener('change', toggleTheme);
}

// DARK MODE LOGIC
function setupTheme() {
    const savedTheme = localStorage.getItem('trackMate_theme') || 'light';
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeToggle.checked = true;
        themeLabel.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
    }
}

function toggleTheme(e) {
    if (e.target.checked) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('trackMate_theme', 'dark');
        themeLabel.innerHTML = '<i class="fas fa-moon"></i> Dark Mode';
    } else {
        document.documentElement.setAttribute('data-theme', 'light');
        localStorage.setItem('trackMate_theme', 'light');
        themeLabel.innerHTML = '<i class="fas fa-sun"></i> Light Mode';
    }
    updateChart(); // Redraw chart for dark/light text scaling
}

function saveToStorage() {
    localStorage.setItem('trackMate_subjects', JSON.stringify(subjects));
}

function handleFormSubmit(e) {
    e.preventDefault();

    const subject = {
        id: Date.now(),
        name: document.getElementById('subject-name').value,
        attended: parseInt(document.getElementById('attended-classes').value),
        total: parseInt(document.getElementById('total-classes').value),
        target: parseFloat(document.getElementById('target-percent').value)
    };

    if (subject.attended > subject.total) {
        alert("Attended classes cannot exceed total classes held.");
        return;
    }

    subjects.push(subject);
    saveToStorage();
    form.reset();
    document.getElementById('target-percent').value = 75;

    refreshUI();
}

// QUICK ACTIONS: Mark Present/Absent
function markAttendance(id, isPresent) {
    const sub = subjects.find(s => s.id === id);
    if (!sub) return;

    sub.total += 1;
    if (isPresent) {
        sub.attended += 1;
    }

    saveToStorage();
    refreshUI();
}

function deleteSubject(id) {
    subjects = subjects.filter(sub => sub.id !== id);
    saveToStorage();
    refreshUI();
}

function refreshUI() {
    renderSubjects();
    updateAnalytics();
    updateChart();
}

function renderSubjects() {
    gridContainer.innerHTML = '';

    if (subjects.length === 0) {
        gridContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No subjects added yet. Add one above to get started!</p>';
        return;
    }

    subjects.forEach(sub => {
        const currentPercent = ((sub.attended / sub.total) * 100).toFixed(2);
        const isSafe = currentPercent >= sub.target;
        const statusClass = isSafe ? 'status-safe' : 'status-warning';

        let insightText = '';
        if (isSafe) {
            const canSkip = Math.floor((100 * sub.attended - sub.target * sub.total) / sub.target);
            insightText = canSkip === 0 
                ? `<i class="fas fa-check"></i> On track at ${sub.target}%. Don't miss upcoming classes.`
                : `<i class="fas fa-check"></i> On track! Can safely skip ${canSkip} class${canSkip > 1 ? 'es' : ''}.`;
        } else {
            const mustAttend = Math.ceil((sub.target * sub.total - 100 * sub.attended) / (100 - sub.target));
            insightText = `<i class="fas fa-exclamation-circle"></i> Below ${sub.target}%. Need next ${mustAttend} class${mustAttend > 1 ? 'es' : ''}.`;
        }

        const cardHTML = `
            <div class="card subject-card ${statusClass}">
                <button class="delete-btn" onclick="deleteSubject(${sub.id})"><i class="fas fa-times"></i></button>
                <h4>${sub.name}</h4>
                <div class="stat-line">
                    <span class="stat-percent">${currentPercent}%</span>
                    <span class="stat-meta">${sub.attended} / ${sub.total} Classes</span>
                </div>
                <div class="progress-box">
                    <div class="progress-bar" style="width: ${Math.min(currentPercent, 100)}%"></div>
                </div>
                <p class="insight-text">${insightText}</p>
                <div class="quick-actions">
                    <button class="action-btn present-btn" onclick="markAttendance(${sub.id}, true)">
                        <i class="fas fa-plus"></i> Present
                    </button>
                    <button class="action-btn absent-btn" onclick="markAttendance(${sub.id}, false)">
                        <i class="fas fa-minus"></i> Absent
                    </button>
                </div>
            </div>
        `;
        gridContainer.insertAdjacentHTML('beforeend', cardHTML);
    });
}

function updateAnalytics() {
    let safeCount = 0;
    let criticalCount = 0;

    subjects.forEach(sub => {
        const currentPercent = (sub.attended / sub.total) * 100;
        currentPercent >= sub.target ? safeCount++ : criticalCount++;
    });

    safeCountEl.textContent = safeCount;
    criticalCountEl.textContent = criticalCount;
}

function initializeChart() {
    if (subjects.length < 2) return;

    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const textColor = isDark ? '#94a3b8' : '#718096';

    const labels = subjects.map(sub => sub.name);
    const dataPercent = subjects.map(sub => ((sub.attended / sub.total) * 100).toFixed(0));

    overallChart = new Chart(radarCanvas, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Current %',
                data: dataPercent,
                fill: true,
                backgroundColor: 'rgba(99, 102, 241, 0.2)',
                borderColor: '#6366f1',
                pointBackgroundColor: '#fff',
                pointBorderColor: '#6366f1',
                pointRadius: 4
            }]
        },
        options: {
            maintainAspectRatio: false,
            scales: {
                r: {
                    angleLines: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
                    grid: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
                    suggestedMin: 0,
                    suggestedMax: 100,
                    pointLabels: { color: textColor, font: { size: 12, weight: '600' } },
                    ticks: { backdropColor: 'transparent', color: textColor }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
}

function updateChart() {
    if (overallChart) overallChart.destroy();
    initializeChart();
}
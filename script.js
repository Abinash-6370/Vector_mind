const searchInput = document.getElementById('search-input');
const searchSubmit = document.getElementById('search-submit');
const heroSection = document.getElementById('hero-section');
const resultsSection = document.getElementById('results-section');
const mainContainer = document.getElementById('main-container');
const aiResponseText = document.getElementById('ai-response-text');
const sourcesGrid = document.getElementById('sources-grid');
const relatedQuestions = document.getElementById('related-questions');
const suggestionChips = document.querySelectorAll('.chip');

// API CONFIG
const API_BASE_URL = "http://127.0.0.1:5000";
const WS_BASE_URL = "ws://127.0.0.1:5000";

// Mock Data
const MOCK_ANSWERS = {
    "default": "Based on the recent notices from the university archives, I found some relevant information. It appears there are multiple documents referencing this topic.",
    "exam": "The **3rd Semester Java Laboratory Exam** is scheduled for **February 15th, 2026**. The batch timings are divided into Morning (9:00 AM - 12:00 PM) and Afternoon (1:00 PM - 4:00 PM) sessions. Please refer to the official Examination Branch notice released on Jan 28th.",
    "scholarship": "The **OBC Post-Matric Scholarship** deadline has been extended to **March 10th, 2026**. Students must submit their income certificates and caste validity documents to the administrative office counter #4 before 5:00 PM.",
    "bus": "For Route #5 (City Center to Campus), the timing has changed effective Feb 1st. The morning bus now departs at **7:45 AM** instead of 8:00 AM due to ongoing road works on the Main Highway."
};

const MOCK_SOURCES = [
    { title: "Exam_Schedule_Feb2026_Final.pdf", date: "Jan 28, 2026", page: 2 },
    { title: "Scholarship_Circular_OBC_Revised.jpg", date: "Feb 02, 2026", page: 1 },
    { title: "Transport_Committee_Minutes.pdf", date: "Jan 15, 2026", page: 12 },
    { title: "Academic_Calendar_2025-26.pdf", date: "Aug 10, 2025", page: 5 }
];

const MOCK_RELATED = [
    "What is the passing criteria for the Java Lab?",
    "Where is the administrative office counter #4?",
    "Download scholarship application form",
    "Bus route map for 2026"
];

// Event Listeners
searchSubmit.addEventListener('click', (e) => {
    e.preventDefault();
    handleSearch();
});

searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        handleSearch();
    }
});

suggestionChips.forEach(chip => {
    chip.addEventListener('click', () => {
        searchInput.value = chip.innerText;
        handleSearch();
    });
});

async function handleSearch() {
    const query = searchInput.value;
    if (!query) return;

    // Transition UI
    heroSection.style.display = 'none';
    resultsSection.classList.remove('hidden');
    requestAnimationFrame(() => {
        resultsSection.classList.add('visible');
    });

    try {
        aiResponseText.innerHTML = "Thinking...";
        // Switching to GET as it's more standard for search queries
        const response = await fetch(`${API_BASE_URL}/ai/search?query=${encodeURIComponent(query)}`);

        if (!response.ok) {
            throw new Error(`Server responded with ${response.status}`);
        }

        const data = await response.json();

        // Simulate AI Streaming with real answer
        streamText(data.answer);

        // Render Sources dynamically if available
        renderSources(data.source ? [data.source] : []);
    } catch (error) {
        console.error("SEARCH ERROR:", error);
        streamText("Sorry, I'm having trouble connecting to the Digital Archaeology brain. Please check your browser's console (F12) for the specific error.");
        renderSources([]); // Clear sources on error
    }

    renderRelated();
}

function streamText(text) {
    aiResponseText.innerHTML = "";
    // Clean text to avoid "According to available information..." or similar vague headers
    const cleanedText = text.replace(/^(According to|Based on|I found|It appears|From the).*?,/i, "").trim();
    // Confidently capitalize the first letter of the cleaned text
    const finalAnswer = cleanedText.charAt(0).toUpperCase() + cleanedText.slice(1);

    const words = finalAnswer.split(" ");
    let i = 0;

    const interval = setInterval(() => {
        if (i >= words.length) {
            clearInterval(interval);
            return;
        }
        let word = words[i];
        if (word.includes("**")) {
            word = word.replace(/\*\*/g, "");
            aiResponseText.innerHTML += `<strong>${word}</strong> `;
        } else {
            aiResponseText.innerHTML += word + " ";
        }
        i++;
    }, 40);
}

function renderSources(sources = []) {
    sourcesGrid.innerHTML = "";

    // If no real sources, use mocks as fallbacks for demo
    const displaySources = (sources && sources.length > 0) ? sources : MOCK_SOURCES;

    displaySources.forEach(source => {
        const div = document.createElement('div');
        div.className = 'source-card';
        // Handle both mock and real source formats
        const title = source.title || source.filename;
        const date = source.date || "Unknown";
        const link = source.link || "#";
        const type = source.type || "PDF";

        div.innerHTML = `
            <div class="source-content">
                <div class="source-title">${title}</div>
                <div class="source-meta">
                    <span class="pdf-icon">📄 ${type.toUpperCase()}</span>
                    <span>${date}</span>
                </div>
            </div>
            <div class="source-link" style="margin-top: 0.5rem;">
                <a href="${link}" target="_blank" style="font-size: 0.8rem; color: var(--accent-color); text-decoration: none;">View Original</a>
            </div>
        `;
        sourcesGrid.appendChild(div);
    });
}

function renderRelated() {
    relatedQuestions.innerHTML = "";
    MOCK_RELATED.forEach(q => {
        const div = document.createElement('div');
        div.className = 'related-item';
        div.innerHTML = `
            <span>${q}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        `;
        relatedQuestions.appendChild(div);
    });
}

// Hardcoded Fallbacks
const TIMELINE_EVENTS = [
    { date: "10", month: "Feb", title: "OBC Scholarship" },
    { date: "15", month: "Feb", title: "Java Lab Exam" },
    { date: "18", month: "Feb", title: "Project Submission" },
    { date: "20", month: "Feb", title: "Tech Fest Registration" },
    { date: "22", month: "Feb", title: "Guest Lecture: AI" },
    { date: "06", month: "Mar", title: "Holi Holiday" }
];

// Elements
const notificationBtn = document.querySelector('#notification-bell button');
const notificationDropdown = document.querySelector('.notification-dropdown');
const notifList = document.querySelector('.notif-list');
const audioBtn = document.getElementById('audio-btn');
const timelineTrack = document.querySelector('.timeline-track');
const micBtn = document.getElementById('mic-btn');
const langSelect = document.getElementById('lang-select');

// Function Calls
// Check if elements exist before rendering to avoid errors if page structure isn't ready
if (timelineTrack) renderTimeline();
if (notifList) renderNotifications();

// Listeners
if (notificationBtn) {
    notificationBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notificationDropdown.classList.toggle('hidden');
    });
}

document.addEventListener('click', () => {
    if (notificationDropdown && !notificationDropdown.classList.contains('hidden')) {
        notificationDropdown.classList.add('hidden');
    }
});



// Functions
function renderTimeline() {
    timelineTrack.innerHTML = "";
    TIMELINE_EVENTS.forEach(event => {
        const div = document.createElement('div');
        div.className = 't-event';
        div.innerHTML = `
            <div class="t-date">
                <span>${event.date}</span>
                ${event.month}
            </div>
            <div class="t-title">${event.title}</div>
        `;
        timelineTrack.appendChild(div);
    });
}

const clearBtn = document.querySelector('.clear-btn');

async function renderNotifications(userId = "1") {
    if (!notifList) return;
    notifList.innerHTML = "";

    // Reset Badge initially
    const badge = document.querySelector('.badge');
    if (badge) badge.classList.add('hidden');

    try {
        const response = await fetch(`${API_BASE_URL}/notifications/latest/${userId}?t=${Date.now()}`);
        const data = await response.json();

        if (data.length === 0) {
            notifList.innerHTML = "<li style='padding:1rem; text-align:center; color:#888;'>No new notifications</li>";
            if (badge) badge.classList.add('hidden');
        } else {
            data.forEach(notif => addNotifToUI(notif));
            if (badge) {
                badge.textContent = data.length;
                badge.classList.remove('hidden');
                // Force display in case it was hidden by other styles
                badge.style.display = 'block';
            }
        }
    } catch (e) {
        console.error("Failed to fetch notifications:", e);
        notifList.innerHTML = "<li style='padding:1rem; text-align:center; color:red;'>Connection Error</li>";
    }
}

// Clear Button Logic
if (clearBtn) {
    clearBtn.addEventListener('click', async (e) => {
        e.stopPropagation(); // Prevent closing dropdown
        const userId = "1"; // Hardcoded for demo
        try {
            await fetch(`${API_BASE_URL}/notifications/clear/${userId}`, { method: 'POST' });
            renderNotifications(userId); // Refresh UI
        } catch (e) {
            console.error("Failed to clear:", e);
        }
    });
}

function addNotifToUI(notif) {
    const li = document.createElement('li');
    li.className = 'notif-item';
    li.innerHTML = `
        <span class="notif-icon">${notif.icon}</span>
        <span class="notif-text"><b>${notif.title}</b><br>${notif.desc}</span>
    `;
    notifList.prepend(li); // Newest at the top
}

// REAL-TIME NOTIFICATIONS (WEBSOCKET)
function setupWebSockets(userId) {
    if (!userId) return;

    const ws = new WebSocket(`${WS_BASE_URL}/notifications/ws/${userId}`);

    ws.onmessage = (event) => {
        const payload = JSON.parse(event.data);
        if (payload.type === "NEW_NOTIFICATION") {
            const notif = payload.data;
            addNotifToUI(notif);

            // Show Badge
            const badge = document.querySelector('.badge');
            if (badge) {
                badge.classList.remove('hidden');
                badge.textContent = parseInt(badge.textContent || 0) + 1;
                badge.style.display = 'block';
            }
        }
    };

    ws.onclose = () => {
        console.log("WebSocket disconnected. Retrying in 5s...");
        setTimeout(() => setupWebSockets(userId), 5000);
    };
}

function speakText(text) {
    if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        // Try to find a good voice
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = voices.find(v => v.name.includes('Google US English')) || voices[0];
        if (preferredVoice) utterance.voice = preferredVoice;

        window.speechSynthesis.speak(utterance);

        // Visual feedback
        const originalText = audioBtn.innerHTML;
        audioBtn.innerHTML = `🔊 Playing...`;
        utterance.onend = () => {
            audioBtn.innerHTML = originalText;
        };
    } else {
        alert("Text-to-Speech not supported in this browser.");
    }
}

// NAVIGATION Logic
const navLinks = document.querySelectorAll('.nav-item');
const views = document.querySelectorAll('.view-section');

navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();

        // Update nav active state
        navLinks.forEach(l => l.classList.remove('active'));
        link.classList.add('active');

        // Switch Views
        const targetId = link.getAttribute('data-target');
        views.forEach(view => {
            if (view.id === targetId) {
                view.classList.add('active-view');
                view.classList.remove('hidden'); // Ensure hidden class is removed
            } else {
                view.classList.remove('active-view');
                view.classList.add('hidden'); // Optional helper class if needed
            }
        });

        // Special case: If switching to home, ensure results are hidden/shown appropriately or reset
        // For now, we keep home state as is.
    });
});


// NOTICES Logic
let allNotices = []; // Will be fetched from backend
const noticesGrid = document.getElementById('notices-grid');
const filterBtns = document.querySelectorAll('.filter-btn');

async function renderNoticesUI(filter = 'all', forceRefresh = false) {
    if (!noticesGrid) return;

    // Only show spinner if we don't have data yet or if it's a forced refresh
    if (allNotices.length === 0 || forceRefresh) {
        noticesGrid.innerHTML = '<div class="loading-spinner">Loading notices...</div>';
    }

    try {
        if (allNotices.length === 0 || forceRefresh) {
            const response = await fetch(`${API_BASE_URL}/notices?t=${Date.now()}`);
            allNotices = await response.json();
        }

        noticesGrid.innerHTML = "";

        const filtered = filter === 'all'
            ? allNotices
            : allNotices.filter(n => n.type === filter);

        if (filtered.length === 0) {
            noticesGrid.innerHTML = '<div class="no-data">No notices found in this category.</div>';
            return;
        }

        filtered.forEach(notice => {
            const div = document.createElement('div');
            div.className = 'notice-item';
            div.innerHTML = `
                <span class="notice-badge tag-${notice.type}">${notice.type}</span>
                <span class="notice-date">${notice.date}</span>
                <h3>${notice.title}</h3>
                <div class="notice-actions">
                    <a href="${notice.link || '#'}" target="_blank" class="action-btn-styled btn-view track-notice-view" data-id="${notice.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        View PDF
                    </a>
                    <button class="action-btn-styled btn-save track-notice-save" data-id="${notice.id}" title="Save Notice">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v13a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                        Save
                    </button>
                    ${localStorage.getItem('user_role') === 'admin' ? `
                    <button class="action-btn-styled btn-delete delete-notice-btn" data-id="${notice.id}">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2-0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        Delete
                    </button>` : ''}
                </div>
            `;
            noticesGrid.appendChild(div);
        });

        // Add event listeners for tracking and actions
        document.querySelectorAll('.track-notice-view').forEach(link => {
            link.addEventListener('click', (e) => {
                const id = link.getAttribute('data-id');
                trackActivity(id, 'read');
            });
        });

        document.querySelectorAll('.track-notice-save').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = btn.getAttribute('data-id');
                trackActivity(id, 'save');
                showToast("Notice Saved", "This notice has been added to your saved items.", "success");
            });
        });

        // Add event listeners for delete buttons
        document.querySelectorAll('.delete-notice-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.getAttribute('data-id');
                if (confirm('Are you sure you want to delete this notice?')) {
                    try {
                        const response = await fetch(`${API_BASE_URL}/notices/${id}`, {
                            method: 'DELETE',
                            headers: {
                                'X-User-Role': localStorage.getItem('user_role') || 'user'
                            }
                        });
                        if (response.ok) {
                            // Clear state and re-render
                            allNotices = [];
                            renderNoticesUI(filter);
                        } else {
                            // Handle non-OK response for delete
                            console.error("Delete failed with status:", response.status);
                            showToast("Delete Failed", "Could not delete notice.", "error");
                        }
                    } catch (err) {
                        console.error("Delete failed:", err);
                        showToast("Delete Failed", "Network error or server issue.", "error");
                    }
                }
            });
        });

    } catch (e) {
        console.error("Error loading notices:", e);
        noticesGrid.innerHTML = '<div class="error-msg">Failed to load notices. Please try again later.</div>';
    }
}


// Init Notices
renderNoticesUI();
updateDashboardStats();

// TRACKING & STATS HELPER
async function trackActivity(notice_id, action) {
    try {
        await fetch(`${API_BASE_URL}/notices/track`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notice_id, action })
        });
        updateDashboardStats(); // Refresh dashboard on every action
    } catch (e) {
        console.error("Tracking failed:", e);
    }
}

async function updateDashboardStats() {
    const statRead = document.getElementById('stat-read');
    const statDeadlines = document.getElementById('stat-deadlines');
    const statSaved = document.getElementById('stat-saved');

    if (!statRead) return;

    try {
        const response = await fetch(`${API_BASE_URL}/users/stats`);
        const stats = await response.json();

        statRead.textContent = stats.read || 0;
        statDeadlines.textContent = stats.deadlines || 0;
        statSaved.textContent = stats.saved || 0;

        // Update dashboard-specific labels if they exist
        const dDeadlines = document.getElementById('d-deadlines-count');
        if (dDeadlines) dDeadlines.textContent = stats.deadlines;

    } catch (e) {
        console.error("Stats fetch failed:", e);
    }
}

// NOTICE FILTER LISTENERS
if (filterBtns) {
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active from all
            filterBtns.forEach(b => b.classList.remove('active'));
            // Add active to clicked
            btn.classList.add('active');

            // Get filter value
            const filterValue = btn.getAttribute('data-filter');
            renderNoticesUI(filterValue);
        });
    });
}
// SCROLL ANIMATIONS
const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px"
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target); // Only animate once
        }
    });
}, observerOptions);

document.querySelectorAll('.reveal-on-scroll').forEach(el => {
    observer.observe(el);
});

// Re-trigger observer when switching to About view
const aboutLink = document.querySelector('a[data-target="view-about"]');
if (aboutLink) {
    aboutLink.addEventListener('click', () => {
        setTimeout(() => {
            document.querySelectorAll('.reveal-on-scroll').forEach(el => {
                observer.observe(el);
            });
        }, 100);
    });
}


// VOICE ACCESSIBILITY & COMMANDS
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (micBtn && SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    micBtn.addEventListener('click', () => {
        if (micBtn.classList.contains('mic-active')) {
            recognition.stop();
        } else {
            recognition.start();
            micBtn.classList.add('mic-active');
        }
    });

    recognition.onend = () => {
        micBtn.classList.remove('mic-active');
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (searchInput) {
            searchInput.value = transcript;
            // Visual feedback for voice detection
            searchInput.style.borderColor = "var(--accent-color)";
            setTimeout(() => searchInput.style.borderColor = "", 1000);

            // Auto-trigger search
            handleSearch();
        }
    };
} else if (micBtn) {
    console.log("Speech Recognition Not Supported");
    micBtn.style.display = 'none';
}

function handleVoiceCommand(keyword) {
    // 1. Switch to Notices View
    const noticesNav = document.querySelector('a[data-target="view-notices"]');
    if (noticesNav) noticesNav.click();

    // 2. Click the filter button
    setTimeout(() => {
        const filterBtn = document.querySelector(`.filter-btn[data-filter="${keyword}"]`);
        if (filterBtn) filterBtn.click();
    }, 500);
}

// MULTI-LANGUAGE TTS
if (audioBtn) {
    audioBtn.addEventListener('click', () => {
        const textToSpeak = aiResponseText ? aiResponseText.innerText : "";
        if (!textToSpeak) return;

        const utterance = new SpeechSynthesisUtterance(textToSpeak);
        // Use selected language or default to English
        utterance.lang = (langSelect && langSelect.value) ? langSelect.value : 'en-US';

        // Visual Feedback
        const originalText = audioBtn.innerHTML;
        audioBtn.innerHTML = `🔊 ...`;

        utterance.onend = () => {
            audioBtn.innerHTML = originalText;
        };

        // Cancel existing and speak
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
    });
}

// USER PROFILE SYSTEM
const profileSetupForm = document.getElementById('profile-setup-form');
const interestChips = document.querySelectorAll('.i-chip');

// 1. Interest Selection Logic
interestChips.forEach(chip => {
    chip.addEventListener('click', () => {
        chip.classList.toggle('selected');
    });
});

// 2. Profile Save Handler
if (profileSetupForm) {
    profileSetupForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const name = document.getElementById('p-name').value;
        const id = document.getElementById('p-id').value;
        const course = document.getElementById('p-course').value;
        const sem = document.getElementById('p-sem').value;

        const interests = [];
        document.querySelectorAll('.i-chip.selected').forEach(chip => {
            interests.push(chip.dataset.val);
        });

        const userProfile = {
            name, id, course, sem, interests
        };

        // Save to LocalStorage
        localStorage.setItem('user_profile', JSON.stringify(userProfile));

        // Redirect to Profile Dashboard
        loadProfile();
        switchView('view-profile');
    });
}

// 3. Edit Profile Button
const editProfileBtn = document.getElementById('edit-profile-btn');
if (editProfileBtn) {
    editProfileBtn.addEventListener('click', () => {
        switchView('view-profile-setup');
    });
}

// 4. Load Profile logic
function loadProfile() {
    const saved = localStorage.getItem('user_profile');
    if (!saved) return false;

    const profile = JSON.parse(saved);

    // Update Dashboard
    const dName = document.getElementById('d-name');
    const dDetails = document.getElementById('d-details');
    const dId = document.getElementById('d-id');
    const dAvatar = document.getElementById('d-avatar');
    const dInterests = document.getElementById('d-interests');

    if (dName) {
        dName.textContent = profile.name;
        dDetails.textContent = `${profile.course} • ${profile.sem} Semester`;
        dId.textContent = `ID: ${profile.id}`;
        dAvatar.textContent = profile.name.charAt(0).toUpperCase();

        dInterests.innerHTML = "";
        profile.interests.forEach(int => {
            dInterests.innerHTML += `<span class="chip">${int.toUpperCase()}</span>`;
        });
    }

    // Update Navbar
    updateNavbarAuth(profile);

    // START REAL-TIME CONNECTION
    if (profile.id) {
        setupWebSockets(profile.id);
    }

    return true;
}

function updateNavbarAuth(profile) {
    // Replace Login button with Avatar
    // Find the Login button
    const loginLink = document.querySelector('a[href="login.html"]');
    if (loginLink && profile) {
        // Create Avatar Element
        const avatarLink = document.createElement('a');
        avatarLink.className = 'nav-avatar';
        avatarLink.textContent = profile.name.charAt(0).toUpperCase();
        avatarLink.href = "#";
        avatarLink.title = "View Profile";
        avatarLink.dataset.target = "view-profile";

        // Add click event for navigation
        avatarLink.addEventListener('click', (e) => {
            e.preventDefault();
            switchView('view-profile');
        });

        loginLink.replaceWith(avatarLink);
    }
}

// Helper to switch views programmatically
function switchView(viewId) {
    views.forEach(view => {
        if (view.id === viewId) {
            view.classList.remove('hidden');
            view.classList.add('active-view');
        } else {
            view.classList.add('hidden');
            view.classList.remove('active-view');
        }
    });

    // Update nav state if applicable
    const navLink = document.querySelector(`a[data-target="${viewId}"]`);
    if (navLink) {
        navLinks.forEach(l => l.classList.remove('active'));
        navLink.classList.add('active');
    } else {
        // Clear active stats if viewing non-nav view (like profile)
        navLinks.forEach(l => l.classList.remove('active'));
    }

}


// 5. Check Auth on Load
window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const isAuthRedirect = urlParams.get('auth');
    const hasProfile = loadProfile();

    if (isAuthRedirect) {
        // Came from Login Page
        if (hasProfile) {
            // Already set up, go home
            switchView('view-home');
        } else {
            // New user, Setup Profile
            switchView('view-profile-setup');
        }
    } else {
        // Normal load
        // Sync state with currently visible view (default: About)
        const activeView = document.querySelector('.view-section:not(.hidden)');
        if (activeView) {
            switchView(activeView.id);
        } else {
            // Fallback
            switchView('view-about');
        }
    }

    // Theme Init
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
});

// THEME TOGGLE LOGIC
const themeToggleBtn = document.getElementById('theme-toggle');
if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeIcon(newTheme);
    });
}

function updateThemeIcon(theme) {
    const sunIcon = document.querySelector('.icon-sun');
    const moonIcon = document.querySelector('.icon-moon');

    if (theme === 'light') {
        if (sunIcon) sunIcon.classList.remove('hidden');
        if (moonIcon) moonIcon.classList.add('hidden');
    } else {
        if (sunIcon) sunIcon.classList.add('hidden');
        if (moonIcon) moonIcon.classList.remove('hidden');
    }
}

// LOGOUT LOGIC
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        // Clear Profile
        localStorage.removeItem('user_profile');

        // Optional: Clear Theme? 
        // localStorage.removeItem('theme'); 

        // Redirect to Login
        window.location.href = 'login.html';
    });
}

// FILE UPLOAD LOGIC
const uploadBtn = document.getElementById('upload-btn');
const fileInput = document.getElementById('file-upload');

if (uploadBtn && fileInput) {
    uploadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            const fileName = file.name;
            const heroTitle = document.querySelector('.hero-title');
            const heroSubtitle = document.querySelector('.hero-subtitle');

            if (!heroTitle || !heroSubtitle) return;

            const originalTitle = heroTitle.innerHTML;
            const originalSubtitle = heroSubtitle.textContent;

            // Show Scanning State
            heroTitle.innerHTML = `Scanning <span class="gradient-text">${fileName}</span>`;
            heroSubtitle.textContent = "Extracting knowledge from your document using Digital Archaeology OCR Intelligence...";

            // Show Immediate Processing Toast
            showToast("Processing File", `I'm analyzing ${fileName} with OCR Intelligence.`, "info");

            // Create FormData
            const formData = new FormData();
            formData.append('file', file);

            try {
                const response = await fetch(`${API_BASE_URL}/upload`, {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) throw new Error("Failed to process file");

                const initialRes = await response.json();
                const taskId = initialRes.task_id;

                // Start Polling for Progress (Demo/Visible Scanning)
                if (taskId) {
                    const progressInterval = setInterval(async () => {
                        try {
                            const progResp = await fetch(`${API_BASE_URL}/upload/progress/${taskId}`);
                            const progData = await progResp.json();

                            if (progData.status === "scanning") {
                                heroSubtitle.textContent = `Scanning page ${progData.current} of ${progData.total}...`;
                            } else if (progData.status === "complete") {
                                clearInterval(progressInterval);
                                // Safety check to prevent multiple calls if status persists
                                if (taskId) {
                                    const finishedTaskId = taskId;
                                    // Set taskId to null locally to prevent re-triggering while finishing
                                    // (Interval is already cleared but extra safety)
                                    finishUpload(fileName, progData.result, originalTitle, originalSubtitle);
                                }
                            } else if (progData.status === "error") {
                                clearInterval(progressInterval);
                                throw new Error(progData.message || "OCR Error");
                            }
                        } catch (err) {
                            clearInterval(progressInterval);
                            console.error("Progress fetch error:", err);
                        }
                    }, 1000);
                } else {
                    // Fallback for cases where no task_id is returned
                    finishUpload(fileName, initialRes, originalTitle, originalSubtitle);
                }

            } catch (error) {
                console.error("UPLOAD ERROR:", error);
                heroTitle.innerHTML = `<span class="gradient-text">Oops!</span> Error Scanning`;
                heroSubtitle.textContent = "I couldn't read that file. Please make sure it's a valid PDF.";
                showToast("Upload Failed", "Could not process document.", "info");
                setTimeout(() => {
                    heroTitle.innerHTML = originalTitle;
                    heroSubtitle.textContent = originalSubtitle;
                }, 3000);
            }
        }
    });
}

function finishUpload(fileName, result, originalTitle, originalSubtitle) {
    const heroTitle = document.querySelector('.hero-title');
    const heroSubtitle = document.querySelector('.hero-subtitle');

    // Success State
    heroTitle.innerHTML = `<span class="gradient-text">Success!</span> Scanned ${fileName}`;
    heroSubtitle.textContent = "I've indexed this document. You can now search for its content.";

    // Show Pop-up (Toast) IMMEDIATELY
    showToast("New PDF Added", `File ${fileName} has been successfully indexed.`, "success");

    // Update Notifications and Notices LOCALLY
    const noticeType = result.type || "admin";
    const newNotice = {
        id: Date.now(),
        title: `Uploaded: ${fileName}`,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        type: noticeType,
        link: result.link || "#",
        content: result.summary || ""
    };

    const newNotif = {
        id: Date.now(),
        icon: "📄",
        title: "New PDF Added",
        desc: `File ${fileName} categorized as ${noticeType}.`
    };

    if (typeof allNotices !== 'undefined' && Array.isArray(allNotices)) {
        allNotices.unshift(newNotice);
        if (typeof renderNoticesUI === 'function') renderNoticesUI('all', false);
    }

    if (typeof addNotifToUI === 'function' && notifList) {
        addNotifToUI(newNotif);
        const badge = document.querySelector('.badge');
        if (badge) {
            badge.classList.remove('hidden');
            badge.textContent = parseInt(badge.textContent || 0) + 1;
            badge.style.display = 'block';
        }
    }

    // Switch to handleSearch to show the "Analysis"
    setTimeout(() => {
        if (typeof handleSearch === 'function') {
            searchInput.value = `Tell me about the content in ${fileName}`;
            handleSearch();
        }
    }, 1500);
}

// TOAST NOTIFICATION SYSTEM
function showToast(title, desc, type = "info") {
    console.log(`Showing Toast: ${title} - ${desc}`);
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = type === 'success' ? '✅' : 'ℹ️';

    toast.innerHTML = `
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
            <span class="toast-title">${title}</span>
            <span class="toast-desc">${desc}</span>
        </div>
    `;

    container.appendChild(toast);

    // Remove after 5s
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => toast.remove(), 500);
    }, 5000);
}


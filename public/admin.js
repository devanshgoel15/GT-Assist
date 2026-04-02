// ========== GT Assist CRM Dashboard ==========

// State
let currentStaff = null;
let currentTicketId = null;
let allStaffList = [];
let ticketsData = [];
let currentSection = 'dashboard';
let confirmCallback = null;

// ========== SVG Icons ==========
const ICONS = {
    dashboard: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
    tickets: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>',
    staff: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    analytics: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
    settings: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    assign: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>',
    messages: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    profile: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
    reports: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>',
};

// ========== Role-based nav config ==========
const NAV_CONFIG = {
    admin: [
        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
        { id: 'tickets', label: 'Tickets', icon: 'tickets', badge: true },
        { id: 'staff', label: 'Staff', icon: 'staff' },
        { id: 'teamchat', label: 'Chat', icon: 'messages' },
        { id: 'analytics', label: 'Analytics', icon: 'analytics' },
        { id: 'settings', label: 'Settings', icon: 'settings' },
    ],
    team: [
        { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
        { id: 'tickets', label: 'Tickets', icon: 'tickets', badge: true },
        { id: 'teamchat', label: 'Chat', icon: 'messages' },
        { id: 'analytics', label: 'Reports', icon: 'reports' },
    ],
    agent: [
        { id: 'tickets', label: 'My Tickets', icon: 'tickets', badge: true },
        { id: 'teamchat', label: 'Chat', icon: 'messages' },
        { id: 'profile', label: 'Profile', icon: 'profile' },
    ],
};

// Section → page title mapping
const PAGE_TITLES = {
    dashboard: 'Dashboard',
    tickets: 'Tickets',
    staff: 'Staff Management',
    analytics: 'Analytics & Reports',
    settings: 'Settings',
    profile: 'My Profile',
    teamchat: 'Team Chat',
};

// ========== DOM Elements ==========
const loginScreen = document.getElementById('loginScreen');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

// ========== API Helper ==========
async function apiFetch(url, options = {}) {
    const res = await fetch(url, options);
    if (res.status === 401) {
        currentStaff = null;
        showLogin();
        throw new Error('Session expired. Please login again.');
    }
    return res;
}

// ========== Auth ==========
async function checkAuth() {
    try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
            const data = await res.json();
            currentStaff = data.staff;
            showDashboard();
            return;
        }
    } catch (e) { /* Not authenticated */ }
    showLogin();
}

function showLogin() {
    loginScreen.classList.remove('hidden');
    dashboard.classList.add('hidden');
}

function showDashboard() {
    loginScreen.classList.add('hidden');
    dashboard.classList.remove('hidden');

    const role = currentStaff.role;

    // Update sidebar user info
    document.getElementById('sidebarUserName').textContent = currentStaff.name;
    document.getElementById('sidebarUserRole').textContent = role;
    document.getElementById('userAvatar').textContent = currentStaff.name.charAt(0).toUpperCase();
    document.getElementById('staffName').textContent = currentStaff.name;
    const roleBadge = document.getElementById('roleBadge');
    roleBadge.textContent = role;
    roleBadge.className = `role-badge ${role}`;

    // Welcome banner
    const welcomeBanner = document.getElementById('welcomeBanner');
    const welcomeHeading = document.getElementById('welcomeHeading');
    const welcomeSubtext = document.getElementById('welcomeSubtext');
    welcomeBanner.className = `welcome-banner ${role}`;

    if (role === 'admin') {
        document.title = 'GT Assist — Admin Panel';
        welcomeHeading.textContent = `Welcome back, ${currentStaff.name}`;
        welcomeSubtext.textContent = 'Full system overview — manage tickets, staff, and operations';
    } else if (role === 'team') {
        document.title = 'GT Assist — Supervisor Panel';
        welcomeHeading.textContent = `Hello, ${currentStaff.name}`;
        welcomeSubtext.textContent = 'Monitor all tickets, assign agents, and track resolution progress';
    } else if (role === 'agent') {
        document.title = 'GT Assist — My Tickets';
        welcomeHeading.textContent = `Hi, ${currentStaff.name}`;
        welcomeSubtext.textContent = 'View and respond to your assigned tickets';
    }

    // Render sidebar
    renderSidebar();

    // Navigate to default section
    const defaultSection = role === 'agent' ? 'tickets' : 'dashboard';
    navigateTo(defaultSection);

    // Load data
    loadTickets();
    if (role === 'admin' || role === 'team') {
        loadStaffList();
    }

    // Profile section
    if (role === 'agent') {
        document.getElementById('profileName').textContent = currentStaff.name;
        document.getElementById('profileEmail').textContent = currentStaff.email;
        document.getElementById('profileRole').textContent = role;
        document.getElementById('profileAvatar').textContent = currentStaff.name.charAt(0).toUpperCase();
    }

    // Settings
    if (role === 'admin') {
        document.getElementById('settingsRole').textContent = 'Administrator';
    }
}

// ========== Sidebar ==========
function renderSidebar() {
    const nav = document.getElementById('sidebarNav');
    const items = NAV_CONFIG[currentStaff.role] || [];
    nav.innerHTML = '';

    const group = document.createElement('div');
    group.className = 'sidebar-nav-group';

    items.forEach(item => {
        const btn = document.createElement('button');
        btn.className = 'sidebar-nav-item';
        btn.dataset.section = item.id;
        btn.innerHTML = `
            ${ICONS[item.icon] || ''}
            <span>${item.label}</span>
            ${item.badge ? '<span class="sidebar-nav-badge hidden" id="navBadge_' + item.id + '">0</span>' : ''}
        `;
        btn.addEventListener('click', () => navigateTo(item.id));
        group.appendChild(btn);
    });

    nav.appendChild(group);
}

function navigateTo(sectionId) {
    currentSection = sectionId;

    // Hide all sections
    document.querySelectorAll('.content-section').forEach(s => s.classList.add('hidden'));

    // Show target section
    const target = document.getElementById(sectionId + 'Section');
    if (target) target.classList.remove('hidden');

    // Update active nav
    document.querySelectorAll('.sidebar-nav-item').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.section === sectionId);
    });

    // Update page title
    document.getElementById('pageTitle').textContent = PAGE_TITLES[sectionId] || sectionId;

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');

    // Load section-specific data
    if (sectionId === 'staff') loadStaffMembers();
    if (sectionId === 'analytics') loadAnalytics();
    if (sectionId === 'tickets') renderTickets();
    if (sectionId === 'teamchat') loadTeamChat();
    if (sectionId === 'dashboard') {
        renderRecentTickets();
        updateStats();
    }
}

// Login form
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginError.classList.add('hidden');

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    try {
        const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (!res.ok) {
            loginError.textContent = data.error || 'Login failed';
            loginError.classList.remove('hidden');
            return;
        }

        currentStaff = data.staff;
        showDashboard();
    } catch (error) {
        loginError.textContent = 'Connection error. Please try again.';
        loginError.classList.remove('hidden');
    }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    currentStaff = null;
    showLogin();
});

// Sidebar toggle (mobile)
document.getElementById('sidebarToggle').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
});

// Notification bell — go to tickets
document.getElementById('notificationBell').addEventListener('click', () => {
    navigateTo('tickets');
});

// ========== Tickets ==========
const statusFilter = document.getElementById('statusFilter');
const priorityFilter = document.getElementById('priorityFilter');
const ticketsTable = document.getElementById('ticketsTable');

async function loadTickets() {
    try {
        ticketsTable.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading tickets...</p></div>';
        const res = await apiFetch('/api/admin/tickets');
        const data = await res.json();
        ticketsData = data.tickets || [];
        updateStats();
        updateNotificationBadge();
        renderTickets();
        renderRecentTickets();
    } catch (error) {
        ticketsTable.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⚠️</div><p class="empty-state-text">Failed to load tickets</p></div>';
    }
}

function updateStats() {
    const total = ticketsData.length;
    const open = ticketsData.filter(t => t.status === 'open').length;
    const inProgress = ticketsData.filter(t => t.status === 'in_progress').length;
    const resolved = ticketsData.filter(t => t.status === 'resolved' || t.status === 'closed').length;

    document.querySelector('#statTotal .stat-value').textContent = total;
    document.querySelector('#statOpen .stat-value').textContent = open;
    document.querySelector('#statProgress .stat-value').textContent = inProgress;
    document.querySelector('#statResolved .stat-value').textContent = resolved;
}

function updateNotificationBadge() {
    const openCount = ticketsData.filter(t => t.status === 'open').length;
    const badge = document.getElementById('notificationCount');
    const navBadge = document.getElementById('navBadge_tickets');

    if (openCount > 0) {
        badge.textContent = openCount;
        badge.classList.remove('hidden');
        if (navBadge) {
            navBadge.textContent = openCount;
            navBadge.classList.remove('hidden');
        }
    } else {
        badge.classList.add('hidden');
        if (navBadge) navBadge.classList.add('hidden');
    }
}

function getFilteredTickets() {
    const statusVal = statusFilter.value;
    const priorityVal = priorityFilter.value;
    let filtered = ticketsData;
    if (statusVal !== 'all') filtered = filtered.filter(t => t.status === statusVal);
    if (priorityVal !== 'all') filtered = filtered.filter(t => t.priority === priorityVal);
    return filtered;
}

function renderTickets() {
    const filtered = getFilteredTickets();
    const role = currentStaff?.role;
    const canAssign = role === 'admin' || role === 'team';

    // Update section title
    const title = document.getElementById('ticketsSectionTitle');
    if (role === 'agent') title.textContent = 'My Tickets';
    else if (role === 'team') title.textContent = 'Team Tickets';
    else title.textContent = 'All Support Tickets';

    if (filtered.length === 0) {
        ticketsTable.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <p class="empty-state-text">No tickets found</p>
                <p class="empty-state-sub">Try adjusting your filters or check back later</p>
            </div>`;
        return;
    }

    const rows = filtered.map(t => `
        <tr class="clickable" data-id="${t.id}">
            <td><strong>#${t.id}</strong></td>
            <td>${escapeHTML(t.subject)}</td>
            <td>${escapeHTML(t.user_name || 'Guest')}</td>
            <td><span class="status-pill ${t.status}">${formatStatus(t.status)}</span></td>
            <td><span class="priority-badge ${t.priority}">${t.priority}</span></td>
            <td>${escapeHTML(t.assigned_to_name || '—')}</td>
            <td>${formatDate(t.created_at)}</td>
        </tr>
    `).join('');

    ticketsTable.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Subject</th>
                    <th>Customer</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Assigned To</th>
                    <th>Created</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;

    ticketsTable.querySelectorAll('tr.clickable').forEach(row => {
        row.addEventListener('click', () => openTicketDetail(parseInt(row.dataset.id)));
    });
}

function renderRecentTickets() {
    const container = document.getElementById('recentTicketsTable');
    if (!container) return;

    const recent = ticketsData.slice(0, 5);

    if (recent.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <p class="empty-state-text">No tickets yet</p>
                <p class="empty-state-sub">New tickets will appear here</p>
            </div>`;
        return;
    }

    const rows = recent.map(t => `
        <tr class="clickable" data-id="${t.id}">
            <td><strong>#${t.id}</strong></td>
            <td>${escapeHTML(t.subject)}</td>
            <td><span class="status-pill ${t.status}">${formatStatus(t.status)}</span></td>
            <td><span class="priority-badge ${t.priority}">${t.priority}</span></td>
            <td>${formatDate(t.created_at)}</td>
        </tr>
    `).join('');

    container.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Subject</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Created</th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;

    container.querySelectorAll('tr.clickable').forEach(row => {
        row.addEventListener('click', () => openTicketDetail(parseInt(row.dataset.id)));
    });
}

statusFilter.addEventListener('change', renderTickets);
priorityFilter.addEventListener('change', renderTickets);
document.getElementById('refreshTickets').addEventListener('click', loadTickets);

// ========== Ticket Detail ==========
const ticketDetail = document.getElementById('ticketDetail');
const closeDetail = document.getElementById('closeDetail');
const detailBackdrop = ticketDetail.querySelector('.slide-over-backdrop');

function openTicketDetail(ticketId) {
    currentTicketId = ticketId;
    const ticket = ticketsData.find(t => t.id === ticketId);
    if (!ticket) return;

    const role = currentStaff.role;

    document.getElementById('detailTitle').textContent = `Ticket #${ticket.id}: ${ticket.subject}`;
    document.getElementById('detailStatus').value = ticket.status;
    document.getElementById('detailPrioritySelect').value = ticket.priority;
    document.getElementById('detailCustomer').textContent = ticket.user_name || 'Guest';
    document.getElementById('detailCreated').textContent = formatDate(ticket.created_at);
    document.getElementById('detailDescription').textContent = ticket.description || 'No description provided.';

    // Show/hide edit button (admin/team only)
    const editBtn = document.getElementById('editTicketBtn');
    if (role === 'admin' || role === 'team') {
        editBtn.classList.remove('hidden');
    } else {
        editBtn.classList.add('hidden');
    }

    // Show/hide assign row
    const assignRow = document.getElementById('assignRow');
    if (role === 'agent') {
        assignRow.classList.add('hidden');
    } else {
        assignRow.classList.remove('hidden');
    }

    // Populate assign dropdown
    const assignSelect = document.getElementById('detailAssign');
    assignSelect.innerHTML = '<option value="">Unassigned</option>';
    allStaffList.forEach(s => {
        const option = document.createElement('option');
        option.value = s.id;
        option.textContent = `${s.name} (${s.role})`;
        if (ticket.assigned_to === s.id) option.selected = true;
        assignSelect.appendChild(option);
    });

    // Load replies and notes
    loadReplies(ticketId);
    loadNotes(ticketId);

    ticketDetail.classList.remove('hidden');
}

function closeTicketDetail() {
    ticketDetail.classList.add('hidden');
    currentTicketId = null;
}

closeDetail.addEventListener('click', closeTicketDetail);
detailBackdrop.addEventListener('click', closeTicketDetail);

// Status change
document.getElementById('detailStatus').addEventListener('change', async (e) => {
    if (!currentTicketId) return;
    try {
        await apiFetch(`/api/admin/tickets/${currentTicketId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: e.target.value }),
        });
        loadTickets();
    } catch (error) {
        console.error('Failed to update status:', error);
    }
});

// Priority change
document.getElementById('detailPrioritySelect').addEventListener('change', async (e) => {
    if (!currentTicketId) return;
    try {
        await apiFetch(`/api/admin/tickets/${currentTicketId}/priority`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ priority: e.target.value }),
        });
        loadTickets();
    } catch (error) {
        console.error('Failed to update priority:', error);
    }
});

// Assign change
document.getElementById('detailAssign').addEventListener('change', async (e) => {
    if (!currentTicketId) return;
    const staffId = e.target.value;
    if (!staffId) return;
    try {
        await apiFetch(`/api/admin/tickets/${currentTicketId}/assign`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ staffId: parseInt(staffId) }),
        });
        loadTickets();
    } catch (error) {
        console.error('Failed to assign ticket:', error);
    }
});

// Edit ticket
document.getElementById('editTicketBtn').addEventListener('click', () => {
    if (!currentTicketId) return;
    const ticket = ticketsData.find(t => t.id === currentTicketId);
    if (!ticket) return;

    document.getElementById('editSubject').value = ticket.subject;
    document.getElementById('editDescription').value = ticket.description || '';
    document.getElementById('editTicketModal').classList.remove('hidden');
});

document.getElementById('editTicketForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const editError = document.getElementById('editError');
    editError.classList.add('hidden');

    const subject = document.getElementById('editSubject').value.trim();
    const description = document.getElementById('editDescription').value.trim();

    if (!subject) {
        editError.textContent = 'Subject is required';
        editError.classList.remove('hidden');
        return;
    }

    try {
        const res = await apiFetch(`/api/admin/tickets/${currentTicketId}/edit`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subject, description }),
        });
        if (!res.ok) {
            const data = await res.json();
            editError.textContent = data.error || 'Failed to edit ticket';
            editError.classList.remove('hidden');
            return;
        }
        document.getElementById('editTicketModal').classList.add('hidden');
        closeTicketDetail();
        loadTickets();
    } catch (error) {
        editError.textContent = error.message || 'Connection error';
        editError.classList.remove('hidden');
    }
});

document.getElementById('closeEditModal').addEventListener('click', () => {
    document.getElementById('editTicketModal').classList.add('hidden');
});
document.getElementById('editTicketModal').querySelector('.modal-backdrop').addEventListener('click', () => {
    document.getElementById('editTicketModal').classList.add('hidden');
});

// ========== Replies ==========
async function loadReplies(ticketId) {
    const repliesList = document.getElementById('repliesList');
    try {
        const res = await apiFetch(`/api/admin/tickets/${ticketId}/replies`);
        const data = await res.json();
        const replies = data.replies || [];

        if (replies.length === 0) {
            repliesList.innerHTML = '<p class="no-replies">No replies yet</p>';
        } else {
            repliesList.innerHTML = replies.map(r => `
                <div class="reply-item">
                    <div class="reply-header">
                        <span class="reply-author">${escapeHTML(r.staff_name)} (${r.staff_role})</span>
                        <span class="reply-time">${formatDate(r.created_at)}</span>
                    </div>
                    <div class="reply-text">${escapeHTML(r.message)}</div>
                </div>
            `).join('');
        }
    } catch (error) {
        repliesList.innerHTML = '<p class="no-replies">Failed to load replies</p>';
    }
}

document.getElementById('replyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = document.getElementById('replyMessage').value.trim();
    if (!message || !currentTicketId) return;

    try {
        await apiFetch(`/api/admin/tickets/${currentTicketId}/replies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message }),
        });
        document.getElementById('replyMessage').value = '';
        loadReplies(currentTicketId);
    } catch (error) {
        console.error('Failed to send reply:', error);
    }
});

// ========== Internal Notes ==========
async function loadNotes(ticketId) {
    const notesList = document.getElementById('notesList');
    try {
        const res = await apiFetch(`/api/admin/tickets/${ticketId}/notes`);
        const data = await res.json();
        const notes = data.notes || [];

        if (notes.length === 0) {
            notesList.innerHTML = '<p class="no-notes">No internal notes yet</p>';
        } else {
            notesList.innerHTML = notes.map(n => `
                <div class="note-item">
                    <div class="note-header">
                        <span class="note-author">${escapeHTML(n.staff_name)} (${n.staff_role})</span>
                        <span class="note-time">${formatDate(n.created_at)}</span>
                    </div>
                    <div class="note-text">${escapeHTML(n.content)}</div>
                </div>
            `).join('');
        }
    } catch (error) {
        notesList.innerHTML = '<p class="no-notes">Failed to load notes</p>';
    }
}

document.getElementById('noteForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const content = document.getElementById('noteContent').value.trim();
    if (!content || !currentTicketId) return;

    try {
        await apiFetch(`/api/admin/tickets/${currentTicketId}/notes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
        });
        document.getElementById('noteContent').value = '';
        loadNotes(currentTicketId);
    } catch (error) {
        console.error('Failed to add note:', error);
    }
});

// ========== Staff Management ==========
async function loadStaffList() {
    try {
        const res = await apiFetch('/api/admin/staff');
        const data = await res.json();
        allStaffList = data.staff || [];
    } catch (error) {
        console.error('Failed to load staff list:', error);
    }
}

async function loadStaffMembers() {
    await loadStaffList();
    renderStaffTable();
}

function renderStaffTable() {
    const staffTableEl = document.getElementById('staffTable');
    const role = currentStaff.role;

    if (allStaffList.length === 0) {
        staffTableEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">👥</div>
                <p class="empty-state-text">No staff members found</p>
            </div>`;
        return;
    }

    const rows = allStaffList.map(s => {
        const canChangeRole = role === 'admin' && s.id !== currentStaff.id;
        const roleCell = canChangeRole
            ? `<select class="role-select" data-staff-id="${s.id}" onchange="changeStaffRole(${s.id}, this.value)">
                   <option value="agent" ${s.role === 'agent' ? 'selected' : ''}>Agent</option>
                   <option value="team" ${s.role === 'team' ? 'selected' : ''}>Team</option>
                   <option value="admin" ${s.role === 'admin' ? 'selected' : ''}>Admin</option>
               </select>`
            : `<span class="role-badge ${s.role}">${s.role}</span>`;

        const deleteBtn = role === 'admin' && s.id !== currentStaff.id
            ? `<button class="btn-danger" onclick="deleteStaffMember(${s.id}, '${escapeHTML(s.name)}')">Delete</button>`
            : '';

        return `
            <tr>
                <td>${s.id}</td>
                <td><strong>${escapeHTML(s.name)}</strong></td>
                <td>${escapeHTML(s.email)}</td>
                <td>${roleCell}</td>
                <td>${formatDate(s.created_at)}</td>
                <td>${deleteBtn}</td>
            </tr>
        `;
    }).join('');

    staffTableEl.innerHTML = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Created</th>
                    <th></th>
                </tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

// Add Staff Modal
const staffModal = document.getElementById('staffModal');
const addStaffBtn = document.getElementById('addStaffBtn');
const closeStaffModal = document.getElementById('closeStaffModal');
const addStaffForm = document.getElementById('addStaffForm');
const staffError = document.getElementById('staffError');

addStaffBtn.addEventListener('click', () => staffModal.classList.remove('hidden'));
closeStaffModal.addEventListener('click', () => {
    staffModal.classList.add('hidden');
    addStaffForm.reset();
    staffError.classList.add('hidden');
});
staffModal.querySelector('.modal-backdrop').addEventListener('click', () => {
    staffModal.classList.add('hidden');
    addStaffForm.reset();
    staffError.classList.add('hidden');
});

addStaffForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    staffError.classList.add('hidden');

    const email = document.getElementById('staffEmail').value.trim();
    const password = document.getElementById('staffPassword').value;
    const name = document.getElementById('staffNameInput').value.trim();
    const role = document.getElementById('staffRole').value;

    try {
        const res = await apiFetch('/api/admin/staff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name, role }),
        });
        const data = await res.json();

        if (!res.ok) {
            staffError.textContent = data.error || 'Failed to create staff';
            staffError.classList.remove('hidden');
            return;
        }

        staffModal.classList.add('hidden');
        addStaffForm.reset();
        loadStaffMembers();
    } catch (error) {
        staffError.textContent = error.message || 'Connection error';
        staffError.classList.remove('hidden');
    }
});

// Delete staff with confirmation modal
window.deleteStaffMember = function (id, name) {
    showConfirmModal(`Are you sure you want to delete staff member "${name}"? This action cannot be undone.`, async () => {
        try {
            const res = await apiFetch(`/api/admin/staff/${id}`, { method: 'DELETE' });
            if (res.ok) {
                loadStaffMembers();
            } else {
                const data = await res.json();
                alert(data.error || 'Failed to delete');
            }
        } catch (error) {
            alert(error.message || 'Connection error');
        }
    });
};

// Change staff role
window.changeStaffRole = async function (id, newRole) {
    try {
        const res = await apiFetch(`/api/admin/staff/${id}/role`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ role: newRole }),
        });
        if (!res.ok) {
            const data = await res.json();
            alert(data.error || 'Failed to change role');
            loadStaffMembers(); // Revert select
        }
    } catch (error) {
        alert(error.message || 'Connection error');
        loadStaffMembers();
    }
};

// ========== Analytics ==========
async function loadAnalytics() {
    const statsEl = document.getElementById('analyticsStats');
    const agentEl = document.getElementById('agentPerformance');
    const chartEl = document.getElementById('priorityChart');

    statsEl.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading analytics...</p></div>';
    agentEl.innerHTML = '<div class="loading-state"><div class="spinner"></div><p>Loading...</p></div>';

    try {
        const res = await apiFetch('/api/analytics/enhanced');
        const data = await res.json();
        const a = data.analytics;

        // Stats cards
        statsEl.innerHTML = `
            <div class="analytics-card">
                <div class="analytics-card-value">${a.totalTickets}</div>
                <div class="analytics-card-label">Total Tickets</div>
            </div>
            <div class="analytics-card">
                <div class="analytics-card-value" style="color: var(--info)">${a.openTickets}</div>
                <div class="analytics-card-label">Open</div>
            </div>
            <div class="analytics-card">
                <div class="analytics-card-value" style="color: var(--warning)">${a.inProgressTickets}</div>
                <div class="analytics-card-label">In Progress</div>
            </div>
            <div class="analytics-card">
                <div class="analytics-card-value" style="color: var(--success)">${a.resolvedTickets}</div>
                <div class="analytics-card-label">Resolved</div>
            </div>
            <div class="analytics-card">
                <div class="analytics-card-value" style="color: var(--danger)">${a.unassignedTickets}</div>
                <div class="analytics-card-label">Unassigned</div>
            </div>
            <div class="analytics-card">
                <div class="analytics-card-value" style="color: var(--accent-light)">${a.avgResolutionHours || '—'}</div>
                <div class="analytics-card-label">Avg Resolution (hrs)</div>
            </div>
        `;

        // Agent performance table
        if (a.perAgent.length === 0) {
            agentEl.innerHTML = '<div class="empty-state"><p class="empty-state-text">No agent data yet</p></div>';
        } else {
            const agentRows = a.perAgent.map(ag => `
                <tr>
                    <td><strong>${escapeHTML(ag.name)}</strong></td>
                    <td><span class="role-badge ${ag.role}">${ag.role}</span></td>
                    <td>${ag.totalTickets}</td>
                    <td style="color: var(--info)">${ag.openTickets}</td>
                    <td style="color: var(--warning)">${ag.inProgressTickets}</td>
                    <td style="color: var(--success)">${ag.resolvedTickets}</td>
                </tr>
            `).join('');

            agentEl.innerHTML = `
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Agent</th>
                            <th>Role</th>
                            <th>Total</th>
                            <th>Open</th>
                            <th>In Progress</th>
                            <th>Resolved</th>
                        </tr>
                    </thead>
                    <tbody>${agentRows}</tbody>
                </table>
            `;
        }

        // Priority chart
        const priorities = ['high', 'normal', 'low'];
        const maxCount = Math.max(...priorities.map(p => a.priorityBreakdown[p] || 0), 1);

        chartEl.innerHTML = priorities.map(p => {
            const count = a.priorityBreakdown[p] || 0;
            const pct = (count / maxCount) * 100;
            return `
                <div class="chart-bar-row">
                    <div class="chart-bar-label">${p}</div>
                    <div class="chart-bar-track">
                        <div class="chart-bar-fill ${p}" style="width: ${pct}%"></div>
                    </div>
                    <div class="chart-bar-value">${count}</div>
                </div>
            `;
        }).join('');

    } catch (error) {
        statsEl.innerHTML = '<div class="empty-state"><p class="empty-state-text">Failed to load analytics</p><p class="empty-state-sub">You may not have permission to view this section</p></div>';
        agentEl.innerHTML = '';
        chartEl.innerHTML = '';
    }
}

document.getElementById('refreshAnalytics').addEventListener('click', loadAnalytics);

// ========== Confirmation Modal ==========
function showConfirmModal(message, callback) {
    confirmCallback = callback;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmModal').classList.remove('hidden');
}

document.getElementById('confirmOk').addEventListener('click', () => {
    document.getElementById('confirmModal').classList.add('hidden');
    if (confirmCallback) {
        confirmCallback();
        confirmCallback = null;
    }
});

document.getElementById('confirmCancel').addEventListener('click', () => {
    document.getElementById('confirmModal').classList.add('hidden');
    confirmCallback = null;
});

document.getElementById('confirmModal').querySelector('.modal-backdrop').addEventListener('click', () => {
    document.getElementById('confirmModal').classList.add('hidden');
    confirmCallback = null;
});

// ========== Helpers ==========
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}

function formatStatus(status) {
    const map = {
        open: 'Open',
        in_progress: 'In Progress',
        resolved: 'Resolved',
        closed: 'Closed',
    };
    return map[status] || status;
}

// ========== Team Chat ==========
let teamChatPollingId = null;

async function loadTeamChat() {
    const container = document.getElementById('teamchatMessages');
    try {
        const res = await apiFetch('/api/teamchat');
        const data = await res.json();
        const messages = data.messages || [];

        if (messages.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">💬</div><p class="empty-state-text">No messages yet</p><p class="empty-state-sub">Start the conversation with your team!</p></div>';
        } else {
            renderTeamMessages(messages);
        }
    } catch (error) {
        container.innerHTML = '<div class="empty-state"><p class="empty-state-text">Failed to load messages</p></div>';
    }

    // Start polling every 8 seconds when chat is open
    clearInterval(teamChatPollingId);
    teamChatPollingId = setInterval(() => {
        if (currentSection === 'teamchat') {
            refreshTeamChat();
        } else {
            clearInterval(teamChatPollingId);
        }
    }, 8000);
}

async function refreshTeamChat() {
    try {
        const res = await apiFetch('/api/teamchat');
        const data = await res.json();
        const messages = data.messages || [];
        if (messages.length > 0) {
            renderTeamMessages(messages);
        }
    } catch (e) { /* silent */ }
}

function renderTeamMessages(messages) {
    const container = document.getElementById('teamchatMessages');
    let html = '';
    let lastDate = '';

    messages.forEach(m => {
        const d = new Date(m.created_at);
        const dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

        if (dateStr !== lastDate) {
            html += `<div class="tchat-date-sep">${dateStr}</div>`;
            lastDate = dateStr;
        }

        const isSelf = currentStaff && m.staff_id === currentStaff.id;
        const initials = (m.staff_name || '?').charAt(0).toUpperCase();
        const role = m.staff_role || 'agent';
        const time = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

        html += `
            <div class="tchat-msg ${isSelf ? 'self' : ''}">
                <div class="tchat-avatar role-${role}">${initials}</div>
                <div class="tchat-body">
                    <div class="tchat-header">
                        <span class="tchat-name">${escapeHTML(m.staff_name || 'Unknown')}</span>
                        <span class="tchat-role ${role}">${role}</span>
                    </div>
                    <div class="tchat-bubble">${escapeHTML(m.content)}</div>
                    <span class="tchat-time">${time}</span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
    // Auto-scroll to bottom
    container.scrollTop = container.scrollHeight;
}

// Send message
document.getElementById('teamchatForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('teamchatInput');
    const content = input.value.trim();
    if (!content) return;

    input.value = '';

    try {
        await apiFetch('/api/teamchat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content }),
        });
        await refreshTeamChat();
    } catch (error) {
        console.error('Failed to send message:', error);
    }
});

// ========== Init ==========
checkAuth();

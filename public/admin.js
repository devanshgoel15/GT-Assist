// ========== GT Assist Admin Dashboard ==========

// State
let currentStaff = null;
let currentTicketId = null;
let allStaffList = [];

// DOM elements
const loginScreen = document.getElementById("loginScreen");
const dashboard = document.getElementById("dashboard");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const roleBadge = document.getElementById("roleBadge");
const staffNameEl = document.getElementById("staffName");
const logoutBtn = document.getElementById("logoutBtn");
const staffTab = document.getElementById("staffTab");

// ========== API Helper ==========
// Wraps fetch to auto-detect 401 (expired session) and redirect to login
async function apiFetch(url, options = {}) {
    const res = await fetch(url, options);
    if (res.status === 401) {
        currentStaff = null;
        showLogin();
        throw new Error("Session expired. Please login again.");
    }
    return res;
}

// ========== Auth ==========

async function checkAuth() {
    try {
        const res = await fetch("/api/auth/me");
        if (res.ok) {
            const data = await res.json();
            currentStaff = data.staff;
            showDashboard();
            return;
        }
    } catch (e) {
        // Not authenticated
    }
    showLogin();
}

function showLogin() {
    loginScreen.classList.remove("hidden");
    dashboard.classList.add("hidden");
}

function showDashboard() {
    loginScreen.classList.add("hidden");
    dashboard.classList.remove("hidden");

    const role = currentStaff.role;

    // Set user info
    staffNameEl.textContent = currentStaff.name;
    roleBadge.textContent = role;
    roleBadge.className = `role-badge ${role}`;

    // ========== Role-based dashboard customization ==========
    const dashboardTitle = document.getElementById("dashboardTitle");
    const welcomeHeading = document.getElementById("welcomeHeading");
    const welcomeSubtext = document.getElementById("welcomeSubtext");
    const welcomeBanner = document.getElementById("welcomeBanner");
    const ticketsSectionTitle = document.getElementById("ticketsSectionTitle");
    const assignRow = document.getElementById("assignRow");
    const ticketsTab = document.getElementById("ticketsTab");

    // Reset classes
    welcomeBanner.className = `welcome-banner ${role}`;

    if (role === "admin") {
        // Admin: Full access - admin panel feel
        document.title = "GT Assist — Admin Panel";
        dashboardTitle.textContent = "Admin Panel";
        welcomeHeading.textContent = `Welcome back, ${currentStaff.name}`;
        welcomeSubtext.textContent = "Full system overview — manage tickets, staff, and operations";
        ticketsSectionTitle.textContent = "All Support Tickets";
        ticketsTab.textContent = "Tickets";
        staffTab.classList.remove("hidden");
        if (assignRow) assignRow.classList.remove("hidden");

    } else if (role === "team") {
        // Team: Supervisor feel - sees everything, assigns, monitors
        document.title = "GT Assist — Supervisor Panel";
        dashboardTitle.textContent = "Supervisor Panel";
        welcomeHeading.textContent = `Hello, ${currentStaff.name}`;
        welcomeSubtext.textContent = "Monitor all tickets, assign agents, and track resolution progress";
        ticketsSectionTitle.textContent = "Team Tickets Overview";
        ticketsTab.textContent = "Team Tickets";
        staffTab.classList.add("hidden");
        if (assignRow) assignRow.classList.remove("hidden");

    } else if (role === "agent") {
        // Agent: Personal queue - only assigned tickets
        document.title = "GT Assist — My Tickets";
        dashboardTitle.textContent = "My Tickets";
        welcomeHeading.textContent = `Hi, ${currentStaff.name}`;
        welcomeSubtext.textContent = "View and respond to your assigned tickets";
        ticketsSectionTitle.textContent = "Assigned to You";
        ticketsTab.textContent = "My Tickets";
        staffTab.classList.add("hidden");
        if (assignRow) assignRow.classList.add("hidden");
    }

    loadTickets();
    if (role === "admin" || role === "team") {
        loadStaffList();
    }
}

loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    loginError.classList.add("hidden");

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    try {
        const res = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });
        const data = await res.json();

        if (!res.ok) {
            loginError.textContent = data.error || "Login failed";
            loginError.classList.remove("hidden");
            return;
        }

        currentStaff = data.staff;
        showDashboard();
    } catch (error) {
        loginError.textContent = "Connection error. Please try again.";
        loginError.classList.remove("hidden");
    }
});

logoutBtn.addEventListener("click", async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    currentStaff = null;
    showLogin();
});

// ========== Tab Navigation ==========

document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
        document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");

        const target = tab.dataset.tab;
        document.getElementById("ticketsSection").classList.toggle("hidden", target !== "tickets");
        document.getElementById("staffSection").classList.toggle("hidden", target !== "staff");

        if (target === "staff") loadStaffMembers();
    });
});

// ========== Tickets ==========

const statusFilter = document.getElementById("statusFilter");
const ticketsTable = document.getElementById("ticketsTable");
const refreshTickets = document.getElementById("refreshTickets");

let ticketsData = [];

async function loadTickets() {
    try {
        const res = await apiFetch("/api/admin/tickets");
        const data = await res.json();
        ticketsData = data.tickets || [];
        updateStats();
        renderTickets();
    } catch (error) {
        ticketsTable.innerHTML = '<p class="empty-state">Failed to load tickets</p>';
    }
}

function updateStats() {
    const total = ticketsData.length;
    const open = ticketsData.filter(t => t.status === "open").length;
    const inProgress = ticketsData.filter(t => t.status === "in_progress").length;
    const resolved = ticketsData.filter(t => t.status === "resolved").length;

    document.querySelector("#statTotal .stat-value").textContent = total;
    document.querySelector("#statOpen .stat-value").textContent = open;
    document.querySelector("#statProgress .stat-value").textContent = inProgress;
    document.querySelector("#statResolved .stat-value").textContent = resolved;
}

function renderTickets() {
    const filter = statusFilter.value;
    let filtered = ticketsData;
    if (filter !== "all") {
        filtered = ticketsData.filter((t) => t.status === filter);
    }

    if (filtered.length === 0) {
        ticketsTable.innerHTML = '<p class="empty-state">No tickets found</p>';
        return;
    }

    const rows = filtered
        .map(
            (t) => `
    <tr class="clickable" data-id="${t.id}">
      <td><strong>#${t.id}</strong></td>
      <td>${escapeHTML(t.subject)}</td>
      <td>${escapeHTML(t.user_name || "Guest")}</td>
      <td><span class="status-pill ${t.status}">${formatStatus(t.status)}</span></td>
      <td><span class="priority-badge ${t.priority}">${t.priority}</span></td>
      <td>${escapeHTML(t.assigned_to_name || "—")}</td>
      <td>${formatDate(t.created_at)}</td>
    </tr>
  `
        )
        .join("");

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

    // Bind row clicks
    ticketsTable.querySelectorAll("tr.clickable").forEach((row) => {
        row.addEventListener("click", () => {
            openTicketDetail(parseInt(row.dataset.id));
        });
    });
}

statusFilter.addEventListener("change", renderTickets);
refreshTickets.addEventListener("click", loadTickets);

// ========== Ticket Detail ==========

const ticketDetail = document.getElementById("ticketDetail");
const closeDetail = document.getElementById("closeDetail");
const detailBackdrop = ticketDetail.querySelector(".slide-over-backdrop");

function openTicketDetail(ticketId) {
    currentTicketId = ticketId;
    const ticket = ticketsData.find((t) => t.id === ticketId);
    if (!ticket) return;

    document.getElementById("detailTitle").textContent = `Ticket #${ticket.id}: ${ticket.subject}`;
    document.getElementById("detailStatus").value = ticket.status;
    document.getElementById("detailPriority").textContent = ticket.priority;
    document.getElementById("detailPriority").className = `priority-badge ${ticket.priority}`;
    document.getElementById("detailCustomer").textContent = ticket.user_name || "Guest";
    document.getElementById("detailCreated").textContent = formatDate(ticket.created_at);
    document.getElementById("detailDescription").textContent = ticket.description || "No description provided.";

    // Populate assign dropdown
    const assignSelect = document.getElementById("detailAssign");
    assignSelect.innerHTML = '<option value="">Unassigned</option>';
    allStaffList.forEach((s) => {
        const option = document.createElement("option");
        option.value = s.id;
        option.textContent = `${s.name} (${s.role})`;
        if (ticket.assigned_to === s.id) option.selected = true;
        assignSelect.appendChild(option);
    });

    // Load replies
    loadReplies(ticketId);

    ticketDetail.classList.remove("hidden");
}

function closeTicketDetail() {
    ticketDetail.classList.add("hidden");
    currentTicketId = null;
}

closeDetail.addEventListener("click", closeTicketDetail);
detailBackdrop.addEventListener("click", closeTicketDetail);

// Status change
document.getElementById("detailStatus").addEventListener("change", async (e) => {
    if (!currentTicketId) return;
    try {
        await apiFetch(`/api/admin/tickets/${currentTicketId}/status`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: e.target.value }),
        });
        loadTickets();
    } catch (error) {
        console.error("Failed to update status:", error);
    }
});

// Assign change
document.getElementById("detailAssign").addEventListener("change", async (e) => {
    if (!currentTicketId) return;
    const staffId = e.target.value;
    if (!staffId) return;
    try {
        await apiFetch(`/api/admin/tickets/${currentTicketId}/assign`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ staffId: parseInt(staffId) }),
        });
        loadTickets();
    } catch (error) {
        console.error("Failed to assign ticket:", error);
    }
});

// ========== Replies ==========

async function loadReplies(ticketId) {
    const repliesList = document.getElementById("repliesList");
    try {
        const res = await apiFetch(`/api/admin/tickets/${ticketId}/replies`);
        const data = await res.json();
        const replies = data.replies || [];

        if (replies.length === 0) {
            repliesList.innerHTML = '<p class="no-replies">No replies yet</p>';
        } else {
            repliesList.innerHTML = replies
                .map(
                    (r) => `
        <div class="reply-item">
          <div class="reply-header">
            <span class="reply-author">${escapeHTML(r.staff_name)} (${r.staff_role})</span>
            <span class="reply-time">${formatDate(r.created_at)}</span>
          </div>
          <div class="reply-text">${escapeHTML(r.message)}</div>
        </div>
      `
                )
                .join("");
        }
    } catch (error) {
        repliesList.innerHTML = '<p class="no-replies">Failed to load replies</p>';
    }
}

const replyForm = document.getElementById("replyForm");
replyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const message = document.getElementById("replyMessage").value.trim();
    if (!message || !currentTicketId) return;

    try {
        await apiFetch(`/api/admin/tickets/${currentTicketId}/replies`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message }),
        });
        document.getElementById("replyMessage").value = "";
        loadReplies(currentTicketId);
    } catch (error) {
        console.error("Failed to send reply:", error);
    }
});

// ========== Staff Management ==========

async function loadStaffList() {
    try {
        const res = await apiFetch("/api/admin/staff");
        const data = await res.json();
        allStaffList = data.staff || [];
    } catch (error) {
        console.error("Failed to load staff list:", error);
    }
}

async function loadStaffMembers() {
    await loadStaffList();
    renderStaffTable();
}

function renderStaffTable() {
    const staffTableEl = document.getElementById("staffTable");

    if (allStaffList.length === 0) {
        staffTableEl.innerHTML = '<p class="empty-state">No staff members found</p>';
        return;
    }

    const rows = allStaffList
        .map(
            (s) => `
    <tr>
      <td>${s.id}</td>
      <td><strong>${escapeHTML(s.name)}</strong></td>
      <td>${escapeHTML(s.email)}</td>
      <td><span class="role-badge ${s.role}">${s.role}</span></td>
      <td>${formatDate(s.created_at)}</td>
      <td>${currentStaff.role === "admin" && s.id !== currentStaff.id
                    ? `<button class="btn-danger" onclick="deleteStaffMember(${s.id})">Delete</button>`
                    : ""
                }</td>
    </tr>
  `
        )
        .join("");

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
const staffModal = document.getElementById("staffModal");
const addStaffBtn = document.getElementById("addStaffBtn");
const closeStaffModal = document.getElementById("closeStaffModal");
const addStaffForm = document.getElementById("addStaffForm");
const staffError = document.getElementById("staffError");

addStaffBtn.addEventListener("click", () => staffModal.classList.remove("hidden"));
closeStaffModal.addEventListener("click", () => {
    staffModal.classList.add("hidden");
    addStaffForm.reset();
    staffError.classList.add("hidden");
});
staffModal.querySelector(".modal-backdrop").addEventListener("click", () => {
    staffModal.classList.add("hidden");
    addStaffForm.reset();
    staffError.classList.add("hidden");
});

addStaffForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    staffError.classList.add("hidden");

    const email = document.getElementById("staffEmail").value.trim();
    const password = document.getElementById("staffPassword").value;
    const name = document.getElementById("staffNameInput").value.trim();
    const role = document.getElementById("staffRole").value;

    try {
        const res = await apiFetch("/api/admin/staff", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password, name, role }),
        });
        const data = await res.json();

        if (!res.ok) {
            staffError.textContent = data.error || "Failed to create staff";
            staffError.classList.remove("hidden");
            return;
        }

        staffModal.classList.add("hidden");
        addStaffForm.reset();
        loadStaffMembers();
    } catch (error) {
        staffError.textContent = error.message || "Connection error";
        staffError.classList.remove("hidden");
    }
});

// Global delete function (called from inline onclick)
window.deleteStaffMember = async function (id) {
    if (!confirm("Are you sure you want to delete this staff member?")) return;

    try {
        const res = await apiFetch(`/api/admin/staff/${id}`, { method: "DELETE" });
        if (res.ok) {
            loadStaffMembers();
        } else {
            const data = await res.json();
            alert(data.error || "Failed to delete");
        }
    } catch (error) {
        alert(error.message || "Connection error");
    }
};

// ========== Helpers ==========

function escapeHTML(str) {
    if (!str) return "";
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function formatDate(dateStr) {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatStatus(status) {
    const map = {
        open: "Open",
        in_progress: "In Progress",
        resolved: "Resolved",
        closed: "Closed",
    };
    return map[status] || status;
}

// ========== Init ==========
checkAuth();

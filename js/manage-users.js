// ==================================================
// BookNest - Manage Users JS File
// Student Project Style
// ==================================================

let usersList = [];
let searchQuery = "";

document.addEventListener("DOMContentLoaded", function() {
    console.log("Manage Users JS Loaded!");

    // 1. Enforce Admin Authentication
    const isLoggedIn = localStorage.getItem("isLoggedIn") === "true";
    const role = localStorage.getItem("role");

    if (!isLoggedIn || role !== "admin") {
        alert("Access Denied! Administrators only.");
        window.location.href = "login.html";
        return;
    }

    // 2. Load users from backend
    loadUsersFromDatabase();

    // 3. Search filter handler
    const searchInput = document.getElementById("userSearchInput");
    if (searchInput) {
        searchInput.addEventListener("input", function() {
            searchQuery = searchInput.value.toLowerCase().trim();
            renderUsersTable();
        });
    }

    // 4. Modal close handlers
    const userDetailsModal = document.getElementById("userDetailsModal");
    const btnCloseUserModal = document.getElementById("btnCloseUserModal");
    if (btnCloseUserModal && userDetailsModal) {
        btnCloseUserModal.addEventListener("click", function() {
            userDetailsModal.style.display = "none";
        });

        // Close on background click
        window.addEventListener("click", function(e) {
            if (e.target === userDetailsModal) {
                userDetailsModal.style.display = "none";
            }
        });
    }
});

// Load the list of users from the ManageUsersServlet
function loadUsersFromDatabase() {
    fetch("../ManageUsersServlet")
        .then(function(res) {
            return res.json();
        })
        .then(function(data) {
            if (Array.isArray(data)) {
                usersList = data;
                renderUsersTable();
            } else {
                console.error("Invalid users data structure:", data);
            }
        })
        .catch(function(err) {
            console.error("Error loading users:", err);
            alert("Error connecting to the server to fetch user details.");
        });
}

// Render the users table with filters
function renderUsersTable() {
    const tableBody = document.getElementById("adminUsersTableBody");
    if (!tableBody) return;

    // Filter users list based on query
    const filtered = usersList.filter(user => {
        return (
            user.fullName.toLowerCase().includes(searchQuery) ||
            user.email.toLowerCase().includes(searchQuery)
        );
    });

    tableBody.innerHTML = "";

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 30px; color: #64748b;">
                    No users found matching query.
                </td>
            </tr>
        `;
        return;
    }

    filtered.forEach(user => {
        const row = document.createElement("tr");

        row.innerHTML = `
            <td><strong>${user.id}</strong></td>
            <td>
                <span class="user-clickable-name" style="color: #3b82f6; font-weight: bold; cursor: pointer; text-decoration: underline;">
                    ${user.fullName}
                </span>
            </td>
            <td>${user.email}</td>
            <td>${user.phone || "-"}</td>
            <td>${user.favGenre || "-"}</td>
            <td>
                <button class="btn_view" data-id="${user.id}">View Details</button>
                <button class="btn_action_delete" data-id="${user.id}">Delete</button>
            </td>
        `;

        // Click on Name or View Details button opens the detailed view modal
        row.querySelector(".user-clickable-name").addEventListener("click", function() {
            openUserDetails(user.id);
        });
        row.querySelector(".btn_view").addEventListener("click", function() {
            openUserDetails(user.id);
        });

        // Click on Delete calls the delete service
        row.querySelector(".btn_action_delete").addEventListener("click", function() {
            deleteUser(user.id, user.fullName);
        });

        tableBody.appendChild(row);
    });
}

// Fetch a single user's profile and reading history, then display in modal
function openUserDetails(userId) {
    fetch("../ManageUsersServlet?selectedUserId=" + userId)
        .then(function(res) {
            return res.json();
        })
        .then(function(data) {
            if (data.status === "success") {
                // Populate Profile Section
                document.getElementById("detFullName").textContent = data.fullName;
                document.getElementById("detEmail").textContent = data.email;
                document.getElementById("detPhone").textContent = data.phone || "-";
                document.getElementById("detGenre").textContent = data.favGenre || "-";

                // Populate Reading History Table
                const historyBody = document.getElementById("userHistoryTableBody");
                if (historyBody) {
                    historyBody.innerHTML = "";
                    if (data.history && data.history.length > 0) {
                        data.history.forEach(item => {
                            const tr = document.createElement("tr");
                            tr.innerHTML = `
                                <td><strong>${item.title}</strong></td>
                                <td>${item.author}</td>
                                <td><span style="background: #f1f5f9; padding: 2px 6px; border-radius: 4px;">${item.category}</span></td>
                                <td>Page <strong>${item.currentPage}</strong></td>
                                <td>${item.lastRead}</td>
                            `;
                            historyBody.appendChild(tr);
                        });
                    } else {
                        historyBody.innerHTML = `
                            <tr>
                                <td colspan="5" style="text-align: center; padding: 20px; color: #64748b;">
                                    This user has not read any ebooks yet.
                                </td>
                            </tr>
                        `;
                    }
                }

                // Show Modal
                const modal = document.getElementById("userDetailsModal");
                if (modal) {
                    modal.style.display = "flex";
                }
            } else {
                alert(data.message);
            }
        })
        .catch(function(err) {
            console.error("Error fetching user details:", err);
            alert("Error connecting to server to fetch profile data.");
        });
}

// Delete user account
function deleteUser(userId, fullName) {
    const confirmDel = confirm(`Are you sure you want to permanently delete user "${fullName}" (ID: ${userId})?\n\nThis will also delete all their reading history and favorites from the database!`);
    if (confirmDel) {
        const params = "action=delete&userId=" + userId;
        
        fetch("../ManageUsersServlet", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: params
        })
        .then(function(res) {
            return res.json();
        })
        .then(function(data) {
            if (data.status === "success") {
                alert("User account and data successfully deleted from PostgreSQL!");
                loadUsersFromDatabase(); // Reload list
            } else {
                alert(data.message);
            }
        })
        .catch(function(err) {
            console.error("Error deleting user:", err);
            alert("Error connecting to the server to delete user.");
        });
    }
}

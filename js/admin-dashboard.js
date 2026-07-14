// ==================================================
// BookNest - Admin Dashboard JS File
// Student Project Style
// ==================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log("Admin Dashboard JS Loaded!");

    // 1. Enforce Admin Authentication
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const role = localStorage.getItem('role');

    if (!isLoggedIn || role !== 'admin') {
        alert("Access Denied! Administrators only.");
        window.location.href = "login.html";
        return;
    }

    // 2. Display Current Date
    const currentDateText = document.getElementById('currentDateText');
    if (currentDateText) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const today = new Date();
        currentDateText.textContent = today.toLocaleDateString('en-US', options);
    }

    // 3. Fetch books and update stats + table
    loadAdminStatsAndTable();

    // 4. Database Backup Action
    const btnBackupDb = document.getElementById('btnBackupDb');
    if (btnBackupDb) {
        btnBackupDb.addEventListener('click', function() {
            window.location.href = '../BackupServlet';
        });
        btnBackupDb.style.cursor = 'pointer';
    }

    // 5. Add logout link to sidebar navigation if needed
    setupAdminLogout();
});

function loadAdminStatsAndTable() {
    // Fetch user count dynamically
    fetch('../ManageUsersServlet')
        .then(res => res.json())
        .then(users => {
            if (Array.isArray(users)) {
                const statHeaders = document.querySelectorAll('.stat_details h3');
                if (statHeaders.length >= 2) {
                    statHeaders[1].textContent = users.length;
                }
            }
        })
        .catch(err => console.error("Error fetching users:", err));

    fetch('../BookServlet')
        .then(res => res.json())
        .then(books => {
            if (Array.isArray(books)) {
                // Update Stats
                const statHeaders = document.querySelectorAll('.stat_details h3');
                if (statHeaders.length >= 4) {
                    // Update Total Ebooks
                    statHeaders[0].textContent = books.length;
                    
                    // Update Categories Count
                    const categories = new Set(books.map(b => b.category));
                    statHeaders[2].textContent = categories.size;
                }

                // Populate Recently Added Table
                const tbody = document.getElementById('recentBooksTableBody');
                if (tbody) {
                    tbody.innerHTML = '';
                    
                    if (books.length === 0) {
                        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No books available in catalog.</td></tr>';
                        return;
                    }

                    // Sort by ID descending (most recent first) and take top 5
                    const recentBooks = [...books].sort((a, b) => b.id - a.id).slice(0, 5);

                    recentBooks.forEach(book => {
                        const tr = document.createElement('tr');
                        
                        tr.innerHTML = `
                            <td>
                                <div class="admin_book_cell" style="display: flex; align-items: center; gap: 10px;">
                                    <div class="mini_cover ${book.coverClass || 'grad_blue'}" style="width: 32px; height: 44px; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 11px;">
                                        ${book.initials || 'BK'}
                                    </div>
                                    <span style="font-weight: 600; color: #1e293b;">${book.title}</span>
                                </div>
                            </td>
                            <td><span class="category_badge_table" style="background: #f1f5f9; color: #475569; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">${book.category}</span></td>
                            <td>${book.author}</td>
                            <td>${book.uploadedAt || 'Recently'}</td>
                            <td><span class="status_badge active" style="background: #dcfce7; color: #15803d; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500;">Active</span></td>
                        `;
                        tbody.appendChild(tr);
                    });
                }
            }
        })
        .catch(err => {
            console.error("Error loading admin dashboard details:", err);
        });
}

function setupAdminLogout() {
    const sidebarNavList = document.querySelector('.sidebar_nav ul');
    if (sidebarNavList) {
        // Add divider and logout item
        const divider = document.createElement('li');
        divider.className = 'nav_divider';
        sidebarNavList.appendChild(divider);

        const logoutItem = document.createElement('li');
        logoutItem.innerHTML = `<a href="#" id="adminLogoutLink" class="nav_item" style="color: #ef4444;"><span class="nav_icon">&#128682;</span> Admin Logout</a>`;
        sidebarNavList.appendChild(logoutItem);

        const adminLogoutLink = document.getElementById('adminLogoutLink');
        if (adminLogoutLink) {
            adminLogoutLink.addEventListener('click', function(e) {
                e.preventDefault();
                if (confirm("Are you sure you want to log out from Admin Portal?")) {
                    fetch('../LogoutServlet')
                        .finally(function() {
                            localStorage.clear();
                            window.location.href = '../index.html';
                        });
                }
            });
        }
    }
}

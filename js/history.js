// Local array that will be loaded from the database
let historyData = [];
document.addEventListener('DOMContentLoaded', function() {
    console.log("Reading History JS Loaded!");
    // Load reading history from the database
    loadReadingHistory();
    // Clear History action
    const btnClearHistory = document.getElementById('btnClearHistory');
    if (btnClearHistory) {
        btnClearHistory.addEventListener('click', function() {
            if (historyData.length === 0) {
                alert('History is already empty!');
                return;
            }
            const confirmClear = confirm('Are you sure you want to clear your reading history? This action cannot be undone.');
            if (confirmClear) {
                // Post to HistoryServlet to clear reading history in DB
                fetch('../HistoryServlet', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: 'action=clear'
                })
                .then(function(res) {
                    return res.json();
                })
                .then(function(data) {
                    if (data.status === 'success') {
                        historyData = [];
                        renderHistoryTable();
                        alert('Reading history cleared successfully!');
                    } else {
                        alert(data.message);
                    }
                })
                .catch(function(err) {
                    console.error('Error clearing history:', err);
                    alert('Error connecting to database. Please check the backend server.');
                });
            }
        });
    }
});
// Fetch reading history from the database
function loadReadingHistory() {
    fetch('../HistoryServlet')
        .then(function(res) {
            return res.json();
        })
        .then(function(data) {
            if (Array.isArray(data)) {
                historyData = data;
            }
            renderHistoryTable();
        })
        .catch(function(err) {
            console.error('Error loading history from database:', err);
            // Fallback empty view or keep default if server is offline
            renderHistoryTable();
        });
}
// Render history items dynamically in table body
function renderHistoryTable() {
    const tableBody = document.getElementById('historyTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';
    if (historyData.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #64748b; font-weight: 600;">
                    Your reading history is empty. Start reading books from the <a href="browse-books.html" style="color: #2563eb; text-decoration: underline;">Browse Books</a> page!
                </td>
            </tr>
        `;
        return;
    }
    historyData.forEach(item => {
        const row = document.createElement('tr');   
        // Progress formatting
        const isCompleted = item.progress === 100;
        const progressClass = isCompleted ? 'progress_green' : 'progress_blue';
        const progressLabel = isCompleted ? 'Completed' : `${item.progress}% In Progress`;
        const actionLabel = isCompleted ? 'Read Again' : 'Continue';
        const isCustomCover = item.coverClass && !item.coverClass.startsWith('grad_');
        const styleAttr = isCustomCover ? `style="background-image: url('../${item.coverClass}'); background-size: cover; background-position: center;"` : '';
        const coverContent = isCustomCover ? '' : `
            <span class="mini_avatar">${item.initials}</span>
            <span class="mini_title">${item.title}</span>
        `;
        row.innerHTML = `
            <td>
                <div class="mini_cover ${isCustomCover ? '' : (item.coverClass || 'grad_blue')}" ${styleAttr}>
                    ${coverContent}
                </div>
            </td>
            <td class="book_info_cell">
                <h4>${item.title}</h4>
                <p>by ${item.author}</p>
            </td>
            <td>
                <span class="category_badge_table">${item.category}</span>
            </td>
            <td>${item.lastAccess}</td>
            <td>
                <div class="progress_cell_wrapper">
                    <div class="progress_bar_table_bg">
                        <div class="progress_bar_table_fill ${progressClass}" style="width: ${item.progress}%;"></div>
                    </div>
                    <span class="progress_text_table">${progressLabel}</span>
                </div>
            </td>
            <td>
                <button class="btn_action_table" data-title="${item.title}">${actionLabel}</button>
            </td>
        `;
        // Action Button click redirects to reader
        row.querySelector('.btn_action_table').addEventListener('click', function() {
            window.location.href = `read-book.html?book=${encodeURIComponent(item.title)}`;
        });
        tableBody.appendChild(row);
    });
}

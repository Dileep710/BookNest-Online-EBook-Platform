// ==================================================
// BookNest - Manage Books JS File
// Student Project Style
// ==================================================

// Default fallback mock books (used if server is down)
const defaultBooks = [
    { id: 1, title: "Clean Code", author: "Robert C. Martin", category: "Programming", rating: 4.8, coverClass: "grad_blue", initials: "CC", isCustom: false },
    { id: 2, title: "The Pragmatic Programmer", author: "David Thomas", category: "Programming", rating: 4.7, coverClass: "grad_purple", initials: "TP", isCustom: false },
    { id: 3, title: "JS: The Good Parts", author: "Douglas Crockford", category: "Programming", rating: 4.6, coverClass: "grad_orange", initials: "JP", isCustom: false },
    { id: 4, title: "Design Patterns", author: "Gang of Four", category: "Programming", rating: 4.6, coverClass: "grad_green", initials: "DP", isCustom: false }
];

let activeCatalog = [];
let searchQuery = '';
let activeCategory = 'All';

document.addEventListener('DOMContentLoaded', function() {
    console.log("Manage Books JS Loaded!");

    // Enforce Admin Authentication
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const role = localStorage.getItem('role');

    if (!isLoggedIn || role !== 'admin') {
        alert("Access Denied! Administrators only.");
        window.location.href = "login.html";
        return;
    }

    // Load initial list from Database
    loadCatalogFromDatabase();

    // Search bar event
    const searchInput = document.getElementById('adminSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            searchQuery = searchInput.value.toLowerCase().trim();
            renderManageTable();
        });
    }

    // Category filter dropdown event
    const categorySelect = document.getElementById('adminCategorySelect');
    if (categorySelect) {
        categorySelect.addEventListener('change', function() {
            activeCategory = categorySelect.value;
            renderManageTable();
        });
    }

    // Modal Close triggers
    const editBookModal = document.getElementById('editBookModal');
    const btnCloseModal = document.getElementById('btnCloseModal');
    if (btnCloseModal && editBookModal) {
        btnCloseModal.addEventListener('click', function() {
            editBookModal.style.display = 'none';
        });

        // Close on clicking outside modal card
        window.addEventListener('click', function(e) {
            if (e.target === editBookModal) {
                editBookModal.style.display = 'none';
            }
        });
    }

    // Edit Modal Form submit handler
    const editBookForm = document.getElementById('editBookForm');
    if (editBookForm) {
        editBookForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const bookId = parseInt(document.getElementById('editBookId').value);
            const title = document.getElementById('editBookTitle').value.trim();
            const author = document.getElementById('editBookAuthor').value.trim();
            const category = document.getElementById('editBookCategory').value;
            const rating = parseFloat(document.getElementById('editBookRating').value);

            if (!title || !author) {
                alert('Please enter valid title and author details.');
                return;
            }

            // Call EditBookServlet to update book in PostgreSQL
            const params = 'id=' + bookId +
                           '&title=' + encodeURIComponent(title) +
                           '&author=' + encodeURIComponent(author) +
                           '&category=' + encodeURIComponent(category) +
                           '&rating=' + rating;

            fetch('../EditBookServlet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: params
            })
            .then(function(res) {
                return res.json();
            })
            .then(function(data) {
                if (data.status === 'success') {
                    alert('Ebook details updated successfully in database!');
                    editBookModal.style.display = 'none';
                    // Reload table list from Database
                    loadCatalogFromDatabase();
                } else {
                    alert(data.message);
                }
            })
            .catch(function(err) {
                console.error("Error editing eBook:", err);
                alert("Error connecting to server to edit book details.");
            });
        });
    }
});

// Load the book catalogue from the Database via BookServlet
function loadCatalogFromDatabase() {
    fetch('../BookServlet')
        .then(function(res) {
            return res.json();
        })
        .then(function(data) {
            activeCatalog = data;
            renderManageTable();
        })
        .catch(function(err) {
            console.error('Error loading books, using mock fallback list:', err);
            // Fallback list
            activeCatalog = defaultBooks;
            renderManageTable();
        });
}

// Render the book rows inside table
function renderManageTable() {
    const tableBody = document.getElementById('adminBooksTableBody');
    if (!tableBody) return;

    // Filter books
    const filtered = activeCatalog.filter(book => {
        const matchesCategory = (activeCategory === 'All' || book.category === activeCategory);
        const matchesSearch = (
            book.title.toLowerCase().includes(searchQuery) ||
            book.author.toLowerCase().includes(searchQuery) ||
            book.category.toLowerCase().includes(searchQuery)
        );
        return matchesCategory && matchesSearch;
    });

    tableBody.innerHTML = '';

    if (filtered.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; padding: 40px; color: #64748b; font-weight: 600;">
                    No ebooks found matching details.
                </td>
            </tr>
        `;
        return;
    }

    filtered.forEach(book => {
        // Tag added books as custom based on their DB ID if it is high
        const isCustom = book.id > 20;
        const sourceLabel = isCustom ? 'Uploaded' : 'Default';
        const sourceColor = isCustom ? '#059669' : '#475569';
        
        const isCustomCover = book.coverClass && !book.coverClass.startsWith('grad_');
        const styleAttr = isCustomCover ? `style="background-image: url('../${book.coverClass}'); background-size: cover; background-position: center;"` : '';
        const coverContent = isCustomCover ? '' : `<span>${book.initials || 'BK'}</span>`;

        rowHtml = `
            <td>
                <div class="micro_cover ${isCustomCover ? '' : (book.coverClass || 'grad_blue')}" ${styleAttr}>
                    ${coverContent}
                </div>
            </td>
            <td>
                <h4>${book.title}</h4>
                <p>by ${book.author}</p>
            </td>
            <td>
                <span class="status_pill" style="background-color: #f1f5f9; color: #475569; font-size: 11px;">${book.category}</span>
            </td>
            <td><strong>${book.rating.toFixed(1)}</strong></td>
            <td>
                <span class="status_pill" style="background-color: #f1f5f9; color: ${sourceColor}; font-size: 11px; font-weight: bold;">${sourceLabel}</span>
            </td>
            <td class="actions_cell">
                <button class="btn_action_edit" data-id="${book.id}">Edit</button>
                <button class="btn_action_delete" data-id="${book.id}">Delete</button>
            </td>
        `;

        const row = document.createElement('tr');
        row.innerHTML = rowHtml;

        // Edit button click event
        row.querySelector('.btn_action_edit').addEventListener('click', function() {
            openEditModal(book.id);
        });

        // Delete button click event
        row.querySelector('.btn_action_delete').addEventListener('click', function() {
            deleteBookRecord(book.id);
        });

        tableBody.appendChild(row);
    });
}

// Populate fields and open the edit modal
function openEditModal(id) {
    const book = activeCatalog.find(b => b.id === id);
    if (!book) return;

    document.getElementById('editBookId').value = book.id;
    document.getElementById('editBookTitle').value = book.title;
    document.getElementById('editBookAuthor').value = book.author;
    document.getElementById('editBookCategory').value = book.category;
    
    // Parse numeric rating
    let ratingVal = 4.5;
    if (typeof book.rating === 'number') {
        ratingVal = book.rating;
    } else if (typeof book.rating === 'string') {
        ratingVal = parseFloat(book.rating) || 4.5;
    }
    document.getElementById('editBookRating').value = ratingVal;

    const editBookModal = document.getElementById('editBookModal');
    if (editBookModal) {
        editBookModal.style.display = 'flex';
    }
}

// Delete book record from active list and database
function deleteBookRecord(id) {
    const book = activeCatalog.find(b => b.id === id);
    if (!book) return;

    const confirmDel = confirm(`Are you sure you want to delete the eBook "${book.title}"?\nThis will permanently delete it from the PostgreSQL database catalogue.`);
    if (confirmDel) {
        // Send POST request to DeleteBookServlet
        fetch('../DeleteBookServlet', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: 'id=' + id
        })
        .then(function(res) {
            return res.json();
        })
        .then(function(data) {
            if (data.status === 'success') {
                alert('Ebook deleted successfully from database!');
                loadCatalogFromDatabase(); // Reload list
            } else {
                alert(data.message);
            }
        })
        .catch(function(err) {
            console.error("Error deleting eBook:", err);
            alert("Error connecting to server to delete the eBook.");
        });
    }
}

const books = [
    { id: 1, title: "Clean Code", author: "Robert C. Martin", category: "Programming", rating: 4.8, coverClass: "grad_blue", initials: "CC" },
    { id: 2, title: "The Pragmatic Programmer", author: "David Thomas", category: "Programming", rating: 4.7, coverClass: "grad_purple", initials: "TP" },
    { id: 3, title: "JS: The Good Parts", author: "Douglas Crockford", category: "Programming", rating: 4.6, coverClass: "grad_orange", initials: "JP" },
    { id: 4, title: "Design Patterns", author: "Gang of Four", category: "Programming", rating: 4.6, coverClass: "grad_green", initials: "DP" },
    { id: 5, title: "Code Complete", author: "Steve McConnell", category: "Programming", rating: 4.5, coverClass: "grad_teal", initials: "CP" },
    { id: 6, title: "Introduction to Algorithms", author: "CLRS", category: "Technology", rating: 4.7, coverClass: "grad_indigo", initials: "IA" },
    { id: 7, title: "AI: A Modern Approach", author: "Stuart Russell & Peter Norvig", category: "AI", rating: 4.8, coverClass: "grad_rose", initials: "AI" },
    { id: 8, title: "Machine Learning", author: "Tom Mitchell", category: "AI", rating: 4.5, coverClass: "grad_space", initials: "ML" },
    { id: 9, title: "Deep Learning", author: "Ian Goodfellow", category: "AI", rating: 4.6, coverClass: "grad_dark", initials: "DL" },
    { id: 10, title: "Start With Why", author: "Simon Sinek", category: "Business", rating: 4.6, coverClass: "grad_brown", initials: "SW" },
    { id: 11, title: "Zero to One", author: "Peter Thiel", category: "Business", rating: 4.7, coverClass: "grad_space", initials: "ZO" },
    { id: 12, title: "Atomic Habits", author: "James Clear", category: "Business", rating: 4.9, coverClass: "grad_teal", initials: "AH" },
    { id: 13, title: "Good to Great", author: "Jim Collins", category: "Business", rating: 4.5, coverClass: "grad_rose", initials: "GG" },
    { id: 14, title: "The Lean Startup", author: "Eric Ries", category: "Business", rating: 4.6, coverClass: "grad_blue", initials: "LS" },
    { id: 15, title: "A Brief History of Time", author: "Stephen Hawking", category: "Science", rating: 4.7, coverClass: "grad_indigo", initials: "BH" },
    { id: 16, title: "Cosmos", author: "Carl Sagan", category: "Science", rating: 4.9, coverClass: "grad_space", initials: "CS" },
    { id: 17, title: "Sapiens", author: "Yuval Noah Harari", category: "History", rating: 4.8, coverClass: "grad_brown", initials: "S" },
    { id: 18, title: "Guns, Germs, and Steel", author: "Jared Diamond", category: "History", rating: 4.6, coverClass: "grad_dark", initials: "GG" },
    { id: 19, title: "Dune", author: "Frank Herbert", category: "Novel", rating: 4.9, coverClass: "grad_orange", initials: "D" },
    { id: 20, title: "1984", author: "George Orwell", category: "Novel", rating: 4.8, coverClass: "grad_dark", initials: "19" }
];
let activeCategory = 'All';
let searchQuery = '';
let selectedRating = 3.0; // Default lower bound
let dbBooks = []; // Loaded from servlet database
document.addEventListener('DOMContentLoaded', function() {
    console.log("Browse Books JS Loaded!");
    // Check and update navbar if user session is active
    updateNavbarSession();
    // Fetch books from Database BookServlet
    fetch('../BookServlet')
        .then(function(res) {
            return res.json();
        })
        .then(function(data) {
            if (Array.isArray(data)) {
                dbBooks = data;
            } else {
                dbBooks = books;
            }
            applyUrlParams();
            renderBooks();
        })
        .catch(function(err) {
            console.error('Error fetching database books, using mock fallback:', err);
            dbBooks = books; // Fallback to mock array
            applyUrlParams();
            renderBooks();
        });
    // Category filter click event
    const categoryItems = document.querySelectorAll('#categoryFilterList li');
    categoryItems.forEach(function(item) {
        item.addEventListener('click', function() {
            // Update active styling
            categoryItems.forEach(li => li.classList.remove('filter_active'));
            item.classList.add('filter_active');
            // Apply category filter
            activeCategory = item.getAttribute('data-category');
            renderBooks();
        });
    });
    // Search input typing event
    const searchInput = document.getElementById('bookSearchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            searchQuery = searchInput.value.toLowerCase().trim();
            renderBooks();
        });
    }
    // Sort select change event
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', function() {
            renderBooks();
        });
    }
    // Rating filters checkboxes change event
    const ratingCheckboxes = document.querySelectorAll('input[name="rating_filter"]');
    ratingCheckboxes.forEach(function(checkbox) {
        checkbox.addEventListener('change', function() {
            // Find highest checked rating threshold
            let selectedRatingsList = [];
            ratingCheckboxes.forEach(cb => {
                if (cb.checked) selectedRatingsList.push(parseFloat(cb.value));
            }); 
            selectedRating = selectedRatingsList.length > 0 ? Math.min(...selectedRatingsList) : 0;
            renderBooks();
        });
    });
});
// Parses and applies parameters passed in URL (search, author, category)
function applyUrlParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    const authorParam = urlParams.get('author');
    const categoryParam = urlParams.get('category');
    const searchInput = document.getElementById('bookSearchInput');
    if (searchParam) {
        if (searchInput) searchInput.value = searchParam;
        searchQuery = searchParam.toLowerCase().trim();
    } else if (authorParam) {
        if (searchInput) searchInput.value = authorParam;
        searchQuery = authorParam.toLowerCase().trim();
    }
    if (categoryParam) {
        activeCategory = categoryParam;
        const categoryItems = document.querySelectorAll('#categoryFilterList li');
        categoryItems.forEach(li => {
            const dataCat = li.getAttribute('data-category');
            if (dataCat && dataCat.toLowerCase() === categoryParam.toLowerCase()) {
                li.classList.add('filter_active');
            } else {
                li.classList.remove('filter_active');
            }
        });
    }
}
// Update navbar if user session is saved in localStorage
function updateNavbarSession() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const authContainer = document.getElementById('navAuthButtons');
    if (isLoggedIn && authContainer) {
        const username = localStorage.getItem('currentUser') || 'User';
        const initials = username.substring(0, 2).toUpperCase();
        // Update nav buttons to a user indicator block
        authContainer.innerHTML = `
            <div class="nav_user_pill" style="cursor: pointer;" onclick="window.location.href='profile.html'">
                <div class="nav_user_avatar">${initials}</div>
                <span>${username}</span>
            </div>
            <a href="#" id="navLogoutBtn" class="register_btn_nav" style="margin-left: 10px; padding: 6px 12px; font-size: 13px;">Logout</a>
        `;
        const logoutBtn = document.getElementById('navLogoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                fetch('../LogoutServlet')
                    .finally(function() {
                        localStorage.clear();
                        window.location.href = '../index.html';
                    });
            });
        }
    }
}
// Render and filter books dynamically in the grid
function renderBooks() {
    const grid = document.getElementById('booksGrid');
    const countText = document.getElementById('booksFoundText');
    const sortSelect = document.getElementById('sortSelect');
    if (!grid) return;
    // Filter books based on active constraints
    let filtered = dbBooks.filter(book => {
        // Category Filter
        const matchesCategory = (activeCategory === 'All' || book.category.toLowerCase() === activeCategory.toLowerCase());
        // Search Filter
        const matchesSearch = (
            book.title.toLowerCase().includes(searchQuery) ||
            book.author.toLowerCase().includes(searchQuery) ||
            book.category.toLowerCase().includes(searchQuery)
        );
        // Rating Filter
        const matchesRating = (book.rating >= selectedRating);
        return matchesCategory && matchesSearch && matchesRating;
    });
    // Apply Sorting
    const sortVal = sortSelect ? sortSelect.value : 'relevance';
    if (sortVal === 'rating') {
        filtered.sort((a, b) => b.rating - a.rating);
    } else {
        filtered.sort((a, b) => a.id - b.id);
    }
    // Update results text
    if (countText) {
        countText.textContent = `${filtered.length} books found`;
    }
    // Clear grid
    grid.innerHTML = '';
    if (filtered.length === 0) {
        grid.innerHTML = `
            <div style="width: 100%; text-align: center; padding: 40px; color: #64748b; font-weight: 600;">
                No books match your criteria. Try adjusting your search query or filters.
            </div>
        `;
        return;
    }
    // Generate book cards HTML
    filtered.forEach(book => {
        const card = document.createElement('div');
        card.className = 'book_card_browse';
        const isCustomCover = book.coverClass && !book.coverClass.startsWith('grad_');
        const styleAttr = isCustomCover ? `style="background-image: url('../${book.coverClass}'); background-size: cover; background-position: center;"` : '';
        const coverContent = isCustomCover ? '' : `
            <div class="book_avatar">${book.initials || 'BK'}</div>
            <div class="book_cover_title">${book.title}</div>
            <div class="book_cover_author">${book.author}</div>
        `;
        card.innerHTML = `
            <div class="cover_placeholder ${isCustomCover ? '' : (book.coverClass || 'grad_blue')}" ${styleAttr}>
                ${coverContent}
            </div>
            <span class="card_category">${book.category.toUpperCase()}</span>
            <h4>${book.title}</h4>
            <p>${book.author}</p>
            <div class="rating_row">
                <span class="stars">&#9733;&#9733;&#9733;&#9733;&#9734;</span>
                <span class="rating_val">${Number(book.rating).toFixed(1)}</span>
            </div>
            <button class="btn_read_card">Read Now</button>
        `;
        // Card Click directs to book details page
        card.addEventListener('click', function(e) {
            const isButton = e.target.classList.contains('btn_read_card');
            if (!isButton) {
                window.location.href = `book-details.html?book=${encodeURIComponent(book.title)}`;
            }
        });
        // Button Click
        const readBtn = card.querySelector('.btn_read_card');
        if (readBtn) {
            readBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                
                const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
                if (isLoggedIn) {
                    window.location.href = `read-book.html?book=${encodeURIComponent(book.title)}`;
                } else {
                    alert('You must be logged in to read ebooks on BookNest!');
                    window.location.href = 'login.html';
                }
            });
        }
        grid.appendChild(card);
    });
}

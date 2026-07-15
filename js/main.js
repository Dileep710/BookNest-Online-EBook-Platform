document.addEventListener('DOMContentLoaded', function() {
    console.log("Landing Page JS Loaded!");
    // 1. Navbar login state toggle (Commented out to always show Login & Register by default)
    // updateLandingNavbar();
    // 2. Search Box landing redirection
    setupLandingSearch();
    // 3. Category cards click handlers
    setupCategoryCards();
    // 4. Hero and CTA buttons handlers
    setupLandingCTAs();
    // 5. Load real ratings and books dynamically from database servlets
    loadDynamicStatsAndBooks();
});
// Updates the navigation buttons on the landing page based on session
function updateLandingNavbar() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const role = localStorage.getItem('role');
    const navButtons = document.querySelector('.nav_buttons');
    if (isLoggedIn && navButtons) {
        const dashboardPage = role === 'admin' ? 'pages/admin-dashboard.html' : 'pages/dashboard.html';
        navButtons.innerHTML = `
            <a href="${dashboardPage}" class="login_btn">Dashboard</a>
            <a href="#" id="logoutBtn" class="register_btn_nav">Logout</a>
        `;
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', function(e) {
                e.preventDefault();
                fetch('LogoutServlet')
                    .finally(function() {
                        localStorage.clear();
                        window.location.href = 'index.html';
                    });
            });
        }
    }
}
// Redirects search query to browse.html with search param
function setupLandingSearch() {
    const searchContainer = document.querySelector('.search_box_landing');
    if (searchContainer) {
        const input = searchContainer.querySelector('input');
        const button = searchContainer.querySelector('button');
        const doSearch = function() {
            const query = input.value.trim();
            if (query !== '') {
                window.location.href = 'pages/browse.html?search=' + encodeURIComponent(query);
            } else {
                window.location.href = 'pages/browse.html';
            }
        };
        if (button && input) {
            button.addEventListener('click', doSearch);
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    doSearch();
                }
            });
        }
    }
}
// Wire category cards on landing page to redirect to browse page with category filter
function setupCategoryCards() {
    const categoryCards = document.querySelectorAll('.category_card');
    categoryCards.forEach(function(card) {
        card.addEventListener('click', function() {
            const h3 = card.querySelector('h3');
            if (h3) {
                const categoryName = h3.textContent.trim();
                window.location.href = 'pages/browse.html?category=' + encodeURIComponent(categoryName);
            }
        });
        card.style.cursor = 'pointer';
    });
}
// Wire hero CTA actions
function setupLandingCTAs() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';   
    // Start Reading Free & Browse Books buttons
    const primaryBtn = document.querySelector('.bsb_primary_btn');
    if (primaryBtn) {
        primaryBtn.addEventListener('click', function() {
            if (isLoggedIn) {
                window.location.href = 'pages/dashboard.html';
            } else {
                window.location.href = 'pages/register.html';
            }
        });
    }
    const secondaryBtn = document.querySelector('.bsb_secondary_btn');
    if (secondaryBtn) {
        secondaryBtn.addEventListener('click', function() {
            window.location.href = 'pages/browse.html';
        });
    }
    // Featured Author links
    const authorLinks = document.querySelectorAll('.author_books_link');
    authorLinks.forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const href = link.getAttribute('href');
            window.location.href = href;
        });
    });
}
// Fetches statistics and books dynamically from backend servlets
function loadDynamicStatsAndBooks() {
    // 1. Fetch Stats
    fetch('StatsServlet')
        .then(res => res.json())
        .then(data => {
            const booksEl = document.getElementById('stat-books');
            const readersEl = document.getElementById('stat-readers');
            const categoriesEl = document.getElementById('stat-categories');
            const ratingEl = document.getElementById('stat-rating');
            const badgeEl = document.getElementById('badge-books-count');
            if (booksEl) booksEl.innerHTML = data.totalBooks + "+";
            if (readersEl) readersEl.innerHTML = data.totalReaders + "+";
            if (categoriesEl) categoriesEl.innerHTML = data.totalCategories + "+";
            if (ratingEl) ratingEl.innerHTML = Number(data.avgRating).toFixed(1) + "&bigstar;";
            if (badgeEl) badgeEl.innerHTML = data.totalBooks + " Books Available";
        })
        .catch(err => console.error('Error fetching statistics:', err));
    // 2. Fetch Books for Featured, Trending, and Recent sections
    fetch('BookServlet')
        .then(res => res.json())
        .then(data => {
            // Update Category Cards Book Counts dynamically
            const categoryCards = document.querySelectorAll('.category_card');
            categoryCards.forEach(function(card) {
                const catNameEl = card.querySelector('h3');
                const countEl = card.querySelector('p');
                if (catNameEl && countEl) {
                    const catName = catNameEl.textContent.trim();
                    const count = data.filter(function(b) {
                        return b.category && b.category.toLowerCase() === catName.toLowerCase();
                    }).length;
                    countEl.textContent = count + (count === 1 ? " book" : " books");
                }
            });
            if (!Array.isArray(data) || data.length === 0) {
                setupBookCardClicks(); // Fallback to static clicks if empty array
                return;
            }
            // Render Featured Book (highest rated book)
            const sortedByRating = [...data].sort((a, b) => b.rating - a.rating);
            const featuredBook = sortedByRating[0];
            const featuredContainer = document.getElementById('featuredBookContainer');
            if (featuredContainer) {
                const isCustomCover = featuredBook.coverClass && !featuredBook.coverClass.startsWith('grad_');
                const styleAttr = isCustomCover ? `style="background-image: url('${featuredBook.coverClass}'); background-size: cover; background-position: center;"` : '';
                const coverContent = isCustomCover ? '' : `
                    <span class="book_avatar">${featuredBook.initials || 'BK'}</span>
                    <div class="book_cover_title">${featuredBook.title}</div>
                    <div class="book_cover_author">${featuredBook.author}</div>
                `;
                featuredContainer.innerHTML = `
                    <span class="featured_tag">FEATURED BOOK</span>
                    <div class="book_card" data-title="${encodeURIComponent(featuredBook.title)}">
                        <div class="book_image ${isCustomCover ? '' : (featuredBook.coverClass || 'grad_blue')}" ${styleAttr}>
                            ${coverContent}
                        </div>
                        <h4>${featuredBook.title}</h4>
                        <p>${featuredBook.author}</p>
                        <div class="rating_stars">
                            <span>${getStarsHtml(featuredBook.rating)}</span>
                            <span class="rating_num">${Number(featuredBook.rating).toFixed(1)}</span>
                        </div>
                        <button class="btn_start_reading">Start Reading</button>
                    </div>
                `;
            }
            // Render Trending Books (top 5 by rating desc)
            const trendingGrid = document.getElementById('trendingBooksGrid');
            if (trendingGrid) {
                const trending = sortedByRating.slice(0, 5);
                trendingGrid.innerHTML = '';
                trending.forEach(book => {
                    const isCustomCover = book.coverClass && !book.coverClass.startsWith('grad_');
                    const styleAttr = isCustomCover ? `style="background-image: url('${book.coverClass}'); background-size: cover; background-position: center;"` : '';
                    const coverContent = isCustomCover ? '' : `
                        <span class="book_avatar">${book.initials || 'BK'}</span>
                        <div class="book_cover_title">${book.title}</div>
                        <div class="book_cover_author">${book.author}</div>
                    `;
                    const card = document.createElement('div');
                    card.className = 'book_card';
                    card.setAttribute('data-title', book.title);
                    card.innerHTML = `
                        <div class="book_image ${isCustomCover ? '' : (book.coverClass || 'grad_blue')}" ${styleAttr}>
                            ${coverContent}
                        </div>
                        <span class="book_card_category">${book.category.toUpperCase()}</span>
                        <h4>${book.title}</h4>
                        <p class="book_card_author">${book.author}</p>
                        <div class="book_card_meta">
                            <div class="rating_stars">
                                <span>${getStarsHtml(book.rating)}</span>
                                <span class="rating_num">${Number(book.rating).toFixed(1)}</span>
                            </div>
                            <p class="reviews_pages">${book.pages || '320 Pages'}</p>
                        </div>
                        <button class="btn_read_now">Read Now</button>
                    `;
                    trendingGrid.appendChild(card);
                });
            }
            // Render Recently Added Books (top 4 by id desc)
            const recentGrid = document.getElementById('recentBooksGrid');
            if (recentGrid) {
                const sortedById = [...data].sort((a, b) => b.id - a.id);
                const recent = sortedById.slice(0, 4);
                recentGrid.innerHTML = '';
                recent.forEach(book => {
                    const isCustomCover = book.coverClass && !book.coverClass.startsWith('grad_');
                    const styleAttr = isCustomCover ? `style="background-image: url('${book.coverClass}'); background-size: cover; background-position: center;"` : '';
                    const coverContent = isCustomCover ? '' : `
                        <span class="book_avatar">${book.initials || 'BK'}</span>
                        <div class="book_cover_title">${book.title}</div>
                        <div class="book_cover_author">${book.author}</div>
                    `;
                    const card = document.createElement('div');
                    card.className = 'book_card';
                    card.setAttribute('data-title', book.title);
                    card.innerHTML = `
                        <div class="book_image ${isCustomCover ? '' : (book.coverClass || 'grad_blue')}" ${styleAttr}>
                            ${coverContent}
                        </div>
                        <span class="book_card_category">${book.category.toUpperCase()}</span>
                        <h4>${book.title}</h4>
                        <p class="book_card_author">${book.author}</p>
                        <div class="book_card_meta">
                            <div class="rating_stars">
                                <span>${getStarsHtml(book.rating)}</span>
                                <span class="rating_num">${Number(book.rating).toFixed(1)}</span>
                            </div>
                            <p class="reviews_pages">${book.pages || '320 Pages'}</p>
                        </div>
                        <button class="btn_read_now">Read Now</button>
                    `;
                    recentGrid.appendChild(card);
                });
            }
            // Set up click handlers on the newly created cards
            setupDynamicBookCardClicks();
        })
        .catch(err => {
            console.error('Error fetching database books:', err);
            // Fall back to setup static cards click handlers
            setupBookCardClicks();
        });
}
function getStarsHtml(rating) {
    let stars = '';
    const rounded = Math.round(rating);
    for (let i = 1; i <= 5; i++) {
        if (i <= rounded) {
            stars += '&#9733;';
        } else {
            stars += '&#9734;';
        }
    }
    return stars;
}
function setupDynamicBookCardClicks() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const containers = ['#featuredBookContainer', '#trendingBooksGrid', '#recentBooksGrid'];
    containers.forEach(containerSelector => {
        const container = document.querySelector(containerSelector);
        if (!container) return;
        const cards = container.querySelectorAll('.book_card');
        cards.forEach(card => {
            const encodedTitle = card.getAttribute('data-title');
            const title = encodedTitle ? decodeURIComponent(encodedTitle) : card.querySelector('h4').textContent.trim();
            card.addEventListener('click', function(e) {
                const isButton = e.target.tagName.toLowerCase() === 'button';
                if (!isButton) {
                    window.location.href = 'pages/book-details.html?book=' + encodeURIComponent(title);
                }
            });
            card.style.cursor = 'pointer';
            const btn = card.querySelector('button');
            if (btn) {
                btn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    if (isLoggedIn) {
                        window.location.href = 'pages/read-book.html?book=' + encodeURIComponent(title);
                    } else {
                        alert('You must be logged in to read ebooks on BookNest!');
                        window.location.href = 'pages/login.html';
                    }
                });
            }
        });
    });
}
// Redirects book cards and Read Now buttons to detail or reading pages (Static Fallback)
function setupBookCardClicks() {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const bookCards = document.querySelectorAll('.book_card');
    bookCards.forEach(function(card) {
        const titleEl = card.querySelector('h4') || card.querySelector('.book_cover_title');
        if (!titleEl) return;
        const title = titleEl.textContent.trim();
        // Clicking the card itself goes to book details
        card.addEventListener('click', function(e) {
            const isButton = e.target.tagName.toLowerCase() === 'button';
            if (!isButton) {
                window.location.href = 'pages/book-details.html?book=' + encodeURIComponent(title);
            }
        });
        card.style.cursor = 'pointer';
        // Clicking the "Read Now" or "Start Reading" button
        const btn = card.querySelector('button');
        if (btn) {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                if (isLoggedIn) {
                    window.location.href = 'pages/read-book.html?book=' + encodeURIComponent(title);
                } else {
                    alert('You must be logged in to read ebooks on BookNest!');
                    window.location.href = 'pages/login.html';
                }
            });
        }
    });
}

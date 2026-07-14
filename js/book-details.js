// ==================================================
// BookNest - Book Details JS File
// Student Project Style
// ==================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log("Book Details JS Loaded!");

    // Parse URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const bookTitleParam = urlParams.get('book');

    if (!bookTitleParam) {
        alert("No book selected. Redirecting to catalogue...");
        window.location.href = "browse-books.html";
        return;
    }

    // Fetch catalogue from database
    fetch('../BookServlet')
        .then(function(res) {
            return res.json();
        })
        .then(function(books) {
            const book = books.find(b => b.title.toLowerCase() === bookTitleParam.toLowerCase());
            if (book) {
                renderBookDetails(book, books);
            } else {
                console.error("Book not found in database catalog: " + bookTitleParam);
                alert("Book not found. Returning to browse page.");
                window.location.href = "browse-books.html";
            }
        })
        .catch(function(err) {
            console.error("Error fetching book details:", err);
            alert("Error loading book details from server.");
        });
});

function renderBookDetails(book, allBooks) {
    // 1. Populate cover
    const detailsBookCover = document.getElementById('detailsBookCover');
    const isCustomCover = book.coverClass && !book.coverClass.startsWith('grad_');

    if (detailsBookCover) {
        if (isCustomCover) {
            detailsBookCover.className = 'large_cover';
            detailsBookCover.style.backgroundImage = "url('../" + book.coverClass + "')";
            detailsBookCover.style.backgroundSize = "cover";
            detailsBookCover.style.backgroundPosition = "center";
        } else {
            detailsBookCover.className = 'large_cover ' + (book.coverClass || 'grad_blue');
            detailsBookCover.style.backgroundImage = "";
        }
    }
    
    const detailsBookAvatar = document.getElementById('detailsBookAvatar');
    if (detailsBookAvatar) {
        detailsBookAvatar.textContent = isCustomCover ? '' : (book.initials || 'BK');
    }

    const detailsBookCoverTitle = document.getElementById('detailsBookCoverTitle');
    if (detailsBookCoverTitle) {
        detailsBookCoverTitle.textContent = isCustomCover ? '' : book.title;
    }

    const detailsBookCoverAuthor = document.getElementById('detailsBookCoverAuthor');
    if (detailsBookCoverAuthor) {
        detailsBookCoverAuthor.textContent = isCustomCover ? '' : book.author;
    }

    // 2. Populate main info panel
    const detailsCategory = document.getElementById('detailsCategory');
    if (detailsCategory) {
        detailsCategory.textContent = book.category.toUpperCase();
    }

    const detailsTitle = document.getElementById('detailsTitle');
    if (detailsTitle) {
        detailsTitle.textContent = book.title;
    }

    const detailsAuthor = document.getElementById('detailsAuthor');
    if (detailsAuthor) {
        detailsAuthor.textContent = 'by ' + book.author;
    }

    const detailsRating = document.getElementById('detailsRating');
    if (detailsRating) {
        const rVal = typeof book.rating === 'number' ? book.rating.toFixed(1) : parseFloat(book.rating).toFixed(1);
        detailsRating.textContent = rVal + ' Stars';
    }

    const detailsDescription = document.getElementById('detailsDescription');
    if (detailsDescription) {
        detailsDescription.textContent = book.description || 'No description available for this book.';
    }

    const detailsPages = document.getElementById('detailsPages');
    if (detailsPages) {
        detailsPages.textContent = book.pages || 'N/A';
    }

    // 3. Read Now button click
    const btnReadNowDetails = document.getElementById('btnReadNowDetails');
    if (btnReadNowDetails) {
        btnReadNowDetails.addEventListener('click', function() {
            const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
            if (isLoggedIn) {
                window.location.href = `read-book.html?book=${encodeURIComponent(book.title)}`;
            } else {
                alert('You must be logged in to read ebooks on BookNest!');
                window.location.href = 'login.html';
            }
        });
    }

    // 3.5 Favorite button click & state check
    const btnFavoriteDetails = document.getElementById('btnFavoriteDetails');
    if (btnFavoriteDetails) {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        if (isLoggedIn) {
            // Check status on load
            const checkParams = 'action=check&bookTitle=' + encodeURIComponent(book.title);
            fetch('../FavoriteServlet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: checkParams
            })
            .then(res => res.json())
            .then(data => {
                updateFavoriteButtonUI(btnFavoriteDetails, data.isFavorite);
            })
            .catch(err => console.error("Error checking favorite status:", err));
        }

        btnFavoriteDetails.addEventListener('click', function() {
            const currentIsLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
            if (!currentIsLoggedIn) {
                alert('You must be logged in to favorite ebooks on BookNest!');
                window.location.href = 'login.html';
                return;
            }

            const toggleParams = 'bookTitle=' + encodeURIComponent(book.title);
            fetch('../FavoriteServlet', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                body: toggleParams
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    updateFavoriteButtonUI(btnFavoriteDetails, data.isFavorite);
                    alert(data.message);
                } else {
                    alert(data.message);
                }
            })
            .catch(err => {
                console.error("Error toggling favorite:", err);
                alert("Error toggling favorite. Please try again.");
            });
        });
    }

    // 4. Render related books
    renderRelatedBooks(book, allBooks);
}

function updateFavoriteButtonUI(btn, isFav) {
    if (isFav) {
        btn.innerHTML = '<span class="heart_icon">&#9829;</span> Remove from Favorites';
        btn.style.color = '#ef4444';
        btn.style.borderColor = '#ef4444';
    } else {
        btn.innerHTML = '<span class="heart_icon">&#9825;</span> Add to Favorites';
        btn.style.color = '#2563eb';
        btn.style.borderColor = '#2563eb';
    }
}

function renderRelatedBooks(currentBook, allBooks) {
    const grid = document.getElementById('relatedBooksGrid');
    if (!grid) return;

    // Filter books of the same category, excluding current book
    const related = allBooks.filter(b => b.category === currentBook.category && b.id !== currentBook.id).slice(0, 4);

    grid.innerHTML = '';

    if (related.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; color: #64748b; font-weight: 500; padding: 20px;">
                No related books found in this category.
            </div>
        `;
        return;
    }

    related.forEach(book => {
        const card = document.createElement('div');
        card.className = 'related_card';
        
        const isCustomCover = book.coverClass && !book.coverClass.startsWith('grad_');
        const styleAttr = isCustomCover ? `style="background-image: url('../${book.coverClass}'); background-size: cover; background-position: center;"` : '';
        const coverContent = isCustomCover ? '' : `
            <span class="rel_avatar">${book.initials || 'BK'}</span>
        `;

        card.innerHTML = `
            <div class="related_cover ${isCustomCover ? '' : (book.coverClass || 'grad_blue')}" ${styleAttr}>
                ${coverContent}
            </div>
            <h4>${book.title}</h4>
            <p>${book.author}</p>
        `;

        card.addEventListener('click', function() {
            window.location.href = `book-details.html?book=${encodeURIComponent(book.title)}`;
        });
        card.style.cursor = 'pointer';

        grid.appendChild(card);
    });
}

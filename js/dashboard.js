// ==================================================
// BookNest - User Dashboard JS File
// Student Project Style
// ==================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log("User Dashboard JS Loaded!");

    // Update Welcome Username
    const welcomeUserName = document.getElementById('welcomeUserName');
    if (welcomeUserName) {
        const userName = localStorage.getItem('fullName') || localStorage.getItem('currentUser') || 'Reader';
        welcomeUserName.textContent = userName;
    }

    // Display Current Date
    const currentDateText = document.getElementById('currentDateText');
    if (currentDateText) {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const today = new Date();
        currentDateText.textContent = today.toLocaleDateString('en-US', options);
    }

    // Immediately hide the static placeholder before the fetch runs
    // This prevents it from showing even for a moment if fetch is slow or fails
    var card = document.querySelector('.continue_reading_card');
    if (card) {
        card.innerHTML = '<div style="flex:1;text-align:center;padding:30px 15px;color:#64748b;"><span style="font-size:36px;display:block;margin-bottom:10px;">📖</span><p style="margin:0 0 15px 0;font-weight:600;font-size:15px;color:#475569;">Loading...</p></div>';
    }

    // Load actual reading history from database to populate the "Continue Reading" card
    loadContinueReadingCard();
    loadFavoritesSidebar();

    // Simple interaction tracker for links
    const quickLinks = document.querySelectorAll('.quick_links_list a');
    quickLinks.forEach(function(link) {
        link.addEventListener('click', function(e) {
            console.log("User navigated to: " + link.textContent.trim());
        });
    });

    // Setup basic click alerts for footer placeholders
    const footerPlaceholders = document.querySelectorAll('footer a[href="#"]');
    footerPlaceholders.forEach(function(link) {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            alert('This placeholder feature is under construction for the college evaluation!');
        });
    });
});

// Fetches history and updates the "Continue Reading" card with the last accessed book
function loadContinueReadingCard() {
    fetch('../HistoryServlet')
        .then(function(res) {
            return res.json();
        })
        .then(function(history) {
            const card = document.querySelector('.continue_reading_card');
            if (card) {
                if (Array.isArray(history) && history.length > 0) {
                    const lastBook = history[0];
                    updateContinueCardUI(lastBook);
                } else {
                    // Show a friendly empty state instead of the hardcoded static placeholder
                    card.innerHTML = `
                        <div style="flex: 1; text-align: center; padding: 30px 15px; color: #64748b;">
                            <span style="font-size: 36px; display: block; margin-bottom: 10px;">📖</span>
                            <p style="margin: 0 0 15px 0; font-weight: 600; font-size: 15px; color: #475569;">You haven't started reading any books yet!</p>
                            <button onclick="window.location.href='browse-books.html'" style="background: #3b82f6; color: white; border: none; padding: 8px 18px; border-radius: 6px; font-weight: 600; font-size: 13px; cursor: pointer; transition: background 0.2s; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);">
                                Explore Books &rarr;
                            </button>
                        </div>
                    `;
                }
            }
        })
        .catch(function(err) {
            console.error("Error loading history for dashboard card:", err);
            // Also show empty state on network error — never leave the static placeholder
            var c = document.querySelector('.continue_reading_card');
            if (c) {
                c.innerHTML = '<div style="flex:1;text-align:center;padding:30px 15px;color:#64748b;"><span style="font-size:36px;display:block;margin-bottom:10px;">📖</span><p style="margin:0 0 15px 0;font-weight:600;font-size:15px;color:#475569;">You haven\'t started reading any books yet!</p><button onclick="window.location.href=\'browse-books.html\'" style="background:#3b82f6;color:white;border:none;padding:8px 18px;border-radius:6px;font-weight:600;font-size:13px;cursor:pointer;">Explore Books &rarr;</button></div>';
            }
        });
}

// Helper function to update the DOM elements inside the Continue Reading card
function updateContinueCardUI(book) {
    const card = document.querySelector('.continue_reading_card');
    if (!card) return;

    // 1. Update book cover classes and text
    const bookImage = card.querySelector('.book_image_small');
    const isCustomCover = book.coverClass && !book.coverClass.startsWith('grad_');
    if (bookImage) {
        if (isCustomCover) {
            bookImage.className = 'book_image_small';
            bookImage.style.backgroundImage = `url('../${book.coverClass}')`;
            bookImage.style.backgroundSize = 'cover';
            bookImage.style.backgroundPosition = 'center';
        } else {
            bookImage.className = 'book_image_small ' + (book.coverClass || 'grad_blue');
            bookImage.style.backgroundImage = '';
        }
    }

    const bookAvatar = card.querySelector('.book_avatar');
    if (bookAvatar) bookAvatar.textContent = isCustomCover ? '' : (book.initials || 'BK');

    const coverTitle = card.querySelector('.book_cover_title');
    if (coverTitle) coverTitle.textContent = isCustomCover ? '' : book.title;

    const coverAuthor = card.querySelector('.book_cover_author');
    if (coverAuthor) coverAuthor.textContent = isCustomCover ? '' : book.author;

    // 2. Update continue details panel
    const categoryTag = card.querySelector('.category_tag');
    if (categoryTag) categoryTag.textContent = book.category.toUpperCase();

    const titleHeader = card.querySelector('.continue_details h3');
    if (titleHeader) titleHeader.textContent = book.title;

    const authorName = card.querySelector('.continue_details .author_name');
    if (authorName) authorName.textContent = book.author;

    // 3. Update reading progress
    const progressPercent = card.querySelector('.progress_percent');
    if (progressPercent) progressPercent.textContent = `${book.progress}%`;

    const progressBarFill = card.querySelector('.progress_bar_fill');
    if (progressBarFill) progressBarFill.style.width = `${book.progress}%`;

    // 4. Update button navigation actions
    const btnContinue = card.querySelector('.btn_continue');
    if (btnContinue) {
        btnContinue.onclick = function() {
            window.location.href = `read-book.html?book=${encodeURIComponent(book.title)}`;
        };
    }

    const btnDetails = card.querySelector('.btn_details_outline');
    if (btnDetails) {
        btnDetails.onclick = function() {
            window.location.href = `book-details.html?book=${encodeURIComponent(book.title)}`;
        };
    }
}

// Fetches and displays favorites in the dashboard sidebar card
function loadFavoritesSidebar() {
    const container = document.getElementById('favoritesListContainer');
    if (!container) return;

    fetch('../FavoriteServlet')
        .then(function(res) {
            return res.json();
        })
        .then(function(favorites) {
            if (Array.isArray(favorites) && favorites.length > 0) {
                container.innerHTML = '';
                favorites.forEach(function(book) {
                    const li = document.createElement('li');
                    li.innerHTML = `<a href="book-details.html?book=${encodeURIComponent(book.title)}"><span class="link_icon" style="color: #ef4444;">&#9829;</span> ${book.title} <span class="arrow">&rarr;</span></a>`;
                    container.appendChild(li);
                });
            } else {
                container.innerHTML = '<li style="color: #64748b; font-size: 14px; padding: 10px 0;">No favorites added yet.</li>';
            }
        })
        .catch(function(err) {
            console.error("Error loading favorites for dashboard sidebar:", err);
            container.innerHTML = '<li style="color: #ef4444; font-size: 14px; padding: 10px 0;">Error loading favorites.</li>';
        });
}

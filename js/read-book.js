// ==================================================
// BookNest - Read Book JS File
// Student Project Style - Fully Customized PDF.js Viewer
// ==================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log("Read Book JS Loaded!");

    // Configure PDF.js worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';

    const urlParams = new URLSearchParams(window.location.search);
    const bookTitleParam = urlParams.get('book');

    if (!bookTitleParam) {
        alert("No book selected to read. Redirecting to browse page...");
        window.location.href = "browse-books.html";
        return;
    }

    // Dom elements
    const readerTitle = document.getElementById('readerBookTitle');
    const inputPageNumEl = document.getElementById('inputPageNum');
    const totalPagesNumEl = document.getElementById('totalPagesNum');
    const btnPrevPage = document.getElementById('btnPrevPage');
    const btnNextPage = document.getElementById('btnNextPage');
    const btnZoomIn = document.getElementById('btnZoomIn');
    const btnZoomOut = document.getElementById('btnZoomOut');
    const zoomLevelText = document.getElementById('zoomLevelText');
    const btnDownload = document.getElementById('btnDownload');
    
    const canvas = document.getElementById('pdfCanvas');
    const ctx = canvas.getContext('2d');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const viewerContainer = document.getElementById('pdfViewerContainer');

    let currentBook = null;
    let currentPage = 1;
    let totalPages = 1;
    let zoomLevel = 100;
    let pdfDoc = null;
    let pageRendering = false;
    let pageNumPending = null;

    // Swipe gestures variables
    let touchStartX = 0;
    let touchEndX = 0;

    // 1. Fetch book data from server
    fetch('../BookServlet')
        .then(res => res.json())
        .then(books => {
            const foundBook = books.find(b => b.title.toLowerCase() === bookTitleParam.toLowerCase());
            if (foundBook) {
                currentBook = foundBook;
                if (readerTitle) readerTitle.textContent = foundBook.title;

                // Load the PDF file using PDF.js
                loadPdfDocument('../' + foundBook.pdf_path);
            } else {
                alert("Book details not found on the server.");
                window.location.href = "browse-books.html";
            }
        })
        .catch(err => {
            console.error("Error loading catalogue:", err);
            alert("Error loading PDF reader. Please check backend.");
        });

    function loadPdfDocument(pdfUrl) {
        if (loadingOverlay) loadingOverlay.style.display = 'flex';

        pdfjsLib.getDocument(pdfUrl).promise.then(function(pdfDoc_) {
            pdfDoc = pdfDoc_;
            totalPages = pdfDoc.numPages;
            if (totalPagesNumEl) totalPagesNumEl.textContent = totalPages;

            // Fetch reading history to get last read page
            fetch('../HistoryServlet')
                .then(res => res.json())
                .then(historyList => {
                    const historyItem = historyList.find(h => h.title.toLowerCase() === currentBook.title.toLowerCase());
                    if (historyItem) {
                        currentPage = historyItem.currentPage;
                    } else {
                        currentPage = 1;
                    }

                    if (currentPage > totalPages) currentPage = totalPages;
                    if (currentPage < 1) currentPage = 1;

                    renderPage(currentPage);
                    saveReadingProgress(currentBook.title, currentPage);
                })
                .catch(err => {
                    console.error("Error fetching user history:", err);
                    currentPage = 1;
                    renderPage(currentPage);
                    saveReadingProgress(currentBook.title, currentPage);
                });

        }).catch(function(error) {
            console.error("PDF.js loading error: ", error);
            if (loadingOverlay) {
                loadingOverlay.innerHTML = `<p style="color: #f87171; font-weight: 600;">Failed to load PDF document.</p>`;
            }
        });
    }

    function renderPage(num) {
        pageRendering = true;
        if (loadingOverlay) loadingOverlay.style.display = 'flex';

        // Get the page
        pdfDoc.getPage(num).then(function(page) {
            // Calculate scale based on container width & zoomLevel
            const containerWidth = viewerContainer.clientWidth - 40; // padding adjustment
            const unscaledViewport = page.getViewport({ scale: 1.0 });
            
            // Auto scale to fit container width, then apply user zoom
            const baseScale = containerWidth / unscaledViewport.width;
            const finalScale = baseScale * (zoomLevel / 100);
            
            const viewport = page.getViewport({ scale: finalScale });
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            // Render PDF page into canvas context
            const renderContext = {
                canvasContext: ctx,
                viewport: viewport
            };
            const renderTask = page.render(renderContext);

            // Wait for rendering to finish
            renderTask.promise.then(function() {
                pageRendering = false;
                if (loadingOverlay) loadingOverlay.style.display = 'none';
                
                if (pageNumPending !== null) {
                    // New page rendering is pending
                    renderPage(pageNumPending);
                    pageNumPending = null;
                }
            });
        });

        // Update page counters
        if (inputPageNumEl) inputPageNumEl.value = num;
    }

    function queueRenderPage(num) {
        if (pageRendering) {
            pageNumPending = num;
        } else {
            renderPage(num);
        }
    }

    // Save progress helper
    function saveReadingProgress(title, pageNum) {
        const params = 'bookTitle=' + encodeURIComponent(title) + '&page=' + pageNum;
        fetch('../HistoryServlet', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params
        })
        .then(res => res.json())
        .then(data => {
            console.log("Reading progress saved to database:", data);
        })
        .catch(err => {
            console.error("Error updating history in database:", err);
        });
    }

    // Page navigation helpers
    function goToPrevPage() {
        if (currentPage > 1) {
            currentPage--;
            queueRenderPage(currentPage);
            if (currentBook) saveReadingProgress(currentBook.title, currentPage);
        }
    }

    // Make functions globally available for dev console testing
    window.goToPrevPage = goToPrevPage;

    function goToNextPage() {
        if (currentPage < totalPages) {
            currentPage++;
            queueRenderPage(currentPage);
            if (currentBook) saveReadingProgress(currentBook.title, currentPage);
        }
    }

    window.goToNextPage = goToNextPage;

    // Bind navigation buttons
    if (btnPrevPage) {
        btnPrevPage.addEventListener('click', goToPrevPage);
    }

    if (btnNextPage) {
        btnNextPage.addEventListener('click', goToNextPage);
    }

    // Bind page number input field
    if (inputPageNumEl) {
        inputPageNumEl.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                const targetPage = parseInt(inputPageNumEl.value);
                if (isNaN(targetPage) || targetPage < 1 || targetPage > totalPages) {
                    alert("Page not found!");
                    inputPageNumEl.value = currentPage; // Reset to current page
                } else {
                    currentPage = targetPage;
                    queueRenderPage(currentPage);
                    if (currentBook) saveReadingProgress(currentBook.title, currentPage);
                }
            }
        });

        inputPageNumEl.addEventListener('change', function() {
            const targetPage = parseInt(inputPageNumEl.value);
            if (isNaN(targetPage) || targetPage < 1 || targetPage > totalPages) {
                alert("Page not found!");
                inputPageNumEl.value = currentPage; // Reset to current page
            } else {
                if (targetPage !== currentPage) {
                    currentPage = targetPage;
                    queueRenderPage(currentPage);
                    if (currentBook) saveReadingProgress(currentBook.title, currentPage);
                }
            }
        });
    }

    // Zoom features
    if (btnZoomIn) {
        btnZoomIn.addEventListener('click', function() {
            if (zoomLevel < 200) {
                zoomLevel += 20;
                if (zoomLevelText) zoomLevelText.textContent = zoomLevel + '%';
                if (pdfDoc) queueRenderPage(currentPage);
            }
        });
    }

    if (btnZoomOut) {
        btnZoomOut.addEventListener('click', function() {
            if (zoomLevel > 60) {
                zoomLevel -= 20;
                if (zoomLevelText) zoomLevelText.textContent = zoomLevel + '%';
                if (pdfDoc) queueRenderPage(currentPage);
            }
        });
    }

    // Swipe Gestures Support
    if (viewerContainer) {
        viewerContainer.addEventListener('touchstart', function(e) {
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        viewerContainer.addEventListener('touchend', function(e) {
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });
    }

    function handleSwipe() {
        const threshold = 70; // minimum swipe distance
        if (touchEndX < touchStartX - threshold) {
            // Swipe Left -> Go to Next Page
            goToNextPage();
        } else if (touchEndX > touchStartX + threshold) {
            // Swipe Right -> Go to Previous Page
            goToPrevPage();
        }
    }

    // Keyboard Arrow Keys Support
    document.addEventListener('keydown', function(e) {
        if (e.key === 'ArrowLeft') {
            goToPrevPage();
        } else if (e.key === 'ArrowRight') {
            goToNextPage();
        }
    });

    // Download action
    if (btnDownload) {
        btnDownload.addEventListener('click', function() {
            if (currentBook && currentBook.pdf_path) {
                const link = document.createElement('a');
                link.href = '../' + currentBook.pdf_path;
                link.download = currentBook.title + '.pdf';
                link.target = '_blank';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                alert("Download link is currently unavailable.");
            }
        });
    }
});

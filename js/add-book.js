// ==================================================
// BookNest - Add Book JS File
// Student Project Style
// ==================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log("Add Book JS Loaded!");

    // Enforce Admin Authentication
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const role = localStorage.getItem('role');

    if (!isLoggedIn || role !== 'admin') {
        alert("Access Denied! Administrators only.");
        window.location.href = "login.html";
        return;
    }

    const addBookForm = document.getElementById('addBookForm');
    
    if (addBookForm) {
        addBookForm.addEventListener('submit', function(e) {
            e.preventDefault();

            // Extract values
            const title = document.getElementById('bookTitle').value.trim();
            const author = document.getElementById('bookAuthor').value.trim();
            const category = document.getElementById('bookCategory').value;
            const rating = parseFloat(document.getElementById('bookRating').value);
            const description = document.getElementById('bookDesc').value.trim();

            const pdfFile = document.getElementById('bookPdfFile').files[0];
            const coverFile = document.getElementById('bookCoverFile').files[0];

            // Basic validation
            if (!title || !author || !category || !description || !pdfFile || !coverFile) {
                alert('Please fill out all required fields, including the PDF and Cover Image.');
                return;
            }

            // Prepare multipart Form Data for AdminBookServlet
            const formData = new FormData();
            formData.append('title', title);
            formData.append('author', author);
            formData.append('category', category);
            formData.append('coverClass', 'grad_blue'); // Default theme accent
            formData.append('rating', rating);
            formData.append('pages', '100'); // Default pages, PDF.js gets actual count anyway
            formData.append('description', description);
            formData.append('pdfFile', pdfFile);
            formData.append('coverFile', coverFile);

            // Post to AdminBookServlet using fetch
            fetch('../AdminBookServlet?action=upload', {
                method: 'POST',
                body: formData
            })
            .then(function(res) {
                return res.json();
            })
            .then(function(data) {
                if (data.status === 'success') {
                    alert(`Ebook uploaded successfully!\n\nTitle: ${title}\nAuthor: ${author}\nCategory: ${category}\n\nThis book is now dynamically registered in the PostgreSQL database and will appear in the Browse catalog!`);
                    addBookForm.reset();
                } else {
                    alert(data.message);
                }
            })
            .catch(function(err) {
                console.error("Upload Error:", err);
                alert("Error connecting to server. Please verify if the backend is running and supports multipart form uploads.");
            });
        });
    }
});

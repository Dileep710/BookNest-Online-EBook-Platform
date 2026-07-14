// ==================================================
// BookNest - Register JS File
// Student Project Style
// ==================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log("Register JS Loaded!");

    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const fullName = document.getElementById('fullName').value.trim();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (fullName === '' || email === '' || password === '') {
                alert('Please fill out all the fields!');
                return;
            }

            if (password !== confirmPassword) {
                alert('Passwords do not match!');
                return;
            }

            if (password.length < 6) {
                alert('Password must be at least 6 characters long!');
                return;
            }

            // Construct urlencoded parameters
            const params = 'fullName=' + encodeURIComponent(fullName) + 
                           '&email=' + encodeURIComponent(email) + 
                           '&password=' + encodeURIComponent(password);

            fetch('../RegisterServlet', {
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
                    alert('Registration successful! Please login.');
                    window.location.href = 'login.html';
                } else {
                    alert(data.message);
                }
            })
            .catch(function(err) {
                console.error('Registration error:', err);
                alert('Error connecting to the server. Please check the backend.');
            });
        });
    }
});

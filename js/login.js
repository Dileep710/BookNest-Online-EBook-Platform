document.addEventListener('DOMContentLoaded', function() 
{
    console.log("Login JS Loaded!");
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            const role = document.getElementById('role').value;
            if (email === '' || password === '') {
                alert('Please enter both email and password!');
                return;
            }
            // Construct form url encoded parameters
            const params = 'email=' + encodeURIComponent(email) + 
                           '&password=' + encodeURIComponent(password) + 
                           '&role=' + encodeURIComponent(role);
            fetch('../LoginServlet', {
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
                    // Save in localStorage for frontend persistence
                    localStorage.setItem('isLoggedIn', 'true');
                    localStorage.setItem('currentUser', data.name);
                    localStorage.setItem('role', data.role);
                    localStorage.setItem('email', data.email);
                    localStorage.setItem('userId', data.userId.toString());
                    // Redirect based on role
                    if (data.role === 'admin') {
                        window.location.href = 'admin-dashboard.html';
                    } else {
                        window.location.href = 'dashboard.html';
                    }
                } else {
                    alert(data.message);
                }
            })
            .catch(function(err) {
                console.error('Login error:', err);
                alert('Error connecting to the server. Please check the backend.');
            });
        });
    }
});

// ==================================================
// BookNest - Profile JS File
// Student Project Style
// ==================================================

document.addEventListener('DOMContentLoaded', function() {
    console.log("Profile JS Loaded!");

    // Input elements
    const profileForm = document.getElementById('profileForm');
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const favGenreInput = document.getElementById('favGenre');
    const notificationsInput = document.getElementById('notifications');

    // Display elements
    const nameDisplay = document.getElementById('profileNameDisplay');
    const avatarDisplay = document.querySelector('.profile_avatar_large');

    // First load default values as placeholder
    let storedName = localStorage.getItem('currentUser') || 'User';
    updateProfileDisplays(storedName);

    // Call ProfileServlet (GET) to load profile from PostgreSQL database
    fetch('../ProfileServlet')
        .then(function(res) {
            return res.json();
        })
        .then(function(data) {
            if (data.status === 'success') {
                if (fullNameInput) fullNameInput.value = data.fullName;
                if (emailInput) emailInput.value = data.email;
                if (phoneInput) phoneInput.value = data.phone;
                if (favGenreInput) favGenreInput.value = data.favGenre;
                if (notificationsInput) notificationsInput.value = data.notifications;

                updateProfileDisplays(data.fullName);

                // Update localStorage cache
                localStorage.setItem('currentUser', data.fullName);
                localStorage.setItem('registeredEmail', data.email);
            }
        })
        .catch(function(err) {
            console.error('Error fetching profile from database, using local storage cache:', err);
            // Fallback to localStorage
            const localName = localStorage.getItem('registeredName') || localStorage.getItem('currentUser') || 'John Doe';
            const localEmail = localStorage.getItem('registeredEmail') || 'john.doe@college.edu';
            const localPhone = localStorage.getItem('profilePhone') || '+1 (555) 019-2834';
            const localGenre = localStorage.getItem('profileGenre') || 'Programming';
            const localNotifications = localStorage.getItem('profileNotifications') || 'all';

            if (fullNameInput) fullNameInput.value = localName;
            if (emailInput) emailInput.value = localEmail;
            if (phoneInput) phoneInput.value = localPhone;
            if (favGenreInput) favGenreInput.value = localGenre;
            if (notificationsInput) notificationsInput.value = localNotifications;

            updateProfileDisplays(localName);
        });

    // Form Submission: updates profile details in database
    if (profileForm) {
        profileForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const updatedName = fullNameInput.value.trim();
            const updatedEmail = emailInput.value.trim();
            const updatedPhone = phoneInput.value.trim();
            const updatedGenre = favGenreInput.value;
            const updatedNotifications = notificationsInput.value;

            const newPasswordInput = document.getElementById('newPassword');
            const confirmNewPasswordInput = document.getElementById('confirmNewPassword');
            const newPassword = newPasswordInput ? newPasswordInput.value : '';
            const confirmNewPassword = confirmNewPasswordInput ? confirmNewPasswordInput.value : '';

            if (updatedName === '' || updatedEmail === '') {
                alert('Full Name and Email Address are required!');
                return;
            }

            // Construct form url encoded parameters
            let params = 'fullName=' + encodeURIComponent(updatedName) + 
                         '&email=' + encodeURIComponent(updatedEmail) + 
                         '&phone=' + encodeURIComponent(updatedPhone) + 
                         '&favGenre=' + encodeURIComponent(updatedGenre) + 
                         '&notifications=' + encodeURIComponent(updatedNotifications);

            if (newPassword !== '') {
                if (newPassword !== confirmNewPassword) {
                    alert('New passwords do not match!');
                    return;
                }
                if (newPassword.length < 6) {
                    alert('New password must be at least 6 characters long!');
                    return;
                }
                params += '&newPassword=' + encodeURIComponent(newPassword);
            }

            // POST request to ProfileServlet
            fetch('../ProfileServlet', {
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
                    // Update displays
                    updateProfileDisplays(updatedName);

                    // Clear password fields
                    if (newPasswordInput) newPasswordInput.value = '';
                    if (confirmNewPasswordInput) confirmNewPasswordInput.value = '';

                    // Update local storage cache
                    localStorage.setItem('registeredName', updatedName);
                    localStorage.setItem('currentUser', updatedName);
                    localStorage.setItem('registeredEmail', updatedEmail);
                    localStorage.setItem('profilePhone', updatedPhone);
                    localStorage.setItem('profileGenre', updatedGenre);
                    localStorage.setItem('profileNotifications', updatedNotifications);

                    alert('Profile updated successfully in database!');
                } else {
                    alert(data.message);
                }
            })
            .catch(function(err) {
                console.error('Error updating profile:', err);
                alert('Server connection error. Please ensure the backend is running.');
            });
        });
    }

    function updateProfileDisplays(name) {
        if (nameDisplay) {
            nameDisplay.textContent = name;
        }
        if (avatarDisplay) {
            const parts = name.split(' ');
            let initials = '';
            if (parts.length >= 2) {
                initials = (parts[0][0] + parts[1][0]).toUpperCase();
            } else if (name.length > 0) {
                initials = name.substring(0, 2).toUpperCase();
            } else {
                initials = 'UN';
            }
            avatarDisplay.textContent = initials;
        }
    }

    // Profile page Logout button functionality
    const profileLogoutBtn = document.getElementById('profileLogoutBtn');
    if (profileLogoutBtn) {
        profileLogoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm("Are you sure you want to log out?")) {
                fetch('../LogoutServlet')
                    .finally(function() {
                        localStorage.clear();
                        window.location.href = '../index.html';
                    });
            }
        });
    }
});

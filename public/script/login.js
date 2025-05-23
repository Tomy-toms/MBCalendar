<<<<<<< HEAD
document.addEventListener('DOMContentLoaded', function () {
        const loginForm = document.getElementById('login-form');
        const errorMessage = document.getElementById('error-message');

        // Fonction pour décoder le token JWT
        function parseJwt(token) {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            return JSON.parse(jsonPayload);
        }

        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const res = await fetch('http://localhost:3000/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || 'Erreur inconnue');
                }

                const token = data.token;
                localStorage.setItem('authToken', token);
                const user = parseJwt(token);

                if (user.mustChangePassword) {
                    // Transition vers formulaire de changement de mot de passe
                    document.getElementById('login-form').classList.add('fade-out');
                    setTimeout(() => {
                        document.getElementById('login-form').style.display = 'none';
                        document.getElementById('change-password-form').style.display = 'block';
                        document.getElementById('change-password-form').classList.add('fade-in');
                    }, 400);
                } else {
                    window.location.href = 'index.html';
                }

            } catch (err) {
                console.error('Erreur de connexion:', err);
                showError(err.message || 'Identifiant ou mot de passe incorrect.');
            }
        });

        document.getElementById('submit-new-password').addEventListener('click', async () => {
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (!newPassword || newPassword !== confirmPassword) {
                alert('Les mots de passe ne correspondent pas ou sont vides.');
                return;
            }

            const token = localStorage.getItem('authToken');

            try {
                const res = await fetch('http://localhost:3000/auth/change-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({ newPassword })
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || 'Erreur lors du changement de mot de passe');
                }

                alert('Mot de passe changé avec succès');
                window.location.href = 'index.html';
            } catch (err) {
                console.error('Erreur de changement de mot de passe:', err);
                alert(err.message || 'Erreur lors du changement de mot de passe');
            }
        });

        function showError(message) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';

            setTimeout(() => {
                errorMessage.style.display = 'none';
            }, 3000);
        }
=======
document.addEventListener('DOMContentLoaded', function () {
        const loginForm = document.getElementById('login-form');
        const errorMessage = document.getElementById('error-message');

        // Fonction pour décoder le token JWT
        function parseJwt(token) {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            return JSON.parse(jsonPayload);
        }

        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const res = await fetch('http://localhost:3000/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || 'Erreur inconnue');
                }

                const token = data.token;
                localStorage.setItem('authToken', token);
                const user = parseJwt(token);

                if (user.mustChangePassword) {
                    // Transition vers formulaire de changement de mot de passe
                    document.getElementById('login-form').classList.add('fade-out');
                    setTimeout(() => {
                        document.getElementById('login-form').style.display = 'none';
                        document.getElementById('change-password-form').style.display = 'block';
                        document.getElementById('change-password-form').classList.add('fade-in');
                    }, 400);
                } else {
                    window.location.href = 'index.html';
                }

            } catch (err) {
                console.error('Erreur de connexion:', err);
                showError(err.message || 'Identifiant ou mot de passe incorrect.');
            }
        });

        document.getElementById('submit-new-password').addEventListener('click', async () => {
            const newPassword = document.getElementById('new-password').value;
            const confirmPassword = document.getElementById('confirm-password').value;

            if (!newPassword || newPassword !== confirmPassword) {
                alert('Les mots de passe ne correspondent pas ou sont vides.');
                return;
            }

            const token = localStorage.getItem('authToken');

            try {
                const res = await fetch('http://localhost:3000/auth/change-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({ newPassword })
                });

                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || 'Erreur lors du changement de mot de passe');
                }

                alert('Mot de passe changé avec succès');
                window.location.href = 'index.html';
            } catch (err) {
                console.error('Erreur de changement de mot de passe:', err);
                alert(err.message || 'Erreur lors du changement de mot de passe');
            }
        });

        function showError(message) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';

            setTimeout(() => {
                errorMessage.style.display = 'none';
            }, 3000);
        }
>>>>>>> fc43a738188cdce725539ef8b5fbec58e7d6320d
    });
// Auth logic for Shinigami Couture
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMsg = document.getElementById('error-msg');
    const loading = document.getElementById('loading');

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            loading.style.display = 'flex';
            errorMsg.style.display = 'none';

            try {
                const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) throw error;

                // Success
                if (window.location.pathname.includes('/admin/')) {
                    window.location.href = './index.html';
                } else {
                    window.location.href = 'admin/';
                }
            } catch (err) {
                errorMsg.textContent = 'ПОМИЛКА: ' + (err.message || 'Невірний логін або пароль');
                errorMsg.style.display = 'block';
            } finally {
                loading.style.display = 'none';
            }
        });
    }
});

// Helper for relative redirects
function safeRedirect(target) {
    const isSubdir = window.location.pathname.includes('/admin/');
    if (isSubdir && !target.startsWith('http')) {
        window.location.href = '../' + target;
    } else {
        window.location.href = target;
    }
}

// Helper function to check session in other pages
async function checkAuth() {
    try {
        const { data: { session } } = await window.supabaseClient.auth.getSession();
        if (!session) {
            safeRedirect('login.html');
        }
        return session;
    } catch (err) {
        safeRedirect('login.html');
        return null;
    }
}

// Logout function
async function handleLogout() {
    await window.supabaseClient.auth.signOut();
    safeRedirect('login.html');
}

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
            const submitBtn = loginForm.querySelector('button[type="submit"]');

            if (loading) loading.style.display = 'flex';
            if (submitBtn) submitBtn.textContent = 'ЗАВАНТАЖЕННЯ...';
            errorMsg.style.display = 'none';

            try {
                const { data, error } = await window.supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });

                if (error) throw error;

                // Success
                if (window.location.pathname.includes('/admin/')) {
                    window.location.href = './';
                } else if (window.location.pathname.includes('/login/')) {
                    window.location.href = '../admin/';
                } else {
                    window.location.href = 'admin/';
                }
            } catch (err) {
                errorMsg.textContent = 'ПОМИЛКА: ' + (err.message || 'Невірний логін або пароль');
                errorMsg.style.display = 'block';
                if (submitBtn) submitBtn.textContent = 'УВІЙТИ';
            } finally {
                if (loading) loading.style.display = 'none';
            }
        });
    }
});

// Helper for relative redirects
function safeRedirect(target) {
    const isSubdir = window.location.pathname.includes('/admin/') || window.location.pathname.includes('/login/');
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
            safeRedirect('login/');
        }
        return session;
    } catch (err) {
        safeRedirect('login/');
        return null;
    }
}

// Logout function
async function handleLogout() {
    await window.supabaseClient.auth.signOut();
    safeRedirect('login/');
}

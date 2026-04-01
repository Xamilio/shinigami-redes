document.addEventListener('DOMContentLoaded', async () => {
    // DOM Elements
    const authCard = document.getElementById('auth-card');
    const dashboardCard = document.getElementById('dashboard-card');
    
    const emailSection = document.getElementById('email-section');
    const otpSection = document.getElementById('otp-section');
    
    const emailForm = document.getElementById('email-form');
    const otpForm = document.getElementById('otp-form');
    
    const emailInput = document.getElementById('email');
    const otpInput = document.getElementById('otp');
    
    const displayEmail = document.getElementById('display-email');
    const logoutBtn = document.getElementById('logout-btn');
    
    const errorMsg = document.getElementById('error-msg');
    const successMsg = document.getElementById('success-msg');
    
    const sendCodeBtn = document.getElementById('send-code-btn');
    const verifyCodeBtn = document.getElementById('verify-code-btn');
    const backToEmailBtn = document.getElementById('back-to-email');

    // State
    let currentUserEmail = '';

    // Error / Success helpers
    const showMsg = (el, msg) => {
        el.textContent = msg;
        el.style.display = 'block';
        setTimeout(() => el.style.display = 'none', 5000);
    };

    // 1. Check if already logged in
    const checkUser = async () => {
        const { data: { session }, error } = await window.supabaseClient.auth.getSession();
        
        if (session && session.user) {
            // Logged in!
            showDashboard(session.user);
        } else {
            // Not logged in
            showAuth();
        }
    };

    // UI Toggles
    const showAuth = () => {
        document.body.classList.remove('dashboard-active');
        authCard.style.display = 'block';
        dashboardCard.style.display = 'none';
        emailSection.style.display = 'block';
        otpSection.style.display = 'none';
        emailInput.value = '';
        otpInput.value = '';
    };

    const showOtpView = (email) => {
        document.body.classList.remove('dashboard-active');
        currentUserEmail = email;
        emailSection.style.display = 'none';
        otpSection.style.display = 'block';
        otpInput.value = '';
        otpInput.focus();
    };

    const showDashboard = (user) => {
        document.body.classList.add('dashboard-active');
        authCard.style.display = 'none';
        dashboardCard.style.display = 'block';
        if (user.email) {
            displayEmail.textContent = user.email;
        }
    };

    // 2. Handle Send OTP Form
    emailForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        if (!email) return;

        sendCodeBtn.disabled = true;
        sendCodeBtn.textContent = 'Відправка...';
        
        try {
            const { error } = await window.supabaseClient.auth.signInWithOtp({
                email: email,
                options: {
                    shouldCreateUser: true // creates user if not exists
                }
            });

            if (error) throw error;

            showMsg(successMsg, 'Код надіслано на вашу пошту!');
            showOtpView(email);
        } catch (err) {
            console.error('OTP Send Error:', err);
            showMsg(errorMsg, err.message || 'Помилка при відправці коду');
        } finally {
            sendCodeBtn.disabled = false;
            sendCodeBtn.textContent = 'ОТРИМАТИ КОД';
        }
    });

    // Back button inside OTP view
    backToEmailBtn.addEventListener('click', () => {
        emailSection.style.display = 'block';
        otpSection.style.display = 'none';
    });

    // 3. Handle Verify Code
    otpForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = otpInput.value.trim();
        if (!code || code.length !== 6) return;

        verifyCodeBtn.disabled = true;
        verifyCodeBtn.textContent = 'Перевірка...';

        try {
            const { data: { session }, error } = await window.supabaseClient.auth.verifyOtp({
                email: currentUserEmail,
                token: code,
                type: 'email'
            });

            if (error) throw error;

            if (session && session.user) {
                // Success!
                showDashboard(session.user);
            } else {
                showMsg(errorMsg, 'Не вдалося авторизуватись. Спробуйте ще раз.');
            }

        } catch (err) {
            console.error('OTP Verify Error:', err);
            const msg = err.message || 'Неправильний код або термін його дії минув.';
            showMsg(errorMsg, msg);
        } finally {
            verifyCodeBtn.disabled = false;
            verifyCodeBtn.textContent = 'УВІЙТИ';
        }
    });

    // 4. Handle Logout
    logoutBtn.addEventListener('click', async () => {
        logoutBtn.disabled = true;
        try {
            await window.supabaseClient.auth.signOut();
            showAuth();
        } catch (err) {
            console.error(err);
        } finally {
            logoutBtn.disabled = false;
        }
    });

    // Initialize checking
    checkUser();
});

document.addEventListener('DOMContentLoaded', () => {
    // Custom Cursor Logic
    const cursor = document.getElementById('custom-cursor');
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });
    
    // Add hover effect logic for cursor
    const interactiveElements = document.querySelectorAll('.product-card, .gallery-thumbnails img, .btn-primary, .close-cart, .social-link');
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });

    // --- Helper for Dynamic Images (Now global in supabase-config.js) ---
    // window.resolveImage is used instead

    // 1. Products Data Management - Removed hardcoded array, now using Supabase exclusively.
    
    // Initialize products from Supabase
    async function fetchProducts() {
        try {
            console.log('Fetching products from Supabase...');
            const { data, error } = await window.supabaseClient
                .from('products')
                .select('*')
                .order('name', { ascending: true }); // Changed from created_at (not in schema) to name

            if (error) throw error;
            console.log('Fetched products from Supabase:', data);
            return data || [];
        } catch (err) {
            console.error('Supabase fetch error:', err);
            return [];
        }
    }

    // 1.5 Dynamic Site Settings
    async function applySiteSettings() {
        try {
            const { data, error } = await window.supabaseClient.from('site_settings').select('*');
            if (error || !data) return;

            data.forEach(s => {
                if (!s.value) return;
                
                if (s.key === 'main_banner') {
                    const bannerImg = document.querySelector('.hero-card-image');
                    if (bannerImg) bannerImg.style.backgroundImage = `url('${window.resolveImage(s.value)}')`;
                }
                if (s.key === 'hero_bg') {
                    const heroSec = document.querySelector('.hero');
                    if (heroSec) heroSec.style.backgroundImage = `url('${window.resolveImage(s.value)}')`;
                }
                if (s.key === 'logo') {
                    const logoImg = document.querySelector('.logo img');
                    if (logoImg) logoImg.src = window.resolveImage(s.value);
                }
                if (s.key === 'marquee') {
                    const marqueeContents = document.querySelectorAll('.marquee-content');
                    marqueeContents.forEach(mc => {
                        const bat = '<img src="img/running-strip/black-bat.png" class="marquee-bat" alt="bat">';
                        const logoText = '<img src="img/running-strip/Shinigami-text.png" class="marquee-logo" alt="shinigami text">';
                        mc.innerHTML = `${logoText}${bat}${s.value}${bat}${logoText}${bat}${s.value}${bat}`;
                    });
                }
                if (s.key === 'instagram') {
                    const links = document.querySelectorAll('.social-link.insta');
                    links.forEach(l => l.href = s.value);
                }
                if (s.key === 'tiktok') {
                    const links = document.querySelectorAll('.social-link.tiktok');
                    links.forEach(l => l.href = s.value);
                }
            });
        } catch (err) {
            console.warn('Dynamic settings not available:', err);
        }
    }
    
    // Call it
    applySiteSettings();

    // 2. Render Products
    const productGrid = document.getElementById('product-grid');
    
    if (productGrid) {
        fetchProducts().then(products => {
            renderProducts(products);
        });
    }

    function renderProducts(products) {
        if (!productGrid) return;
        productGrid.innerHTML = '';
        products.forEach((product) => {
            const card = document.createElement('div');
            card.className = 'product-card reveal';
            
            // Render status badge
            let badgeHTML = '';
            const status = product.status || 'none';
            
            if (status !== 'none') {
                let badgeText = '';
                if (status === 'new') badgeText = 'NEW';
                if (status === 'preorder') badgeText = 'PRE-ORDER';
                if (status === 'soldout') badgeText = 'SOLD OUT';
                badgeHTML = `<div class="badge">${badgeText}</div>`;
            }
            
            const stripeSize = 20;
            const pattern = `repeating-linear-gradient(45deg, #e0e0e0, #e0e0e0 ${stripeSize}px, #f5f5f5 ${stripeSize}px, #f5f5f5 ${stripeSize * 2}px)`;

            // Map user's specific database fields
            let imageSource = product.image || '';
            if (String(imageSource).endsWith('/')) {
                imageSource = `${imageSource}/1.jpg`.replace(/\/+/g, '/'); // Dynamic preview for folders
            }
            const image = window.resolveImage(imageSource);
            const title = product.name || product.title;
            const price = typeof product.price === 'number' ? `₴${product.price}` : product.price;

            // Use name as ID for the detail page
            const productId = product.name || product.title || product.id;

            const imageHTML = image 
                ? `<img src="${image}" class="product-img main-img" alt="${title}">`
                : `<div class="product-image-placeholder" style="background: ${pattern};">
                       ${title.split(' ')[0]} ${title.split(' ')[1] || ''}
                   </div>`;

            card.innerHTML = `
                <div class="product-image-wrap">
                    ${badgeHTML}
                    ${imageHTML}
                </div>
                <div class="product-info">
                    <h3 class="product-title">${title}</h3>
                    <div class="product-bottom">
                        <p class="product-price">${price}</p>
                        <button class="add-to-cart-btn" aria-label="Add to cart" data-product-id="${productId}">
                            <img src="img/icons/basket-black.svg" alt="cart">
                        </button>
                    </div>
                </div>
            `;
            productGrid.appendChild(card);
            
            // Fix: Separate click for image/title vs add-to-cart button
            const imageWrap = card.querySelector('.product-image-wrap');
            const infoTitle = card.querySelector('.product-title');
            const addToCartBtn = card.querySelector('.add-to-cart-btn');

            [imageWrap, infoTitle].forEach(el => {
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    window.location.href = `product.html?id=${encodeURIComponent(productId)}`; 
                });
            });

            if (addToCartBtn) {
                addToCartBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const cleanPrice = typeof product.price === 'string' 
                        ? parseFloat(product.price.replace(/[^\d.]/g, '')) 
                        : product.price;
                    
                    window.addToCart({
                        id: productId,
                        name: productId,
                        price: cleanPrice,
                        image: imageSource
                    });
                });
            }
        });

        // Initialize animations for new elements
        const revealElements = document.querySelectorAll('.reveal');
        if (typeof IntersectionObserver !== 'undefined') {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('active');
                    }
                });
            }, { threshold: 0.1 });
            revealElements.forEach(el => observer.observe(el));
        }
    }

    // 2.5 Scroll Reveal Animation using Intersection Observer
    const revealElements = document.querySelectorAll('.reveal');
    const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('active');
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    });

    revealElements.forEach(el => revealObserver.observe(el));

    // 3. Setup Navbar scroll effect
    const navbar = document.getElementById('navbar');
    const marqueeContainer = document.querySelector('.marquee-container');

    window.addEventListener('scroll', () => {
        // Navbar scrolled state logic remains, but removed dynamic hiding logic
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        // Hide navbar just before reaching the marquee (Home page only)
        if (marqueeContainer) {
            const hideThreshold = marqueeContainer.offsetTop - navbar.offsetHeight - 50;
            if (window.scrollY > hideThreshold) {
                navbar.classList.add('hidden-nav');
            } else {
                navbar.classList.remove('hidden-nav');
            }
        }
    });

    // 4. Mobile Menu
    const burgerMenu = document.getElementById('burger-menu');
    const navLinks = document.getElementById('nav-links');
    
    burgerMenu.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        // Simple animation for burger lines could go here
    });

    // Close menu when clicking a link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', () => {
            navLinks.classList.remove('active');
        });
    });

    // 5. Cart Drawer functionality
    const cartBtn = document.getElementById('cart-btn');
    const closeCart = document.getElementById('close-cart');
    const cartDrawer = document.getElementById('cart-drawer');
    const cartOverlay = document.getElementById('cart-drawer-overlay');

    function toggleCart() {
        cartDrawer.classList.toggle('active');
        cartOverlay.classList.toggle('active');
        if(cartDrawer.classList.contains('active')) {
            document.body.style.overflow = 'hidden'; // Stop background scrolling
        } else {
            document.body.style.overflow = '';
        }
    }

    cartBtn.addEventListener('click', toggleCart);
    closeCart.addEventListener('click', toggleCart);
    cartOverlay.addEventListener('click', toggleCart);

    // --- CART SYSTEM ---
    window.cart = JSON.parse(localStorage.getItem('shinigami_cart')) || [];

    window.saveCart = () => {
        localStorage.setItem('shinigami_cart', JSON.stringify(window.cart));
        window.updateCartUI();
    };

    window.addToCart = (product) => {
        const existing = window.cart.find(item => item.id === product.id);
        if (existing) {
            existing.quantity += 1;
        } else {
            window.cart.push({
                ...product,
                quantity: 1
            });
        }
        window.saveCart();
        
        // Open cart to show addition
        if (!cartDrawer.classList.contains('active')) toggleCart();
    };

    window.removeFromCart = (productId) => {
        window.cart = window.cart.filter(item => item.id !== productId);
        window.saveCart();
    };

    window.updateQuantity = (productId, delta) => {
        const item = window.cart.find(item => item.id === productId);
        if (item) {
            item.quantity += delta;
            if (item.quantity <= 0) {
                window.removeFromCart(productId);
            } else {
                window.saveCart();
            }
        }
    };

    window.updateCartUI = () => {
        const cartBody = document.querySelector('.cart-body');
        const cartTotal = document.querySelector('.cart-total span:last-child');
        const cartCount = document.querySelector('.cart-btn .cart-badge'); // We might need to add this to HTML later
        
        if (!cartBody) return;

        if (window.cart.length === 0) {
            cartBody.innerHTML = '<p class="empty-cart-msg">Ваш кошик порожній.</p>';
            if (cartTotal) cartTotal.textContent = '₴0';
            return;
        }

        let total = 0;
        cartBody.innerHTML = window.cart.map(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            const imgPath = window.resolveImage(item.image);
            
            return `
                <div class="cart-item">
                    <div class="cart-item-img">
                        <img src="${imgPath}" alt="${item.name}">
                    </div>
                    <div class="cart-item-info">
                        <div class="cart-item-header">
                            <h4>${item.name}</h4>
                            <button class="remove-item" onclick="window.removeFromCart('${item.id.replace(/'/g, "\\'")}')">&times;</button>
                        </div>
                        <div class="cart-item-bottom">
                            <div class="quantity-controls">
                                <button onclick="window.updateQuantity('${item.id.replace(/'/g, "\\'")}', -1)">-</button>
                                <span>${item.quantity}</span>
                                <button onclick="window.updateQuantity('${item.id.replace(/'/g, "\\'")}', 1)">+</button>
                            </div>
                            <span class="item-price">₴${itemTotal.toLocaleString('uk-UA')}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        if (cartTotal) cartTotal.textContent = `₴${total.toLocaleString('uk-UA')}`;
        const finalTotal = document.getElementById('final-total');
        if (finalTotal) finalTotal.textContent = `₴${total.toLocaleString('uk-UA')}`;
    };

    // --- CHECKOUT LOGIC ---
    const checkoutBtn = document.querySelector('.checkout-btn');
    const checkoutModal = document.getElementById('checkout-modal');
    const closeCheckout = document.getElementById('close-checkout');
    const checkoutForm = document.getElementById('checkout-form');
    const orderSuccess = document.getElementById('order-success');

    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (window.cart.length === 0) {
                alert('Кошик порожній!');
                return;
            }
            toggleCart(); // Close drawer
            checkoutModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        });
    }

    if (closeCheckout) {
        closeCheckout.addEventListener('click', () => {
            checkoutModal.classList.remove('active');
            document.body.style.overflow = '';
        });
    }

    if (checkoutForm) {
        checkoutForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Here you would normally send data to a server
            const orderData = {
                customer: {
                    name: document.getElementById('cust-name').value,
                    phone: document.getElementById('cust-phone').value,
                    address: document.getElementById('cust-address').value
                },
                items: window.cart,
                total: window.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
            };

            console.log('Order placed:', orderData);
            
            // Simulated success
            checkoutForm.style.display = 'none';
            orderSuccess.style.display = 'block';
            
            // Clear cart
            window.cart = [];
            window.saveCart();
        });
    }

    // Initial UI update
    window.updateCartUI();
});

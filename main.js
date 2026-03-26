document.addEventListener('DOMContentLoaded', () => {
    // Custom Cursor Logic
    const cursor = document.getElementById('custom-cursor');
    document.addEventListener('mousemove', (e) => {
        cursor.style.left = e.clientX + 'px';
        cursor.style.top = e.clientY + 'px';
    });
    
    // Add hover effect logic for cursor
    const interactiveElements = document.querySelectorAll('.product-card, .gallery-thumbnails img, .btn-primary, .close-cart');
    interactiveElements.forEach(el => {
        el.addEventListener('mouseenter', () => cursor.classList.add('hover'));
        el.addEventListener('mouseleave', () => cursor.classList.remove('hover'));
    });

    // 1. Products Data Management
    const initialProducts = [
        { name: '«BEEP THE BAT» LEATHER BACKPACK', price: '₴6,666.00', status: 'none', color: 'black', image: 'img/products/beep-the-bat-leather-backpack/Backpack_1.webp', hoverImage: 'img/products/beep-the-bat-leather-backpack/Backpack_2.webp' },
        { name: '«BEEP THE BAT» THERMOCHROMIC CROSSBODY BAG WHITE', price: '₴2,800', status: 'preorder', color: 'white' },
        { name: '«BEEP THE BAT» THERMOCHROMIC CROSSBODY BAG BLUE', price: '₴2,800', status: 'none', color: 'blue' },
        { name: '«BEEP THE BAT» THERMOCHROMIC CROSSBODY BAG PURPLE', price: '₴2,800', status: 'preorder', color: 'purple' },
        { name: 'DARK LORD PUFFER JACKET', price: '₴6,500', status: 'preorder', color: 'black' },
        { name: 'Сумка через плече "Beep the Bat" - чорна', price: '₴2,600', status: 'preorder', color: 'black' },
        { name: 'COAT OF ARMS TEE - DARK GRAY', price: '₴1,200', status: 'none', color: '#333' },
        { name: 'COAT OF ARMS TEE - LIGHT GRAY', price: '₴1,200', status: 'none', color: '#ccc' },
        { name: 'ANARCHY SHINE TEE BLACK', price: '₴1,400', status: 'none', color: '#111' },
        { name: 'ANARCHY SHINE TEE WHITE', price: '₴1,400', status: 'none', color: '#fff' },
        { name: 'ШКАПЕТКИ ANARCHY (3 УПАКОВКИ)', price: '₴600', status: 'none', color: 'mixed' },
        { name: 'DARK CRUSADER SILK SHAWL', price: '₴1,800', status: 'none', color: 'black' },
        { name: 'ТЕРМОХРОМНА ВІТРОВКА З КИШЕНЯМИ - СІРА', price: '₴4,200', status: 'preorder', color: 'grey' },
        { name: 'ВІТРОВКА З ВЕНЗЕЛЕМ І КИШЕНЯМИ - ЗЕЛЕНА', price: '₴4,200', status: 'preorder', color: 'green' }
    ];

    // Initialize products from Supabase
    async function fetchProducts() {
        try {
            const { data, error } = await window.supabaseClient
                .from('products')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            
            if (data && data.length > 0) {
                return data;
            } else {
                // If DB is empty, use initialProducts and maybe seed them (optional)
                return JSON.parse(localStorage.getItem('shinigami_products')) || initialProducts;
            }
        } catch (err) {
            console.error('Supabase fetch error:', err);
            return JSON.parse(localStorage.getItem('shinigami_products')) || initialProducts;
        }
    }

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
            const image = product.image;
            const title = product.name || product.title;
            const price = typeof product.price === 'number' ? `₴${product.price}` : product.price;

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
                        <button class="add-to-cart-btn" aria-label="Add to cart">
                            <img src="img/icons/basket-black.svg" alt="cart">
                        </button>
                    </div>
                </div>
            `;
            productGrid.appendChild(card);
            
            // Use name as ID for the detail page
            const productId = product.name || product.title || product.id;
            if (productId) {
                card.addEventListener('click', () => { 
                    window.location.href = `product.html?id=${encodeURIComponent(productId)}`; 
                });
            } else {
                console.error('Product has no valid identifier:', product);
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

    // Add empty cart check logic if needed later
});

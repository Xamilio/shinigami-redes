document.addEventListener('DOMContentLoaded', async () => {
    // 0. Security Check
    const session = await checkAuth();
    if (!session) return;

    // Logout binding
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // 1. Tab Switching Logic
    const navItems = document.querySelectorAll('.nav-item[data-tab]');
    const tabContents = document.querySelectorAll('.tab-content');
    const pageTitle = document.getElementById('page-title');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = item.getAttribute('data-tab');
            
            // Update active states
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            
            tabContents.forEach(tab => tab.classList.remove('active'));
            document.getElementById(`${tabId}-tab`).classList.add('active');
            
            // Update title
            pageTitle.textContent = item.textContent.trim();
        });
    });

    // 2. Data Management
    let products = [];

    const fetchProducts = async () => {
        try {
            const { data, error } = await window.supabaseClient
                .from('products')
                .select('*')
                .order('name', { ascending: true }); // No created_at in screenshot, using name

            if (error) throw error;
            products = data || [];
            updateDashboard();
        } catch (err) {
            console.error('Error fetching products:', err);
            const msg = err.message || JSON.stringify(err);
            console.log('Detailed fetch error:', msg);
            products = JSON.parse(localStorage.getItem('shinigami_products')) || [];
            updateDashboard();
        }
    };

    const saveProductToDB = async (productData, originalName) => {
        try {
            // Helper to clean price: "₴2,500" -> 2500
            const cleanPrice = (priceStr) => {
                if (typeof priceStr === 'string') return priceStr.trim();
                return priceStr;
            };

            const dbData = {
                name: productData.title, // Map UI title to DB name
                price: cleanPrice(productData.price),
                category: productData.category,
                image: productData.image,
                description: productData.description,
                specifications: productData.features.join('; '), // Map features to specifications (text)
                material: productData.material,
                delivery: productData.delivery,
                recommendations: productData.care, // Map care to recommendations
                configuration: productData.packageContents, // Map packageContents to configuration
                status: productData.status
            };

            let res;
            if (originalName) {
                // If we are editing, we use the original name to find the record
                res = await window.supabaseClient.from('products').update(dbData).eq('name', originalName);
            } else {
                res = await window.supabaseClient.from('products').insert([dbData]);
            }

            if (res.error) throw res.error;
            await fetchProducts();
        } catch (err) {
            console.error('Error saving product:', err);
            const msg = err.message || JSON.stringify(err);
            alert('Помилка при збереженні: ' + msg);
        }
    };

    const deleteProductFromDB = async (name) => {
        try {
            const { error } = await window.supabaseClient.from('products').delete().eq('name', name);
            if (error) throw error;
            await fetchProducts();
        } catch (err) {
            console.error('Error deleting product:', err);
            const msg = err.message || JSON.stringify(err);
            alert('Помилка при видаленні: ' + msg);
        }
    };

    // 3. UI Rendering
    function updateDashboard() {
        document.getElementById('total-products-count').textContent = products.length;
        const preorderCount = products.filter(p => p.status === 'preorder').length;
        document.getElementById('preorder-count').textContent = preorderCount;
        
        const soldoutCount = products.filter(p => p.status === 'soldout').length;
        document.getElementById('soldout-count').textContent = soldoutCount;
        
        renderRecentTable();
        renderAllTable();
    }

    const renderRecentTable = () => {
        const recentTableBody = document.querySelector('#recent-products-table tbody');
        if (!recentTableBody) return;
        recentTableBody.innerHTML = '';
        const recent = products.slice(0, 5);
        recent.forEach((p) => {
            const tr = document.createElement('tr');
            const isPre = p.status === 'preorder';
            tr.innerHTML = `
                <td>${p.name}</td>
                <td>₴${p.price}</td>
                <td>${isPre ? '<span style="color: #ffaa00">Передзамовлення</span>' : 'В наявності'}</td>
                <td>
                    <button class="btn-action btn-edit" onclick="editProductByName('${p.name.replace(/'/g, "\\'")}')">Редагувати</button>
                </td>
            `;
            recentTableBody.appendChild(tr);
        });
    };

    const renderAllTable = () => {
        const allTableBody = document.querySelector('#all-products-table tbody');
        if (!allTableBody) return;
        allTableBody.innerHTML = '';
        products.forEach((p) => {
            const tr = document.createElement('tr');
            const isPre = p.status === 'preorder';
            tr.innerHTML = `
                <td><div style="width: 40px; height: 40px; border: 1px solid #000; overflow: hidden;"><img src="${p.image || ''}" style="width: 100%; height: 100%; object-fit: cover;" alt=""></div></td>
                <td>${p.name}</td>
                <td>₴${p.price}</td>
                <td>${isPre ? 'Так' : 'Ні'}</td>
                <td>
                    <a href="product.html?id=${p.name}" target="_blank" class="btn-action btn-view" style="text-decoration: none; display: inline-block;">Перегляд</a>
                    <button class="btn-action btn-edit" onclick="editProductByName('${p.name.replace(/'/g, "\\'")}')">Ред.</button>
                    <button class="btn-action btn-delete" onclick="deleteProductByName('${p.name.replace(/'/g, "\\'")}')">Вид.</button>
                </td>
            `;
            allTableBody.appendChild(tr);
        });
    };

    // 4. CRUD Operations
    const modal = document.getElementById('product-modal');
    const productForm = document.getElementById('product-form');
    const modalTitle = document.getElementById('modal-title');
    const addBtn = document.getElementById('add-product-btn');
    const closeModal = document.querySelector('.close-modal');

    window.editProductByName = (name) => {
        const p = products.find(prod => prod.name === name);
        if (!p) return;

        document.getElementById('product-index').value = p.name; // Store original name for identification
        document.getElementById('title').value = p.name;
        document.getElementById('price').value = `₴${p.price}`;
        document.getElementById('category').value = p.category || '';
        document.getElementById('image').value = p.image || '';
        document.getElementById('description').value = p.description || '';
        
        // Handle specifications (it was array features in UI, but text specifications in DB)
        document.getElementById('features').value = p.specifications || '';
        
        document.getElementById('material').value = p.material || '';
        document.getElementById('delivery').value = p.delivery || '';
        document.getElementById('sku').value = ''; // No SKU in screenshot
        document.getElementById('care').value = p.recommendations || '';
        document.getElementById('packageContents').value = p.configuration || '';
        
        const radio = document.querySelector(`input[name="product-status"][value="${p.status || 'none'}"]`);
        if (radio) radio.checked = true;
        
        modalTitle.textContent = 'Редагувати товар';
        modal.classList.add('active');
    };

    window.deleteProductByName = (name) => {
        if (confirm(`Ви впевнені, що хочете видалити "${name}"?`)) {
            deleteProductFromDB(name);
        }
    };

    addBtn.addEventListener('click', () => {
        productForm.reset();
        document.getElementById('product-index').value = '';
        modalTitle.textContent = 'Додати товар';
        modal.classList.add('active');
    });

    closeModal.addEventListener('click', () => modal.classList.remove('active'));
    window.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });

    productForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const originalName = document.getElementById('product-index').value;
        const productData = {
            title: document.getElementById('title').value,
            price: document.getElementById('price').value,
            category: document.getElementById('category').value,
            image: document.getElementById('image').value,
            description: document.getElementById('description').value,
            // Specifications is text in DB, keeping it text here
            features: document.getElementById('features').value.split(';').map(f => f.trim()).filter(f => f !== ''),
            material: document.getElementById('material').value,
            delivery: document.getElementById('delivery').value,
            care: document.getElementById('care').value,
            packageContents: document.getElementById('packageContents').value,
            status: document.querySelector('input[name="product-status"]:checked').value
        };
        
        saveProductToDB(productData, originalName === '' ? null : originalName);
        modal.classList.remove('active');
    });

    // 5. Custom Cursor
    const cursor = document.getElementById('custom-cursor');
    if (cursor) {
        document.addEventListener('mousemove', (e) => {
            cursor.style.left = e.clientX + 'px';
            cursor.style.top = e.clientY + 'px';
        });
        
        document.addEventListener('mouseover', (e) => {
            if (e.target.closest('button, a, .nav-item, tr')) {
                cursor.classList.add('hover');
            } else {
                cursor.classList.remove('hover');
            }
        });
    }

    // Initial load
    fetchProducts();
});

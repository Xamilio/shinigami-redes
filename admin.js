document.addEventListener('DOMContentLoaded', async () => {
    // 0. Custom Cursor (Move to top for reliability)
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

    // 0.5 Security Check
    const session = await checkAuth();
    if (!session) return;

    // Logout binding
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }

    // --- Live Previews for Settings ---
    function updatePreview(id, value) {
        const preview = document.getElementById(`preview-${id}`);
        if (!preview) return;
        const url = window.resolveImage(value);
        if (url && url !== value) {
            preview.style.backgroundImage = `url('${url}')`;
            preview.innerHTML = ''; // Clear text
            preview.style.backgroundSize = 'contain';
            preview.style.backgroundRepeat = 'no-repeat';
        } else if (url && (url.startsWith('http') || url.startsWith('img/'))) {
            preview.style.backgroundImage = `url('${url}')`;
            preview.innerHTML = '';
            preview.style.backgroundSize = 'contain';
            preview.style.backgroundRepeat = 'no-repeat';
        } else {
            preview.style.backgroundImage = 'none';
            preview.innerHTML = `<span style="font-size: 0.7rem; color: #999;">Прев'ю ${id.replace('setting-', '')}</span>`;
        }
    }

    function setupSettingsPreviews() {
        const inputs = ['setting-logo', 'setting-main_banner', 'setting-hero_bg'];
        inputs.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', (e) => updatePreview(id.replace('setting-', ''), e.target.value));
            }
        });
    }

    // --- Helper for Dynamic Images (Now global in supabase-config.js) ---
    // window.resolveImage is used instead

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
                gallery: productData.gallery,
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
        // Skip fetchSettings here as it's called globally above
    }

    const renderRecentTable = () => {
        const recentTableBody = document.querySelector('#recent-products-table tbody');
        if (!recentTableBody) return;
        recentTableBody.innerHTML = '';
        const recent = products.slice(0, 5);
        recent.forEach((p) => {
            const tr = document.createElement('tr');
            let displayPrice = String(p.price).trim();
            if (!displayPrice.startsWith('₴') && !isNaN(displayPrice)) {
                displayPrice = `₴${displayPrice}`;
            }
            const isPre = p.status === 'preorder';
            const isSold = p.status === 'soldout';
            
            let statusText = '<span style="color: #000; font-weight: 800;">В наявності</span>';
            if (isPre) statusText = '<span style="color: #000; font-weight: 800;">Передзамовлення</span>';
            if (isSold) statusText = '<span style="color: #000; font-weight: 800;">Розпродано</span>';

            tr.innerHTML = `
                <td>${p.name}</td>
                <td>${displayPrice}</td>
                <td>${statusText}</td>
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
            let displayPrice = String(p.price).trim();
            if (!displayPrice.startsWith('₴') && !isNaN(displayPrice)) {
                displayPrice = `₴${displayPrice}`;
            }
            
            const isPre = p.status === 'preorder';
            const isSold = p.status === 'soldout';
            const isNew = p.status === 'new';
            
            let statusText = '<span style="color: #000; font-weight: 800;">В наявності</span>';
            if (isPre) statusText = '<span style="color: #000; font-weight: 800;">Передзамовлення</span>';
            if (isSold) statusText = '<span style="color: #000; font-weight: 800;">Розпродано</span>';
            if (isNew) statusText = '<span style="color: #000; font-weight: 800;">Новинка</span>';

            tr.innerHTML = `
                <td><div style="width: 40px; height: 40px; border: 1px solid #000; overflow: hidden;"><img src="${window.resolveImage(p.image) || ''}" style="width: 100%; height: 100%; object-fit: cover;" alt=""></div></td>
                <td>${p.name}</td>
                <td>${displayPrice}</td>
                <td>${statusText}</td>
                <td>
                    <a href="product.html?id=${p.name}" target="_blank" class="btn-action btn-view">Перегляд</a>
                    <button class="btn-action btn-edit" onclick="editProductByName('${p.name.replace(/'/g, "\\'")}')">Ред.</button>
                    <button class="btn-action btn-delete" onclick="deleteProductByName('${p.name.replace(/'/g, "\\'")}')">Вид.</button>
                </td>
            `;
            allTableBody.appendChild(tr);
        });
    };

    // 4. Modal Control
    const productModal = document.getElementById('product-modal');
    const addBtn = document.getElementById('add-product-btn');
    const productForm = document.getElementById('product-form');
    
    
    window.openProductModal = () => {
        if (productModal) {
            productModal.style.display = 'flex';
            setTimeout(() => productModal.classList.add('active'), 10);
            document.body.style.overflow = 'hidden'; // Prevent scroll
        }
    };

    window.closeProductModal = () => {
        if (productModal) {
            productModal.classList.remove('active');
            setTimeout(() => {
                productModal.style.display = 'none';
                document.body.style.overflow = '';
            }, 300);
        }
    };

    window.editProductByName = (name) => {
        const p = products.find(prod => prod.name === name);
        if (!p) return;

        const modalTitle = document.getElementById('modal-title');
        
        document.getElementById('product-index').value = p.name;
        document.getElementById('title').value = p.name;
        document.getElementById('price').value = p.price;
        document.getElementById('category').value = p.category || '';
        document.getElementById('image').value = p.image || '';
        document.getElementById('gallery').value = p.gallery || '';
        document.getElementById('description').value = p.description || '';
        document.getElementById('features').value = p.specifications || '';
        document.getElementById('material').value = p.material || '';
        document.getElementById('delivery').value = p.delivery || '';
        document.getElementById('care').value = p.recommendations || '';
        document.getElementById('packageContents').value = p.configuration || '';
        
        const radio = document.querySelector(`input[name="product-status"][value="${p.status || 'none'}"]`);
        if (radio) radio.checked = true;
        
        // Update Modal Preview
        updateProductModalPreview(p.image);
        
        modalTitle.textContent = 'Редагувати товар';
        openProductModal();
    };

    window.deleteProductByName = (name) => {
        if (confirm(`Ви впевнені, що хочете видалити "${name}"?`)) {
            deleteProductFromDB(name);
        }
    };

    addBtn.addEventListener('click', () => {
        const modalTitle = document.getElementById('modal-title');
        productForm.reset();
        document.getElementById('product-index').value = '';
        updateProductModalPreview(''); // Clear preview
        modalTitle.textContent = 'Додати товар';
        openProductModal();
    });

    // Helper for modal preview
    function updateProductModalPreview(value) {
        const preview = document.getElementById('product-img-preview');
        if (!preview) return;
        const url = window.resolveImage(value);
        if (url && (url.startsWith('http') || url.startsWith('img/'))) {
            preview.innerHTML = `<img src="${url}" style="max-height: 100%; max-width: 100%; object-fit: contain;">`;
        } else {
            preview.innerHTML = `<span style="font-size: 0.7rem; color: #999;">Прев'ю основного фото</span>`;
        }
    }

    const modalImgInput = document.getElementById('image');
    if (modalImgInput) {
        modalImgInput.addEventListener('input', (e) => updateProductModalPreview(e.target.value));
    }

    // --- GALLERY UPLOAD LOGIC ---
    const galleryUploadBtn = document.getElementById('gallery-upload-btn');
    const galleryUploadInput = document.getElementById('gallery-upload-input');
    const uploadStatus = document.getElementById('upload-status');

    if (galleryUploadBtn && galleryUploadInput) {
        galleryUploadBtn.addEventListener('click', () => {
            const title = document.getElementById('title').value;
            if (!title) {
                alert('Спочатку введіть назву товару, щоб створити папку!');
                return;
            }
            galleryUploadInput.click();
        });

        galleryUploadInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;

            const title = document.getElementById('title').value;
            const slug = title.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
            const folderName = `${slug}-${Date.now()}`;
            const bucket = 'products';
            
            galleryUploadBtn.disabled = true;
            galleryUploadBtn.textContent = 'ЗАВАНТАЖЕННЯ...';
            
            let uploadedCount = 0;
            let firstImagePath = '';

            try {
                for (const file of files) {
                    const fileName = `${uploadedCount + 1}-${file.name.replace(/\s+/g, '_')}`;
                    const path = `products/${folderName}/${fileName}`; // Correcting nested folder
                    
                    uploadStatus.textContent = `Завантаження ${uploadedCount + 1} з ${files.length}...`;
                    
                    const { error } = await window.supabaseClient.storage
                        .from(bucket)
                        .upload(path, file);

                    if (error) throw error;
                    
                    if (uploadedCount === 0) {
                        firstImagePath = `${bucket}/${path}`;
                    }
                    uploadedCount++;
                }

                alert(`Успішно завантажено ${uploadedCount} зображень!`);
                
                // Update form fields
                document.getElementById('gallery').value = `${bucket}/products/${folderName}/`;
                if (!document.getElementById('image').value) {
                    document.getElementById('image').value = firstImagePath;
                    updateProductModalPreview(firstImagePath);
                }
                
                uploadStatus.textContent = '✅ Готово!';
                uploadStatus.style.color = 'green';
            } catch (err) {
                console.error('Gallery upload error:', err);
                alert('Помилка завантаження: ' + err.message);
                uploadStatus.textContent = '❌ Помилка';
                uploadStatus.style.color = 'red';
            } finally {
                galleryUploadBtn.disabled = false;
                galleryUploadBtn.textContent = '+ ЗАВАНТАЖИТИ ГАЛЕРЕЮ';
                galleryUploadInput.value = '';
            }
        });
    }

    productForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const originalName = document.getElementById('product-index').value;
        const productData = {
            title: document.getElementById('title').value,
            price: document.getElementById('price').value,
            category: document.getElementById('category').value,
            image: document.getElementById('image').value,
            gallery: document.getElementById('gallery').value,
            description: document.getElementById('description').value,
            features: document.getElementById('features').value.split(';').map(f => f.trim()).filter(f => f !== ''),
            material: document.getElementById('material').value,
            delivery: document.getElementById('delivery').value,
            care: document.getElementById('care').value,
            packageContents: document.getElementById('packageContents').value,
            status: document.querySelector('input[name="product-status"]:checked').value
        };
        
        saveProductToDB(productData, originalName === '' ? null : originalName);
        closeProductModal();
    });

    // 6. Site Settings Logic
    const settingsForm = document.getElementById('settings-form');
    const storageGallery = document.getElementById('storage-gallery');
    const refreshStorageBtn = document.getElementById('refresh-storage-btn');
    
    let activeSettingInput = null; // Track which input we are filling

    const fetchSettings = async () => {
        try {
            const { data, error } = await window.supabaseClient.from('site_settings').select('*');
            if (error) {
                console.warn('site_settings table might not exist yet:', error.message);
                return;
            }
            data.forEach(s => {
                const input = document.getElementById(`setting-${s.key}`);
                if (input) {
                    input.value = s.value;
                    updatePreview(s.key, s.value);
                }
                
                // Apply logo to admin sidebar too
                if (s.key === 'logo') {
                    const logoImg = document.querySelector('.sidebar-header .logo img');
                    if (logoImg) logoImg.src = window.resolveImage(s.value);
                }
            });
        } catch (err) {
            console.error('Error fetching settings:', err);
        }
    };

    const uploadBtn = document.getElementById('upload-banner-btn');
    const uploadInput = document.getElementById('upload-banner-input');

    const fetchStorageImages = async () => {
        if (!storageGallery) return;
        storageGallery.innerHTML = '<p style="grid-column: 1/-1; color: #888;">Завантаження...</p>';
        
        try {
            const { data, error } = await window.supabaseClient.storage.from('banner').list('', {
                limit: 100,
                offset: 0,
                sortBy: { column: 'name', order: 'desc' }
            });

            if (error) throw error;

            if (!data || data.length === 0) {
                storageGallery.innerHTML = '<p style="grid-column: 1/-1; color: #888;">У бакеті "banner" немає файлів.</p>';
                return;
            }

            storageGallery.innerHTML = '';
            data.forEach(file => {
                // Skip placeholder files or folders if any
                if (file.name === '.emptyFolderPlaceholder') return;

                const { data: { publicUrl } } = window.supabaseClient.storage.from('banner').getPublicUrl(file.name);
                
                const item = document.createElement('div');
                item.style.border = '1px solid #ddd';
                item.style.cursor = 'pointer';
                item.style.position = 'relative';
                item.style.aspectRatio = '1/1';
                item.style.overflow = 'hidden';
                item.innerHTML = `<img src="${publicUrl}" style="width: 100%; height: 100%; object-fit: cover;" alt="${file.name}">`;
                
                item.onclick = () => {
                    // Save PATH instead of URL
                    const path = `banner/${file.name}`;
                    const targetInput = activeSettingInput || document.getElementById('setting-main_banner');
                    if (targetInput) {
                        targetInput.value = path;
                        if (targetInput.id.startsWith('setting-')) {
                            updatePreview(targetInput.id.replace('setting-', ''), path);
                        }
                    }
                    
                    // Visual feedback
                    document.querySelectorAll('#storage-gallery div').forEach(d => d.style.borderColor = '#ddd');
                    item.style.borderColor = '#000';
                    item.style.borderWidth = '3px';
                };

                storageGallery.appendChild(item);
            });
        } catch (err) {
            console.error('Error fetching storage:', err);
            storageGallery.innerHTML = `<p style="grid-column: 1/-1; color: red;">Помилка: ${err.message}</p>`;
        }
    };

    // Track last focused input in settings
    const settingInputs = [document.getElementById('setting-main_banner'), document.getElementById('setting-hero_bg')];
    settingInputs.forEach(input => {
        if (input) input.addEventListener('focus', () => activeSettingInput = input);
    });

    if (uploadBtn && uploadInput) {
        uploadBtn.addEventListener('click', () => uploadInput.click());
        
        uploadInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const originalBtnText = uploadBtn.textContent;
            uploadBtn.textContent = 'ЗАВАНТАЖЕННЯ...';
            uploadBtn.disabled = true;

            try {
                const fileName = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
                const { error } = await window.supabaseClient.storage
                    .from('banner')
                    .upload(fileName, file);

                if (error) throw error;
                
                alert('Зображення успішно завантажено!');
                fetchStorageImages(); // Refresh the gallery
            } catch (err) {
                console.error('Upload error:', err);
                alert('Помилка завантаження: ' + err.message);
            } finally {
                uploadBtn.textContent = originalBtnText;
                uploadBtn.disabled = false;
                uploadInput.value = ''; // Reset input
            }
        });
    }

    if (refreshStorageBtn) {
        refreshStorageBtn.addEventListener('click', fetchStorageImages);
    }

    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const updates = [
                { key: 'logo', value: document.getElementById('setting-logo').value.trim() },
                { key: 'marquee', value: document.getElementById('setting-marquee').value.trim() },
                { key: 'main_banner', value: document.getElementById('setting-main_banner').value.trim() },
                { key: 'hero_bg', value: document.getElementById('setting-hero_bg').value.trim() },
                { key: 'instagram', value: document.getElementById('setting-instagram').value.trim() },
                { key: 'tiktok', value: document.getElementById('setting-tiktok').value.trim() }
            ];
            
            try {
                for (const item of updates) {
                    if (item.value !== undefined) {
                        const { error } = await window.supabaseClient
                            .from('site_settings')
                            .upsert(item, { onConflict: 'key' });
                        if (error) throw error;
                    }
                }
                
                alert('Налаштування успішно збережено!');
            } catch (err) {
                console.error('Error saving settings:', err);
                alert('Помилка при збереженні: ' + err.message);
            }
        });
    }

    // Initialize
    setupSettingsPreviews();
    fetchSettings();
    updateDashboard();
    fetchStorageImages();

    // Initial load
    fetchProducts();
});

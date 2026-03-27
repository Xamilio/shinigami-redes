document.addEventListener('DOMContentLoaded', async () => {
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
        const inputs = [
            'setting-logo', 
            'setting-main_banner', 
            'setting-hero_bg',
            'setting-cursor_img',
            'setting-marquee_logo',
            'setting-marquee_bat',
            'setting-cart_icon_white',
            'setting-cart_icon_black'
        ];
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

            // Toggle Add Product button visibility
            const addProductBtn = document.getElementById('add-product-btn');
            if (addProductBtn) {
                addProductBtn.style.display = tabId === 'products' ? 'block' : 'none';
            }
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
                    <a href="../product.html?id=${p.name}" target="_blank" class="btn-action btn-view">Перегляд</a>
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
                    if (input.type === 'checkbox') {
                        input.checked = s.value === 'true';
                    } else {
                        input.value = s.value;
                    }
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

    let storageBuckets = [];


    // Track last focused input in settings
    const settingInputs = [
        document.getElementById('setting-main_banner'), 
        document.getElementById('setting-hero_bg'),
        document.getElementById('setting-hero_title'),
        document.getElementById('setting-hero_subtitle'),
        document.getElementById('setting-cursor_img'),
        document.getElementById('setting-marquee_logo'),
        document.getElementById('setting-marquee_bat'),
        document.getElementById('setting-cart_icon_white'),
        document.getElementById('setting-cart_icon_black')
    ];
    settingInputs.forEach(input => {
        if (input) input.addEventListener('focus', () => activeSettingInput = input);
    });

    // Helper for direct settings uploads
    const handleSettingUpload = async (fileInputId, targetId) => {
        const fileInput = document.getElementById(fileInputId);
        const targetInput = document.getElementById(targetId);
        const file = fileInput.files[0];
        if (!file || !targetInput) return;

        const originalBtn = document.querySelector(`button[data-input="${fileInputId}"]`);
        const originalText = originalBtn.textContent;
        originalBtn.textContent = '...';
        originalBtn.disabled = true;

        try {
            const bucketName = storageBuckets.find(b => b.name === 'banner') ? 'banner' : (storageBuckets[0]?.name || 'products');
            const fileName = `${bucketName}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
            const { error } = await window.supabaseClient.storage
                .from(bucketName)
                .upload(fileName.replace(`${bucketName}/`, ''), file);

            if (error) throw error;
            
            targetInput.value = fileName;
            updatePreview(targetId.replace('setting-', ''), fileName);
            alert('Зображение завантажено!');
        } catch (err) {
            console.error('Setting upload error:', err);
            alert('Помилка: ' + err.message);
        } finally {
            originalBtn.textContent = originalText;
            originalBtn.disabled = false;
            fileInput.value = ''; // Reset
        }
    };

    document.querySelectorAll('.upload-setting-btn').forEach(btn => {
        const inputId = btn.getAttribute('data-input');
        const targetId = btn.getAttribute('data-target');
        const fileInput = document.getElementById(inputId);
        
        btn.onclick = () => fileInput.click();
        fileInput.onchange = () => handleSettingUpload(inputId, targetId);
    });



    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const updates = [
                { key: 'logo', value: document.getElementById('setting-logo').value.trim() },
                { key: 'marquee', value: document.getElementById('setting-marquee').value.trim() },
                { key: 'main_banner', value: document.getElementById('setting-main_banner').value.trim() },
                { key: 'hero_bg', value: document.getElementById('setting-hero_bg').value.trim() },
                { key: 'hero_title', value: document.getElementById('setting-hero_title').value.trim() },
                { key: 'hero_subtitle', value: document.getElementById('setting-hero_subtitle').value.trim() },
                { key: 'cursor_img', value: document.getElementById('setting-cursor_img').value.trim() },
                { key: 'marquee_logo', value: document.getElementById('setting-marquee_logo').value.trim() },
                { key: 'marquee_bat', value: document.getElementById('setting-marquee_bat').value.trim() },
                { key: 'cart_icon_white', value: document.getElementById('setting-cart_icon_white').value.trim() },
                { key: 'cart_icon_black', value: document.getElementById('setting-cart_icon_black').value.trim() },
                { key: 'cursor_negative', value: document.getElementById('setting-cursor_negative').checked ? 'true' : 'false' },
                { key: 'instagram', value: document.getElementById('setting-instagram').value.trim() },
                { key: 'tiktok', value: document.getElementById('setting-tiktok').value.trim() },
                { key: 'info_faq', value: document.getElementById('setting-info_faq').value.trim() },
                { key: 'info_shipping', value: document.getElementById('setting-info_shipping').value.trim() },
                { key: 'info_returns', value: document.getElementById('setting-info_returns').value.trim() },
                { key: 'info_terms', value: document.getElementById('setting-info_terms').value.trim() }
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

    // 7. Media Manager Logic (The NEW Section)
    let currentBucket = '';
    let currentPrefix = ''; // Folder path
    
    const mediaExplorer = document.getElementById('media-explorer');
    const mediaBucketSelect = document.getElementById('media-bucket-select');
    const mediaBackBtn = document.getElementById('media-back-btn');
    const mediaBreadcrumb = document.getElementById('media-breadcrumb');
    const mediaUploadBtn = document.getElementById('media-upload-btn');
    const mediaUploadInput = document.getElementById('media-upload-input');
    const mediaNewFolderBtn = document.getElementById('media-new-folder-btn');

    // 8. Folder Picker Loader
    let pickerBucket = 'products';
    let pickerPrefix = '';
    let pickerTargetInput = null;

    const pickerModal = document.getElementById('picker-modal');
    const pickerList = document.getElementById('picker-list');
    const pickerBreadcrumb = document.getElementById('picker-breadcrumb');
    const pickerSelectBtn = document.getElementById('picker-select-btn');
    const pickerBackBtn = document.getElementById('picker-back-btn');
    const closePickerBtn = document.getElementById('close-picker-btn');

    const openPicker = (targetId) => {
        pickerTargetInput = document.getElementById(targetId);
        const currentVal = pickerTargetInput.value.trim();
        
        // Try to auto-detect bucket and prefix from current value
        if (currentVal && currentVal.includes('/')) {
            const parts = currentVal.split('/');
            pickerBucket = parts[0];
            // Only set prefix if it's more than just bucket/filename
            if (parts.length > 2) {
                pickerPrefix = parts.slice(1, -1).join('/') + '/';
            } else {
                pickerPrefix = '';
            }
        } else {
            // No valid path, start at bucket selection
            pickerBucket = '';
            pickerPrefix = '';
        }

        pickerModal.style.display = 'flex';
        fetchPickerItems();
    };

    const fetchPickerItems = async () => {
        if (!pickerList) return;
        pickerList.innerHTML = '<p style="color: #888; text-align: center; padding: 20px;">Завантаження...</p>';
        
        // Update breadcrumb
        if (!pickerBucket) {
            pickerBreadcrumb.textContent = 'Оберіть бакет';
        } else {
            pickerBreadcrumb.textContent = pickerPrefix ? `${pickerBucket}/${pickerPrefix}` : `${pickerBucket}/`;
        }

        try {
            if (!window.supabaseClient) throw new Error('Supabase client missing');

            // 1. If no bucket selected, show buckets list
            if (!pickerBucket) {
                if (storageBuckets.length === 0) {
                    try {
                        const { data: buckets, error: bErr } = await window.supabaseClient.storage.listBuckets();
                        if (bErr || !buckets || buckets.length === 0) {
                            storageBuckets = [{ name: 'products' }, { name: 'site-img' }, { name: 'banner' }];
                        } else {
                            storageBuckets = buckets;
                        }
                    } catch (e) {
                        storageBuckets = [{ name: 'products' }, { name: 'site-img' }, { name: 'banner' }];
                    }
                }

                pickerList.innerHTML = '';
                storageBuckets.forEach(b => {
                    const div = document.createElement('div');
                    div.className = 'picker-item';
                    div.style.padding = '15px';
                    div.style.borderBottom = '2px solid #000';
                    div.style.cursor = 'pointer';
                    div.style.fontWeight = 'bold';
                    div.style.display = 'flex';
                    div.style.alignItems = 'center';
                    div.style.gap = '10px';
                    
                    div.innerHTML = `<span style="font-size: 20px;">📦</span> <span>${b.name.toUpperCase()}</span>`;
                    
                    div.onclick = () => {
                        pickerBucket = b.name;
                        pickerPrefix = '';
                        fetchPickerItems();
                    };
                    pickerList.appendChild(div);
                });
                return; // Early return for bucket list
            }

            // 2. If bucket selected, list its items
            const { data, error } = await window.supabaseClient.storage.from(pickerBucket).list(pickerPrefix, {
                limit: 100,
                sortBy: { column: 'name', order: 'asc' }
            });

            if (error) throw error;

            pickerList.innerHTML = '';
            
            if (!data || data.length === 0) {
                pickerList.innerHTML = '<p style="padding: 20px; color: #888; text-align: center;">Тут порожньо</p>';
                return;
            }

            data.forEach(item => {
                if (item.name === '.emptyFolderPlaceholder') return;
                const isFolder = !item.metadata;

                const div = document.createElement('div');
                div.className = 'picker-item';
                div.style.padding = '8px';
                div.style.borderBottom = '1px solid #eee';
                div.style.cursor = 'pointer';
                div.style.display = 'flex';
                div.style.alignItems = 'center';
                div.style.gap = '10px';
                
                let icon = isFolder ? '📁' : '📄';
                if (!isFolder && /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(item.name)) {
                    const filePath = pickerPrefix + item.name;
                    const { data: { publicUrl } } = window.supabaseClient.storage.from(pickerBucket).getPublicUrl(filePath);
                    console.log(`[Picker] Thumbnail for ${item.name}:`, publicUrl);
                    icon = `<img src="${publicUrl}" 
                                 style="width: 40px; height: 40px; object-fit: cover; border: 1px solid #000;" 
                                 onerror="this.parentElement.innerHTML='⚠️'; console.error('Failed to load thumb:', this.src);">`;
                }

                div.innerHTML = `
                    <div class="picker-icon" style="width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">${icon}</div>
                    <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.name}</span>
                `;

                div.onclick = () => {
                    if (isFolder) {
                        pickerPrefix += item.name + '/';
                        fetchPickerItems();
                    } else {
                        // If it's a file, we might want to select it immediately or just highlight
                        // For 'image' target, we select the file. For 'gallery', we probably want the folder.
                        const fullPath = `${pickerBucket}/${pickerPrefix}${item.name}`;
                        if (confirm(`Вибрати цей файл: ${fullPath}?`)) {
                            pickerTargetInput.value = fullPath;
                            pickerModal.style.display = 'none';
                            
                            // Trigger preview updates
                            if (pickerTargetInput.id === 'image') {
                                updateProductModalPreview(fullPath);
                            } else if (pickerTargetInput.id.startsWith('setting-')) {
                                const key = pickerTargetInput.id.replace('setting-', '');
                                updatePreview(key, fullPath);
                            }
                        }
                    }
                };
                pickerList.appendChild(div);
            });
        } catch (err) {
            pickerList.innerHTML = `<p style="color:red;">Error: ${err.message}</p>`;
        }
    };

    if (pickerSelectBtn) {
        pickerSelectBtn.onclick = () => {
            if (!pickerBucket) {
                alert('Сначала выберите бакет');
                return;
            }
            const currentPath = `${pickerBucket}/${pickerPrefix}`;
            pickerTargetInput.value = currentPath;
            pickerModal.style.display = 'none';
            
            // Trigger preview updates
            if (pickerTargetInput.id === 'image') {
                updateProductModalPreview(currentPath);
            } else if (pickerTargetInput.id.startsWith('setting-')) {
                const key = pickerTargetInput.id.replace('setting-', '');
                updatePreview(key, currentPath);
            }
        };
    }

    if (pickerBackBtn) {
        pickerBackBtn.addEventListener('click', () => {
            if (pickerPrefix) {
                const parts = pickerPrefix.split('/').filter(p => p !== '');
                parts.pop();
                pickerPrefix = parts.length > 0 ? parts.join('/') + '/' : '';
                fetchPickerItems();
            } else if (pickerBucket) {
                // We are in the root of a bucket, go back to bucket selection
                pickerBucket = '';
                fetchPickerItems();
            }
        });
    }

    if (closePickerBtn) {
        closePickerBtn.onclick = () => pickerModal.style.display = 'none';
    }

    // Attach to form buttons
    document.querySelectorAll('.open-picker-btn').forEach(btn => {
        btn.onclick = () => openPicker(btn.getAttribute('data-target'));
    });

    const fetchMedia = async (bucket, prefix = '') => {
        if (!mediaExplorer) return;
        mediaExplorer.innerHTML = '<p style="grid-column: 1/-1; color: #888;">Завантаження...</p>';
        
        try {
            if (!window.supabaseClient) {
                throw new Error('Supabase client not initialized. Check your credentials.');
            }

            // 1. If NO bucket selected, show buckets list (just like the picker)
            if (!bucket) {
                if (storageBuckets.length === 0) {
                    try {
                        const { data: buckets, error: bErr } = await window.supabaseClient.storage.listBuckets();
                        if (bErr || !buckets || buckets.length === 0) {
                            storageBuckets = [{ name: 'products' }, { name: 'site-img' }, { name: 'banner' }];
                        } else {
                            storageBuckets = buckets;
                        }
                    } catch (e) {
                        storageBuckets = [{ name: 'products' }, { name: 'site-img' }, { name: 'banner' }];
                    }
                }
                
                // Populate select
                if (mediaBucketSelect) {
                    mediaBucketSelect.innerHTML = '<option value="">📦 Оберіть бакет...</option>' + 
                        storageBuckets.map(b => `<option value="${b.name}">📦 Бакет: ${b.name}</option>`).join('');
                }

                mediaExplorer.innerHTML = '';
                mediaBreadcrumb.textContent = 'Оберіть бакет';
                mediaBackBtn.style.display = 'none';

                storageBuckets.forEach(b => {
                    const card = document.createElement('div');
                    card.className = 'media-item-card';
                    card.style.border = '2px solid #000';
                    card.style.padding = '20px';
                    card.style.cursor = 'pointer';
                    card.style.display = 'flex';
                    card.style.flexDirection = 'column';
                    card.style.alignItems = 'center';
                    card.style.gap = '10px';
                    
                    card.innerHTML = `
                        <div style="font-size: 50px;">📦</div>
                        <div style="font-weight: 800; text-transform: uppercase;">${b.name}</div>
                        <button class="btn-action" style="width: 100%;">ВІДКРИТИ</button>
                    `;
                    
                    card.onclick = () => {
                        currentBucket = b.name;
                        currentPrefix = '';
                        if (mediaBucketSelect) mediaBucketSelect.value = b.name;
                        fetchMedia(currentBucket, currentPrefix);
                    };
                    mediaExplorer.appendChild(card);
                });
                return;
            }

            // 2. Fetch buckets if needed anyway (to keep select populated)

            const { data, error } = await window.supabaseClient.storage.from(bucket).list(prefix, {
                limit: 100,
                offset: 0,
                sortBy: { column: 'name', order: 'asc' }
            });

            if (error) throw error;

            mediaExplorer.innerHTML = '';
            
            // Update UI components
            mediaBackBtn.style.display = prefix ? 'block' : 'none';
            mediaBreadcrumb.textContent = prefix ? `Папка: ${prefix}` : 'Коренева папка';

            if (!data || data.length === 0) {
                mediaExplorer.innerHTML = '<p style="grid-column: 1/-1; color: #888; text-align: center; padding: 40px;">Тут порожньо</p>';
                return;
            }

            data.forEach(item => {
                if (item.name === '.emptyFolderPlaceholder') return;

                const isFolder = !item.metadata; // In Supabase, folders don't have metadata in list()
                const card = document.createElement('div');
                card.className = 'media-item-card'; // We should add some basic styles to admin.css or inline
                card.style.border = '2px solid #000';
                card.style.padding = '10px';
                card.style.display = 'flex';
                card.style.flexDirection = 'column';
                card.style.gap = '10px';
                card.style.position = 'relative';

                if (isFolder) {
                    card.innerHTML = `
                        <div style="font-size: 40px; text-align: center;">📁</div>
                        <div style="font-size: 11px; font-weight: 800; text-align: center; word-break: break-all;">${item.name}</div>
                        <button class="btn-action" style="width: 100%; margin-top: auto;">ВІДКРИТИ</button>
                    `;
                    card.onclick = () => {
                        currentPrefix = prefix ? `${prefix}${item.name}/` : `${item.name}/`;
                        fetchMedia(currentBucket, currentPrefix);
                    };
                } else {
                    const { data: { publicUrl } } = window.supabaseClient.storage.from(bucket).getPublicUrl(prefix + item.name);
                    const isImage = /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(item.name);
                    
                    card.innerHTML = `
                        <div style="height: 100px; border: 1px solid #eee; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #fdfdfd;">
                            ${isImage ? `<img src="${publicUrl}" style="width: 100%; height: 100%; object-fit: contain;">` : `<span style="font-size: 30px;">📄</span>`}
                        </div>
                        <div style="font-size: 10px; font-weight: 600; word-break: break-all; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.name}</div>
                        <div style="display: flex; gap: 5px; margin-top: auto;">
                            <button class="btn-action btn-copy" style="flex: 1; font-size: 9px; padding: 4px;">URL</button>
                            <button class="btn-action btn-delete-file" style="background: #000; color: #fff; flex: 1; font-size: 9px; padding: 4px;">ВИД.</button>
                        </div>
                    `;

                    // Copy URL logic
                    card.querySelector('.btn-copy').onclick = (e) => {
                        e.stopPropagation();
                        // Copy path relative to bucket or absolute URL? Let's do absolute but maybe short path is better for DB
                        const path = `${bucket}/${prefix}${item.name}`;
                        navigator.clipboard.writeText(path);
                        alert('Шлях скопійовано: ' + path);
                    };

                    // Delete file logic
                    card.querySelector('.btn-delete-file').onclick = async (e) => {
                        e.stopPropagation();
                        if (confirm(`Видалити файл "${item.name}"?`)) {
                            const { error } = await window.supabaseClient.storage.from(bucket).remove([prefix + item.name]);
                            if (error) alert('Помилка: ' + error.message);
                            else fetchMedia(currentBucket, currentPrefix);
                        }
                    };
                }
                
                mediaExplorer.appendChild(card);
            });

        } catch (err) {
            console.error('Media fetch error:', err);
            mediaExplorer.innerHTML = `<p style="grid-column: 1/-1; color: red;">Помилка: ${err.message}</p>`;
        }
    };

    if (mediaBucketSelect) {
        mediaBucketSelect.addEventListener('change', (e) => {
            currentBucket = e.target.value;
            currentPrefix = '';
            fetchMedia(currentBucket, currentPrefix);
        });
    }

    if (mediaBackBtn) {
        mediaBackBtn.addEventListener('click', () => {
            const parts = currentPrefix.split('/').filter(p => p !== '');
            parts.pop();
            currentPrefix = parts.length > 0 ? parts.join('/') + '/' : '';
            fetchMedia(currentBucket, currentPrefix);
        });
    }

    if (mediaUploadBtn && mediaUploadInput) {
        mediaUploadBtn.addEventListener('click', () => mediaUploadInput.click());
        mediaUploadInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files);
            if (files.length === 0) return;

            mediaUploadBtn.disabled = true;
            mediaUploadBtn.textContent = 'ЗАВАНТАЖЕННЯ...';

            try {
                for (const file of files) {
                    const path = currentPrefix + file.name.replace(/\s+/g, '_');
                    const { error } = await window.supabaseClient.storage.from(currentBucket).upload(path, file);
                    if (error) throw error;
                }
                alert(`Успішно завантажено ${files.length} файлів.`);
                fetchMedia(currentBucket, currentPrefix);
            } catch (err) {
                alert('Помилка: ' + err.message);
            } finally {
                mediaUploadBtn.disabled = false;
                mediaUploadBtn.textContent = '+ ЗАВАНТАЖИТИ СЮДИ';
                mediaUploadInput.value = '';
            }
        });
    }

    if (mediaNewFolderBtn) {
        const folderModal = document.getElementById('folder-modal');
        const folderInput = document.getElementById('new-folder-name');
        const folderConfirmBtn = document.getElementById('folder-create-confirm');
        const folderCancelBtn = document.getElementById('folder-create-cancel');

        mediaNewFolderBtn.addEventListener('click', () => {
            if (!currentBucket) {
                alert('Спочатку оберіть бакет');
                return;
            }
            folderInput.value = '';
            folderModal.style.display = 'flex';
            folderInput.focus();
        });

        folderCancelBtn.onclick = () => folderModal.style.display = 'none';

        folderConfirmBtn.onclick = async () => {
            const folderName = folderInput.value.trim();
            if (!folderName) return;

            const cleanFolderName = folderName.replace(/\s+/g, '_').replace(/\/+$/, '');
            if (!cleanFolderName) return;

            const path = `${currentPrefix}${cleanFolderName}/.emptyFolderPlaceholder`;
            
            try {
                folderConfirmBtn.disabled = true;
                folderConfirmBtn.textContent = 'СТВОРЕННЯ...';
                const { error } = await window.supabaseClient.storage.from(currentBucket).upload(path, new Blob([''], { type: 'text/plain' }));
                if (error) throw error;
                
                folderModal.style.display = 'none';
                fetchMedia(currentBucket, currentPrefix);
            } catch (err) {
                alert('Помилка створення папки: ' + err.message);
            } finally {
                folderConfirmBtn.disabled = false;
                folderConfirmBtn.textContent = 'СТВОРИТИ';
            }
        };

        // Support Enter key
        folderInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') folderConfirmBtn.click();
        });
    }

    // Initialize Media when tab is clicked
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            if (item.getAttribute('data-tab') === 'media') {
                fetchMedia(currentBucket, currentPrefix);
            }
        });
    });

    // Initialize
    setupSettingsPreviews();
    fetchSettings();
    updateDashboard();

    // Initial load
    fetchProducts();
});

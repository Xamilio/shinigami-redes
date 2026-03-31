const translations = {
    uk: {
        "nav_shop": "Магазин",
        "nav_shipping": "Доставка",
        "nav_faq": "FAQ",
        "cart_title": "Кошик",
        "cart_empty": "Ваш кошик порожній",
        "cart_checkout": "ОФОРМИТИ ЗАМОВЛЕННЯ",
        "btn_add_to_cart": "ДОДАТИ В КОШИК",
        "footer_desc": "Преміальний вуличний одяг з темною естетикою.",
        "footer_info": "Інформація",
        "footer_returns": "Повернення",
        "footer_terms": "Умови використання",
        "footer_social": "Соціальні мережі",
        "status_instock": "В НАЯВНОСТІ",
        "status_preorder": "ПЕРЕДЗАМОВЛЕННЯ",
        "status_soldout": "РОЗПРОДАНО",
        "status_new": "НОВИНКА",
        "home": "Головна",
        "breadcrumb_product": "Товар",
        "price_note": "Включаючи ПДВ · Безкоштовна доставка",
        "label_material": "Матеріал",
        "label_delivery": "Доставка",
        "label_recommendations": "Рекомендації",
        "label_configuration": "Комплектація",
        "not_found": "Товар не знайдено",
        "back_to_shop": "Повернутись до магазину"
    },
    en: {
        "nav_shop": "Shop",
        "nav_shipping": "Shipping",
        "nav_faq": "FAQ",
        "cart_title": "Cart",
        "cart_empty": "Your cart is empty",
        "cart_checkout": "CHECKOUT",
        "btn_add_to_cart": "ADD TO CART",
        "footer_desc": "Premium streetwear with a dark aesthetic.",
        "footer_info": "Information",
        "footer_returns": "Returns",
        "footer_terms": "Terms of Service",
        "footer_social": "Social Media",
        "status_instock": "IN STOCK",
        "status_preorder": "PRE-ORDER",
        "status_soldout": "SOLD OUT",
        "status_new": "NEW",
        "home": "Home",
        "breadcrumb_product": "Product",
        "price_note": "VAT included · Free shipping",
        "label_material": "Material",
        "label_delivery": "Delivery",
        "label_recommendations": "Care Instructions",
        "label_configuration": "In the Box",
        "not_found": "Product not found",
        "back_to_shop": "Back to shop"
    }
};

let currentLang = localStorage.getItem('shinigami_lang') || 'uk';

function changeLanguage(lang) {
    if (!translations[lang]) return;
    currentLang = lang;
    localStorage.setItem('shinigami_lang', lang);
    applyTranslations();
    updateLangSelectors();
    // Dispatch custom event to notify other scripts (like main.js) to re-render dynamic content
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
}

function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[currentLang][key]) {
            // For inputs/placeholders we might need to handle them differently
            if (el.tagName === 'INPUT' && el.type === 'text') {
                el.placeholder = translations[currentLang][key];
            } else {
                // If the element has child images or spans we don't want to destroy
                // but since data-i18n should be applied to text nodes or specific spans
                // we assume it's safe to set outer/inner text. 
                // However, we must be careful with buttons that contain images (like the cart button).
                
                // If it's a node that also contains an image (like the add-to-cart detail button),
                // we should only replace the text node.
                let hasImage = el.querySelector('img');
                if (hasImage) {
                    // Safe approach: wrap text in a a span with data-i18n instead, 
                    // or just replace text content but keep the image node.
                    // To keep it simple, we require data-i18n to be on purely text elements.
                    el.innerHTML = translations[currentLang][key]; 
                } else {
                    el.textContent = translations[currentLang][key];
                }
            }
        }
    });

    // Special logic for the detail button with image
    const btnTextDetail = document.getElementById('add-to-cart-text');
    if (btnTextDetail) {
        btnTextDetail.textContent = translations[currentLang]["btn_add_to_cart"];
    }
}

function updateLangSelectors() {
    document.querySelectorAll('.lang-selector').forEach(sel => {
        sel.textContent = currentLang.toUpperCase();
    });
}

function t(key) {
    return translations[currentLang][key] || key;
}

document.addEventListener('DOMContentLoaded', () => {
    applyTranslations();
    updateLangSelectors();

    // Toggle logic for the language selector
    document.querySelectorAll('.lang-selector').forEach(sel => {
        sel.addEventListener('click', () => {
            const nextLang = currentLang === 'uk' ? 'en' : 'uk';
            changeLanguage(nextLang);
        });
        sel.style.cursor = "pointer";
        sel.style.fontWeight = "800";
    });
});

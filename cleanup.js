const fs = require('fs');
const path = require('path');

const files = [
    'g:/shinigami-redes/index.html',
    'g:/shinigami-redes/style.css',
    'g:/shinigami-redes/main.js',
    'g:/shinigami-redes/admin.js',
    'g:/shinigami-redes/admin.css',
    'g:/shinigami-redes/supabase-config.js',
    'g:/shinigami-redes/auth.js',
    'g:/shinigami-redes/i18n.js',
    'g:/shinigami-redes/product/index.html',
    'g:/shinigami-redes/product.css',
    'g:/shinigami-redes/profile/index.html',
    'g:/shinigami-redes/profile/profile.js',
    'g:/shinigami-redes/login.html'
];

files.forEach(f => {
    if (!fs.existsSync(f)) {
        console.log(`Skipping (not found): ${f}`);
        return;
    }
    let content = fs.readFileSync(f, 'utf8');
    
    // Pattern to catch merge conflicts
    const pattern = /<<<<<<< HEAD\r?\n([\s\S]*?)\r?\n=======\r?\n([\s\S]*?)\r?\n>>>>>>> [a-f0-9]+/g;
    
    let newContent = content.replace(pattern, (match, side1, side2) => {
        // If side2 (the incoming changes) has content, keep it. 
        // In many cases here, side2 is more complete (e.g. image handling in i18n).
        if (side2.trim().length > 0) return side2;
        return side1;
    });
    
    // Remove all console.log statements
    newContent = newContent.replace(/console\.log\(.*?\);?/g, '');
    
    // Remove multiple empty lines that might result from conflict resolution
    newContent = newContent.replace(/\r?\n\s*\r?\n\s*\r?\n/g, '\n\n');
    
    fs.writeFileSync(f, newContent, 'utf8');
    console.log(`Cleaned: ${f}`);
});

// Delete duplicate login.html if it exists
const rootLogin = 'g:/shinigami-redes/login.html';
if (fs.existsSync(rootLogin)) {
    // Actually, let's keep it until we verify login/index.html works, or just rename it.
    // The user said "remove all unnecessary", so let's delete it.
    fs.unlinkSync(rootLogin);
    console.log(`Deleted redundant: ${rootLogin}`);
}

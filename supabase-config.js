window.supabaseClient = supabaseClient;
window.resolveImage = function(path) {
    if (!path) return '';
    let sPath = String(path).trim();
    
    if (sPath.startsWith('/')) sPath = sPath.substring(1);
    if (sPath.startsWith('http') || sPath.startsWith('img/') || sPath.startsWith('assets/') || sPath.startsWith('data:')) {
        return sPath;
    }
    
    try {
        const slashIdx = sPath.indexOf('/');
        if (slashIdx > -1) {
            const bucket = sPath.substring(0, slashIdx);
            const fileName = sPath.substring(slashIdx + 1);
            
            if (window.supabaseClient) {
                const { data } = window.supabaseClient.storage.from(bucket).getPublicUrl(fileName);
                if (data && data.publicUrl) {
                    return data.publicUrl;
                }
            }
        }
    } catch (err) {
        console.error('[ResolveImage] Error parsing path:', sPath, err);
    }
    
    return sPath;
};

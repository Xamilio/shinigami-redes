
const SUPABASE_URL = 'https://azypglollvjyjuizfcxz.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6eXBnbG9sbHZqeWp1aXpmY3h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDA0MzMsImV4cCI6MjA5MDExNjQzM30.bAdC9sU_K14WEo4F4v21Fsx0g4MF4YsmXUrLDS2DU9A';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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

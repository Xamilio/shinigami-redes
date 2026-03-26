// Конфигурация Supabase
// Замените эти значения на ваши из панели управления Supabase (Settings -> API)
const SUPABASE_URL = 'https://azypglollvjyjuizfcxz.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF6eXBnbG9sbHZqeWp1aXpmY3h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1NDA0MzMsImV4cCI6MjA5MDExNjQzM30.bAdC9sU_K14WEo4F4v21Fsx0g4MF4YsmXUrLDS2DU9A';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Экспортируем для использования в других файлах
window.supabaseClient = supabaseClient;

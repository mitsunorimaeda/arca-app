import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://pfhdcvgcujwmnudlrioi.supabase.co"; // ← あなたのURLに置き換え
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBmaGRjdmdjdWp3bW51ZGxyaW9pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM5MDI2MjEsImV4cCI6MjA1OTQ3ODYyMX0.N291THV7BYGuuOwcq0TM_YmCAXLYcAdPj2qAharX9o8";     // ← あなたのanonキーに置き換え

export const supabase = createClient(supabaseUrl, supabaseKey);

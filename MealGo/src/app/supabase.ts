import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zhvgyibyxmttgnszntuh.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpodmd5aWJ5eG10dGduc3pudHVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTUxMDk2NjYsImV4cCI6MjA3MDY4NTY2Nn0.WmGNu92M0udYKKxxzDN3udjgkSpzXcrueoOPqLsFPMM';

export const supabase = createClient(supabaseUrl, supabaseKey);
export default supabase; 
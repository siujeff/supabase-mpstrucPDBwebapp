import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://txvvnfowdnlcyqadygfq.supabase.co' 
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR4dnZuZm93ZG5sY3lxYWR5Z2ZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwOTUyMzQsImV4cCI6MjA2MjY3MTIzNH0.KSCERZCXqxfDsx7HfsdM8nZe3ubUdTQnTNI6kZYEV00'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://vwxgtmntyagzrnvpdwnu.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3eGd0bW50eWFnenJudnBkd251Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MjY3ODQsImV4cCI6MjA5NzAwMjc4NH0.G4JV4eKh1hvBHKhB5Xl-m2V-MP0d-J-qRkz7i6nALDU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

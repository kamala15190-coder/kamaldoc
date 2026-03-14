import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://grbalaqdgdukzwumejfu.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyYmFsYXFkZ2R1a3p3dW1lamZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0MzIyMjAsImV4cCI6MjA4OTAwODIyMH0.KiW_34a8Aw-mfauBezhgFuJwwDPC0RLFtWR-VFP8KWw'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

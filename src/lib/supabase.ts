import { createClient } from '@supabase/supabase-js'

const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || 'https://nlyhalscwfvrtkmzjgej.supabase.co'

const supabaseUrl = (() => {
  try {
    const parsedUrl = new URL(rawSupabaseUrl)
    return `${parsedUrl.protocol}//${parsedUrl.host}`
  } catch {
    return rawSupabaseUrl.replace(/\/(rest|auth)\/v1\/?$/, '')
  }
})()

export const supabase = createClient(supabaseUrl, import.meta.env.VITE_SUPABASE_ANON_KEY!)
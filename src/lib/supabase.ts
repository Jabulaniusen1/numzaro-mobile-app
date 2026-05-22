import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rnkqvprfglxyxlzzypeh.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJua3F2cHJmZ2x4eXhsenp5cGVoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczOTQ2MDgsImV4cCI6MjA4Mjk3MDYwOH0.HuaqgPUrble12ieC11gTCmY7LxhOj29Y69fkLEU01pc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

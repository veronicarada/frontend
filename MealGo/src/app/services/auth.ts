
// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { supabase } from '../supabase';

@Injectable({
  providedIn: 'root',
})
export class Auth {
   
   async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  }

  getCurrentSession() {
    return supabase.auth.getSession();
  }

  logout() {
    return supabase.auth.signOut();
  }
}

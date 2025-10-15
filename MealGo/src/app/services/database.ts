// src/app/services/database.ts
import { Injectable } from '@angular/core';
import { supabase } from '../supabase';

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  async getAll(table: string) {
    const { data, error } = await supabase.from(table).select('*').order('fecha_creacion', { ascending: false });
    if (error) throw error;
    return data;
  }

  async insert(table: string, record: any) {
    const { data, error } = await supabase.from(table).insert([record]).select().single();
    if (error) throw error;
    return data;
  }

  // Mantengo tus originales por compatibilidad
  async update(table: string, id: number, record: any) {
    const { data, error } = await supabase.from(table).update(record).eq('id', id).select().single();
    if (error) throw error;
    return data;
  }

  async delete(table: string, id: number) {
    const { data, error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    return data;
  }

  // === Nuevos para PK personalizada (ej: id_receta) ===
  async updateBy(table: string, idColumn: string, idValue: any, record: any) {
    const { data, error } = await supabase.from(table).update(record).eq(idColumn, idValue).select().single();
    if (error) throw error;
    return data;
  }

  async deleteBy(table: string, idColumn: string, idValue: any) {
    const { data, error } = await supabase.from(table).delete().eq(idColumn, idValue);
    if (error) throw error;
    return data;
  }
}

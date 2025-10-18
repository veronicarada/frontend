// src/app/services/database.ts
import { Injectable } from '@angular/core';
import { supabase } from '../supabase';

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  // ===================================
  // MÉTODOS GENERALES (TUS ORIGINALES)
  // ===================================

  async getAll(table: string) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('fecha_creacion', { ascending: false });
    if (error) throw error;
    return data;
  }

  async insert(table: string, record: any) {
    const { data, error } = await supabase
      .from(table)
      .insert([record])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async update(table: string, id: number, record: any) {
    const { data, error } = await supabase
      .from(table)
      .update(record)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async delete(table: string, id: number) {
    const { data, error } = await supabase.from(table).delete().eq('id', id);
    if (error) throw error;
    return data;
  }

  // === Nuevos para PK personalizada (ej: id_receta, id_ingrediente) ===
  async updateBy(table: string, idColumn: string, idValue: any, record: any) {
    const { data, error } = await supabase
      .from(table)
      .update(record)
      .eq(idColumn, idValue)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteBy(table: string, idColumn: string, idValue: any) {
    const { data, error } = await supabase
      .from(table)
      .delete()
      .eq(idColumn, idValue);
    if (error) throw error;
    return data;
  }

  // ===================================
  // MÉTODOS ESPECÍFICOS: INGREDIENTE
  // ===================================

  async getIngredientes(): Promise<any[]> {
    const { data, error } = await supabase
      .from('ingrediente')
      .select('*')
      .order('nombre', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async addIngrediente(payload: any): Promise<any> {
    const { data, error } = await supabase
      .from('ingrediente')
      .insert([payload])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateIngrediente(id_ingrediente: string, payload: any): Promise<any> {
    const { data, error } = await supabase
      .from('ingrediente')
      .update(payload)
      .eq('id_ingrediente', id_ingrediente)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteIngrediente(id_ingrediente: string): Promise<void> {
    const { error } = await supabase
      .from('ingrediente')
      .delete()
      .eq('id_ingrediente', id_ingrediente);
    if (error) throw error;
  }
}

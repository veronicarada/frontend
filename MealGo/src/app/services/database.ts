// src/app/services/database.ts
import { Injectable } from '@angular/core';
import { supabase } from '../supabase';

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  // ⚠️ Mantengo tu comportamiento original: ordena por 'fecha_creacion'
  // (si la tabla no tiene esa columna, usa getAllBy).
  async getAll(table: string) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order('fecha_creacion', { ascending: false });
    if (error) throw error;
    return data;
  }

  // ✅ Obtener todo con columna de orden configurable
  async getAllBy(table: string, orderColumn: string, ascending = false) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(orderColumn, { ascending });
    if (error) throw error;
    return data;
  }

  async insert(table: string, record: any) {
    const { data, error } = await supabase.from(table).insert([record]).select().single();
    if (error) throw error;
    return data;
  }

  async update(table: string, idField: string, idValue: any, record: any) {
    const { data, error } = await supabase
      .from(table)
      .update(record)
      .eq(idField, idValue)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async delete(table: string, idField: string, idValue: any) {
    // Mantengo tu patrón de .select().single() para consistencia con tus llamadas
    const { data, error } = await supabase
      .from(table)
      .delete()
      .eq(idField, idValue)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // ---------------------------
  // Aliases para compatibilidad
  // ---------------------------
  // Para páginas que llaman updateBy/deleteBy (plan.page.ts, etc.)
  async updateBy(table: string, idField: string, idValue: any, record: any) {
    return this.update(table, idField, idValue, record);
  }

  async deleteBy(table: string, idField: string, idValue: any) {
    return this.delete(table, idField, idValue);
  }

  // ---------------------------
  // Ingredientes (despensa.page.ts)
  // ---------------------------
  // Nota: estas operan sobre la tabla 'ingrediente'.
  // Si tu despensa usa 'usuario_ingrediente' (PK compuesta), avisame y te dejo versiones por usuario.
  async getIngredientes() {
    const { data, error } = await supabase
      .from('ingrediente')
      .select('*')
      .order('nombre', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async addIngrediente(record: any) {
    // record: { nombre, categoria, calorias, proteinas, carbohidratos, grasas }
    const { data, error } = await supabase
      .from('ingrediente')
      .insert([record])
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async updateIngrediente(id_ingrediente: string, record: any) {
    const { data, error } = await supabase
      .from('ingrediente')
      .update(record)
      .eq('id_ingrediente', id_ingrediente)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  async deleteIngrediente(id_ingrediente: string) {
    const { data, error } = await supabase
      .from('ingrediente')
      .delete()
      .eq('id_ingrediente', id_ingrediente)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
}

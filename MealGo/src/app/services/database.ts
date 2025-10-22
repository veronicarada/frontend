// src/app/services/database.ts
import { Injectable } from '@angular/core';
import { supabase } from '../supabase';

@Injectable({ providedIn: 'root' })
export class DatabaseService {
  // =========================================
  // Genéricos (tus originales)
  // =========================================
  // ⚠️ Ordena por 'fecha_creacion' (si la tabla no la tiene, usá getAllBy)
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
    const { data, error } = await supabase
      .from(table)
      .insert([record])
      .select()
      .single();
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
    // Mantengo tu patrón de .select().single() para consistencia
    const { data, error } = await supabase
      .from(table)
      .delete()
      .eq(idField, idValue)
      .select()
      .single();
    if (error) throw error;
    return data;
  }

  // Aliases de compatibilidad
  async updateBy(table: string, idField: string, idValue: any, record: any) {
    return this.update(table, idField, idValue, record);
  }
  async deleteBy(table: string, idField: string, idValue: any) {
    return this.delete(table, idField, idValue);
  }

  // =========================================
  // Ingredientes (tab Despensa)
  // Tabla: ingrediente
  // =========================================
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

  /**
   * Eliminar un ingrediente:
   * 1) borra relaciones en receta_ingrediente (FK compuesta)
   * 2) borra el ingrediente
   */
  async deleteIngrediente(id_ingrediente: string) {
    // 1) borrar relaciones N:M
    const delRel = await supabase
      .from('receta_ingrediente')
      .delete()
      .eq('id_ingrediente', id_ingrediente);
    if (delRel.error) throw delRel.error;

    // 2) borrar ingrediente
    const delIng = await supabase
      .from('ingrediente')
      .delete()
      .eq('id_ingrediente', id_ingrediente);
    if (delIng.error) throw delIng.error;

    return { ok: true };
  }

  /**
   * Recetas que usan un ingrediente (por id_ingrediente)
   * Devuelve array del tipo: [{ receta: { id_receta, nombre, ... }}, ...]
   */
  async getRecetasPorIngrediente(id_ingrediente: string) {
    const { data, error } = await supabase
      .from('receta_ingrediente')
      .select(`
        receta:receta (
          id_receta,
          nombre,
          dificultad,
          tiempo_preparacion_min
        )
      `)
      .eq('id_ingrediente', id_ingrediente);

    if (error) throw error;
    return data || [];
  }

  // =========================================
  // Recetas (tab Recetas)
  // Tablas: receta, receta_ingrediente
  // =========================================

  // Traer receta por id con ingredientes relacionados
  async getRecetaById(id_receta: string) {
    const { data, error } = await supabase
      .from('receta')
      .select(`
        id_receta,
        nombre,
        instrucciones,
        tiempo_preparacion_min,
        dificultad,
        receta_ingrediente (
          id_ingrediente,
          cantidad,
          unidad,
          ingrediente:ingrediente (
            id_ingrediente,
            nombre
          )
        )
      `)
      .eq('id_receta', id_receta)
      .single();

    if (error) throw error;
    return data;
  }

  // Actualizar campos de la receta
  async updateReceta(id_receta: string, payload: any) {
    const { data, error } = await supabase
      .from('receta')
      .update(payload)
      .eq('id_receta', id_receta)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Reemplazar completamente los ingredientes de una receta
   * (estrategia segura: DELETE + INSERT)
   */
  async replaceRecetaIngredientes(
    id_receta: string,
    items: Array<{ id_ingrediente: string; cantidad?: number; unidad?: string }>
  ) {
    // 1) borrar actuales
    const del = await supabase
      .from('receta_ingrediente')
      .delete()
      .eq('id_receta', id_receta);
    if (del.error) throw del.error;

    if (!items || items.length === 0) return { ok: true };

    // 2) insertar nuevos
    const rows = items.map((x) => ({
      id_receta,
      id_ingrediente: x.id_ingrediente,
      cantidad: x.cantidad ?? 1,
      unidad: x.unidad ?? 'unidad',
    }));

    const { error: insErr } = await supabase
      .from('receta_ingrediente')
      .insert(rows);
    if (insErr) throw insErr;

    return { ok: true };
  }

  /**
   * Eliminar una receta:
   * 1) borra relaciones en receta_ingrediente
   * 2) borra la receta
   */
  async deleteReceta(id_receta: string) {
    const delRel = await supabase
      .from('receta_ingrediente')
      .delete()
      .eq('id_receta', id_receta);
    if (delRel.error) throw delRel.error;

    const delRec = await supabase
      .from('receta')
      .delete()
      .eq('id_receta', id_receta);
    if (delRec.error) throw delRec.error;

    return { ok: true };
  }
}

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
  // ======= Extras necesarios para Recetas =======

// Buscar por igualdad (tabla/columna/valor)
async selectEq(table: string, col: string, value: any) {
  const { data, error } = await supabase.from(table).select('*').eq(col, value);
  if (error) throw error;
  return data || [];
}

// Delete con 2 columnas (útil para favoritos PK compuesta)
async deleteBy2(table: string, col1: string, val1: any, col2: string, val2: any) {
  const { error } = await supabase.from(table).delete().eq(col1, val1).eq(col2, val2);
  if (error) throw error;
}

// Obtener id_usuario (tu tabla) a partir del usuario logueado (auth)
async getCurrentUsuarioId(): Promise<string | null> {
  const { data: auth } = await supabase.auth.getUser();
  const email = auth?.user?.email;
  if (!email) return null;

  const { data, error } = await supabase
    .from('usuario')
    .select('id_usuario')
    .eq('email', email)
    .maybeSingle();

  if (error) throw error;
  return data?.id_usuario ?? null;
}
// Traer recetas + ingredientes (para listar en el tab)
async getRecetasConIngredientes() {
  const { data, error } = await supabase
    .from('receta')
    .select(`
      id_receta,
      nombre,
      instrucciones,
      tiempo_preparacion_min,
      dificultad,
      fecha_creacion,
      receta_ingrediente (
        ingrediente:ingrediente ( id_ingrediente, nombre )
      )
    `)
    .order('fecha_creacion', { ascending: false });

  if (error) throw error;
  return data || [];
}
 async getUsuarios() {
    const { data, error } = await supabase
      .from('usuario')
      .select('*')
      .order('fecha_creacion', { ascending: false });
    return { data, error };
  }

  async insertUsuario(newUser: any) {
    const { data, error } = await supabase
      .from('usuario')
      .insert([{
        nombre: newUser.nombre,
        email: newUser.email,
        contrasenia: newUser.contrasenia, // coincide con tu columna
        telefono: newUser.telefono || null,
      }])
      .select()
      .single();
    return { data, error };
  }

  // =========================================
  // SUSCRIPCIONES
  // =========================================
  async getSuscripciones() {
    const { data, error } = await supabase
      .from('suscripcion')
      .select('*')
      .order('nombre', { ascending: true });
      console.log('[getSuscripciones] error:', error);
  console.log('[getSuscripciones] data:', data); // ← debería ser un array con objetos
    return { data, error };
  }

  // Suscripción activa actual (si existe)
  async getSuscripcionActiva(id_usuario: string) {
    const { data, error } = await supabase
      .from('usuario_suscripcion')
      .select('id_suscripcion, estado, fecha_inicio, fecha_cierre')
      .eq('id_usuario', id_usuario)
      .eq('estado', 'activa')
      .is('fecha_cierre', null)
      .order('fecha_inicio', { ascending: false })
      .limit(1)
      .maybeSingle(); // devuelve null si no hay
    return { data, error };
  }

  // Activar (o cambiar) una suscripción: inserta una fila activa con fecha_inicio = hoy
async activarSuscripcion(id_usuario: string, id_suscripcion: string) {
  const hoy = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD'

  // 1) Si existe una fila de HOY para este usuario y plan, la "reabrimos":
  //    estado = 'activa' y fecha_cierre = null (evita PK duplicada)
  const { data: existHoy, error: eExist } = await supabase
    .from('usuario_suscripcion')
    .select('id_usuario, id_suscripcion, fecha_inicio, estado, fecha_cierre')
    .eq('id_usuario', id_usuario)
    .eq('id_suscripcion', id_suscripcion)
    .eq('fecha_inicio', hoy)
    .maybeSingle();

  if (eExist) return { data: null, error: eExist };

  if (existHoy) {
    const { data, error } = await supabase
      .from('usuario_suscripcion')
      .update({ estado: 'activa', fecha_cierre: null })
      .eq('id_usuario', id_usuario)
      .eq('id_suscripcion', id_suscripcion)
      .eq('fecha_inicio', hoy)
      .select()
      .single();

    return { data, error };
  }

  // 2) Si no existe fila de HOY, insertamos una nueva
  const { data, error } = await supabase
    .from('usuario_suscripcion')
    .insert([{
      id_usuario,
      id_suscripcion,
      fecha_inicio: hoy,
      estado: 'activa',
      // fecha_cierre null por defecto
    }])
    .select()
    .single();

  return { data, error };
}


  // Cerrar suscripción activa (si la hay)
  async cerrarSuscripcionActiva(id_usuario: string) {
    const hoy = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('usuario_suscripcion')
      .update({ estado: 'cerrada', fecha_cierre: hoy })
      .eq('id_usuario', id_usuario)
      .eq('estado', 'activa')
      .is('fecha_cierre', null);
    return { data, error };
  }
}

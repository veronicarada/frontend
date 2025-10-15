import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from 'src/environments/environment';

export type Receta = {
  id: number;
  titulo: string;
  imagen: string | null;
  tiempoMin?: number | null;
  favorito?: boolean | null;
};

export type Ingrediente = {
  id: number;
  nombre: string;
  stock?: string | null;
};

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  /** Opcional: si ya manejás auth, traé el userId real */
  get userId(): string | null {
    const u = this.supabase.auth.getUser(); // promise, pero para demo dejemos null y filtra en Home si lo necesitás
    return null;
  }

  // === QUERIES ===
  async getRecetasSugeridas(limit = 10): Promise<Receta[]> {
    // 👇 AJUSTÁ nombres de tabla/columnas a tu DER
    const { data, error } = await this.supabase
      .from('recetas') // p.ej. 'recetas'
      .select(`
        id,
        titulo:nombre,                -- si tu columna es 'nombre' y querés mapear a 'titulo'
        imagen:imagen_url,            -- si usás 'imagen_url' en BD; si no, poné la tuya
        tiempoMin:tiempo_min,
        favorito
      `)
      .limit(limit);

    if (error) throw error;
    // Normalizo: si tu select no usa alias, cambia el mapeo acá
    return (data || []).map((r: any) => ({
      id: r.id,
      titulo: r.titulo ?? r.nombre ?? 'Sin título',
      imagen: r.imagen ?? r.imagen_url ?? null,
      tiempoMin: r.tiempoMin ?? r.tiempo_min ?? null,
      favorito: r.favorito ?? false,
    }));
  }

  async getIngredientesDisponibles(userId?: string, limit = 10): Promise<Ingrediente[]> {
    // 🧩 3 opciones comunes (usa la que coincida con tu DER):
    // A) Tabla ingredientes con user_id
    let query = this.supabase
      .from('ingredientes')                // p.ej. 'ingredientes'
      .select('id, nombre, stock')         // ajustá 'stock' si no existe

    if (userId) query = query.eq('usuario_id', userId); // si tenés ese campo
    const { data, error } = await query.limit(limit);
    if (error) throw error;
    return (data || []) as Ingrediente[];

    // B) Si tenés tabla pivote usuario_ingrediente(usuario_id, ingrediente_id, stock) con FK a ingredientes(nombre),
    //    avisame y te dejo la query con join seleccionable de Supabase (select anidado).
  }

  async getGastoSemanal(userId?: string): Promise<{ presupuesto: number; gastado: number; }> {
    // 🎯 Lo simple para el “donut” del mockup:
    // - presupuesto semanal desde la tabla usuarios (columna 'presupuesto_semanal')
    // - gastado = suma(tabla 'gastos' de la semana actual)
    // Cambiá los nombres a los de tu DER o, si tenés una VIEW 'gastos_semana_view', consultala directo.

    const startOfWeek = this.startOfWeekISO(new Date());

    // presupuesto (desde 'usuarios')
    let presupuesto = 1200; // valor por defecto si no existe en BD
    if (userId) {
      const { data: u, error: eu } = await this.supabase
        .from('usuarios')
        .select('presupuesto_semanal')
        .eq('id', userId)
        .single();
      if (!eu && u?.presupuesto_semanal != null) presupuesto = u.presupuesto_semanal;
    }

    // gastado de la semana (desde 'gastos')
    // ajustá: tabla 'gastos' con columnas 'monto' (number) y 'fecha' (date/timestamp) + 'usuario_id'
    let gastado = 0;
    let q = this.supabase
      .from('gastos')
      .select('monto, fecha')
      .gte('fecha', startOfWeek);

    if (userId) q = q.eq('usuario_id', userId);
    const { data: g, error: eg } = await q;
    if (!eg && Array.isArray(g)) {
      gastado = g.reduce((acc, row: any) => acc + (Number(row.monto) || 0), 0);
    }

    return { presupuesto, gastado };
  }

  // === helpers ===
  private startOfWeekISO(d: Date) {
    const date = new Date(d);
    const day = (date.getDay() + 6) % 7; // lunes=0
    date.setDate(date.getDate() - day);
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
  }
}

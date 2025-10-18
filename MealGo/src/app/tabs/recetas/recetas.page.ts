import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonicModule,
  ToastController,
  AlertController,
  LoadingController
} from '@ionic/angular';

import { supabase } from '../../supabase';

@Component({
  selector: 'app-recetas',
  templateUrl: './recetas.page.html',
  styleUrls: ['./recetas.page.scss'],
  standalone: true,
  imports: [FormsModule, CommonModule, IonicModule]
})
export class RecetasPage implements OnInit {

  // === Estado general ===
  recetas: any[] = [];
  filtro = '';
  verSoloFavoritas = false;

  // Ingredientes disponibles (desde Despensa)
  ingredientesDisponibles: Array<{ id_ingrediente: number; nombre: string }> = [];

  // Simulá obtenerla de tu AuthService (setéala en ngOnInit)
  private userId: string | null = null;

  // === Formulario ===
  form: any = {
    id_receta: null,
    id_usuario: null,
    nombre: '',
    instrucciones: '',
    tiempo_preparacion_min: null,
    dificultad: '',
    ingredientesIds: [] as number[] // <-- requerido
  };

  editando = false;

  constructor(
    private toast: ToastController,
    private alert: AlertController,
    private loading: LoadingController
  ) {}

  async ngOnInit() {
    // TODO: reemplazar por lo que uses para auth
    // Ej.: this.userId = this.auth.user()?.id || null;
    this.userId = null; // si ya tenés sesión, setealo aquí

    await Promise.all([this.cargar(), this.cargarIngredientesDesdeDespensa()]);
  }

  // === Helpers ===
  private promedio(nums: number[]): number | null {
    if (!nums?.length) return null;
    return +(nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(1);
  }

  async toastQuick(message: string) {
    const t = await this.toast.create({ message, duration: 1800, position: 'bottom' });
    await t.present();
  }

  toggleFavoritas() { this.verSoloFavoritas = !this.verSoloFavoritas; }

  // === Pull to refresh ===
  async doRefresh(ev: CustomEvent) {
    try {
      await Promise.all([this.cargar(), this.cargarIngredientesDesdeDespensa()]);
    } finally {
      (ev.target as HTMLIonRefresherElement).complete();
    }
  }

  // === Ingredientes desde Despensa (requisito) ===
  private async cargarIngredientesDesdeDespensa() {
    try {
      // 1) Intentar leer ingredientes cargados en la DESPENSA del usuario (si hay userId)
      let lista: Array<{ id_ingrediente: number; nombre: string }> = [];
      if (this.userId) {
        const { data, error } = await supabase
          .from('despensa')
          .select(`
            id_ingrediente,
            ingrediente:ingrediente ( id_ingrediente, nombre )
          `)
          .eq('id_usuario', this.userId);

        if (error) throw error;

        lista = (data ?? [])
          .map((d: any) => ({
            id_ingrediente: d?.ingrediente?.id_ingrediente ?? d?.id_ingrediente,
            nombre: d?.ingrediente?.nombre
          }))
          .filter(x => x.id_ingrediente && x.nombre);
      }

      // 2) Fallback: si no hay userId o la despensa está vacía, tomar catálogo base de 'ingrediente'
      if (!lista.length) {
        const { data, error } = await supabase
          .from('ingrediente')
          .select('id_ingrediente, nombre')
          .order('nombre', { ascending: true });
        if (error) throw error;
        lista = (data ?? []) as any;
      }

      // Quitar duplicados por id y ordenar
      const map = new Map<number, string>();
      for (const it of lista) map.set(it.id_ingrediente, it.nombre);
      this.ingredientesDisponibles = Array.from(map.entries())
        .map(([id, nombre]) => ({ id_ingrediente: id, nombre }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
    } catch (e) {
      console.error(e);
      this.toastQuick('No se pudieron cargar los ingredientes de tu despensa');
    }
  }

  // === Listado con relaciones + favoritos + rating ===
  async cargar() {
    const loader = await this.loading.create({ message: 'Cargando recetas...' });
    await loader.present();
    try {
      const { data, error } = await supabase
        .from('receta')
        .select(`
          id_receta, id_usuario, nombre, instrucciones, tiempo_preparacion_min, dificultad, fecha_creacion,
          receta_ingrediente ( cantidad, unidad, ingrediente ( id_ingrediente, nombre ) ),
          receta_etiqueta ( etiquetas ( nombre ) ),
          calificaciones ( estrellas )
        `)
        .order('fecha_creacion', { ascending: false });

      if (error) throw error;

      // favoritos del usuario
      let favs: Array<{ id_receta: string }> = [];
      if (this.userId) {
        const { data: favData, error: favErr } = await supabase
          .from('favoritos')
          .select('id_receta')
          .eq('id_usuario', this.userId);
        if (favErr) throw favErr;
        favs = favData ?? [];
      }

      this.recetas = (data ?? []).map((r: any) => ({
        ...r,
        rating: this.promedio((r.calificaciones ?? []).map((c: any) => c.estrellas)),
        ingredientesTxt: (r.receta_ingrediente ?? [])
          .map((ri: any) => ri.ingrediente?.nombre).filter(Boolean).join(' ').toLowerCase(),
        etiquetasTxt: (r.receta_etiqueta ?? [])
          .map((re: any) => re.etiquetas?.nombre).filter(Boolean).join(' ').toLowerCase(),
        esFavorita: !!favs.find(f => f.id_receta === r.id_receta)
      }));
    } catch (e) {
      console.error(e);
      this.toastQuick('Error al cargar recetas');
    } finally {
      loader.dismiss();
    }
  }

  // === Filtro (incluye etiquetas e ingredientes) ===
  get recetasFiltradas() {
    const q = this.filtro.toLowerCase().trim();
    const base = this.verSoloFavoritas ? this.recetas.filter(r => r.esFavorita) : this.recetas;
    if (!q) return base;

    return base.filter((r: any) =>
      (r?.nombre || '').toLowerCase().includes(q) ||
      (r?.dificultad || '').toLowerCase().includes(q) ||
      (r?.instrucciones || '').toLowerCase().includes(q) ||
      (r?.ingredientesTxt || '').includes(q) ||
      (r?.etiquetasTxt || '').includes(q)
    );
  }

  // === Alta / Edición ===
  async guardar() {
    if (!this.form?.nombre?.trim() || !this.form?.instrucciones?.trim()) {
      this.toastQuick('Nombre e instrucciones son obligatorios');
      return;
    }

    // Requisito: al menos 1 ingrediente de la despensa
    if (!this.form.ingredientesIds?.length) {
      this.toastQuick('Seleccioná al menos un ingrediente');
      return;
    }

    // Validar dificultad si vino seteada
    const dif = (this.form.dificultad || '').toLowerCase();
    if (this.form.dificultad && !['fácil', 'media', 'difícil'].includes(dif)) {
      this.toastQuick('Dificultad inválida');
      return;
    }

    // Asociar autor si hay sesión
    if (this.userId && !this.form.id_usuario) this.form.id_usuario = this.userId;

    const payload: any = {
      id_usuario: this.form.id_usuario ?? null,
      nombre: this.form.nombre.trim(),
      instrucciones: this.form.instrucciones.trim(),
      tiempo_preparacion_min: this.form.tiempo_preparacion_min ?? null,
      dificultad: this.form.dificultad || null
    };

    const loader = await this.loading.create({ message: this.editando ? 'Actualizando...' : 'Creando...' });
    await loader.present();

    try {
      let recetaId = this.form.id_receta;

      if (this.editando && recetaId) {
        const { error } = await supabase
          .from('receta')
          .update(payload)
          .eq('id_receta', recetaId);
        if (error) throw error;
        this.toastQuick('Receta actualizada');
      } else {
        const { data: nueva, error } = await supabase
          .from('receta')
          .insert(payload)
          .select('id_receta')
          .single();
        if (error) throw error;
        recetaId = nueva?.id_receta;
        this.toastQuick('Receta creada');
      }

      // Sin recetaId no podemos seguir
      if (!recetaId) throw new Error('No se obtuvo id_receta');

      // Sincronizar tabla intermedia receta_ingrediente:
      // 1) borrar existentes
      await supabase.from('receta_ingrediente').delete().eq('id_receta', recetaId);

      // 2) insertar los seleccionados (sin cantidades por ahora)
      const rows = (this.form.ingredientesIds as number[]).map(idIng => ({
        id_receta: recetaId,
        id_ingrediente: idIng,
        cantidad: null,
        unidad: null
      }));
      if (rows.length) {
        const { error: eRI } = await supabase.from('receta_ingrediente').insert(rows);
        if (eRI) throw eRI;
      }

      await this.cargar();
      this.cancelarEdicion(true);
    } catch (e) {
      console.error(e);
      this.toastQuick('Error al guardar');
    } finally {
      loader.dismiss();
    }
  }

  editar(r: any) {
    this.editando = true;
    this.form = {
      id_receta: r.id_receta || null,
      id_usuario: r.id_usuario ?? null,
      nombre: r.nombre || '',
      instrucciones: r.instrucciones || '',
      tiempo_preparacion_min: r.tiempo_preparacion_min ?? null,
      dificultad: r.dificultad || '',
      ingredientesIds: (r.receta_ingrediente ?? [])
        .map((ri: any) => ri?.ingrediente?.id_ingrediente)
        .filter((x: any) => !!x)
    };
  }

  cancelarEdicion(limpiar = false) {
    this.editando = false;
    if (limpiar) {
      this.form = {
        id_receta: null,
        id_usuario: this.form.id_usuario ?? null,
        nombre: '',
        instrucciones: '',
        tiempo_preparacion_min: null,
        dificultad: '',
        ingredientesIds: []
      };
    }
  }

  async eliminar(r: any) {
    const alert = await this.alert.create({
      header: 'Eliminar',
      message: `¿Eliminar la receta "<strong>${r?.nombre}</strong>"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              // Borrar relaciones primero para mantener integridad visual
              await supabase.from('receta_ingrediente').delete().eq('id_receta', r.id_receta);

              const { error } = await supabase
                .from('receta')
                .delete()
                .eq('id_receta', r.id_receta);
              if (error) throw error;

              this.toastQuick('Receta eliminada');
              if (this.editando && this.form.id_receta === r.id_receta) this.cancelarEdicion(true);
              await this.cargar();
            } catch (e) {
              console.error(e);
              this.toastQuick('Error al eliminar');
            }
          }
        }
      ]
    });
    await alert.present();
  }

  // === Favoritos ===
  async toggleFavorito(r: any) {
    if (!this.userId) { this.toastQuick('Iniciá sesión para usar favoritos'); return; }
    try {
      if (r.esFavorita) {
        const { error } = await supabase
          .from('favoritos')
          .delete()
          .match({ id_usuario: this.userId, id_receta: r.id_receta });
        if (error) throw error;
        r.esFavorita = false;
        this.toastQuick('Quitado de favoritos');
      } else {
        const { error } = await supabase
          .from('favoritos')
          .upsert({ id_usuario: this.userId, id_receta: r.id_receta }, { onConflict: 'id_usuario,id_receta' });
        if (error) throw error;
        r.esFavorita = true;
        this.toastQuick('Agregado a favoritos');
      }
    } catch (e) {
      console.error(e);
      this.toastQuick('No se pudo actualizar favoritos');
    }
  }

  // === Calificaciones ===
  async calificar(r: any, estrellas: number) {
    if (!this.userId) { this.toastQuick('Iniciá sesión para calificar'); return; }
    if (estrellas < 1 || estrellas > 5) return;

    try {
      const { error } = await supabase.from('calificaciones').insert({
        id_usuario: this.userId,
        id_receta: r.id_receta,
        estrellas
      });
      if (error) throw error;

      // refrescar solo las estrellas
      const { data: calis, error: e2 } = await supabase
        .from('calificaciones')
        .select('estrellas')
        .eq('id_receta', r.id_receta);
      if (e2) throw e2;

      r.rating = this.promedio((calis ?? []).map((c: any) => c.estrellas));
      this.toastQuick('¡Gracias por tu calificación!');
    } catch (e) {
      console.error(e);
      this.toastQuick('No se pudo calificar');
    }
  }
}

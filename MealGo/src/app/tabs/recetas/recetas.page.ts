import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
  IonContent, IonRefresher, IonRefresherContent, IonItem, IonLabel,
  IonInput, IonTextarea, IonSelect, IonSelectOption, IonIcon,
  IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonGrid, IonRow, IonCol, IonChip
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { heart, heartOutline, timeOutline, star, pencil, trash, search, addCircleOutline } from 'ionicons/icons';

import { DatabaseService } from '../../services/database';

@Component({
  selector: 'app-recetas',
  standalone: true,
  templateUrl: './recetas.page.html',
  styleUrls: ['./recetas.page.scss'],
  imports: [
    CommonModule, FormsModule,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton,
    IonContent, IonRefresher, IonRefresherContent, IonItem, IonLabel,
    IonInput, IonTextarea, IonSelect, IonSelectOption, IonIcon,
    IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonGrid, IonRow, IonCol, IonChip
  ]
})
export class RecetasPage implements OnInit {
  constructor(private db: DatabaseService) {
    addIcons({ heart, heartOutline, timeOutline, star, pencil, trash, search, addCircleOutline });
  }

  // UI
  filtro = '';
  verSoloFavoritas = false;
  editando = false;

  // DATA
  recetas: any[] = [];
  recetasFiltradas: any[] = [];
  favoritosSet = new Set<string>();

  // USER
  idUsuario: string | null = null;

  // FORM
  form: any = { id_receta: null, nombre: '', instrucciones: '', tiempo_preparacion_min: null, dificultad: '' };

  async ngOnInit() {
    await this.bootstrap();
  }

  async ionViewWillEnter() {
    await this.bootstrap();
  }


  // ===== Filtro =====
  onBuscarChange() { this.aplicarFiltro(); }
  toggleFavoritas() { this.verSoloFavoritas = !this.verSoloFavoritas; this.aplicarFiltro(); }
  aplicarFiltro() {
    const f = (this.filtro || '').toLowerCase().trim();
    let base = [...this.recetas];
    if (this.verSoloFavoritas) base = base.filter(r => this.favoritosSet.has(r.id_receta));
    if (f) {
      base = base.filter(r =>
        (r.nombre || '').toLowerCase().includes(f) ||
        (r.instrucciones || '').toLowerCase().includes(f) ||
        (r.dificultad || '').toLowerCase().includes(f)
      );
    }
    this.recetasFiltradas = base;
  }

  // ===== Form / CRUD =====
  nuevo() {
    this.form = { id_receta: null, nombre: '', instrucciones: '', tiempo_preparacion_min: null, dificultad: '' };
    this.ingredientesSeleccionados = []; // reset
    this.editando = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  editar(r: any, ev?: Event) {
    if (ev) ev.stopPropagation();
    this.form = { ...r };
    this.editando = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  

  cancelar() {
    this.editando = false;
    this.form = { id_receta: null, nombre: '', instrucciones: '', tiempo_preparacion_min: null, dificultad: '' };
    this.ingredientesSeleccionados = [];
  }


async guardar() {
  if (!this.form.nombre || !this.form.instrucciones) {
    alert('Nombre e instrucciones son obligatorios.');
    return;
  }

  const payload: any = {
    nombre: String(this.form.nombre).trim(),
    instrucciones: String(this.form.instrucciones).trim(),
    tiempo_preparacion_min: this.form.tiempo_preparacion_min ? Number(this.form.tiempo_preparacion_min) : null,
    dificultad: String(this.form.dificultad || '').trim(),
    id_usuario: this.idUsuario
  };

  try {
    // Declaramos la variable en este scope
    let recetaId: string | null = this.form.id_receta ?? null;

    if (recetaId) {
      // update
      await this.db.updateBy('receta', 'id_receta', recetaId, payload);
    } else {
      // insert: tu DatabaseService.insert devuelve la fila con id_receta
      const inserted = await this.db.insert('receta', payload);
      recetaId = inserted?.id_receta ?? null;
    }

    // Usamos la MISMA variable recetaId ya definida arriba
    if (recetaId) {
      const rows = (this.ingredientesSeleccionados || []).map((id: string) => ({
        id_ingrediente: id,        // cantidad/unidad opcionales
        // cantidad: 1,             // si querés un default explícito
        // unidad: 'unidad'
      }));
      await this.db.replaceRecetaIngredientes(recetaId, rows);
    }

    this.cancelar();
    await this.cargarRecetas();
  } catch (e: any) {
    console.error('Error guardando receta', e);
    alert('No se pudo guardar: ' + (e?.message || e));
  }
}

  async eliminar(r: any, ev?: Event) {
    if (ev) ev.stopPropagation();
    if (!confirm(`Eliminar "${r.nombre}"?`)) return;
    try {
      await this.db.deleteBy('receta', 'id_receta', r.id_receta);
      await this.cargarRecetas();
    } catch (e: any) {
      console.error('Error eliminando receta', e);
      alert('No se pudo eliminar: ' + (e?.message || e));
    }
  }

  // ===== Favoritos (necesita id_usuario) =====
  async cargarFavoritos() {
    this.favoritosSet.clear();
    if (!this.idUsuario) return;
    try {
      const favs = await this.db.selectEq('favoritos', 'id_usuario', this.idUsuario);
      (favs || []).forEach((f: any) => this.favoritosSet.add(f.id_receta));
      this.aplicarFiltro();
    } catch (e) {
      console.warn('No se pudieron cargar favoritos', e);
    }
  }

  esFavorita(r: any) { return this.favoritosSet.has(r.id_receta); }

  async toggleFavorita(r: any, ev?: Event) {
    if (ev) ev.stopPropagation();
    if (!this.idUsuario) { alert('Logueate para usar favoritos.'); return; }

    try {
      if (this.esFavorita(r)) {
        await this.db.deleteBy2('favoritos', 'id_usuario', this.idUsuario, 'id_receta', r.id_receta);
        this.favoritosSet.delete(r.id_receta);
      } else {
        await this.db.insert('favoritos', { id_usuario: this.idUsuario, id_receta: r.id_receta });
        this.favoritosSet.add(r.id_receta);
      }
      this.aplicarFiltro();
    } catch (e: any) {
      console.error('Favoritos', e);
      alert('No se pudo actualizar favoritos: ' + (e?.message || e));
    }
  }

  // ===== Calificar 5 (necesita id_usuario) =====
  async calificarCinco(r: any, ev?: Event) {
    if (ev) ev.stopPropagation();
    if (!this.idUsuario) { alert('Logueate para calificar.'); return; }
    try {
      await this.db.insert('calificaciones', {
        id_usuario: this.idUsuario,
        id_receta: r.id_receta,
        estrellas: 5,
        comentario: null
      });
      alert('¡Gracias por tu calificación!');
    } catch (e: any) {
      console.error('Error calificando', e);
      alert('No se pudo calificar: ' + (e?.message || e));
    }
  }

  // ===== Refresh =====
  doRefresh(ev: any) {
    Promise.all([this.cargarRecetas(), this.cargarFavoritos()]).finally(() => ev.target.complete());
  }

  // ===== Chip color =====
  chipClase(d: string) {
    const s = (d || '').toLowerCase();
    if (s.includes('fáci') || s.includes('facil')) return 'dif-facil';
    if (s.includes('media')) return 'dif-media';
    if (s.includes('difí') || s.includes('dificil')) return 'dif-dificil';
    return 'dif-otra';
  }
ingredientes: any[] = [];
ingredientesSeleccionados: string[] = [];

private async bootstrap() {
  try { this.idUsuario = await this.db.getCurrentUsuarioId(); } catch { this.idUsuario = null; }
  await Promise.all([this.cargarRecetas(), this.cargarFavoritos(), this.cargarIngredientes()]);
}

async cargarIngredientes() {
  try {
    this.ingredientes = await this.db.getIngredientes(); // viene de tu servicio
  } catch (e) {
    console.error('No se pudieron cargar ingredientes', e);
    this.ingredientes = [];
  }
}
// 1) Nueva carga con join de ingredientes
async cargarRecetas(event?: any) {
  try {
    const data = await this.db.getRecetasConIngredientes();

    this.recetas = (data || []).map((r: any) => ({
      ...r,
      ingredientes_nombres: (r.receta_ingrediente || [])
        .map((ri: any) => ri.ingrediente?.nombre)
        .filter(Boolean)
    }));
  } catch (e: any) {
    console.error('Error cargando recetas', e);
    alert('Error al cargar recetas: ' + (e?.message || e));
    this.recetas = [];
  } finally {
    if (event) event.target.complete();
    this.aplicarFiltro();
  }
}
}

import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { DatabaseService } from '../../services/database';
import { supabase } from '../../supabase';

@Component({
  selector: 'app-recetas',
  templateUrl: './recetas.page.html',
  styleUrls: ['./recetas.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class RecetasPage implements OnInit {
  // --------- estado general ----------
  loading = false;
  filtro = '';
  verSoloFavoritas = false;

  // --------- datasets ----------
  recetas: any[] = [];                 // lista (con flag _fav)
  ingredientesDisponibles: any[] = []; // [{id_ingrediente, nombre}]

  // --------- formulario (creación / edición) ----------
  editando = false; // para el formulario del template
  form: any = {
    id_receta: '',
    nombre: '',
    instrucciones: '',
    tiempo_preparacion_min: '',
    dificultad: '',
    ingredientesIds: [] as string[],
  };

  // --------- modo detalle mediante query param (desde Despensa) ----------
  detalleMode = false; // si hay id_receta en URL, mostramos sólo esa receta en el form
  userId: string | null = null;

  constructor(
    private db: DatabaseService,
    private router: Router,
    private route: ActivatedRoute,
    private toast: ToastController,
    private alert: AlertController
  ) {}

  async ngOnInit() {
    // usuario actual para ownership / favoritos / calificaciones
    const { data } = await supabase.auth.getUser();
    this.userId = data.user?.id ?? null;

    // catálogos
    this.ingredientesDisponibles = await this.db.getIngredientes();

    // si viene id_receta en la URL, abrimos en detalle
    this.route.queryParamMap.subscribe(async (q) => {
      const id = q.get('id_receta');
      if (id) {
        this.detalleMode = true;
        await this.cargarDetalleEnForm(id);
      } else {
        this.detalleMode = false;
        this.resetForm();
      }
      await this.cargarLista();
    });
  }

  // ==================== CARGAS ====================
  async cargarLista() {
    this.loading = true;
    try {
      // Trae recetas básicas
      const { data, error } = await supabase
        .from('receta')
        .select('id_receta,nombre,dificultad,tiempo_preparacion_min,id_usuario,fecha_creacion')
        .order('fecha_creacion', { ascending: false });
      if (error) throw error;
      const recetas = data || [];

      // marcar favoritas del usuario
      if (this.userId) {
        const fav = await supabase
          .from('favoritos')
          .select('id_receta')
          .eq('id_usuario', this.userId);
        const setFav = new Set((fav.data || []).map((x: any) => x.id_receta));
        this.recetas = recetas.map((r: any) => ({ ...r, _fav: setFav.has(r.id_receta) }));
      } else {
        this.recetas = recetas.map((r: any) => ({ ...r, _fav: false }));
      }

      // si estamos en detalle y hay una receta cargada en el form, aseguramos que quede primera en la lista
      if (this.detalleMode && this.form.id_receta) {
        const idx = this.recetas.findIndex(x => x.id_receta === this.form.id_receta);
        if (idx > 0) {
          const [sel] = this.recetas.splice(idx, 1);
          this.recetas.unshift(sel);
        }
      }
    } catch (e) {
      console.error(e);
      this.show('Error cargando recetas');
    } finally {
      this.loading = false;
    }
  }

  async cargarDetalleEnForm(id_receta: string) {
    try {
      const r = await this.db.getRecetaById(id_receta);
      this.form.id_receta = r.id_receta;
      this.form.nombre = r.nombre || '';
      this.form.instrucciones = r.instrucciones || '';
      this.form.tiempo_preparacion_min = r.tiempo_preparacion_min ?? '';
      this.form.dificultad = r.dificultad || '';
      this.form.ingredientesIds = (r.receta_ingrediente || []).map((x: any) => x.id_ingrediente);
      this.editando = true;
    } catch (e) {
      console.error(e);
      this.show('No se pudo cargar la receta');
    }
  }

  // ==================== UI HELPERS ====================
  async doRefresh(ev: any) {
    await this.cargarLista();
    ev?.target?.complete?.();
  }

  toggleFavoritas() {
    this.verSoloFavoritas = !this.verSoloFavoritas;
  }

  get recetasFiltradas() {
    const q = this.filtro.toLowerCase().trim();
    let arr = this.recetas;
    if (this.verSoloFavoritas) arr = arr.filter(r => r._fav);
    if (!q) return arr;
    return arr.filter(r =>
      (r.nombre || '').toLowerCase().includes(q) ||
      (r.dificultad || '').toLowerCase().includes(q)
    );
  }

  // ==================== CRUD FORM ====================
  resetForm() {
    this.form = {
      id_receta: '',
      nombre: '',
      instrucciones: '',
      tiempo_preparacion_min: '',
      dificultad: '',
      ingredientesIds: [] as string[],
    };
    this.editando = false;
  }

  async guardar() {
    if (!this.form.nombre?.trim() || !this.form.instrucciones?.trim()) {
      this.show('Completá nombre e instrucciones');
      return;
    }

    try {
      if (this.editando && this.form.id_receta) {
        // UPDATE receta
        await this.db.updateReceta(this.form.id_receta, {
          nombre: this.form.nombre.trim(),
          instrucciones: this.form.instrucciones.trim(),
          tiempo_preparacion_min:
            this.form.tiempo_preparacion_min === '' ? null : Number(this.form.tiempo_preparacion_min),
          dificultad: this.form.dificultad || null,
        });

        // REPLACE ingredientes
        const rels = (this.form.ingredientesIds || []).map((idIng: string) => ({
          id_ingrediente: idIng,
          cantidad: 1,
          unidad: 'unidad',
        }));
        await this.db.replaceRecetaIngredientes(this.form.id_receta, rels);

        this.show('Receta actualizada');
      } else {
        // CREATE receta + relaciones
        if (!this.userId) {
          this.show('Necesitás iniciar sesión para crear recetas');
          return;
        }
        const nueva = await this.db.insert('receta', {
          id_usuario: this.userId,
          nombre: this.form.nombre.trim(),
          instrucciones: this.form.instrucciones.trim(),
          tiempo_preparacion_min:
            this.form.tiempo_preparacion_min === '' ? null : Number(this.form.tiempo_preparacion_min),
          dificultad: this.form.dificultad || null,
        });
        const id = nueva?.id_receta;

        const rels = (this.form.ingredientesIds || []).map((idIng: string) => ({
          id_ingrediente: idIng,
          cantidad: 1,
          unidad: 'unidad',
        }));
        await this.db.replaceRecetaIngredientes(id, rels);

        this.show('Receta creada');
        this.resetForm();
      }

      // refrescar data
      await this.cargarLista();

      // si estamos en detalle, recargar form desde DB
      if (this.detalleMode && this.form.id_receta) {
        await this.cargarDetalleEnForm(this.form.id_receta);
      }
    } catch (e: any) {
      console.error('Guardar receta error =>', e);
      this.show('Error al guardar: ' + (e?.message || 'ver consola'));
    }
  }

  cancelarEdicion() {
    if (this.detalleMode) {
      // si venimos de Despensa con id_receta, volver a ver todas
      this.router.navigate(['/tabs/recetas']);
    }
    this.resetForm();
  }

  editar(r: any) {
    // Modo limpio: vamos a detalle con query param
    this.router.navigate(['/tabs/recetas'], { queryParams: { id_receta: r.id_receta } });
  }

  async eliminar(r: any) {
    const confirm = await this.alert.create({
      header: 'Eliminar receta',
      message: `¿Eliminar "${r?.nombre}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              await this.db.deleteReceta(r.id_receta);
              this.show('Receta eliminada');

              if (this.detalleMode && this.form.id_receta === r.id_receta) {
                this.router.navigate(['/tabs/recetas']);
                this.resetForm();
              }
              await this.cargarLista();
            } catch (e) {
              console.error(e);
              this.show('No se pudo eliminar');
            }
          },
        },
      ],
    });
    await confirm.present();
  }

  // ==================== FAVORITOS / CALIFICACIONES ====================
  async toggleFavorito(r: any) {
    if (!this.userId) {
      this.show('Iniciá sesión para usar favoritos');
      return;
    }
    try {
      if (r._fav) {
        // quitar
        const { error } = await supabase
          .from('favoritos')
          .delete()
          .eq('id_usuario', this.userId)
          .eq('id_receta', r.id_receta);
        if (error) throw error;
        r._fav = false;
      } else {
        // agregar
        const { error } = await supabase.from('favoritos').insert([
          { id_usuario: this.userId, id_receta: r.id_receta },
        ]);
        if (error) throw error;
        r._fav = true;
      }
    } catch (e) {
      console.error(e);
      this.show('No se pudo actualizar favoritos');
    }
  }

  async calificar(r: any, estrellas: number) {
    if (!this.userId) {
      this.show('Iniciá sesión para calificar');
      return;
    }
    try {
      // Insert simple (si querés evitar múltiples calificaciones, agregá unique en SQL)
      const { error } = await supabase.from('calificaciones').insert([
        { id_usuario: this.userId, id_receta: r.id_receta, estrellas },
      ]);
      if (error) throw error;
      this.show('¡Gracias por tu calificación!');
    } catch (e: any) {
      console.error(e);
      this.show('No se pudo calificar: ' + (e?.message || 'ver consola'));
    }
  }

  // ==================== helpers ====================
  private async show(msg: string) {
    const t = await this.toast.create({ message: msg, duration: 2000 });
    t.present();
  }
}

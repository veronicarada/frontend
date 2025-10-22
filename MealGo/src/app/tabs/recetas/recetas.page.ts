import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { DatabaseService } from '../../services/database';

@Component({
  selector: 'app-recetas',
  templateUrl: './recetas.page.html',
  styleUrls: ['./recetas.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class RecetasPage implements OnInit {
  // lista completa (cuando NO hay id_receta en URL)
  recetas: any[] = [];
  filtro = '';

  // detalle / edición
  detalleMode = false;
  id_receta = '';
  nombre = '';
  instrucciones = '';
  tiempo_preparacion_min: any = '';
  dificultad = '';
  // multi-select de ingredientes
  ingredientesDisponibles: any[] = [];  // {id_ingrediente, nombre}
  seleccionIngredientes: string[] = [];  // lista de ids
  // (opcional) cantidades/unidades simples
  // si no querés cantidades, no uses esto
  cantUnidad: Record<string, { cantidad: number, unidad: string }> = {};

  loading = false;

  constructor(
    private db: DatabaseService,
    private route: ActivatedRoute,
    private router: Router,
    private toast: ToastController
  ) {}

  async ngOnInit() {
    // cargar ingredientes para el select
    this.ingredientesDisponibles = await this.db.getIngredientes();

    this.route.queryParamMap.subscribe(async (q) => {
      const id = q.get('id_receta');
      if (id) {
        this.detalleMode = true;
        this.id_receta = id;
        await this.cargarDetalle(id);
      } else {
        this.detalleMode = false;
        await this.cargarLista();
      }
    });
  }

  // =============== LISTA GENERAL ===============
  async cargarLista() {
    this.loading = true;
    try {
      // Si ya tenías un método getRecetas(), usalo aquí.
      // De lo contrario, acá un read simple:
      const { data, error } = await (window as any).supabase
        .from('receta')
        .select('id_receta,nombre,dificultad,tiempo_preparacion_min')
        .order('fecha_creacion', { ascending: false });
      if (error) throw error;
      this.recetas = data || [];
    } catch (e) {
      console.error(e);
      this.show('Error cargando recetas');
    } finally {
      this.loading = false;
    }
  }

  get listaFiltrada() {
    const q = this.filtro.toLowerCase().trim();
    if (!q) return this.recetas;
    return this.recetas.filter(r =>
      (r.nombre || '').toLowerCase().includes(q) ||
      (r.dificultad || '').toLowerCase().includes(q)
    );
  }

  // =============== DETALLE ===============
  async cargarDetalle(id: string) {
    this.loading = true;
    try {
      const r = await this.db.getRecetaById(id);
      this.nombre = r?.nombre || '';
      this.instrucciones = r?.instrucciones || '';
      this.tiempo_preparacion_min = r?.tiempo_preparacion_min ?? '';
      this.dificultad = r?.dificultad || '';
      // mapear ingredientes seleccionados
      const ing = r?.receta_ingrediente || [];
      this.seleccionIngredientes = ing.map((x: any) => x.id_ingrediente);
      // si usás cantidad/unidad
      this.cantUnidad = {};
      ing.forEach((x: any) => {
        this.cantUnidad[x.id_ingrediente] = { cantidad: x.cantidad ?? 1, unidad: x.unidad ?? 'unidad' };
      });
    } catch (e) {
      console.error(e);
      this.show('No se pudo cargar la receta');
    } finally {
      this.loading = false;
    }
  }

  async guardarCambios() {
    if (!this.nombre?.trim() || !this.instrucciones?.trim()) {
      this.show('Completá nombre e instrucciones');
      return;
    }

    const payload: any = {
      nombre: this.nombre.trim(),
      instrucciones: this.instrucciones.trim(),
      tiempo_preparacion_min: this.tiempo_preparacion_min === '' ? null : Number(this.tiempo_preparacion_min),
      dificultad: this.dificultad || null,
    };

    try {
      // 1) Update receta
      await this.db.updateReceta(this.id_receta, payload);

      // 2) Reemplazar relaciones ingredientes
      const rels = this.seleccionIngredientes.map(idIng => ({
        id_ingrediente: idIng,
        cantidad: this.cantUnidad[idIng]?.cantidad ?? 1,
        unidad: this.cantUnidad[idIng]?.unidad ?? 'unidad'
      }));
      await this.db.replaceRecetaIngredientes(this.id_receta, rels);

      this.show('Receta actualizada');
      // refrescar detalle
      await this.cargarDetalle(this.id_receta);
    } catch (e: any) {
      console.error(e);
      this.show('Error al guardar');
    }
  }

  volverALista() {
    this.router.navigate(['/tabs/recetas']);
  }

  private async show(msg: string) {
    const t = await this.toast.create({ message: msg, duration: 2000 });
    t.present();
  }
}

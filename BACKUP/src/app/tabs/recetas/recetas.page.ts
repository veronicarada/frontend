import { Component } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-recetas',
  standalone: true,
  imports: [IonicModule, CommonModule],
  templateUrl: './recetas.page.html',
  styleUrls: ['./recetas.page.scss'],
})
export class RecetasPage implements OnInit {

  // ====== VARIABLES DEL FORMULARIO (sin interfaces) ======
  id_receta: string | null = null;   // null => modo crear, con valor => modo editar
  id_usuario: string | null = null;  // opcional, si querés asociar al usuario logueado
  nombre = '';
  instrucciones = '';
  tiempo_preparacion_min: number | null = null;
  dificultad = ''; // Ej: 'Fácil' | 'Media' | 'Difícil'

  // ====== LISTA Y BÚSQUEDA ======
  recetas: any[] = [];
  filtro = '';

  // Nombre de la tabla y PK en Supabase
  private readonly TABLE = 'receta';
  private readonly PK = 'id_receta';

  constructor(
    private db: DbService,
    private toast: ToastController,
    private alert: AlertController,
    private loading: LoadingController
  ) {}

  async ngOnInit() {
    // Si tenés un AuthService con el user, podés setear id_usuario acá:
    // this.id_usuario = this.auth.user?.id_usuario ?? null;
    await this.loadRecetas();
  }

  // ====== CRUD ======
  async loadRecetas() {
    const loader = await this.loading.create({ message: 'Cargando recetas...' });
    await loader.present();
    try {
      // Ajustá al método real de tu servicio genérico
      // Ejemplos comunes: this.db.list(this.TABLE) o this.db.select(this.TABLE)
      const data = await this.db.list(this.TABLE);
      this.recetas = Array.isArray(data) ? data : [];
    } catch (e) {
      await this.showToast('Error al cargar recetas');
      console.error(e);
    } finally {
      loader.dismiss();
    }
  }

  limpiarForm() {
    this.id_receta = null;
    this.nombre = '';
    this.instrucciones = '';
    this.tiempo_preparacion_min = null;
    this.dificultad = '';
    // this.id_usuario = this.auth.user?.id_usuario ?? null; // si lo manejás
  }

  async guardar() {
    if (!this.nombre.trim() || !this.instrucciones.trim()) {
      return this.showToast('Nombre e instrucciones son obligatorios');
    }

    const payload: any = {
      // id_receta lo maneja la base (uuid default) al crear
      id_usuario: this.id_usuario, // opcional (puede ir null si lo permitís)
      nombre: this.nombre.trim(),
      instrucciones: this.instrucciones.trim(),
      tiempo_preparacion_min: this.tiempo_preparacion_min ?? null,
      dificultad: this.dificultad || null
      // fecha_creacion la setea la base con default now()
    };

    const loader = await this.loading.create({ message: this.id_receta ? 'Actualizando...' : 'Creando...' });
    await loader.present();

    try {
      if (this.id_receta) {
        // UPDATE
        await this.db.update(this.TABLE, this.PK, this.id_receta, payload);
        await this.showToast('Receta actualizada');
      } else {
        // INSERT
        await this.db.create(this.TABLE, payload);
        await this.showToast('Receta creada');
      }
      await this.loadRecetas();
      this.limpiarForm();
    } catch (e) {
      await this.showToast('Error al guardar la receta');
      console.error(e);
    } finally {
      loader.dismiss();
    }
  }

  editar(receta: any) {
    // Pasamos campos a variables del formulario
    this.id_receta = receta.id_receta || null;
    this.id_usuario = receta.id_usuario || null;
    this.nombre = receta.nombre || '';
    this.instrucciones = receta.instrucciones || '';
    this.tiempo_preparacion_min = receta.tiempo_preparacion_min ?? null;
    this.dificultad = receta.dificultad || '';
  }

  async eliminar(receta: any) {
    const confirm = await this.alert.create({
      header: 'Eliminar',
      message: `¿Eliminar la receta "<strong>${receta?.nombre}</strong>"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              await this.db.remove(this.TABLE, this.PK, receta.id_receta);
              await this.showToast('Receta eliminada');
              await this.loadRecetas();
              if (this.id_receta === receta.id_receta) this.limpiarForm();
            } catch (e) {
              await this.showToast('Error al eliminar');
              console.error(e);
            }
          }
        }
      ]
    });
    await confirm.present();
  }

  // ====== UTIL ======
  get recetasFiltradas() {
    const q = this.filtro.toLowerCase().trim();
    if (!q) return this.recetas;
    return this.recetas.filter(r =>
      (r?.nombre || '').toLowerCase().includes(q) ||
      (r?.instrucciones || '').toLowerCase().includes(q) ||
      (r?.dificultad || '').toLowerCase().includes(q)
    );
  }

  private async showToast(message: string) {
    const t = await this.toast.create({ message, duration: 1800, position: 'bottom' });
    await t.present();
  }
}
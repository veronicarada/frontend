// src/app/pages/home/home.page.ts
import { Component, OnInit } from '@angular/core';
import { DatabaseService } from '../../services/database';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController, AlertController, LoadingController } from '@ionic/angular';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [FormsModule, CommonModule, IonicModule]
})
export class HomePage implements OnInit {

  // === Estado general ===
  recetas: any[] = [];
  filtro = '';

  // === Formulario (sin interfaces) ===
  // id_receta null => alta | con valor => edición
  form: any = {
    id_receta: null,
    id_usuario: null,            // setéalo si querés asociar al user logueado
    nombre: '',
    instrucciones: '',
    tiempo_preparacion_min: null,
    dificultad: ''
  };

  editando = false;

  // Constantes
  private readonly TABLE = 'receta';
  private readonly PK = 'id_receta';

  constructor(
    private db: DatabaseService,
    private toast: ToastController,
    private alert: AlertController,
    private loading: LoadingController
  ) {}

  async ngOnInit() {
    await this.cargar();
  }

  // === Listado ===
  async cargar() {
    const loader = await this.loading.create({ message: 'Cargando recetas...' });
    await loader.present();
    try {
      this.recetas = await this.db.getAll(this.TABLE);
    } catch (e) {
      console.error(e);
      this.toastQuick('Error al cargar recetas');
    } finally {
      loader.dismiss();
    }
  }

  get recetasFiltradas() {
    const q = this.filtro.toLowerCase().trim();
    if (!q) return this.recetas;
    return this.recetas.filter(r =>
      (r?.nombre || '').toLowerCase().includes(q) ||
      (r?.dificultad || '').toLowerCase().includes(q) ||
      (r?.instrucciones || '').toLowerCase().includes(q)
    );
  }

  // === Alta/Edición ===
  async guardar() {
    if (!this.form.nombre?.trim() || !this.form.instrucciones?.trim()) {
      this.toastQuick('Nombre e instrucciones son obligatorios');
      return;
    }

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
      if (this.editando && this.form.id_receta) {
        // ===== Opción A (servicio extendido):
        await this.db.updateBy(this.TABLE, this.PK, this.form.id_receta, payload);

        // ===== Opción B (si NO querés tocar el servicio), des-comenta y comenta la línea de arriba:
        // const { data, error } = await supabase.from(this.TABLE).update(payload).eq(this.PK, this.form.id_receta);
        // if (error) throw error;

        this.toastQuick('Receta actualizada');
      } else {
        await this.db.insert(this.TABLE, payload);
        this.toastQuick('Receta creada');
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
      dificultad: r.dificultad || ''
    };
  }

  cancelarEdicion(limpiar = false) {
    this.editando = false;
    if (limpiar) {
      this.form = {
        id_receta: null,
        id_usuario: this.form.id_usuario ?? null, // mantené si lo traés de auth
        nombre: '',
        instrucciones: '',
        tiempo_preparacion_min: null,
        dificultad: ''
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
          text: 'Eliminar', role: 'destructive', handler: async () => {
            try {
              // ===== Opción A (servicio extendido):
              await this.db.deleteBy(this.TABLE, this.PK, r.id_receta);

              // ===== Opción B (sin tocar servicio):
              // const { error } = await supabase.from(this.TABLE).delete().eq(this.PK, r.id_receta);
              // if (error) throw error;

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

  // === Utils ===
  private async toastQuick(message: string) {
    const t = await this.toast.create({ message, duration: 1800, position: 'bottom' });
    await t.present();
  }
}


 
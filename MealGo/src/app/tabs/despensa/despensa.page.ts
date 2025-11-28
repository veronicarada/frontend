import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { Router } from '@angular/router';
import { DatabaseService } from '../../services/database';

@Component({
  selector: 'app-despensa',
  templateUrl: './despensa.page.html',
  styleUrls: ['./despensa.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class DespensaPage implements OnInit {

  // listado
  ingredientes: any[] = [];
  filtro = '';

  // formulario
  id_ingrediente = '';
  nombre = '';
  categoria = '';
  calorias: any = '';
  proteinas: any = '';
  carbohidratos: any = '';
  grasas: any = '';

  // estado
  editMode = false;
  loading = false;

  // modal recetas
  modalOpen = false;
  loadingRecetas = false;
  recetasDelIngrediente: any[] = [];
  ingredienteActual: any = null;

  constructor(
    private db: DatabaseService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController,
    private router: Router
  ) {}

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    this.loading = true;
    try {
      const rows: any[] = await this.db.getIngredientes();
      this.ingredientes = rows || [];
    } catch (e) {
      this.showToast('Error cargando ingredientes');
      console.error(e);
    } finally {
      this.loading = false;
    }
  }

  limpiarForm() {
    this.id_ingrediente = '';
    this.nombre = '';
    this.categoria = '';
    this.calorias = '';
    this.proteinas = '';
    this.carbohidratos = '';
    this.grasas = '';
    this.editMode = false;
  }

  async guardar() {
    if (!this.nombre?.trim()) {
      this.showToast('El nombre es obligatorio.');
      return;
    }

    const payload: any = {
      nombre: this.nombre?.trim(),
      categoria: this.categoria?.trim() || null,
      calorias: this.calorias === '' ? null : Number(this.calorias),
      proteinas: this.proteinas === '' ? null : Number(this.proteinas),
      carbohidratos: this.carbohidratos === '' ? null : Number(this.carbohidratos),
      grasas: this.grasas === '' ? null : Number(this.grasas),
    };

    try {
      if (this.editMode && this.id_ingrediente) {
        await this.db.updateIngrediente(this.id_ingrediente, payload);
        this.showToast('Ingrediente actualizado');
      } else {
        await this.db.addIngrediente(payload);
        this.showToast('Ingrediente agregado');
      }
      await this.cargar();
      this.limpiarForm();
    } catch (e: any) {
      if (e?.message?.includes('duplicate key') || e?.message?.includes('unique')) {
        this.showToast('Ya existe un ingrediente con ese nombre.');
      } else {
        this.showToast('Error guardando ingrediente.');
      }
      console.error(e);
    }
  }

  editar(item: any) {
    this.editMode = true;
    this.id_ingrediente = item.id_ingrediente || '';
    this.nombre = item.nombre || '';
    this.categoria = item.categoria || '';
    this.calorias = item.calorias ?? '';
    this.proteinas = item.proteinas ?? '';
    this.carbohidratos = item.carbohidratos ?? '';
    this.grasas = item.grasas ?? '';
  }

  async confirmarBorrar(item: any) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar ingrediente',
      message: `¿Eliminar "${item?.nombre}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: () => this.borrar(item)
        }
      ]
    });
    await alert.present();
  }

  async borrar(item: any) {
    try {
      await this.db.deleteIngrediente(item.id_ingrediente);
      this.showToast('Ingrediente eliminado');
      await this.cargar();
      if (this.editMode && this.id_ingrediente === item.id_ingrediente) {
        this.limpiarForm();
      }
    } catch (e: any) {
      this.showToast('No se puede eliminar (puede estar usado en recetas).');
      console.error(e);
    }
  }

  // =========================
  // VER RECETAS POR INGREDIENTE
  // =========================
  async verRecetas(item: any) {
    this.ingredienteActual = item;
    this.modalOpen = true;
    this.loadingRecetas = true;
    this.recetasDelIngrediente = [];
    try {
      // usa el método del servicio (ver abajo)
      const data = await this.db.getRecetasPorIngrediente(item.id_ingrediente);
      // 'data' puede venir como [{receta:{...}}, ...] o ya mapeado. Normalizamos:
      this.recetasDelIngrediente = (data || []).map((row: any) => row.receta ? row.receta : row);
    } catch (e) {
      this.showToast('Error obteniendo recetas.');
      console.error(e);
    } finally {
      this.loadingRecetas = false;
    }
  }

  cerrarModal() {
    this.modalOpen = false;
    this.recetasDelIngrediente = [];
    this.ingredienteActual = null;
  }

  irADetalleReceta(receta: any) {
    // Navegá al tab "Recetas" pasando el id por query param.
    // Ajustá la ruta si tu app usa otra estructura.
    this.router.navigate(['/tabs/recetas'], { queryParams: { id_receta: receta.id_receta } });
    this.cerrarModal();
  }

  get listaFiltrada() {
    const q = this.filtro.toLowerCase().trim();
    if (!q) return this.ingredientes;
    return this.ingredientes.filter(x =>
      (x?.nombre || '').toLowerCase().includes(q) ||
      (x?.categoria || '').toLowerCase().includes(q)
    );
  }

  private async showToast(msg: string) {
    const t = await this.toastCtrl.create({ message: msg, duration: 2000 });
    t.present();
  }
}

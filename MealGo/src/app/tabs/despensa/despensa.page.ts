import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';
import { DatabaseService } from '../../services/database'; // usa tu servicio existente

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

  // formulario (variables TS simples, sin interfaces)
  id_ingrediente = ''; // para editar
  nombre = '';
  categoria = '';
  calorias: any = '';
  proteinas: any = '';
  carbohidratos: any = '';
  grasas: any = '';

  // estado
  editMode = false;
  loading = false;

  constructor(
    private db: DatabaseService,
    private toastCtrl: ToastController,
    private alertCtrl: AlertController
  ) {}

  async ngOnInit() {
    await this.cargar();
  }

  async cargar() {
    this.loading = true;
    try {
      // Se asume que tu servicio devuelve un array de filas de supabase
      // y que el método se llama getIngredientes()
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
    // Validación mínima
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
        // update
        await this.db.updateIngrediente(this.id_ingrediente, payload);
        this.showToast('Ingrediente actualizado');
      } else {
        // create
        await this.db.addIngrediente(payload);
        this.showToast('Ingrediente agregado');
      }
      await this.cargar();
      this.limpiarForm();
    } catch (e: any) {
      // Manejo típico de constraint UNIQUE (nombre)
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
      // si estabas editando el mismo, reseteá
      if (this.editMode && this.id_ingrediente === item.id_ingrediente) {
        this.limpiarForm();
      }
    } catch (e: any) {
      // Puede fallar si está referenciado en receta_ingrediente (FK)
      this.showToast('No se puede eliminar (puede estar usado en recetas).');
      console.error(e);
    }
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

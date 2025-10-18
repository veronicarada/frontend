import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { DatabaseService } from 'src/app/services/database';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true, // 👈 si tu proyecto usa componentes standalone (como tabs)
  imports: [CommonModule, FormsModule, IonicModule],
})
export class HomePage implements OnInit {
  tips: any[] = [];
  loading = true;

  // Modelo del formulario
  newTip = {
    titulo: '',
    descripcion: '',
    categoria: '',
  };

  constructor(private databaseService: DatabaseService) {}

  async ngOnInit() {
    await this.loadTips();
  }

  // 🧠 Cargar todos los tips desde Supabase
  async loadTips() {
    try {
      this.loading = true;
      const { data, error } = await this.databaseService.getTips();
      if (error) throw error;
      this.tips = data ?? [];
    } catch (error) {
      console.error('Error al cargar los tips:', error);
    } finally {
      this.loading = false;
    }
  }

  // 🧠 Agregar un nuevo tip
  async addTip() {
    // Validación simple
    if (!this.newTip.titulo || !this.newTip.descripcion || !this.newTip.categoria) {
      alert('Por favor completá todos los campos.');
      return;
    }

    try {
      const { data, error } = await this.databaseService.insertTip(this.newTip);
      if (error) throw error;

      console.log('Nuevo tip agregado:', data);

      // Limpiar formulario
      this.newTip = { titulo: '', descripcion: '', categoria: '' };

      // Recargar lista
      await this.loadTips();

      alert('✅ Tip agregado correctamente.');
    } catch (error) {
      console.error('Error al agregar el tip:', error);
      alert('❌ Error al guardar el tip.');
    }
  }
}
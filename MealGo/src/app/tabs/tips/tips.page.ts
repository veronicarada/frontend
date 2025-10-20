import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { DatabaseService } from '../../services/database';

const CATS = ['GRUPOS','HIDRATACION','REDUCCION','HABITOS','AHORRO'];

@Component({
  selector: 'app-tips',
  standalone: true,
  templateUrl: './tips.page.html',
  styleUrls: ['./tips.page.scss'],
  imports: [CommonModule, FormsModule, IonicModule],
})
export class TipsPage {
  filtro = '';

  categorias = [
    { value: 'ALL',         text: 'Todos',                                  emoji: '✨' },
    { value: 'GRUPOS',      text: 'Consejos Basados en Grupos de Alimentos', emoji: '🥗' },
    { value: 'HIDRATACION', text: 'Consejos de Hidratación',                 emoji: '💧' },
    { value: 'REDUCCION',   text: 'Consejos de Reducción',                   emoji: '🧂' },
    { value: 'HABITOS',     text: 'Estilo de Vida y Hábitos',                emoji: '🏃' },
    { value: 'AHORRO',      text: 'Ahorro $ en comida',                      emoji: '💸' },
  ];

  categoriaSeleccionada = 'ALL';

  tipsOriginal: any[] = [];
  tips: any[] = [];

  cargando = false;
  errorMsg = '';

  constructor(private db: DatabaseService) {}

  ionViewWillEnter() { this.cargarTips(); }

  async cargarTips(event?: any) {
    this.cargando = true;
    this.errorMsg = '';
    try {
      const tabla = 'tip_nutricional';
      let data: any[] = [];

      // 🔁 Server-side: traé sólo tips válidos
      if (this.categoriaSeleccionada === 'ALL' && (this.db as any).getByIn) {
        data = await (this.db as any).getByIn(tabla, 'categoria', CATS);
      } else if (this.categoriaSeleccionada !== 'ALL' && (this.db as any).getByEq) {
        data = await (this.db as any).getByEq(tabla, 'categoria', this.categoriaSeleccionada);
      } else if ((this.db as any).getAllBy) {
        data = await (this.db as any).getAllBy(tabla, 'titulo', true);
      } else {
        data = await this.db.getAll(tabla);
      }

      // 🧹 Normalización + filtro client-side de seguridad
      this.tipsOriginal = (data || [])
        .map(t => ({
          id_tip: t.id_tip ?? t.id ?? null,
          titulo: (t.titulo || '').trim(),
          categoria: ((t.categoria || '').trim() || 'DEFAULT').toUpperCase(),
          descripcion: (t.descripcion || '').trim(),
        }))
        .filter(t => CATS.includes(t.categoria)); // 👈 acá se descartan los sin categoría

      this.aplicarFiltros();
    } catch (e) {
      console.error('Tips load error:', e);
      this.errorMsg = 'No se pudieron cargar los tips. Revisa conexión/permisos.';
      this.tipsOriginal = [];
      this.tips = [];
    } finally {
      this.cargando = false;
      if (event) event.target.complete();
    }
  }

  onBuscarChange() { this.aplicarFiltros(); }

  onSeleccionCategoria(value: string) {
    this.categoriaSeleccionada = value;
    this.cargarTips(); // recarga desde server si se puede
  }

  private aplicarFiltros() {
    const texto = (this.filtro || '').toLowerCase();
    let lista = [...this.tipsOriginal];

    if (this.categoriaSeleccionada !== 'ALL') {
      lista = lista.filter(t => t.categoria === this.categoriaSeleccionada);
    }

    if (texto) {
      lista = lista.filter(t =>
        (t.titulo || '').toLowerCase().includes(texto) ||
        (t.descripcion || '').toLowerCase().includes(texto)
      );
    }

    this.tips = lista.sort((a, b) => a.titulo.localeCompare(b.titulo));
  }

  // 🎨 Helpers UI
  getEmoji(value: string) {
    return this.categorias.find(c => c.value === value)?.emoji || '📝';
  }
  getText(value: string) {
    return this.categorias.find(c => c.value === value)?.text || 'Tip';
  }
  categoryClass(cat?: string) {
    const c = (cat || 'DEFAULT').toUpperCase();
    return {
      'cat-grupos': c === 'GRUPOS',
      'cat-hidratacion': c === 'HIDRATACION',
      'cat-reduccion': c === 'REDUCCION',
      'cat-habitos': c === 'HABITOS',
      'cat-ahorro': c === 'AHORRO',
      'cat-default': !CATS.includes(c),
    };
  }
}

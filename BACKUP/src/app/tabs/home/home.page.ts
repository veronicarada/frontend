import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ToastController } from '@ionic/angular';
import { SupabaseService, Receta, Ingrediente } from 'src/app/services/supabase.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: true,
  imports: [CommonModule, IonicModule],
})
export class HomePage implements OnInit {
  usuario = 'Juan';

  // datos que alimentan el mockup
  recetas: Receta[] = [];
  ingredientes: Ingrediente[] = [];

  presupuestoSemana = 1200;
  gastadoSemana = 0;

  get restanteSemana() {
    return Math.max(this.presupuestoSemana - this.gastadoSemana, 0);
  }
  get pctGastado() {
    return Math.min(this.gastadoSemana / Math.max(this.presupuestoSemana, 1), 1);
  }

  loading = true;

  constructor(
    private sb: SupabaseService,
    private toast: ToastController,
  ) {}

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    try {
      this.loading = true;

      // TODO: si ya manejás auth, pasá userId real:
      const userId: string | undefined = undefined;

      const [recetas, ingredientes, gasto] = await Promise.all([
        this.sb.getRecetasSugeridas(10),
        this.sb.getIngredientesDisponibles(userId, 10),
        this.sb.getGastoSemanal(userId),
      ]);

      this.recetas = recetas;
      this.ingredientes = ingredientes;
      this.presupuestoSemana = gasto.presupuesto;
      this.gastadoSemana = gasto.gastado;

    } catch (e: any) {
      console.error(e);
      this.showToast('No pude cargar los datos. Revisá nombres de tablas/columnas.');
    } finally {
      this.loading = false;
    }
  }

  // acciones UI
  go(section: 'recetas'|'ingredientes'|'gastos'|'plus') {
    console.log('Ir a:', section);
  }

  toggleFav(r: Receta) {
    r.favorito = !r.favorito;
    // Opcional: persistir favorito en tabla 'favoritos' o en 'recetas'
  }

  private async showToast(message: string) {
    const t = await this.toast.create({ message, duration: 2500, position: 'bottom' });
    await t.present();
  }
}

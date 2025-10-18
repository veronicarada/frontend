// src/app/tabs/plan/plan.page.ts
import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController, AlertController } from '@ionic/angular';

import { DatabaseService } from '../../services/database';
import { Auth } from '../../services/auth';
import { supabase } from '../../supabase';

@Component({
  standalone: true,
  selector: 'app-plan',
  templateUrl: './plan.page.html',
  styleUrls: ['./plan.page.scss'],
  imports: [CommonModule, FormsModule, IonicModule],
})
export class PlanPage implements OnInit {
  private db = inject(DatabaseService);
  private auth = inject(Auth);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);

  // 🔑 Usuario actual
  userId: string = '';

  // 📋 Listados
  planes: any[] = [];
  recetas: any[] = [];

  // 🔎 Selección y detalle
  selectedPlan: any = null;
  recetasDelPlan: any[] = [];

  // 📝 Form plan (crear/editar)
  planTitulo: string = '';
  planFechaInicio: string = '';
  planFechaFin: string = '';
  editPlanId: string | null = null;

  // ➕ Form agregar receta al plan
  nuevaRecetaId: string = '';
  nuevaRecetaTipo: string = 'Desayuno';
  tiposComida = ['Desayuno', 'Almuerzo', 'Merienda', 'Cena', 'Snack'];

  async ngOnInit() {
    await this.cargarUsuario();
    await this.cargarRecetas();
    await this.cargarPlanes();
  }

  // ======== Helpers ========
  private toPgDate(value: any): string {
    if (!value) return '';
    const s = value.toString();
    if (s.includes('T')) return s.split('T')[0]; // de ISO → 'YYYY-MM-DD'
    return s.substring(0, 10);                   // seguridad por si viene más largo
  }

  private async toast(msg: string) {
    const t = await this.toastCtrl.create({ message: msg, duration: 1600, position: 'bottom' });
    t.present();
  }

  // helper simple para generar una contraseña dummy
  private randomString(n = 12) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let s = '';
    for (let i = 0; i < n; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  }

  // ======== Cargas iniciales ========
  async cargarUsuario() {
    const session = await this.auth.getCurrentSession();
    const supaUser = session.data.session?.user;
    if (!supaUser) {
      await this.toast('Iniciá sesión nuevamente');
      this.userId = '';
      return;
    }

    const email = supaUser.email || '';
    if (!email) {
      await this.toast('No se obtuvo el email del usuario');
      this.userId = '';
      return;
    }

    // 1) Buscar por email en tu tabla pública
    const { data: found, error: findErr } = await supabase
      .from('usuario')
      .select('id_usuario')
      .eq('email', email)
      .single();

    if (!findErr && found?.id_usuario) {
      this.userId = found.id_usuario;
      return;
    }

    // 2) Si no existe, lo creo con datos mínimos requeridos
    const meta = (supaUser as any)?.user_metadata || {};
    const nombre = meta['full_name'] || meta['name'] || email.split('@')[0];
    const contraseniaDummy = this.randomString(16);

    const { data: inserted, error: insErr } = await supabase
      .from('usuario')
      .insert([{
        nombre,
        email,
        contrasenia: contraseniaDummy,
        telefono: null
      }])
      .select('id_usuario')
      .single();

    if (insErr || !inserted?.id_usuario) {
      console.error('crear usuario público', insErr);
      await this.toast('No se pudo vincular el usuario con la BD');
      this.userId = '';
      return;
    }

    this.userId = inserted.id_usuario;
  }

  async cargarRecetas() {
    try {
      this.recetas = await this.db.getAll('receta');
    } catch (e) {
      console.error('cargarRecetas', e);
      this.recetas = [];
    }
  }

  async cargarPlanes() {
    if (!this.userId) return;
    try {
      const { data, error } = await supabase
        .from('plan_de_comidas')
        .select('*')
        .eq('id_usuario', this.userId)
        .order('fecha_creacion', { ascending: false });

      if (error) throw error;
      this.planes = data || [];
    } catch (e) {
      console.error('cargarPlanes', e);
      this.toast('Error al cargar planes');
      this.planes = [];
    }
  }

  // ======== CRUD plan_de_comidas ========
  limpiarFormPlan() {
    this.planTitulo = '';
    this.planFechaInicio = '';
    this.planFechaFin = '';
    this.editPlanId = null;
  }

  async guardarPlan() {
    if (!this.planTitulo || !this.planFechaInicio || !this.planFechaFin) {
      return this.toast('Completá título y fechas');
    }
    if (!this.userId) return this.toast('No hay usuario autenticado');

    const payload = {
      id_usuario: this.userId,
      titulo: this.planTitulo,
      fecha_inicio: this.toPgDate(this.planFechaInicio),
      fecha_fin: this.toPgDate(this.planFechaFin),
    };

    try {
      if (this.editPlanId) {
        await this.db.updateBy('plan_de_comidas', 'id_plan', this.editPlanId, payload);
        await this.toast('Plan actualizado');
      } else {
        await this.db.insert('plan_de_comidas', payload);
        await this.toast('Plan creado');
      }
      this.limpiarFormPlan();
      await this.cargarPlanes();
    } catch (e: any) {
      console.error('guardarPlan', e);
      this.toast(e?.message || 'Error al guardar el plan');
    }
  }

  editarPlan(plan: any) {
    this.editPlanId = plan.id_plan;
    this.planTitulo = plan.titulo || '';
    this.planFechaInicio = this.toPgDate(plan.fecha_inicio);
    this.planFechaFin   = this.toPgDate(plan.fecha_fin);
       setTimeout(() => {
      document.querySelector('ion-input')?.setFocus?.();
      document.querySelector('ion-content')?.scrollToTop?.(300);
    });
  }

  async eliminarPlan(plan: any) {
    const alert = await this.alertCtrl.create({
      header: 'Eliminar plan',
      message: `¿Eliminar "${plan.titulo}"?`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Eliminar',
          role: 'destructive',
          handler: async () => {
            try {
              await this.db.deleteBy('plan_de_comidas', 'id_plan', plan.id_plan);
              if (this.selectedPlan?.id_plan === plan.id_plan) {
                this.selectedPlan = null;
                this.recetasDelPlan = [];
              }
              await this.cargarPlanes();
              this.toast('Plan eliminado');
            } catch (e: any) {
              console.error('eliminarPlan', e);
              this.toast(e?.message || 'Error al eliminar');
            }
          },
        },
      ],
    });
    await alert.present();
  }

  // ======== Detalle: plan_receta ========
  async verDetalle(plan: any) {
    this.selectedPlan = plan;
    await this.cargarRecetasDelPlan(plan.id_plan);
  }

  private async cargarRecetasDelPlan(id_plan: string) {
    try {
      const { data, error } = await supabase
        .from('plan_receta')
        .select('id_receta, tipo, receta:receta ( nombre )')
        .eq('id_plan', id_plan)
        .order('tipo', { ascending: true });

      if (error) throw error;

      this.recetasDelPlan = (data || []).map((row: any) => ({
        id_receta: row.id_receta,
        tipo: row.tipo,
        nombre: row.receta?.[0]?.nombre || row.receta?.nombre || '(sin nombre)',
      }));
    } catch (e) {
      console.error('cargarRecetasDelPlan', e);
      this.recetasDelPlan = [];
    }
  }

  async agregarRecetaAlPlan() {
    if (!this.selectedPlan) return this.toast('Seleccioná un plan');
    if (!this.nuevaRecetaId) return this.toast('Seleccioná una receta');

    const payload = {
      id_plan: this.selectedPlan.id_plan,
      id_receta: this.nuevaRecetaId,
      tipo: this.nuevaRecetaTipo,
    };

    try {
      await this.db.insert('plan_receta', payload);
      this.nuevaRecetaId = '';
      await this.cargarRecetasDelPlan(this.selectedPlan.id_plan);
      this.toast('Receta agregada');
    } catch (e: any) {
      console.error('agregarRecetaAlPlan', e);
      this.toast(e?.message || 'Error al agregar receta');
    }
  }

  async quitarRecetaDelPlan(item: any) {
    if (!this.selectedPlan) return;
    try {
      const { error } = await supabase
        .from('plan_receta')
        .delete()
        .match({
          id_plan: this.selectedPlan.id_plan,
          id_receta: item.id_receta,
          tipo: item.tipo,
        });
      if (error) throw error;

      await this.cargarRecetasDelPlan(this.selectedPlan.id_plan);
      this.toast('Receta quitada');
    } catch (e: any) {
      console.error('quitarRecetaDelPlan', e);
      this.toast(e?.message || 'Error al quitar receta');
    }
  }
}

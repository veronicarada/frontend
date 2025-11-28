import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ToastController } from '@ionic/angular';
import { DatabaseService } from 'src/app/services/database';

@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.page.html',
  styleUrls: ['./usuarios.page.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule],
})
export class UsuariosPage implements OnInit {
  usuarios: any[] = [];
  suscripciones: any[] = [];
  loading = true;

  // Form alta
  newUser = { nombre: '', email: '', contrasenia: '', telefono: '' };
  selectedPlanNew: string = ''; // plan inicial opcional

  // Estado por usuario
  activaPorUsuario: any = {};           // { [id_usuario]: { id_suscripcion, ... } | null }
  selectedPlanPorUsuario: any = {};     // { [id_usuario]: id_suscripcion }
  editMode: any = {};                   // { [id_usuario]: boolean }

  constructor(
    private databaseService: DatabaseService,
    private toast: ToastController
  ) {}

  async ngOnInit() {
    await this.loadSuscripciones();
    await this.loadUsuarios();
  }

  // ==========================
  // Helpers UI
  // ==========================
  planName(id: string | null | undefined) {
    if (!id) return '';
    const p = this.suscripciones.find((x: any) => x.id_suscripcion === id);
    return p ? p.nombre : '';
  }

  toggleEdit(userId: string) {
    this.editMode[userId] = !this.editMode[userId];
    if (this.editMode[userId] && !this.selectedPlanPorUsuario[userId]) {
      // precargar con la activa si existe
      this.selectedPlanPorUsuario[userId] = this.activaPorUsuario[userId]?.id_suscripcion || '';
    }
  }

  async toastOk(msg: string) {
    const t = await this.toast.create({ message: msg, duration: 1500, color: 'success' });
    await t.present();
  }
  async toastErr(msg: string) {
    const t = await this.toast.create({ message: msg, duration: 2000, color: 'danger' });
    await t.present();
  }

  // ==========================
  // Carga base
  // ==========================
  async loadSuscripciones() {
    const { data, error } = await this.databaseService.getSuscripciones();
    if (error) { console.error(error); return; }
    this.suscripciones = data || [];
  }

  async loadUsuarios() {
    try {
      this.loading = true;
      const { data, error } = await this.databaseService.getUsuarios();
      if (error) throw error;
      this.usuarios = data || [];

      // Suscripción activa por usuario
      for (const u of this.usuarios) {
        const { data: act } = await this.databaseService.getSuscripcionActiva(u.id_usuario);
        this.activaPorUsuario[u.id_usuario] = act || null;
        // no forzamos selectedPlanPorUsuario acá; se setea al abrir "Editar"
      }
    } catch (err) {
      console.error('Error al cargar los usuarios:', err);
    } finally {
      this.loading = false;
    }
  }

  // ==========================
  // Alta de usuario (con plan inicial opcional)
  // ==========================
  async addUser() {
    if (!this.newUser.nombre || !this.newUser.email || !this.newUser.contrasenia) {
      this.toastErr('Completá nombre, email y contraseña.');
      return;
    }

    try {
      const { data: u, error } = await this.databaseService.insertUsuario(this.newUser);
      if (error) throw error;

      // Si eligió plan inicial → activar
      if (u?.id_usuario && this.selectedPlanNew) {
        const planId = this.selectedPlanNew;
        // por si acaso no hay activa, no hace falta cerrar; si la hubiera, la cerramos
        await this.databaseService.cerrarSuscripcionActiva(u.id_usuario);
        const { error: e2 } = await this.databaseService.activarSuscripcion(u.id_usuario, planId);
        if (e2) throw e2;
      }

      // Reset form
      this.newUser = { nombre: '', email: '', contrasenia: '', telefono: '' };
      this.selectedPlanNew = '';

      await this.loadUsuarios();
      this.toastOk('Usuario agregado.');
    } catch (err: any) {
      console.error(err);
      this.toastErr(err?.message || 'Error al guardar.');
    }
  }

  // ==========================
  // Suscripciones (editar)
  // ==========================
  onPlanChange(userId: string, planId: string) {
    this.selectedPlanPorUsuario[userId] = planId;
  }

  async activarPlan(userId: string) {
    const plan = this.selectedPlanPorUsuario[userId];
    if (!plan) { this.toastErr('Elegí un plan.'); return; 
      if (this.activaPorUsuario[userId]?.id_suscripcion === plan) {
    this.toastOk('Ese plan ya está activo.');
    return;
  }
    }

    try {
      await this.databaseService.cerrarSuscripcionActiva(userId);
      const { error } = await this.databaseService.activarSuscripcion(userId, plan);
      if (error) throw error;

      const { data } = await this.databaseService.getSuscripcionActiva(userId);
      this.activaPorUsuario[userId] = data || null;

      this.toastOk('Suscripción actualizada.');
    } catch (err: any) {
      console.error(err);
      this.toastErr(err?.message || 'Error al actualizar suscripción.');
    }
  }

  async cerrarPlan(userId: string) {
    try {
      const { error } = await this.databaseService.cerrarSuscripcionActiva(userId);
      if (error) throw error;

      this.activaPorUsuario[userId] = null;
      this.selectedPlanPorUsuario[userId] = '';
      this.toastOk('Suscripción cerrada.');
    } catch (err: any) {
      console.error(err);
      this.toastErr(err?.message || 'No se pudo cerrar la suscripción.');
    }
  }
}

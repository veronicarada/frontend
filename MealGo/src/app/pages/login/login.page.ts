import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Auth } from 'src/app/services/auth';

import {
  IonContent,
  IonInput,
  IonItem,
  IonLabel,
  IonButton
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonContent,
    IonInput,
    IonItem,
    IonLabel,
    IonButton
  ]
})
export class LoginPage {
  email: string = '';
  password: string = '';
  errorMessage: string = '';

  constructor(private auth: Auth, private router: Router) {}

async login() {
  this.errorMessage = '';

  if (!this.email || !this.password) {
    this.errorMessage = 'Debés ingresar correo y contraseña.';
    return;
  }

  const { data, error } = await this.auth.login(this.email, this.password);

  if (error) {
    this.errorMessage = 'Correo o contraseña incorrectos.';
    console.error(error);
    return;
  }

  this.router.navigateByUrl('/tabs', { replaceUrl: true });
}
}

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { Auth } from 'src/app/services/auth';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    IonicModule  
  ]
})
export class LoginPage {
  email: string = '';
  password: string = '';
  errorMessage = '';

  constructor(private auth: Auth, private router: Router) {}

  async login() {
    const { data, error } = await this.auth.login(this.email, this.password);

    if (error) {
      this.errorMessage = error.message;
      console.error(error);
    } else {
      this.router.navigateByUrl('/tabs');
    }
  }
}

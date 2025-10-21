import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  // Necesitamos RouterModule para usar [routerLink] en el HTML
  imports: [CommonModule, IonicModule, RouterModule],
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
})
export class HomePage {}

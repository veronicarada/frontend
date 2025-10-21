import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Auth } from 'src/app/services/auth';


import {
  IonTabs,
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-tabs',
  standalone: true,
  templateUrl: './tabs.page.html',
  styleUrls: ['./tabs.page.scss'],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [
    CommonModule,
    RouterModule,
    IonTabs,
    IonTabBar,
    IonTabButton,
    IonIcon,
    IonLabel

  ]
})

export class TabsPage {
  constructor(private auth: Auth, private router: Router) {}

  async logoutDirect() {
    await this.auth.logout();
    this.router.navigateByUrl('/login');
  }

}

import { Routes } from '@angular/router';
import { TabsPage } from './tabs/tabs.page';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then(m => m.LoginPage)
  },
  {
    path: 'tabs',
    loadComponent: () => import('./tabs/tabs.page').then(m => m.TabsPage),
    children: [
      {
        path: 'despensa',
        loadComponent: () => import('./tabs/despensa/despensa.page').then(m => m.DespensaPage)
      },
       {
        path: 'recetas',
        loadComponent: () => import('./tabs/recetas/recetas.page').then(m => m.RecetasPage)
      },
      {
        path: 'plan',
        loadComponent: () => import('./tabs/plan/plan.page').then(m => m.PlanPage)
      },
      {
        path: 'tips',
        loadComponent: () => import('./tabs/tips/tips.page').then(m => m.TipsPage)
      },
      {
        path: 'home',
        loadComponent: () => import('./tabs/home/home.page').then(m => m.HomePage)
      },
      {
        path: 'capture',
        loadComponent: () => import('./tabs/capture/capture.page').then(m => m.CapturePage)
      },
      {
        path: 'stats',
        loadComponent: () => import('./tabs/stats/stats.page').then(m => m.StatsPage)
      },
      {
        path: 'profile',
        loadComponent: () => import('./tabs/profile/profile.page').then(m => m.ProfilePage)
      },
       {
        path: 'usuario',
        loadComponent: () => import('./tabs/usuario/usuario.page').then(m => m.UsuarioPage)
      },
      {
        path: '',
        redirectTo: 'home',
        pathMatch: 'full'
      }
    ]
  }, 
   { path: '**', redirectTo: 'login' }
];

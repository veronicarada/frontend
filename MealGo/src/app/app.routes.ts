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
      path: '',
      redirectTo: 'home',
      pathMatch: 'full'
    },
    {
      path: 'home',
      loadComponent: () => import('./tabs/home/home.page').then(m => m.HomePage)
    },
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
      path: 'usuario',
      loadComponent: () => import('./tabs/usuario/usuarios.page').then(m => m.UsuariosPage)
    }
  ]
},
   { path: '**', redirectTo: 'login' },
  {
    path: 'hola',
    loadComponent: () => import('./tabs/hola/hola.page').then( m => m.HolaPage)
  }
];

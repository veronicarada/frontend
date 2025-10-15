import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then(m => m.LoginPage)
  },

  {
    path: 'tabs',
    loadComponent: () =>
      import('./tabs/tabs.page').then(m => m.TabsPage),
    children: [
      {
        path: 'home',
        loadComponent: () =>
          import('./tabs/home/home.page').then(m => m.HomePage)
      },
    {
        path: 'recetas',
        loadComponent: () => import('./tabs/recetas/recetas.page').then(m => m.RecetasPage)
      },

      { path: '', redirectTo: 'recetas', pathMatch: 'full' }
    ]
  },
      {
        path: 'ingredientes',
        loadComponent: () =>
          import('./tabs/ingredientes/ingredientes.page').then(m => m.IngredientesPage)
      },
      {
        path: 'gastos',
        loadComponent: () =>
          import('./tabs/gastos/gastos.page').then(m => m.GastosPage)
      },
      {
        path: 'plus',
        loadComponent: () =>
          import('./tabs/plus/plus.page').then(m => m.PlusPage)
      },
      { path: '', redirectTo: 'home', pathMatch: 'full' }
    ]
  },

  // fallback
  { path: '**', redirectTo: 'login' }
];

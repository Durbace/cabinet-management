import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <main class="app-shell">
      <header class="mobile-topbar">
        <div class="logo-mark">CM</div>
        <div>
          <div class="logo-title">Cabinet Manager</div>
          <div class="logo-subtitle">aplicație mobilă PWA</div>
        </div>
      </header>

      <aside class="sidebar" aria-label="Navigare principală">
        <div class="logo">
          <div class="logo-mark">CM</div>
          <div>
            <div class="logo-title">Cabinet Manager</div>
            <div class="logo-subtitle">pacienți • programări • bani</div>
          </div>
        </div>

        <nav class="nav">
          <a routerLink="/dashboard" routerLinkActive="active">Dashboard</a>
          <a routerLink="/patients" routerLinkActive="active">Pacienți</a>
          <a routerLink="/appointments" routerLinkActive="active">Programări</a>
          <a routerLink="/payments" routerLinkActive="active">Încasări</a>
          <a routerLink="/expenses" routerLinkActive="active">Cheltuieli</a>
          <a routerLink="/reports" routerLinkActive="active">Rapoarte</a>
          <a routerLink="/services" routerLinkActive="active">Servicii</a>
        </nav>
      </aside>

      <section class="content">
        <router-outlet />
      </section>
    </main>
  `
})
export class AppComponent { }

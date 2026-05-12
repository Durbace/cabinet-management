import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CabinetStoreService } from '../cabinet-store.service';
import { formatRon, monthKey } from '../utils/date-utils';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <header class="page-header">
      <div>
        <h1 class="page-title">Dashboard</h1>
        <p class="page-description">
          Imagine rapidă asupra cabinetului: încasări, cheltuieli, programări și pacienți activi.
        </p>
      </div>
      <button class="secondary" (click)="store.resetDemoData()">Resetează date demo</button>
    </header>

    <section class="grid grid-4">
      <article class="card metric">
        <span class="metric-label">Încasări luna curentă</span>
        <strong class="metric-value">{{ money(store.dashboard().revenue) }}</strong>
        <span class="metric-note">Total plăți înregistrate luna aceasta</span>
      </article>
      <article class="card metric">
        <span class="metric-label">Cheltuieli luna curentă</span>
        <strong class="metric-value">{{ money(store.dashboard().expenses) }}</strong>
        <span class="metric-note">Consumabile, marketing, chirie etc.</span>
      </article>
      <article class="card metric">
        <span class="metric-label">Profit estimat</span>
        <strong class="metric-value">{{ money(store.dashboard().profit) }}</strong>
        <span class="metric-note">Încasări minus cheltuieli</span>
      </article>
      <article class="card metric">
        <span class="metric-label">Pacienți activi</span>
        <strong class="metric-value">{{ store.dashboard().activePatients }}</strong>
        <span class="metric-note">Pacienți marcați activi</span>
      </article>
    </section>

    <section class="grid grid-2" style="margin-top: 18px;">
      <article class="card">
        <h2>Programări azi</h2>
        @if (todayAppointments().length === 0) {
          <p class="empty">Nu există programări pentru astăzi.</p>
        } @else {
          <div class="desktop-table table-wrap">
            <table>
              <thead>
                <tr><th>Ora</th><th>Pacient</th><th>Serviciu</th><th>Status</th></tr>
              </thead>
              <tbody>
                @for (appointment of todayAppointments(); track appointment.id) {
                  <tr>
                    <td>{{ appointment.startTime }} - {{ appointment.endTime }}</td>
                    <td>{{ store.getPatientName(appointment.patientId) }}</td>
                    <td>{{ store.getService(appointment.serviceId)?.name }}</td>
                    <td><span class="badge info">{{ appointment.status }}</span></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="mobile-list">
            @for (appointment of todayAppointments(); track appointment.id) {
              <article class="mobile-card">
                <div class="mobile-card-header">
                  <div>
                    <div class="mobile-card-title">{{ store.getPatientName(appointment.patientId) }}</div>
                    <div class="mobile-card-subtitle">{{ appointment.startTime }} - {{ appointment.endTime }}</div>
                  </div>
                  <span class="badge info">{{ appointment.status }}</span>
                </div>
                <div class="mobile-card-grid">
                  <div class="mobile-field"><span>Serviciu</span><strong>{{ store.getService(appointment.serviceId)?.name }}</strong></div>
                  <div class="mobile-field"><span>Note</span><strong>{{ appointment.notes || '-' }}</strong></div>
                </div>
                <div class="mobile-card-actions">
                  <a class="button secondary full" [routerLink]="['/patients', appointment.patientId]">Detalii pacient</a>
                </div>
              </article>
            }
          </div>
        }
        <div class="actions" style="margin-top: 14px;">
          <a class="button secondary" routerLink="/appointments">Vezi programări</a>
        </div>
      </article>

      <article class="card">
        <h2>Încasări pe luni</h2>
        <div class="chart">
          @for (item of revenueByMonth(); track item.month) {
            <div class="chart-row">
              <strong>{{ item.month }}</strong>
              <div class="bar-track">
                <div class="bar-fill" [style.width.%]="barWidth(item.total, maxMonthlyRevenue())"></div>
              </div>
              <span>{{ money(item.total) }}</span>
            </div>
          }
        </div>
      </article>
    </section>

    <section class="grid grid-3" style="margin-top: 18px;">
      <article class="card metric">
        <span class="metric-label">Programări efectuate</span>
        <strong class="metric-value">{{ store.dashboard().completedAppointments }}</strong>
      </article>
      <article class="card metric">
        <span class="metric-label">Programări anulate</span>
        <strong class="metric-value">{{ store.dashboard().cancelledAppointments }}</strong>
      </article>
      <article class="card metric">
        <span class="metric-label">Neprezentări</span>
        <strong class="metric-value">{{ store.dashboard().noShowAppointments }}</strong>
      </article>
    </section>
  `
})
export class DashboardPageComponent {
  readonly store = inject(CabinetStoreService);

  readonly todayAppointments = computed(() => {
    const today = new Date().toISOString().slice(0, 10);
    return this.store.appointments()
      .filter((appointment) => appointment.date === today)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  readonly revenueByMonth = computed(() => {
    const totals = new Map<string, number>();
    for (const payment of this.store.payments()) {
      const key = monthKey(payment.date);
      totals.set(key, (totals.get(key) ?? 0) + payment.amount);
    }
    return [...totals.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, total]) => ({ month, total }));
  });

  readonly maxMonthlyRevenue = computed(() => Math.max(1, ...this.revenueByMonth().map((item) => item.total)));

  money(value: number): string {
    return formatRon(value);
  }

  barWidth(value: number, max: number): number {
    return Math.max(4, Math.round((value / max) * 100));
  }
}

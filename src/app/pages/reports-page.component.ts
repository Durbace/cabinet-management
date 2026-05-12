import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CabinetStoreService } from '../cabinet-store.service';
import { downloadCsv, formatRon, monthKey } from '../utils/date-utils';

interface MonthlyReportRow {
  month: string;
  revenue: number;
  expenses: number;
  profit: number;
  sessions: number;
  payments: number;
}

@Component({
  selector: 'app-reports-page',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="page-header">
      <div>
        <h1 class="page-title">Rapoarte</h1>
        <p class="page-description">
          Statistici utile pentru decizii: venituri pe luni, servicii populare, cheltuieli și profit estimat.
        </p>
      </div>
      <button class="secondary" (click)="exportMonthlyCsv()">Export raport lunar CSV</button>
    </header>

    <section class="grid grid-2">
      <article class="card">
        <h2>Profit estimat pe luni</h2>
        <div class="chart">
          @for (row of monthlyRows(); track row.month) {
            <div class="chart-row">
              <strong>{{ row.month }}</strong>
              <div class="bar-track">
                <div class="bar-fill" [style.width.%]="barWidth(row.profit, maxProfit())"></div>
              </div>
              <span>{{ money(row.profit) }}</span>
            </div>
          }
        </div>
      </article>

      <article class="card">
        <h2>Servicii după încasări</h2>
        <div class="chart">
          @for (item of serviceRevenue(); track item.service) {
            <div class="chart-row">
              <strong>{{ item.service }}</strong>
              <div class="bar-track">
                <div class="bar-fill" [style.width.%]="barWidth(item.total, maxServiceRevenue())"></div>
              </div>
              <span>{{ money(item.total) }}</span>
            </div>
          }
        </div>
      </article>
    </section>

    <section class="card" style="margin-top: 18px;">
      <h2>Raport lunar</h2>
      <div class="desktop-table table-wrap">
        <table>
          <thead>
            <tr><th>Luna</th><th>Încasări</th><th>Cheltuieli</th><th>Profit</th><th>Ședințe</th><th>Plăți</th></tr>
          </thead>
          <tbody>
            @for (row of monthlyRows(); track row.month) {
              <tr>
                <td><strong>{{ row.month }}</strong></td>
                <td>{{ money(row.revenue) }}</td>
                <td>{{ money(row.expenses) }}</td>
                <td><strong>{{ money(row.profit) }}</strong></td>
                <td>{{ row.sessions }}</td>
                <td>{{ row.payments }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <div class="mobile-list">
        @for (row of monthlyRows(); track row.month) {
          <article class="mobile-card">
            <div class="mobile-card-header">
              <div>
                <div class="mobile-card-title">{{ row.month }}</div>
                <div class="mobile-card-subtitle">{{ row.sessions }} ședințe • {{ row.payments }} plăți</div>
              </div>
              <span class="badge" [class.success]="row.profit >= 0" [class.danger]="row.profit < 0">{{ money(row.profit) }}</span>
            </div>
            <div class="mobile-card-grid">
              <div class="mobile-field"><span>Încasări</span><strong>{{ money(row.revenue) }}</strong></div>
              <div class="mobile-field"><span>Cheltuieli</span><strong>{{ money(row.expenses) }}</strong></div>
              <div class="mobile-field"><span>Profit</span><strong>{{ money(row.profit) }}</strong></div>
              <div class="mobile-field"><span>Activitate</span><strong>{{ row.sessions }} ședințe</strong></div>
            </div>
          </article>
        }
      </div>
    </section>
  `
})
export class ReportsPageComponent {
  readonly store = inject(CabinetStoreService);

  readonly monthlyRows = computed<MonthlyReportRow[]>(() => {
    const months = new Set<string>();
    this.store.payments().forEach((payment) => months.add(monthKey(payment.date)));
    this.store.expenses().forEach((expense) => months.add(monthKey(expense.date)));
    this.store.sessions().forEach((session) => months.add(monthKey(session.date)));

    return [...months].sort().map((month) => {
      const revenue = this.store.payments()
        .filter((payment) => monthKey(payment.date) === month)
        .reduce((sum, payment) => sum + payment.amount, 0);
      const expenses = this.store.expenses()
        .filter((expense) => monthKey(expense.date) === month)
        .reduce((sum, expense) => sum + expense.amount, 0);
      const sessions = this.store.sessions().filter((session) => monthKey(session.date) === month).length;
      const payments = this.store.payments().filter((payment) => monthKey(payment.date) === month).length;

      return { month, revenue, expenses, profit: revenue - expenses, sessions, payments };
    });
  });

  readonly serviceRevenue = computed(() => {
    const totals = new Map<string, number>();
    for (const payment of this.store.payments()) {
      const serviceName = this.store.getService(payment.serviceId)?.name ?? 'Fără serviciu';
      totals.set(serviceName, (totals.get(serviceName) ?? 0) + payment.amount);
    }
    return [...totals.entries()]
      .map(([service, total]) => ({ service, total }))
      .sort((a, b) => b.total - a.total);
  });

  readonly maxProfit = computed(() => Math.max(1, ...this.monthlyRows().map((row) => Math.max(0, row.profit))));
  readonly maxServiceRevenue = computed(() => Math.max(1, ...this.serviceRevenue().map((item) => item.total)));

  barWidth(value: number, max: number): number {
    return Math.max(4, Math.round((Math.max(0, value) / max) * 100));
  }

  money(value: number): string {
    return formatRon(value);
  }

  exportMonthlyCsv(): void {
    downloadCsv('raport-lunar.csv', this.monthlyRows().map((row) => ({
      luna: row.month,
      incasari: row.revenue,
      cheltuieli: row.expenses,
      profit: row.profit,
      sedinte: row.sessions,
      plati: row.payments
    })));
  }
}

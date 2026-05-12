import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CabinetStoreService } from '../cabinet-store.service';
import { Payment } from '../models';
import { downloadCsv, formatRon, todayIso } from '../utils/date-utils';

@Component({
  selector: 'app-payments-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <header class="page-header">
      <div>
        <h1 class="page-title">Încasări</h1>
        <p class="page-description">Înregistrează plăți și vezi rapid totalul încasărilor.</p>
      </div>
      <button class="secondary" (click)="exportCsv()">Export CSV</button>
    </header>

    <section class="grid grid-3">
      <article class="card metric">
        <span class="metric-label">Total încasat</span>
        <strong class="metric-value">{{ money(totalRevenue()) }}</strong>
      </article>
      <article class="card metric">
        <span class="metric-label">Plăți numerar</span>
        <strong class="metric-value">{{ money(totalByMethod('cash')) }}</strong>
      </article>
      <article class="card metric">
        <span class="metric-label">Plăți card / transfer</span>
        <strong class="metric-value">{{ money(totalByMethod('card') + totalByMethod('bankTransfer')) }}</strong>
      </article>
    </section>

    <section class="grid grid-2" style="margin-top: 18px;">
      <article class="card form-card">
        <h2>Adaugă plată</h2>
        <form [formGroup]="form" (ngSubmit)="addPayment()" class="form-grid">
          <div class="form-field">
            <label>Pacient *</label>
            <select formControlName="patientId">
              <option value="">Alege pacient</option>
              @for (patient of store.patients(); track patient.id) {
                <option [value]="patient.id">{{ patient.firstName }} {{ patient.lastName }}</option>
              }
            </select>
          </div>
          <div class="form-field">
            <label>Serviciu</label>
            <select formControlName="serviceId">
              <option value="">Fără serviciu</option>
              @for (service of store.services(); track service.id) {
                <option [value]="service.id">{{ service.name }}</option>
              }
            </select>
          </div>
          <div class="form-field">
            <label>Sumă *</label>
            <input type="number" min="0" formControlName="amount" />
          </div>
          <div class="form-field">
            <label>Metodă *</label>
            <select formControlName="method">
              <option value="cash">Numerar</option>
              <option value="card">Card</option>
              <option value="bankTransfer">Transfer</option>
            </select>
          </div>
          <div class="form-field">
            <label>Data *</label>
            <input type="date" formControlName="date" />
          </div>
          <div class="form-field full">
            <label>Note</label>
            <textarea formControlName="notes"></textarea>
          </div>
          <div class="actions full">
            <button type="submit" [disabled]="form.invalid">Adaugă plată</button>
          </div>
        </form>
      </article>

      <article class="card list-card">
        <div class="toolbar">
          <div>
            <h2 style="margin-bottom: 4px;">Lista plăților</h2>
            <span class="muted">{{ filteredPayments().length }} plăți</span>
          </div>
          <input class="search" [value]="query()" (input)="query.set($any($event.target).value)" placeholder="Caută pacient, serviciu..." />
        </div>

        <div class="desktop-table table-wrap">
          <table>
            <thead><tr><th>Data</th><th>Pacient</th><th>Serviciu</th><th>Sumă</th><th>Metodă</th><th></th></tr></thead>
            <tbody>
              @for (payment of filteredPayments(); track payment.id) {
                <tr>
                  <td>{{ payment.date }}</td>
                  <td><a [routerLink]="['/patients', payment.patientId]"><strong>{{ store.getPatientName(payment.patientId) }}</strong></a></td>
                  <td>{{ store.getService(payment.serviceId)?.name || '-' }}</td>
                  <td><strong>{{ money(payment.amount) }}</strong></td>
                  <td>{{ payment.method }}</td>
                  <td><button class="danger" (click)="store.deletePayment(payment.id)">Șterge</button></td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="mobile-list">
          @for (payment of filteredPayments(); track payment.id) {
            <article class="mobile-card">
              <div class="mobile-card-header">
                <div>
                  <div class="mobile-card-title">{{ money(payment.amount) }}</div>
                  <div class="mobile-card-subtitle">{{ payment.date }} • {{ payment.method }}</div>
                </div>
                <span class="badge success">Plată</span>
              </div>

              <div class="mobile-card-grid">
                <div class="mobile-field"><span>Pacient</span><a [routerLink]="['/patients', payment.patientId]"><strong>{{ store.getPatientName(payment.patientId) }}</strong></a></div>
                <div class="mobile-field"><span>Serviciu</span><strong>{{ store.getService(payment.serviceId)?.name || '-' }}</strong></div>
                <div class="mobile-field"><span>Note</span><strong>{{ payment.notes || '-' }}</strong></div>
              </div>

              <div class="mobile-card-actions">
                <a class="button secondary" [routerLink]="['/patients', payment.patientId]">Pacient</a>
                <button class="danger" (click)="store.deletePayment(payment.id)">Șterge</button>
              </div>
            </article>
          }
        </div>
      </article>
    </section>
  `
})
export class PaymentsPageComponent {
  private readonly fb = inject(FormBuilder);
  readonly store = inject(CabinetStoreService);
  readonly query = signal('');

  readonly form = this.fb.nonNullable.group({
    patientId: ['', Validators.required],
    serviceId: [''],
    amount: [0, [Validators.required, Validators.min(1)]],
    method: ['cash' as Payment['method'], Validators.required],
    date: [todayIso(), Validators.required],
    notes: ['']
  });

  readonly filteredPayments = computed(() => {
    const q = this.query().trim().toLowerCase();
    const payments = [...this.store.payments()].sort((a, b) => b.date.localeCompare(a.date));
    if (!q) return payments;
    return payments.filter((payment) =>
      `${payment.date} ${payment.method} ${payment.amount} ${this.store.getPatientName(payment.patientId)} ${this.store.getService(payment.serviceId)?.name ?? ''}`
        .toLowerCase()
        .includes(q)
    );
  });

  readonly totalRevenue = computed(() => this.store.payments().reduce((sum, payment) => sum + payment.amount, 0));

  totalByMethod(method: Payment['method']): number {
    return this.store.payments().filter((payment) => payment.method === method).reduce((sum, payment) => sum + payment.amount, 0);
  }

  addPayment(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.store.addPayment({
      patientId: value.patientId,
      serviceId: value.serviceId || undefined,
      amount: Number(value.amount),
      method: value.method,
      date: value.date,
      notes: value.notes || undefined
    });
    this.form.reset({
      patientId: '',
      serviceId: '',
      amount: 0,
      method: 'cash',
      date: todayIso(),
      notes: ''
    });
  }

  exportCsv(): void {
    downloadCsv('incasari.csv', this.store.payments().map((payment) => ({
      data: payment.date,
      pacient: this.store.getPatientName(payment.patientId),
      serviciu: this.store.getService(payment.serviceId)?.name ?? '',
      suma: payment.amount,
      metoda: payment.method,
      note: payment.notes ?? ''
    })));
  }

  money(value: number): string {
    return formatRon(value);
  }
}

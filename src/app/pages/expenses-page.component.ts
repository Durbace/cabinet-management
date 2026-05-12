import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CabinetStoreService } from '../cabinet-store.service';
import { downloadCsv, formatRon, todayIso } from '../utils/date-utils';

@Component({
  selector: 'app-expenses-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <header class="page-header">
      <div>
        <h1 class="page-title">Cheltuieli</h1>
        <p class="page-description">Ține evidența costurilor: consumabile, chirie, reclame, cursuri sau alte cheltuieli.</p>
      </div>
      <button class="secondary" (click)="exportCsv()">Export CSV</button>
    </header>

    <section class="grid grid-3">
      <article class="card metric">
        <span class="metric-label">Total cheltuieli</span>
        <strong class="metric-value">{{ money(totalExpenses()) }}</strong>
      </article>
      <article class="card metric">
        <span class="metric-label">Categorii</span>
        <strong class="metric-value">{{ categoriesCount() }}</strong>
      </article>
      <article class="card metric">
        <span class="metric-label">Media cheltuielilor</span>
        <strong class="metric-value">{{ money(avgExpense()) }}</strong>
      </article>
    </section>

    <section class="grid grid-2" style="margin-top: 18px;">
      <article class="card form-card">
        <h2>Adaugă cheltuială</h2>
        <form [formGroup]="form" (ngSubmit)="addExpense()" class="form-grid">
          <div class="form-field">
            <label>Categorie *</label>
            <input formControlName="category" placeholder="ex: Consumabile" />
          </div>
          <div class="form-field">
            <label>Sumă *</label>
            <input type="number" min="0" formControlName="amount" />
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
            <button type="submit" [disabled]="form.invalid">Adaugă cheltuială</button>
          </div>
        </form>
      </article>

      <article class="card list-card">
        <div class="toolbar">
          <div>
            <h2 style="margin-bottom: 4px;">Lista cheltuielilor</h2>
            <span class="muted">{{ filteredExpenses().length }} cheltuieli</span>
          </div>
          <input class="search" [value]="query()" (input)="query.set($any($event.target).value)" placeholder="Caută categorie..." />
        </div>

        <div class="desktop-table table-wrap">
          <table>
            <thead><tr><th>Data</th><th>Categorie</th><th>Sumă</th><th>Note</th><th></th></tr></thead>
            <tbody>
              @for (expense of filteredExpenses(); track expense.id) {
                <tr>
                  <td>{{ expense.date }}</td>
                  <td>{{ expense.category }}</td>
                  <td><strong>{{ money(expense.amount) }}</strong></td>
                  <td>{{ expense.notes || '-' }}</td>
                  <td><button class="danger" (click)="store.deleteExpense(expense.id)">Șterge</button></td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="mobile-list">
          @for (expense of filteredExpenses(); track expense.id) {
            <article class="mobile-card">
              <div class="mobile-card-header">
                <div>
                  <div class="mobile-card-title">{{ money(expense.amount) }}</div>
                  <div class="mobile-card-subtitle">{{ expense.date }}</div>
                </div>
                <span class="badge warning">{{ expense.category }}</span>
              </div>

              <div class="mobile-card-grid">
                <div class="mobile-field"><span>Categorie</span><strong>{{ expense.category }}</strong></div>
                <div class="mobile-field"><span>Note</span><strong>{{ expense.notes || '-' }}</strong></div>
              </div>

              <div class="mobile-card-actions">
                <button class="danger full" (click)="store.deleteExpense(expense.id)">Șterge</button>
              </div>
            </article>
          }
        </div>
      </article>
    </section>
  `
})
export class ExpensesPageComponent {
  private readonly fb = inject(FormBuilder);
  readonly store = inject(CabinetStoreService);
  readonly query = signal('');

  readonly form = this.fb.nonNullable.group({
    category: ['', Validators.required],
    amount: [0, [Validators.required, Validators.min(1)]],
    date: [todayIso(), Validators.required],
    notes: ['']
  });

  readonly filteredExpenses = computed(() => {
    const q = this.query().trim().toLowerCase();
    const expenses = [...this.store.expenses()].sort((a, b) => b.date.localeCompare(a.date));
    if (!q) return expenses;
    return expenses.filter((expense) => `${expense.date} ${expense.category} ${expense.amount} ${expense.notes ?? ''}`.toLowerCase().includes(q));
  });

  readonly totalExpenses = computed(() => this.store.expenses().reduce((sum, expense) => sum + expense.amount, 0));
  readonly categoriesCount = computed(() => new Set(this.store.expenses().map((expense) => expense.category)).size);
  readonly avgExpense = computed(() => this.store.expenses().length ? this.totalExpenses() / this.store.expenses().length : 0);

  addExpense(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    this.store.addExpense({
      category: value.category,
      amount: Number(value.amount),
      date: value.date,
      notes: value.notes || undefined
    });
    this.form.reset({ category: '', amount: 0, date: todayIso(), notes: '' });
  }

  exportCsv(): void {
    downloadCsv('cheltuieli.csv', this.store.expenses().map((expense) => ({
      data: expense.date,
      categorie: expense.category,
      suma: expense.amount,
      note: expense.notes ?? ''
    })));
  }

  money(value: number): string {
    return formatRon(value);
  }
}

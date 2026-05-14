import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { CabinetStoreService } from '../cabinet-store.service';
import { formatRon, todayIso } from '../utils/date-utils';


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
      <button class="secondary" (click)="exportPdf()">Export PDF</button>
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
                  <td><button class="danger" (click)="deleteExpense(expense.id)">Șterge</button></td>
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
                <button class="danger full" (click)="deleteExpense(expense.id)">Șterge</button>
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

  deleteExpense(id: string): void {
    const confirmed = window.confirm('Sigur vrei să ștergi această cheltuială?');

    if (!confirmed) return;

    this.store.deleteExpense(id);
  }

  async exportPdf(): Promise<void> {
    const expenses = this.filteredExpenses();

    if (expenses.length === 0) {
      alert('Nu există cheltuieli de exportat.');
      return;
    }

    const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const generatedAt = new Date().toLocaleString('ro-RO');

    const rowsHtml = expenses.map((expense) => `
    <article class="expense-card">
      <div class="expense-top">
        <div>
          <div class="expense-category">${this.escapeHtml(expense.category)}</div>
          <div class="expense-date">${this.escapeHtml(expense.date)}</div>
        </div>
        <div class="expense-amount">${this.escapeHtml(this.money(expense.amount))}</div>
      </div>

      <div class="expense-notes">
        <strong>Note:</strong> ${this.escapeHtml(expense.notes || '-')}
      </div>
    </article>
  `).join('');

    const element = document.createElement('div');

    element.innerHTML = `
    <style>
      * {
        box-sizing: border-box;
      }

      body {
        font-family: Arial, sans-serif;
      }

      .report {
        width: 100%;
        padding: 20px;
        background: #f4f7fb;
        color: #172033;
        font-family: Arial, sans-serif;
      }

      .header {
        background: #0f172a;
        color: white;
        padding: 22px;
        border-radius: 18px;
        margin-bottom: 18px;
      }

      .header h1 {
        margin: 0 0 8px;
        font-size: 28px;
      }

      .header p {
        margin: 0;
        color: #cbd5e1;
        font-size: 14px;
      }

      .summary {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
        margin-bottom: 18px;
      }

      .summary-card {
        background: white;
        border: 1px solid #d9e2ec;
        border-radius: 16px;
        padding: 16px;
      }

      .summary-card span {
        display: block;
        color: #667085;
        font-size: 13px;
        font-weight: 700;
        margin-bottom: 6px;
      }

      .summary-card strong {
        font-size: 22px;
      }

      .expense-card {
        background: white;
        border: 1px solid #d9e2ec;
        border-radius: 16px;
        padding: 16px;
        margin-bottom: 12px;
        page-break-inside: avoid;
      }

      .expense-top {
        display: flex;
        justify-content: space-between;
        gap: 12px;
        align-items: flex-start;
      }

      .expense-category {
        font-size: 18px;
        font-weight: 800;
      }

      .expense-date {
        color: #667085;
        font-size: 13px;
        margin-top: 4px;
      }

      .expense-amount {
        font-size: 20px;
        font-weight: 900;
        white-space: nowrap;
      }

      .expense-notes {
        margin-top: 12px;
        padding-top: 12px;
        border-top: 1px solid #e5e7eb;
        color: #344054;
        line-height: 1.45;
      }
    </style>

    <main class="report">
      <section class="header">
        <h1>Raport cheltuieli</h1>
        <p>Generat la: ${this.escapeHtml(generatedAt)}</p>
      </section>

      <section class="summary">
        <article class="summary-card">
          <span>Total cheltuieli</span>
          <strong>${this.escapeHtml(this.money(total))}</strong>
        </article>

        <article class="summary-card">
          <span>Număr cheltuieli</span>
          <strong>${expenses.length}</strong>
        </article>

        <article class="summary-card">
          <span>Media cheltuielilor</span>
          <strong>${this.escapeHtml(this.money(expenses.length ? total / expenses.length : 0))}</strong>
        </article>
      </section>

      ${rowsHtml}
    </main>
  `;

    document.body.appendChild(element);

    const fileName = `raport-cheltuieli-${todayIso()}.pdf`;
    const html2pdfModule = await import('html2pdf.js');
    const html2pdf = html2pdfModule.default;

    html2pdf()
      .set({
        margin: 10,
        filename: fileName,
        image: {
          type: 'jpeg',
          quality: 0.98
        },
        html2canvas: {
          scale: 2
        },
        jsPDF: {
          unit: 'mm',
          format: 'a4',
          orientation: 'portrait'
        }
      })
      .from(element)
      .save()
      .then(() => {
        document.body.removeChild(element);
      });
  }

  private escapeHtml(value: unknown): string {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  money(value: number): string {
    return formatRon(value);
  }
}

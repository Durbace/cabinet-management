import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CabinetStoreService } from '../cabinet-store.service';
import { ServiceType } from '../models';

@Component({
  selector: 'app-services-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <header class="page-header">
      <div>
        <h1 class="page-title">Servicii</h1>
        <p class="page-description">
          Adaugă serviciile pe care le folosești în cabinet. Acestea vor apărea apoi în programări, ședințe și încasări.
        </p>
      </div>
    </header>

    <section class="grid grid-2">
      <article class="card form-card">
        <h2>{{ editingId() ? 'Editează serviciu' : 'Adaugă serviciu' }}</h2>

        @if (message()) {
          <p class="badge danger">{{ message() }}</p>
        }

        <form [formGroup]="form" (ngSubmit)="saveService()" class="form-grid">
          <div class="form-field full">
            <label>Nume serviciu *</label>
            <input formControlName="name" placeholder="ex: Osteopatie" />
          </div>

          <div class="actions full">
            <button type="submit" [disabled]="form.invalid">Salvează</button>

            @if (editingId()) {
              <button type="button" class="secondary" (click)="cancelEdit()">Renunță</button>
            }
          </div>
        </form>
      </article>

      <article class="card list-card">
        <div class="toolbar">
          <div>
            <h2 style="margin-bottom: 4px;">Lista serviciilor</h2>
            <span class="muted">{{ services().length }} servicii</span>
          </div>
        </div>

        @if (services().length === 0) {
          <p class="empty">Nu există servicii adăugate.</p>
        } @else {
          <div class="desktop-table table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Serviciu</th>
                  <th>Acțiuni</th>
                </tr>
              </thead>
              <tbody>
                @for (service of services(); track service.id) {
                  <tr>
                    <td><strong>{{ service.name }}</strong></td>
                    <td>
                      <div class="actions">
                        <button class="secondary" (click)="editService(service)">Edit</button>
                        <button class="danger" (click)="deleteService(service.id)">Șterge</button>
                      </div>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>

          <div class="mobile-list">
            @for (service of services(); track service.id) {
              <article class="mobile-card">
                <div class="mobile-card-header">
                  <div>
                    <div class="mobile-card-title">{{ service.name }}</div>
                    <div class="mobile-card-subtitle">Serviciu cabinet</div>
                  </div>
                </div>

                <div class="mobile-card-actions">
                  <button class="secondary" (click)="editService(service)">Edit</button>
                  <button class="danger" (click)="deleteService(service.id)">Șterge</button>
                </div>
              </article>
            }
          </div>
        }
      </article>
    </section>
  `
})
export class ServicesPageComponent {
  private readonly fb = inject(FormBuilder);
  readonly store = inject(CabinetStoreService);

  readonly editingId = signal<string | null>(null);
  readonly message = signal('');

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(2)]]
  });

  readonly services = computed(() =>
    [...this.store.services()].sort((a, b) => a.name.localeCompare(b.name))
  );

  saveService(): void {
    if (this.form.invalid) return;

    const value = this.form.getRawValue();

    this.store.upsertService({
      id: this.editingId() ?? undefined,
      name: value.name.trim()
    });

    this.message.set('');
    this.cancelEdit();
  }

  editService(service: ServiceType): void {
    this.editingId.set(service.id);
    this.message.set('');

    this.form.patchValue({
      name: service.name
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.editingId.set(null);

    this.form.reset({
      name: ''
    });
  }

  deleteService(id: string): void {
    const confirmed = window.confirm('Sigur vrei să ștergi acest serviciu?');

    if (!confirmed) return;

    const result = this.store.deleteService(id);

    if (!result.ok) {
      this.message.set(result.message);
      return;
    }

    this.message.set('');
  }
}
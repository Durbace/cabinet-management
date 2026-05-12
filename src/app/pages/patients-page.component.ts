import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CabinetStoreService } from '../cabinet-store.service';
import { Patient } from '../models';
import { calcAge } from '../utils/date-utils';

@Component({
  selector: 'app-patients-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <header class="page-header">
      <div>
        <h1 class="page-title">Pacienți</h1>
        <p class="page-description">
          Adaugă date de contact, problema principală, zona afectată și observații. Pentru GitHub folosește doar date false.
        </p>
      </div>
    </header>

    <section class="grid grid-2">
      <article class="card form-card">
        <h2>{{ editingId() ? 'Editează pacient' : 'Adaugă pacient' }}</h2>
        <form [formGroup]="form" (ngSubmit)="savePatient()" class="form-grid">
          <div class="form-field">
            <label>Prenume *</label>
            <input formControlName="firstName" placeholder="ex: Andrei" />
          </div>
          <div class="form-field">
            <label>Nume *</label>
            <input formControlName="lastName" placeholder="ex: Popescu" />
          </div>
          <div class="form-field">
            <label>Telefon *</label>
            <input formControlName="phone" placeholder="07..." />
          </div>
          <div class="form-field">
            <label>Email</label>
            <input formControlName="email" type="email" placeholder="email@example.com" />
          </div>
          <div class="form-field">
            <label>Data nașterii</label>
            <input formControlName="birthDate" type="date" />
          </div>
          <div class="form-field">
            <label>Status</label>
            <select formControlName="status">
              <option value="active">Activ</option>
              <option value="inactive">Inactiv</option>
            </select>
          </div>
          <div class="form-field">
            <label>Problema principală</label>
            <input formControlName="mainComplaint" placeholder="ex: durere lombară" />
          </div>
          <div class="form-field">
            <label>Zonă</label>
            <input formControlName="problemArea" placeholder="ex: lombar, cervical, umăr" />
          </div>
          <div class="form-field">
            <label>Durere 0-10</label>
            <input formControlName="painLevel" type="number" min="0" max="10" />
          </div>
          <div class="form-field">
            <label>De când?</label>
            <input formControlName="symptomStartDate" type="date" />
          </div>
          <div class="form-field full">
            <label>Simptome / observații problemă</label>
            <textarea formControlName="symptoms" placeholder="Descriere scurtă"></textarea>
          </div>
          <div class="form-field full">
            <label>Note interne</label>
            <textarea formControlName="notes" placeholder="Observații generale"></textarea>
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
            <h2 style="margin-bottom: 4px;">Lista pacienților</h2>
            <span class="muted">{{ filteredPatients().length }} pacienți afișați</span>
          </div>
          <input class="search" [value]="query()" (input)="query.set($any($event.target).value)" placeholder="Caută nume, telefon, problemă..." />
        </div>

        <div class="desktop-table table-wrap">
          <table>
            <thead>
              <tr>
                <th>Pacient</th><th>Contact</th><th>Problemă</th><th>Status</th><th>Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              @for (patient of filteredPatients(); track patient.id) {
                <tr>
                  <td>
                    <strong>{{ patient.firstName }} {{ patient.lastName }}</strong><br />
                    <span class="muted">{{ age(patient.birthDate) ?? '-' }} ani</span>
                  </td>
                  <td>{{ patient.phone }}<br /><span class="muted">{{ patient.email || '-' }}</span></td>
                  <td>{{ patient.mainComplaint || '-' }}<br /><span class="muted">{{ patient.problemArea || '' }}</span></td>
                  <td><span class="badge" [class.success]="patient.status === 'active'">{{ patient.status }}</span></td>
                  <td>
                    <div class="actions">
                      <a class="button secondary" [routerLink]="['/patients', patient.id]">Detalii</a>
                      <button class="secondary" (click)="editPatient(patient)">Edit</button>
                      <button class="danger" (click)="deletePatient(patient.id)">Șterge</button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="mobile-list">
          @for (patient of filteredPatients(); track patient.id) {
            <article class="mobile-card">
              <div class="mobile-card-header">
                <div>
                  <div class="mobile-card-title">{{ patient.firstName }} {{ patient.lastName }}</div>
                  <div class="mobile-card-subtitle">{{ age(patient.birthDate) ?? '-' }} ani • {{ patient.phone }}</div>
                </div>
                <span class="badge" [class.success]="patient.status === 'active'">{{ patient.status }}</span>
              </div>

              <div class="mobile-card-grid">
                <div class="mobile-field"><span>Problemă</span><strong>{{ patient.mainComplaint || '-' }}</strong></div>
                <div class="mobile-field"><span>Zonă</span><strong>{{ patient.problemArea || '-' }}</strong></div>
                <div class="mobile-field"><span>Email</span><strong>{{ patient.email || '-' }}</strong></div>
                <div class="mobile-field"><span>Durere</span><strong>{{ patient.painLevel ?? '-' }}/10</strong></div>
              </div>

              <div class="mobile-card-actions">
                <a class="button secondary" [routerLink]="['/patients', patient.id]">Detalii</a>
                <a class="button secondary" [href]="'tel:' + patient.phone">Sună</a>
                <button class="secondary" (click)="editPatient(patient)">Edit</button>
                <button class="danger" (click)="deletePatient(patient.id)">Șterge</button>
              </div>
            </article>
          }
        </div>
      </article>
    </section>
  `
})
export class PatientsPageComponent {
  private readonly fb = inject(FormBuilder);
  readonly store = inject(CabinetStoreService);
  readonly query = signal('');
  readonly editingId = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.minLength(2)]],
    lastName: ['', [Validators.required, Validators.minLength(2)]],
    phone: ['', [Validators.required, Validators.minLength(8)]],
    email: ['', [Validators.email]],
    birthDate: [''],
    gender: [''],
    status: ['active' as Patient['status'], [Validators.required]],
    mainComplaint: [''],
    problemArea: [''],
    symptoms: [''],
    painLevel: [null as number | null, [Validators.min(0), Validators.max(10)]],
    symptomStartDate: [''],
    notes: ['']
  });

  readonly filteredPatients = computed(() => {
    const q = this.query().trim().toLowerCase();
    const patients = this.store.patients();
    if (!q) return patients;
    return patients.filter((patient) =>
      `${patient.firstName} ${patient.lastName} ${patient.phone} ${patient.email ?? ''} ${patient.mainComplaint ?? ''} ${patient.problemArea ?? ''}`
        .toLowerCase()
        .includes(q)
    );
  });

  savePatient(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();

    this.store.upsertPatient({
      id: this.editingId() ?? undefined,
      firstName: value.firstName,
      lastName: value.lastName,
      phone: value.phone,
      email: value.email || undefined,
      birthDate: value.birthDate || undefined,
      gender: value.gender ? (value.gender as Patient['gender']) : undefined,
      status: value.status,
      mainComplaint: value.mainComplaint || undefined,
      problemArea: value.problemArea || undefined,
      symptoms: value.symptoms || undefined,
      painLevel: value.painLevel ?? undefined,
      symptomStartDate: value.symptomStartDate || undefined,
      notes: value.notes || undefined
    });

    this.cancelEdit();
  }

  editPatient(patient: Patient): void {
    this.editingId.set(patient.id);
    this.form.patchValue({
      firstName: patient.firstName,
      lastName: patient.lastName,
      phone: patient.phone,
      email: patient.email ?? '',
      birthDate: patient.birthDate ?? '',
      gender: patient.gender ?? '',
      status: patient.status,
      mainComplaint: patient.mainComplaint ?? '',
      problemArea: patient.problemArea ?? '',
      symptoms: patient.symptoms ?? '',
      painLevel: patient.painLevel ?? null,
      symptomStartDate: patient.symptomStartDate ?? '',
      notes: patient.notes ?? ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  cancelEdit(): void {
    this.editingId.set(null);
    this.form.reset({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      birthDate: '',
      gender: '',
      status: 'active',
      mainComplaint: '',
      problemArea: '',
      symptoms: '',
      painLevel: null,
      symptomStartDate: '',
      notes: ''
    });
  }

  deletePatient(id: string): void {
    if (confirm('Ștergi pacientul și istoricul lui?')) {
      this.store.deletePatient(id);
    }
  }

  age(birthDate?: string): number | null {
    return calcAge(birthDate);
  }
}

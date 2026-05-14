import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CabinetStoreService } from '../cabinet-store.service';
import { Appointment } from '../models';
import { todayIso } from '../utils/date-utils';

@Component({
  selector: 'app-appointments-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <header class="page-header">
      <div>
        <h1 class="page-title">Programări</h1>
        <p class="page-description">
          Creează programări și marchează-le ca efectuate, anulate sau neprezentate. Aplicația verifică suprapunerea pe aceeași oră.
        </p>
      </div>
    </header>

    <section class="grid grid-2">
      <article class="card form-card">
        <h2>Adaugă programare</h2>
        @if (message()) {
          <p class="badge danger">{{ message() }}</p>
        }
        <form [formGroup]="form" (ngSubmit)="addAppointment()" class="form-grid">
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
            <label>Serviciu *</label>
            <select formControlName="serviceId">
              @for (service of store.services(); track service.id) {
                <option [value]="service.id">{{ service.name }} - {{ service.durationMinutes }} min</option>
              }
            </select>
          </div>
          <div class="form-field">
            <label>Data *</label>
            <input type="date" formControlName="date" />
          </div>
          <div class="form-field">
            <label>Ora început *</label>
            <input type="time" formControlName="startTime" />
          </div>
          <div class="form-field">
            <label>Ora final *</label>
            <input type="time" formControlName="endTime" />
          </div>
          <div class="form-field">
            <label>Status</label>
            <select formControlName="status">
              <option value="scheduled">Programat</option>
              <option value="completed">Efectuat</option>
              <option value="cancelled">Anulat</option>
              <option value="noShow">Nu s-a prezentat</option>
            </select>
          </div>
          <div class="form-field full">
            <label>Note</label>
            <textarea formControlName="notes"></textarea>
          </div>
          <div class="actions full">
            <button type="submit" [disabled]="form.invalid">Adaugă programare</button>
          </div>
        </form>
      </article>

      <article class="card list-card">
        <div class="toolbar">
          <div>
            <h2 style="margin-bottom: 4px;">Lista programărilor</h2>
            <span class="muted">{{ filteredAppointments().length }} rezultate</span>
          </div>
          <input class="search" [value]="query()" (input)="query.set($any($event.target).value)" placeholder="Caută pacient/status..." />
        </div>

        <div class="desktop-table table-wrap">
          <table>
            <thead>
              <tr><th>Data</th><th>Ora</th><th>Pacient</th><th>Serviciu</th><th>Status</th><th>Acțiuni</th></tr>
            </thead>
            <tbody>
              @for (appointment of filteredAppointments(); track appointment.id) {
                <tr>
                  <td>{{ appointment.date }}</td>
                  <td>{{ appointment.startTime }} - {{ appointment.endTime }}</td>
                  <td><a [routerLink]="['/patients', appointment.patientId]"><strong>{{ store.getPatientName(appointment.patientId) }}</strong></a></td>
                  <td>{{ store.getService(appointment.serviceId)?.name }}</td>
                  <td><span class="badge" [ngClass]="statusClass(appointment.status)">{{ statusLabel(appointment.status) }}</span></td>
                  <td>
                    <div class="actions">
                      <button class="secondary" (click)="setStatus(appointment.id, 'completed')">Efectuat</button>
                      <button class="secondary" (click)="setStatus(appointment.id, 'cancelled')">Anulat</button>
                      <button class="secondary" (click)="setStatus(appointment.id, 'noShow')">No show</button>
                      <button class="danger" (click)="deleteAppointment(appointment.id)">Șterge</button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div class="mobile-list">
          @for (appointment of filteredAppointments(); track appointment.id) {
            <article class="mobile-card">
              <div class="mobile-card-header">
                <div>
                  <div class="mobile-card-title">{{ store.getPatientName(appointment.patientId) }}</div>
                  <div class="mobile-card-subtitle">{{ appointment.date }} • {{ appointment.startTime }} - {{ appointment.endTime }}</div>
                </div>
                <span class="badge" [ngClass]="statusClass(appointment.status)">{{ statusLabel(appointment.status) }}</span>
              </div>

              <div class="mobile-card-grid">
                <div class="mobile-field"><span>Serviciu</span><strong>{{ store.getService(appointment.serviceId)?.name }}</strong></div>
                <div class="mobile-field"><span>Note</span><strong>{{ appointment.notes || '-' }}</strong></div>
              </div>

              <div class="mobile-card-actions">
                <a class="button secondary" [routerLink]="['/patients', appointment.patientId]">Pacient</a>
                <button class="secondary" (click)="setStatus(appointment.id, 'completed')">Efectuat</button>
                <button class="secondary" (click)="setStatus(appointment.id, 'cancelled')">Anulat</button>
                <button class="danger" (click)="deleteAppointment(appointment.id)">Șterge</button>
              </div>
            </article>
          }
        </div>
      </article>
    </section>
  `
})
export class AppointmentsPageComponent {
  private readonly fb = inject(FormBuilder);
  readonly store = inject(CabinetStoreService);
  readonly query = signal('');
  readonly message = signal('');

  readonly form = this.fb.nonNullable.group({
    patientId: ['', Validators.required],
    serviceId: ['srv-osteopathy', Validators.required],
    date: [todayIso(), Validators.required],
    startTime: ['10:00', Validators.required],
    endTime: ['10:50', Validators.required],
    status: ['scheduled' as Appointment['status'], Validators.required],
    notes: ['']
  });

  readonly filteredAppointments = computed(() => {
    const q = this.query().trim().toLowerCase();
    const appointments = [...this.store.appointments()].sort((a, b) => `${b.date} ${b.startTime}`.localeCompare(`${a.date} ${a.startTime}`));
    if (!q) return appointments;
    return appointments.filter((appointment) =>
      `${appointment.date} ${appointment.status} ${this.store.getPatientName(appointment.patientId)} ${this.store.getService(appointment.serviceId)?.name ?? ''}`
        .toLowerCase()
        .includes(q)
    );
  });

  addAppointment(): void {
    if (this.form.invalid) return;
    const value = this.form.getRawValue();
    const result = this.store.addAppointment({
      patientId: value.patientId,
      serviceId: value.serviceId,
      date: value.date,
      startTime: value.startTime,
      endTime: value.endTime,
      status: value.status,
      notes: value.notes || undefined
    });

    if (!result.ok) {
      this.message.set(result.message);
      return;
    }

    this.message.set('');
    this.form.reset({
      patientId: '',
      serviceId: 'srv-osteopathy',
      date: todayIso(),
      startTime: '10:00',
      endTime: '10:50',
      status: 'scheduled',
      notes: ''
    });
  }

  setStatus(id: string, status: Appointment['status']): void {
    this.store.updateAppointmentStatus(id, status);
  }

  deleteAppointment(id: string): void {
    const confirmed = window.confirm('Sigur vrei să ștergi această programare?');

    if (!confirmed) return;

    this.store.deleteAppointment(id);
  }

  statusLabel(status: Appointment['status']): string {
    const labels: Record<Appointment['status'], string> = {
      scheduled: 'Programat',
      completed: 'Efectuat',
      cancelled: 'Anulat',
      noShow: 'Nu s-a prezentat'
    };
    return labels[status];
  }

  statusClass(status: Appointment['status']): string {
    return {
      scheduled: 'info',
      completed: 'success',
      cancelled: 'danger',
      noShow: 'warning'
    }[status];
  }


}

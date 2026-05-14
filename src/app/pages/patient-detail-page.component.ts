import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CabinetStoreService } from '../cabinet-store.service';
import { formatRon, todayIso } from '../utils/date-utils';

@Component({
  selector: 'app-patient-detail-page',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    @if (!patient()) {
      <article class="card">
        <h1>Pacient inexistent</h1>
        <a class="button secondary" routerLink="/patients">Înapoi la pacienți</a>
      </article>
    } @else {
      <header class="page-header">
        <div>
          <h1 class="page-title">{{ patient()!.firstName }} {{ patient()!.lastName }}</h1>
          <p class="page-description">
            Fișă pacient: contact, problema principală, ședințe, plăți și evoluție.
          </p>
        </div>
        <a class="button secondary" routerLink="/patients">Înapoi</a>
      </header>

      <section class="grid grid-4">
        <article class="card metric">
          <span class="metric-label">Total ședințe</span>
          <strong class="metric-value">{{ patientSessions().length }}</strong>
        </article>
        <article class="card metric">
          <span class="metric-label">Total plătit</span>
          <strong class="metric-value">{{ money(totalPaid()) }}</strong>
        </article>
        <article class="card metric">
          <span class="metric-label">Ultima vizită</span>
          <strong class="metric-value" style="font-size: 22px;">{{ lastSessionDate() || '-' }}</strong>
        </article>
        <article class="card metric">
          <span class="metric-label">Durere inițială → actuală</span>
          <strong class="metric-value" style="font-size: 22px;">{{ painProgress() }}</strong>
        </article>
      </section>

      <section class="grid grid-2" style="margin-top: 18px;">
        <article class="card">
          <h2>Date pacient</h2>
          <div class="detail-list">
            <div class="detail-item"><span>Telefon</span><strong><a [href]="'tel:' + patient()!.phone">{{ patient()!.phone }}</a></strong></div>
            <div class="detail-item"><span>Email</span><strong>{{ patient()!.email || '-' }}</strong></div>
            <div class="detail-item"><span>Status</span><strong>{{ patient()!.status }}</strong></div>
            <div class="detail-item"><span>Problemă</span><strong>{{ patient()!.mainComplaint || '-' }}</strong></div>
            <div class="detail-item"><span>Zonă</span><strong>{{ patient()!.problemArea || '-' }}</strong></div>
            <div class="detail-item"><span>Simptome</span><strong>{{ patient()!.symptoms || '-' }}</strong></div>
            <div class="detail-item"><span>Note</span><strong>{{ patient()!.notes || '-' }}</strong></div>
          </div>
        </article>

        <article class="card">
          <h2>Adaugă ședință</h2>
          <form [formGroup]="sessionForm" (ngSubmit)="addSession()" class="form-grid">
            <div class="form-field">
              <label>Data *</label>
              <input type="date" formControlName="date" />
            </div>
            <div class="form-field">
              <label>Serviciu *</label>
              <select formControlName="serviceId">
  <option value="">Alege serviciu</option>
  @for (service of store.services(); track service.id) {
    <option [value]="service.id">{{ service.name }}</option>
  }
</select>
            </div>
            <div class="form-field">
              <label>Durere înainte</label>
              <input type="number" min="0" max="10" formControlName="painBefore" />
            </div>
            <div class="form-field">
              <label>Durere după</label>
              <input type="number" min="0" max="10" formControlName="painAfter" />
            </div>
            <div class="form-field full">
              <label>Observații *</label>
              <textarea formControlName="notes"></textarea>
            </div>
            <div class="form-field full">
              <label>Recomandare</label>
              <textarea formControlName="recommendation"></textarea>
            </div>
            <div class="actions full">
              <button type="submit" [disabled]="sessionForm.invalid">Adaugă ședință</button>
            </div>
          </form>
        </article>
      </section>

      <section class="grid grid-2" style="margin-top: 18px;">
        <article class="card">
          <h2>Istoric ședințe</h2>
          @if (patientSessions().length === 0) {
            <p class="empty">Nu există ședințe adăugate.</p>
          } @else {
            <div class="desktop-table table-wrap">
              <table>
                <thead><tr><th>Data</th><th>Serviciu</th><th>Durere</th><th>Observații</th><th></th></tr></thead>
                <tbody>
                  @for (session of patientSessions(); track session.id) {
                    <tr>
                      <td>{{ session.date }}</td>
                      <td>{{ store.getService(session.serviceId)?.name }}</td>
                      <td>{{ session.painBefore ?? '-' }} → {{ session.painAfter ?? '-' }}</td>
                      <td>{{ session.notes }}<br /><span class="muted">{{ session.recommendation || '' }}</span></td>
                      <td><button class="danger" (click)="deleteSession(session.id)">Șterge</button></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="mobile-list">
              @for (session of patientSessions(); track session.id) {
                <article class="mobile-card">
                  <div class="mobile-card-header">
                    <div>
                      <div class="mobile-card-title">{{ store.getService(session.serviceId)?.name }}</div>
                      <div class="mobile-card-subtitle">{{ session.date }}</div>
                    </div>
                    <span class="badge info">{{ session.painBefore ?? '-' }} → {{ session.painAfter ?? '-' }}</span>
                  </div>
                  <div class="mobile-card-grid">
                    <div class="mobile-field"><span>Observații</span><strong>{{ session.notes }}</strong></div>
                    <div class="mobile-field"><span>Recomandare</span><strong>{{ session.recommendation || '-' }}</strong></div>
                  </div>
                  <div class="mobile-card-actions">
                    <button class="danger full" (click)="deleteSession(session.id)">Șterge</button>
                  </div>
                </article>
              }
            </div>
          }
        </article>

        <article class="card">
          <h2>Plăți pacient</h2>
          @if (patientPayments().length === 0) {
            <p class="empty">Nu există plăți adăugate.</p>
          } @else {
            <div class="desktop-table table-wrap">
              <table>
                <thead><tr><th>Data</th><th>Sumă</th><th>Metodă</th><th>Note</th></tr></thead>
                <tbody>
                  @for (payment of patientPayments(); track payment.id) {
                    <tr>
                      <td>{{ payment.date }}</td>
                      <td><strong>{{ money(payment.amount) }}</strong></td>
                      <td>{{ payment.method }}</td>
                      <td>{{ payment.notes || '-' }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>

            <div class="mobile-list">
              @for (payment of patientPayments(); track payment.id) {
                <article class="mobile-card">
                  <div class="mobile-card-header">
                    <div>
                      <div class="mobile-card-title">{{ money(payment.amount) }}</div>
                      <div class="mobile-card-subtitle">{{ payment.date }} • {{ payment.method }}</div>
                    </div>
                    <span class="badge success">Plată</span>
                  </div>
                  <div class="mobile-card-grid">
                    <div class="mobile-field"><span>Note</span><strong>{{ payment.notes || '-' }}</strong></div>
                  </div>
                </article>
              }
            </div>
          }
        </article>
      </section>
    }
  `
})
export class PatientDetailPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  readonly store = inject(CabinetStoreService);
  readonly patientId = this.route.snapshot.paramMap.get('id') ?? '';

  readonly patient = computed(() => this.store.getPatient(this.patientId));
  readonly patientSessions = computed(() => this.store.sessions()
    .filter((session) => session.patientId === this.patientId)
    .sort((a, b) => b.date.localeCompare(a.date))
  );
  readonly patientPayments = computed(() => this.store.payments()
    .filter((payment) => payment.patientId === this.patientId)
    .sort((a, b) => b.date.localeCompare(a.date))
  );
  readonly totalPaid = computed(() => this.patientPayments().reduce((sum, payment) => sum + payment.amount, 0));
  readonly lastSessionDate = computed(() => this.patientSessions()[0]?.date ?? null);
  readonly painProgress = computed(() => {
    const sessions = [...this.patientSessions()].reverse();
    const first = sessions.find((session) => session.painBefore !== undefined)?.painBefore;
    const last = [...sessions].reverse().find((session) => session.painAfter !== undefined)?.painAfter;
    if (first === undefined && last === undefined) return '-';
    return `${first ?? '-'} → ${last ?? '-'}`;
  });

  readonly sessionForm = this.fb.nonNullable.group({
    date: [todayIso(), Validators.required],
    serviceId: ['', Validators.required],
    painBefore: [null as number | null, [Validators.min(0), Validators.max(10)]],
    painAfter: [null as number | null, [Validators.min(0), Validators.max(10)]],
    notes: ['', Validators.required],
    recommendation: ['']
  });

  addSession(): void {
    if (this.sessionForm.invalid || !this.patient()) return;
    const value = this.sessionForm.getRawValue();
    this.store.addSession({
      patientId: this.patientId,
      date: value.date,
      serviceId: value.serviceId,
      painBefore: value.painBefore ?? undefined,
      painAfter: value.painAfter ?? undefined,
      notes: value.notes,
      recommendation: value.recommendation || undefined
    });
    this.sessionForm.reset({
      date: todayIso(),
      serviceId: '',
      painBefore: null,
      painAfter: null,
      notes: '',
      recommendation: ''
    });
  }

  deleteSession(id: string): void {
    const confirmed = window.confirm('Sigur vrei să ștergi această ședință din istoricul pacientului?');

    if (!confirmed) return;

    this.store.deleteSession(id);
  }

  money(value: number): string {
    return formatRon(value);
  }
}

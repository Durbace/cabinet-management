import { computed, Injectable, signal } from '@angular/core';
import { Appointment, Expense, Patient, Payment, ServiceType, SessionNote } from './models';
import { monthKey, todayIso } from './utils/date-utils';

interface CabinetState {
  patients: Patient[];
  services: ServiceType[];
  appointments: Appointment[];
  sessions: SessionNote[];
  payments: Payment[];
  expenses: Expense[];
}

const STORAGE_KEY = 'cabinet-management-dashboard-state-v1';

const seedState: CabinetState = {
  services: [],
  patients: [],
  appointments: [],
  sessions: [],
  payments: [],
  expenses: []
};

@Injectable({ providedIn: 'root' })
export class CabinetStoreService {
  private readonly state = signal<CabinetState>(this.loadState());

  readonly patients = computed(() => this.state().patients);
  readonly services = computed(() => this.state().services);
  readonly appointments = computed(() => this.state().appointments);
  readonly sessions = computed(() => this.state().sessions);
  readonly payments = computed(() => this.state().payments);
  readonly expenses = computed(() => this.state().expenses);

  readonly dashboard = computed(() => {
    const state = this.state();
    const currentMonth = monthKey(todayIso());
    const monthPayments = state.payments.filter((payment) => monthKey(payment.date) === currentMonth);
    const monthExpenses = state.expenses.filter((expense) => monthKey(expense.date) === currentMonth);
    const todayAppointments = state.appointments.filter((appointment) => appointment.date === todayIso());

    const revenue = monthPayments.reduce((sum, payment) => sum + payment.amount, 0);
    const expenses = monthExpenses.reduce((sum, expense) => sum + expense.amount, 0);

    return {
      revenue,
      expenses,
      profit: revenue - expenses,
      activePatients: state.patients.filter((patient) => patient.status === 'active').length,
      todayAppointments: todayAppointments.length,
      completedAppointments: state.appointments.filter((appointment) => appointment.status === 'completed').length,
      cancelledAppointments: state.appointments.filter((appointment) => appointment.status === 'cancelled').length,
      noShowAppointments: state.appointments.filter((appointment) => appointment.status === 'noShow').length
    };
  });

  getPatient(id: string): Patient | undefined {
    return this.state().patients.find((patient) => patient.id === id);
  }

  getService(id?: string): ServiceType | undefined {
    return this.state().services.find((service) => service.id === id);
  }

  getPatientName(patientId: string): string {
    const patient = this.getPatient(patientId);
    return patient ? `${patient.firstName} ${patient.lastName}` : 'Pacient șters';
  }

  upsertService(service: Omit<ServiceType, 'id'> & Partial<Pick<ServiceType, 'id'>>): void {
    this.update((state) => {
      if (service.id) {
        return {
          ...state,
          services: state.services.map((existing) =>
            existing.id === service.id ? { ...existing, ...service } : existing
          )
        };
      }

      const created: ServiceType = {
        ...service,
        id: crypto.randomUUID()
      };

      return {
        ...state,
        services: [created, ...state.services]
      };
    });
  }

  deleteService(id: string): { ok: true } | { ok: false; message: string } {
    const state = this.state();

    const isUsed =
      state.appointments.some((appointment) => appointment.serviceId === id) ||
      state.sessions.some((session) => session.serviceId === id) ||
      state.payments.some((payment) => payment.serviceId === id);

    if (isUsed) {
      return {
        ok: false,
        message: 'Serviciul nu poate fi șters pentru că este folosit în programări, ședințe sau plăți.'
      };
    }

    this.update((state) => ({
      ...state,
      services: state.services.filter((service) => service.id !== id)
    }));

    return { ok: true };
  }

  upsertPatient(patient: Omit<Patient, 'id' | 'createdAt' | 'updatedAt'> & Partial<Pick<Patient, 'id'>>): void {
    const now = new Date().toISOString();
    this.update((state) => {
      if (patient.id) {
        return {
          ...state,
          patients: state.patients.map((existing) =>
            existing.id === patient.id ? { ...existing, ...patient, updatedAt: now } : existing
          )
        };
      }

      const created: Patient = {
        ...patient,
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now
      };
      return { ...state, patients: [created, ...state.patients] };
    });
  }

  deletePatient(id: string): void {
    this.update((state) => ({
      ...state,
      patients: state.patients.filter((patient) => patient.id !== id),
      appointments: state.appointments.filter((appointment) => appointment.patientId !== id),
      sessions: state.sessions.filter((session) => session.patientId !== id),
      payments: state.payments.filter((payment) => payment.patientId !== id)
    }));
  }

  addAppointment(data: Omit<Appointment, 'id' | 'createdAt'>): { ok: true } | { ok: false; message: string } {
    const conflict = this.state().appointments.some((appointment) =>
      appointment.date === data.date &&
      appointment.startTime === data.startTime &&
      appointment.status !== 'cancelled'
    );

    if (conflict) {
      return { ok: false, message: 'Există deja o programare la ora aleasă.' };
    }

    const appointment: Appointment = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };

    this.update((state) => ({ ...state, appointments: [appointment, ...state.appointments] }));
    return { ok: true };
  }

  updateAppointmentStatus(id: string, status: Appointment['status']): void {
    this.update((state) => ({
      ...state,
      appointments: state.appointments.map((appointment) =>
        appointment.id === id ? { ...appointment, status } : appointment
      )
    }));
  }

  deleteAppointment(id: string): void {
    this.update((state) => ({
      ...state,
      appointments: state.appointments.filter((appointment) => appointment.id !== id)
    }));
  }

  addSession(data: Omit<SessionNote, 'id' | 'createdAt'>): void {
    const session: SessionNote = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    this.update((state) => ({ ...state, sessions: [session, ...state.sessions] }));
  }

  deleteSession(id: string): void {
    this.update((state) => ({
      ...state,
      sessions: state.sessions.filter((session) => session.id !== id)
    }));
  }

  addPayment(data: Omit<Payment, 'id' | 'createdAt'>): void {
    const payment: Payment = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    this.update((state) => ({ ...state, payments: [payment, ...state.payments] }));
  }

  deletePayment(id: string): void {
    this.update((state) => ({
      ...state,
      payments: state.payments.filter((payment) => payment.id !== id)
    }));
  }

  addExpense(data: Omit<Expense, 'id' | 'createdAt'>): void {
    const expense: Expense = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    this.update((state) => ({ ...state, expenses: [expense, ...state.expenses] }));
  }

  deleteExpense(id: string): void {
    this.update((state) => ({
      ...state,
      expenses: state.expenses.filter((expense) => expense.id !== id)
    }));
  }

  resetDemoData(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.state.set(seedState);
  }

  private update(projector: (state: CabinetState) => CabinetState): void {
    this.state.update((current) => {
      const next = projector(current);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  private loadState(): CabinetState {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return seedState;

    try {
      return JSON.parse(saved) as CabinetState;
    } catch {
      return seedState;
    }
  }
}

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
  services: [
    { id: 'srv-osteopathy', name: 'Osteopatie', price: 180, durationMinutes: 50 },
    { id: 'srv-kineto', name: 'Kinetoterapie', price: 150, durationMinutes: 50 },
    { id: 'srv-manual', name: 'Terapie manuală', price: 170, durationMinutes: 50 },
    { id: 'srv-nutrition', name: 'Nutriție', price: 200, durationMinutes: 60 }
  ],
  patients: [
    {
      id: 'pat-1',
      firstName: 'Andrei',
      lastName: 'Popescu',
      phone: '0712345678',
      email: 'andrei.popescu@example.com',
      birthDate: '1991-05-17',
      gender: 'male',
      status: 'active',
      mainComplaint: 'Durere lombară',
      problemArea: 'Lombar',
      symptoms: 'Durere la stat mult pe scaun',
      painLevel: 6,
      notes: 'Date demo, nu pacient real.',
      createdAt: '2026-04-02T10:00:00.000Z',
      updatedAt: '2026-04-02T10:00:00.000Z'
    },
    {
      id: 'pat-2',
      firstName: 'Maria',
      lastName: 'Ionescu',
      phone: '0798765432',
      email: 'maria.ionescu@example.com',
      birthDate: '1984-11-03',
      gender: 'female',
      status: 'active',
      mainComplaint: 'Tensiune cervicală',
      problemArea: 'Cervical',
      symptoms: 'Rigiditate și disconfort la birou',
      painLevel: 5,
      notes: 'Date demo, nu pacient real.',
      createdAt: '2026-04-06T12:30:00.000Z',
      updatedAt: '2026-04-06T12:30:00.000Z'
    }
  ],
  appointments: [
    {
      id: 'app-1',
      patientId: 'pat-1',
      serviceId: 'srv-osteopathy',
      date: todayIso(),
      startTime: '10:00',
      endTime: '10:50',
      status: 'scheduled',
      notes: 'Reevaluare',
      createdAt: '2026-05-01T09:00:00.000Z'
    },
    {
      id: 'app-2',
      patientId: 'pat-2',
      serviceId: 'srv-manual',
      date: todayIso(),
      startTime: '12:00',
      endTime: '12:50',
      status: 'scheduled',
      notes: '',
      createdAt: '2026-05-01T09:20:00.000Z'
    }
  ],
  sessions: [
    {
      id: 'ses-1',
      patientId: 'pat-1',
      serviceId: 'srv-osteopathy',
      date: '2026-05-03',
      painBefore: 6,
      painAfter: 4,
      notes: 'Mobilitate mai bună la finalul ședinței.',
      recommendation: 'Exerciții ușoare zilnic.',
      createdAt: '2026-05-03T10:55:00.000Z'
    }
  ],
  payments: [
    {
      id: 'pay-1',
      patientId: 'pat-1',
      serviceId: 'srv-osteopathy',
      amount: 180,
      method: 'cash',
      date: '2026-05-03',
      notes: 'Ședință osteopatie',
      createdAt: '2026-05-03T11:00:00.000Z'
    },
    {
      id: 'pay-2',
      patientId: 'pat-2',
      serviceId: 'srv-manual',
      amount: 170,
      method: 'card',
      date: '2026-05-05',
      notes: 'Terapie manuală',
      createdAt: '2026-05-05T12:55:00.000Z'
    }
  ],
  expenses: [
    {
      id: 'exp-1',
      category: 'Consumabile',
      amount: 120,
      date: '2026-05-02',
      notes: 'Materiale cabinet',
      createdAt: '2026-05-02T13:00:00.000Z'
    },
    {
      id: 'exp-2',
      category: 'Marketing',
      amount: 250,
      date: '2026-05-08',
      notes: 'Promovare online',
      createdAt: '2026-05-08T13:00:00.000Z'
    }
  ]
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

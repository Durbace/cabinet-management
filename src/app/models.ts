export type PatientStatus = 'active' | 'inactive';
export type AppointmentStatus = 'scheduled' | 'completed' | 'cancelled' | 'noShow';
export type PaymentMethod = 'cash' | 'card' | 'bankTransfer';

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  birthDate?: string;
  gender?: 'male' | 'female' | 'other';
  status: PatientStatus;
  mainComplaint?: string;
  problemArea?: string;
  symptoms?: string;
  painLevel?: number;
  symptomStartDate?: string;
  medicalHistory?: string;
  surgeries?: string;
  medications?: string;
  allergies?: string;
  contraindications?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceType {
  id: string;
  name: string;
  price: number;
  durationMinutes: number;
}

export interface Appointment {
  id: string;
  patientId: string;
  serviceId: string;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  notes?: string;
  createdAt: string;
}

export interface SessionNote {
  id: string;
  patientId: string;
  appointmentId?: string;
  serviceId: string;
  date: string;
  painBefore?: number;
  painAfter?: number;
  notes: string;
  recommendation?: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  patientId: string;
  appointmentId?: string;
  sessionId?: string;
  serviceId?: string;
  amount: number;
  method: PaymentMethod;
  date: string;
  notes?: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  date: string;
  notes?: string;
  createdAt: string;
}

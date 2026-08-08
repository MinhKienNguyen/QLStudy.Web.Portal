import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Semester {
  id: number;
  name: string;
  isActive: boolean;
}

export interface ClassSchedule {
  id?: number;
  classId?: number;
  dayOfWeek: string;
  timeSlot: string;
}

export interface Class {
  id: number;
  name: string;
  semesterId: number;
  subjectId?: number | null;
  teacherId?: number | null;
  startDate?: string | null;
  endDate?: string | null;
  tuitionFee?: number;
  schedules?: ClassSchedule[];
}

export interface UserAccount {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: 'Manager' | 'Teacher';
  status: 'Active' | 'Locked';
  subjectIds: number[];
  subjects: string[];
}

export interface StudentClassEnrollment {
  id: number;
  classId: number;
  className: string;
  startMonth: string;
  endMonth?: string | null;
  status: string;
  reason?: string | null;
}

export interface Student {
  id: number;
  name: string;
  phoneNumber?: string;
  email?: string;
  startMonth: string;
  classIds?: number[];
  classNames?: string[];
  classStartMonths?: { [classId: number]: string };
  classStatuses?: { [classId: number]: string };
  classEnrollmentPlans?: { [classId: number]: any };
  enrollments?: StudentClassEnrollment[];
  rewardIds?: number[];
  rewardNames?: string[];
}

export interface RewardOption {
  id: number;
  name: string;
}

export interface TuitionPeriod {
  id: number;
  monthName: string;
}

export interface PaymentInfo {
  amountPaid: number;
  notes: string;
  paidAt?: string | null;
}

export interface TuitionAdjustmentInfo {
  adjustmentType: string;
  adjustmentValue: number;
  note: string;
  amountDue: number;
}

export interface StudentTuitionRow {
  studentId: number;
  studentName: string;
  classId: number;
  className: string;
  classTuitionFee?: number;
  startMonth: string;
  classPeriodIds?: number[];
  payablePeriodIds?: number[];
  amountDueByPeriod?: { [periodId: string]: number };
  adjustments?: { [periodId: string]: TuitionAdjustmentInfo };
  payments: { [periodId: string]: PaymentInfo };
}

export interface TuitionMatrix {
  periods: TuitionPeriod[];
  students: StudentTuitionRow[];
}

export interface AttendanceRecord {
  studentId: number;
  studentName?: string;
  status: string; // Present, Absent, Late
  note: string;
}

export interface PenaltyRule {
  id: number;
  name: string;
  defaultAmount: number;
  isActive: boolean;
}

export interface StudentPenalty {
  id: number;
  studentId: number;
  studentName: string;
  classId: number;
  className: string;
  penaltyRuleId: number;
  ruleName: string;
  date: string;
  amount: number;
  note: string;
}

export interface StudentScore {
  id: number;
  studentId: number;
  classId: number;
  className: string;
  date: string;
  testName: string;
  score: number;
  maxScore: number;
  note: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  public selectedSemesterId = signal<number | null>(null);
  public activeSemesterName = signal<string>('');

  private apiUrl = '/api';

  constructor(private http: HttpClient) {
  }

  setApiUrl(url: string) {
    this.apiUrl = url;
  }

  getSemesters(): Observable<Semester[]> {
    return this.http.get<Semester[]>(`${this.apiUrl}/semesters`);
  }

  getSchedule(semesterId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/semesters/${semesterId}/schedule`);
  }

  getTuitionMatrix(semesterId: number): Observable<TuitionMatrix> {
    return this.http.get<TuitionMatrix>(`${this.apiUrl}/semesters/${semesterId}/tuition-matrix`);
  }

  savePayment(studentId: number, classId: number, periodId: number, amount: number, notes: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tuition/payment`, {
      studentId,
      classId,
      periodId,
      amount,
      notes
    });
  }

  saveTuitionAdjustment(payload: {
    studentId: number;
    classId: number;
    periodId: number;
    adjustmentType: string;
    adjustmentValue: number;
    note: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/tuition/adjustment`, payload);
  }

  deleteTuitionAdjustment(studentId: number, classId: number, periodId: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/tuition/adjustment?studentId=${studentId}&classId=${classId}&periodId=${periodId}`);
  }

  getClasses(semesterId?: number): Observable<Class[]> {
    const url = semesterId ? `${this.apiUrl}/classes?semesterId=${semesterId}` : `${this.apiUrl}/classes`;
    return this.http.get<Class[]>(url);
  }

  createClass(cls: any): Observable<Class> {
    return this.http.post<Class>(`${this.apiUrl}/classes`, cls);
  }

  updateClass(id: number, cls: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/classes/${id}`, cls);
  }

  deleteClass(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/classes/${id}`);
  }

  setSchedules(classId: number, schedules: ClassSchedule[]): Observable<ClassSchedule[]> {
    return this.http.post<ClassSchedule[]>(`${this.apiUrl}/classes/${classId}/schedules`, schedules);
  }

  getStudents(classId?: number, semesterId?: number): Observable<Student[]> {
    let url = `${this.apiUrl}/students`;
    if (classId) {
      url += `?classId=${classId}`;
    } else if (semesterId) {
      url += `?semesterId=${semesterId}`;
    }
    return this.http.get<Student[]>(url);
  }

  createStudent(student: any): Observable<Student> {
    return this.http.post<Student>(`${this.apiUrl}/students`, student);
  }

  updateStudent(id: number, student: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/students/${id}`, student);
  }

  deleteStudent(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/students/${id}`);
  }

  updateStudentClassEnrollment(studentId: number, classId: number, action: 'pause' | 'resume' | 'stop', effectiveMonth: string, reason = ''): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/students/${studentId}/classes/${classId}/${action}`, {
      effectiveMonth,
      reason
    });
  }

  getStudentScores(studentId: number): Observable<StudentScore[]> {
    return this.http.get<StudentScore[]>(`${this.apiUrl}/studentscores?studentId=${studentId}`);
  }

  createStudentScore(score: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/studentscores`, score);
  }

  deleteStudentScore(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/studentscores/${id}`);
  }

  // Reward Options Configuration API
  getRewardOptions(): Observable<RewardOption[]> {
    return this.http.get<RewardOption[]>(`${this.apiUrl}/rewardoptions`);
  }

  createRewardOption(option: any): Observable<RewardOption> {
    return this.http.post<RewardOption>(`${this.apiUrl}/rewardoptions`, option);
  }

  deleteRewardOption(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/rewardoptions/${id}`);
  }

  // Reports API
  getSemestersSummary(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/reports/semesters-summary`);
  }

  getMonthlyRevenue(semesterId: number, fromPeriodId?: number | null, toPeriodId?: number | null): Observable<any[]> {
    const params = new URLSearchParams({ semesterId: String(semesterId) });
    if (fromPeriodId) params.set('fromPeriodId', String(fromPeriodId));
    if (toPeriodId) params.set('toPeriodId', String(toPeriodId));
    return this.http.get<any[]>(`${this.apiUrl}/reports/monthly-revenue?${params.toString()}`);
  }

  getClassRevenue(semesterId: number, fromPeriodId?: number | null, toPeriodId?: number | null): Observable<any[]> {
    const params = new URLSearchParams({ semesterId: String(semesterId) });
    if (fromPeriodId) params.set('fromPeriodId', String(fromPeriodId));
    if (toPeriodId) params.set('toPeriodId', String(toPeriodId));
    return this.http.get<any[]>(`${this.apiUrl}/reports/class-revenue?${params.toString()}`);
  }

  getPaymentStatusReport(semesterId: number, periodId: number): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/reports/payment-status?semesterId=${semesterId}&periodId=${periodId}`);
  }

  getAttendance(classId: number, date: string): Observable<AttendanceRecord[]> {
    return this.http.get<AttendanceRecord[]>(`${this.apiUrl}/attendance?classId=${classId}&date=${date}`);
  }

  saveAttendance(classId: number, date: string, records: AttendanceRecord[]): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/attendance?classId=${classId}&date=${date}`, records);
  }

  getAttendanceHistory(classId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/attendance/history?classId=${classId}`);
  }

  deleteAttendance(classId: number, date: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/attendance?classId=${classId}&date=${date}`);
  }

  getPenaltyRules(): Observable<PenaltyRule[]> {
    return this.http.get<PenaltyRule[]>(`${this.apiUrl}/penalties/rules`);
  }

  createPenaltyRule(rule: any): Observable<PenaltyRule> {
    return this.http.post<PenaltyRule>(`${this.apiUrl}/penalties/rules`, rule);
  }

  updatePenaltyRule(id: number, rule: any): Observable<PenaltyRule> {
    return this.http.put<PenaltyRule>(`${this.apiUrl}/penalties/rules/${id}`, rule);
  }

  deletePenaltyRule(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/penalties/rules/${id}`);
  }

  getPenalties(classId?: number | null, date?: string): Observable<StudentPenalty[]> {
    const params = new URLSearchParams();
    if (classId) params.set('classId', String(classId));
    if (date) params.set('date', date);
    const query = params.toString();
    return this.http.get<StudentPenalty[]>(`${this.apiUrl}/penalties${query ? '?' + query : ''}`);
  }

  createPenalty(penalty: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/penalties`, penalty);
  }

  deletePenalty(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/penalties/${id}`);
  }

  getPenaltySummary(semesterId: number, mode: 'week' | 'month', from?: string, to?: string): Observable<any[]> {
    const params = new URLSearchParams({ semesterId: String(semesterId), mode });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return this.http.get<any[]>(`${this.apiUrl}/penalties/summary?${params.toString()}`);
  }

  // Subjects Management API
  getSubjects(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/subjects`);
  }

  createSubject(subject: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/subjects`, subject);
  }

  updateSubject(id: number, subject: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/subjects/${id}`, subject);
  }

  deleteSubject(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/subjects/${id}`);
  }

  // Users Management API
  getUsers(): Observable<UserAccount[]> {
    return this.http.get<UserAccount[]>(`${this.apiUrl}/users`);
  }

  createUser(user: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/users`, user);
  }

  updateUser(id: number, user: any): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/users/${id}`, user);
  }

  deleteUser(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/users/${id}`);
  }

  // Screen Permissions API
  getPermissions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/users/permissions`);
  }

  updatePermissions(permissions: any[]): Observable<any> {
    return this.http.put<any>(`${this.apiUrl}/users/permissions`, permissions);
  }
}


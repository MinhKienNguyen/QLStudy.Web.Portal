import { Component, OnInit, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Class, ClassSchedule, UserAccount } from '../api.service';

interface Subject {
  id: number;
  name: string;
}

@Component({
  selector: 'app-classes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="classes-container">
      <div class="header-section">
        <h1>Quản lý Lớp Học</h1>
        <p>Thêm, cấu hình môn học, học phí chuẩn và lịch học cho các lớp.</p>
        <button class="btn btn-primary add-btn" (click)="openAddModal()">
          <span class="material-symbols-outlined">add</span>
          <span>Thêm Lớp Mới</span>
        </button>
      </div>

      <!-- Classes Table -->
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 80px; text-align: center;">ID</th>
              <th style="text-align: left;">Giáo viên</th>
              <th style="text-align: left;">Tên lớp học</th>
              <th style="text-align: left;">Môn học</th>
              <th style="text-align: right; width: 140px;">Học phí chuẩn</th>
              <th style="text-align: left;">Lịch học tuần</th>
              <th style="width: 280px; text-align: center;">Hành động</th>
            </tr>
          </thead>
          <tbody>
            @for (c of classes(); track c.id) {
              <tr>
                <td style="text-align: center; color: var(--text-muted);">{{ c.id }}</td>
                <td>
                  <span *ngIf="c.teacherId" class="badge badge-info" style="text-transform: none;">
                    {{ getTeacherName(c.teacherId) }}
                  </span>
                  <span *ngIf="!c.teacherId" style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">
                    Chưa gán giáo viên
                  </span>
                </td>
                <td style="font-weight: 600;">{{ c.name }}</td>
                <td>
                  <span *ngIf="c.subjectId" class="badge badge-primary" style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.2); color: #a5b4fc; text-transform: none;">
                    {{ getSubjectName(c.subjectId) }}
                  </span>
                  <span *ngIf="!c.subjectId" style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">
                    Chưa gán môn
                  </span>
                </td>
                <td style="text-align: right; font-weight: 600; color: #86efac;">
                  {{ formatTuition(c.tuitionFee) }}
                </td>
                <td>
                  <div class="schedule-badges">
                    @for (sched of c.schedules; track sched.id) {
                      <span class="badge badge-info">
                        {{ sched.dayOfWeek }}: {{ sched.timeSlot }}
                      </span>
                    } @empty {
                      <span style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">
                        Chưa cài đặt lịch học
                      </span>
                    }
                  </div>
                </td>
                <td style="text-align: center;">
                  <div class="actions-group">
                    <button class="btn btn-secondary btn-sm" (click)="openEditModal(c)">
                      <span>Sửa</span>
                    </button>
                    <button class="btn btn-secondary btn-sm" (click)="openScheduleModal(c)">
                      <span class="material-symbols-outlined" style="font-size: 1.1rem;">calendar_month</span>
                      <span>Lịch</span>
                    </button>
                    <button class="btn btn-danger btn-sm" (click)="deleteClass(c.id)">
                      <span class="material-symbols-outlined" style="font-size: 1.1rem;">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="7" style="text-align: center; padding: 2.5rem; color: var(--text-secondary);">
                  Chưa có lớp học nào trong học kỳ này.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Modal Add/Edit Class -->
      @if (showAddModal()) {
        <div class="modal-overlay">
          <div class="modal-container" style="max-width: 460px;">
            <div class="modal-header">
              <h3>{{ modalMode() === 'add' ? 'Thêm Lớp Học Mới' : 'Cập Nhật Lớp Học' }}</h3>
              <button class="close-btn" (click)="closeAddModal()">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
            <div class="modal-body" style="display: flex; flex-direction: column; gap: 1.25rem;">
              <div *ngIf="formError()" style="padding: 0.75rem 1rem; border-radius: 8px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #fca5a5; font-size: 0.875rem;">
                {{ formError() }}
              </div>
              <div class="form-group">
                <label class="form-label">Tên lớp học</label>
                <input type="text" class="form-control" placeholder="Ví dụ: Toán 9.1, KHTN 6..." [(ngModel)]="editForm.name">
              </div>

              <div class="form-group">
                <label class="form-label">Môn học liên kết</label>
                <div class="form-group" style="margin-bottom: 1.25rem;">
                  <label class="form-label">Giáo viên phụ trách</label>
                  <select class="form-control" [(ngModel)]="editForm.teacherId" (ngModelChange)="onTeacherChange()">
                    <option [ngValue]="null">-- Chọn giáo viên --</option>
                    @for (teacher of teachers(); track teacher.id) {
                      <option [ngValue]="teacher.id">{{ teacher.fullName }}</option>
                    }
                  </select>
                </div>
                <label class="form-label">Môn học của giáo viên</label>
                <select class="form-control" [(ngModel)]="editForm.subjectId" [disabled]="!editForm.teacherId || filteredSubjects().length === 0">
                  <option [ngValue]="null">-- Chọn môn học --</option>
                  @for (sub of filteredSubjects(); track sub.id) {
                    <option [ngValue]="sub.id">{{ sub.name }}</option>
                  }
                </select>
                <span *ngIf="editForm.teacherId && filteredSubjects().length === 0" style="color: var(--text-muted); font-size: 0.8rem;">
                  Giáo viên này chưa được phân môn.
                </span>
              </div>

              <div class="form-group">
                <label class="form-label">Học phí chuẩn định kỳ (nghìn đồng - k)</label>
                <input type="number" class="form-control" placeholder="Ví dụ: 1200" [(ngModel)]="editForm.tuitionFee">
              </div>

              <div class="class-date-grid">
                <div class="form-group">
                  <label class="form-label">Ngày bắt đầu lớp</label>
                  <input type="date" class="form-control" [(ngModel)]="editForm.startDate">
                </div>
                <div class="form-group">
                  <label class="form-label">Ngày kết thúc lớp</label>
                  <input type="date" class="form-control" [(ngModel)]="editForm.endDate">
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeAddModal()">Hủy</button>
              <button class="btn btn-primary" (click)="saveClass()" [disabled]="!editForm.name.trim() || !editForm.teacherId || !editForm.subjectId">Lưu</button>
            </div>
          </div>
        </div>
      }

      <!-- Modal Edit Schedule -->
      @if (showScheduleModal()) {
        <div class="modal-overlay">
          <div class="modal-container schedule-modal">
            <div class="modal-header">
              <h3>Sắp lịch học: {{ selectedClass()?.name }}</h3>
              <button class="close-btn" (click)="closeScheduleModal()">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
            <div class="modal-body">
              <div *ngIf="scheduleError()" style="padding: 0.75rem 1rem; border-radius: 8px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #fca5a5; font-size: 0.875rem; margin-bottom: 1rem;">
                {{ scheduleError() }}
              </div>
              <div class="current-schedules-list">
                <h4>Lịch hiện tại:</h4>
                @for (s of tempSchedules(); track s.id; let idx = $index) {
                  <div class="schedule-edit-item">
                    <span>Thứ: <strong>{{ s.dayOfWeek }}</strong> | Ca: <strong>{{ s.timeSlot }}</strong></span>
                    <button class="close-btn" (click)="removeTempSchedule(idx)">
                      <span class="material-symbols-outlined" style="color: var(--color-danger); font-size: 1.2rem;">remove_circle</span>
                    </button>
                  </div>
                } @empty {
                  <p style="color: var(--text-muted); font-size: 0.85rem; font-style: italic; margin-bottom: 1rem;">
                    Chưa cài đặt lịch học nào.
                  </p>
                }
              </div>

              <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 1.25rem 0;">

              <!-- Form Add Slot -->
              <h4>Thêm ca học mới:</h4>
              <div class="quick-time-section">
                <span class="quick-time-label">Chọn giờ nhanh</span>
                <div class="quick-time-grid">
                  @for (preset of schedulePresets; track preset.label) {
                    <button type="button"
                            class="quick-time-btn"
                            [class.active]="newStartTime === preset.start && newEndTime === preset.end"
                            (click)="applySchedulePreset(preset)">
                      {{ preset.label }}
                    </button>
                  }
                </div>
              </div>
              <div class="add-slot-form">
                <div class="form-group">
                  <label class="form-label">Thứ</label>
                  <select class="form-control" [(ngModel)]="newDay">
                    <option value="T2">Thứ 2</option>
                    <option value="T3">Thứ 3</option>
                    <option value="T4">Thứ 4</option>
                    <option value="T5">Thứ 5</option>
                    <option value="T6">Thứ 6</option>
                    <option value="T7">Thứ 7</option>
                    <option value="CN">Chủ Nhật</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Từ giờ</label>
                  <input type="time" class="form-control" [(ngModel)]="newStartTime">
                </div>
                <div class="form-group">
                  <label class="form-label">Đến giờ</label>
                  <input type="time" class="form-control" [(ngModel)]="newEndTime">
                </div>
                <button class="btn btn-secondary add-slot-btn" (click)="addTempSchedule()" title="Thêm ca học">
                  <span class="material-symbols-outlined">add</span>
                </button>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeScheduleModal()">Hủy</button>
              <button class="btn btn-primary" (click)="saveSchedules()">Cập nhật Lịch học</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .classes-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      min-height: 0;
    }
    .header-section {
      position: relative;
    }
    .header-section h1 {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
    }
    .header-section p {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }
    .add-btn {
      position: absolute;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .table-container {
      background: var(--bg-card);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      overflow: auto;
      max-height: calc(100vh - 230px);
      min-height: 320px;
      box-shadow: var(--shadow-sm);
      scrollbar-width: thin;
      scrollbar-color: rgba(148, 163, 184, 0.45) transparent;
    }
    .table-container::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    .table-container::-webkit-scrollbar-track {
      background: transparent;
    }
    .table-container::-webkit-scrollbar-thumb {
      background: rgba(148, 163, 184, 0.35);
      border-radius: 999px;
    }
    .table-container::-webkit-scrollbar-thumb:hover {
      background: rgba(148, 163, 184, 0.6);
    }
    .data-table {
      width: 100%;
      min-width: 1180px;
      border-collapse: collapse;
      font-size: 0.9375rem;
    }
    .data-table th, .data-table td {
      padding: 0.875rem 1rem;
      border-bottom: 1px solid var(--border-color);
    }
    .data-table th {
      background: rgba(255, 255, 255, 0.02);
      color: var(--text-secondary);
      font-weight: 600;
      position: sticky;
      top: 0;
      z-index: 2;
      box-shadow: 0 1px 0 var(--border-color);
    }
    .data-table tr:hover {
      background: rgba(255, 255, 255, 0.01);
    }
    .schedule-badges {
      display: flex;
      flex-wrap: wrap;
      gap: 0.375rem;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.625rem;
      border-radius: 6px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    .badge-info {
      background: rgba(6, 182, 212, 0.1);
      color: #67e8f9;
      border: 1px solid rgba(6, 182, 212, 0.2);
    }
    .badge-primary {
      background: rgba(99, 102, 241, 0.1);
      color: #a5b4fc;
      border: 1px solid rgba(99, 102, 241, 0.2);
    }
    .actions-group {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
    }
    @media (max-width: 900px) {
      .header-section {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        gap: 0.75rem;
      }
      .add-btn {
        position: static;
        transform: none;
        justify-content: center;
      }
      .table-container {
        max-height: calc(100vh - 280px);
        min-height: 260px;
      }
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 0.375rem;
      font-size: 0.875rem;
      font-weight: 600;
      border: 1px solid transparent;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
      padding: 0.5rem 1rem;
    }
    .btn-sm {
      padding: 0.375rem 0.75rem;
      font-size: 0.8125rem;
    }
    .btn-primary {
      background: var(--primary-color);
      color: #fff;
    }
    .btn-primary:hover {
      box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
    }
    .btn-secondary {
      background: var(--bg-card);
      border-color: var(--border-color);
      color: #fff;
    }
    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.05);
    }
    .btn-danger {
      background: rgba(239, 68, 68, 0.1);
      color: #fca5a5;
      border-color: rgba(239, 68, 68, 0.2);
    }
    .btn-danger:hover {
      background: rgba(239, 68, 68, 0.2);
    }
    .modal-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal-container {
      background: #111827;
      border: 1px solid var(--border-color);
      border-radius: 16px;
      width: 100%;
      max-width: 440px;
      max-height: min(90vh, 760px);
      display: flex;
      flex-direction: column;
      box-shadow: var(--shadow-lg);
    }
    .schedule-modal {
      width: min(92vw, 620px);
      max-width: 620px;
    }
    .modal-header {
      padding: 1.25rem;
      border-bottom: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-header h3 {
      font-size: 1.15rem;
      font-weight: 700;
      color: #fff;
      margin: 0;
    }
    .modal-body {
      padding: 1.25rem;
      overflow-y: auto;
    }
    .modal-footer {
      padding: 1.25rem;
      border-top: 1px solid var(--border-color);
      display: flex;
      justify-content: flex-end;
      flex-wrap: wrap;
      gap: 0.75rem;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.375rem;
    }
    .form-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--text-secondary);
    }
    .form-control {
      background: rgba(31, 41, 55, 0.5);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      color: #fff;
      padding: 0.5rem 0.75rem;
      font-size: 0.9375rem;
      transition: all 0.2s;
    }
    .form-control:focus {
      border-color: var(--primary-color);
      outline: none;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.15);
    }
    .close-btn {
      background: none;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0.25rem;
      border-radius: 50%;
    }
    .close-btn:hover {
      background: rgba(255, 255, 255, 0.05);
      color: #fff;
    }
    .schedule-edit-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0.75rem;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }
    .quick-time-section {
      margin: 0.75rem 0 1rem;
    }
    .quick-time-label {
      display: block;
      margin-bottom: 0.45rem;
      color: var(--text-secondary);
      font-size: 0.82rem;
      font-weight: 700;
    }
    .quick-time-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
      gap: 0.45rem;
    }
    .quick-time-btn {
      border: 1px solid var(--border-color);
      background: var(--bg-primary);
      color: var(--text-primary);
      border-radius: var(--radius-sm);
      padding: 0.55rem 0.45rem;
      font-weight: 700;
      cursor: pointer;
      font-size: 0.78rem;
    }
    .quick-time-btn:hover,
    .quick-time-btn.active {
      border-color: var(--accent-primary);
      background: rgba(99, 102, 241, 0.16);
      color: #fff;
    }
    .add-slot-form {
      display: grid;
      grid-template-columns: minmax(112px, 1fr) minmax(112px, 1fr) minmax(112px, 1fr) 48px;
      gap: 0.75rem;
      align-items: end;
      width: 100%;
    }
    .add-slot-btn {
      width: 48px;
      height: 40px;
      padding: 0;
      flex: 0 0 48px;
    }
    .add-slot-form .form-control {
      width: 100%;
      min-width: 0;
    }
    .class-date-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.75rem;
    }
    @media (max-width: 560px) {
      .schedule-modal {
        width: calc(100vw - 2rem);
      }
      .add-slot-form {
        grid-template-columns: 1fr 1fr;
      }
      .add-slot-form .form-group:first-child {
        grid-column: 1 / -1;
      }
      .add-slot-btn {
        grid-column: 1 / -1;
        width: 100%;
      }
      .modal-footer {
        justify-content: stretch;
      }
      .modal-footer .btn {
        flex: 1 1 140px;
        min-height: 40px;
      }
      .class-date-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ClassesComponent implements OnInit {
  private apiService = inject(ApiService);

  public classes = signal<Class[]>([]);
  public subjects = signal<Subject[]>([]);
  public users = signal<UserAccount[]>([]);
  public formError = signal<string>('');
  public scheduleError = signal<string>('');

  public showAddModal = signal<boolean>(false);
  public modalMode = signal<'add' | 'edit'>('add');
  public editForm = {
    id: 0,
    name: '',
    teacherId: null as number | null,
    subjectId: null as number | null,
    startDate: '',
    endDate: '',
    tuitionFee: 1200
  };

  public showScheduleModal = signal<boolean>(false);
  public selectedClass = signal<Class | null>(null);
  public tempSchedules = signal<ClassSchedule[]>([]);

  // Form helpers for schedule
  public newDay = 'T2';
  public newStartTime = '';
  public newEndTime = '';
  public schedulePresets = [
    { label: '7:15-9:00', start: '07:15', end: '09:00' },
    { label: '7:30-9:00', start: '07:30', end: '09:00' },
    { label: '9:15-10:45', start: '09:15', end: '10:45' },
    { label: '9:15-11:00', start: '09:15', end: '11:00' },
    { label: '11:00-11:30', start: '11:00', end: '11:30' },
    { label: '13:30-15:00', start: '13:30', end: '15:00' },
    { label: '13:30-15:15', start: '13:30', end: '15:15' },
    { label: '15:00-16:45', start: '15:00', end: '16:45' },
    { label: '15:15-17:00', start: '15:15', end: '17:00' },
    { label: '17:15-19:00', start: '17:15', end: '19:00' },
    { label: '19:15-21:00', start: '19:15', end: '21:00' }
  ];

  constructor() {
    effect(() => {
      const semId = this.apiService.selectedSemesterId();
      if (semId) {
        this.loadClasses(semId);
      }
    });
  }

  ngOnInit() {
    this.loadSubjects();
    this.loadUsers();
  }

  loadClasses(semesterId: number) {
    this.apiService.getClasses(semesterId).subscribe(data => this.classes.set(data));
  }

  loadSubjects() {
    this.apiService.getSubjects().subscribe(data => this.subjects.set(data));
  }

  loadUsers() {
    this.apiService.getUsers().subscribe(data => this.users.set(data));
  }

  teachers(): UserAccount[] {
    return this.users().filter(u => u.role === 'Teacher' && u.status === 'Active');
  }

  filteredSubjects(): Subject[] {
    const teacher = this.teachers().find(t => t.id === Number(this.editForm.teacherId));
    if (!teacher) return [];
    return this.subjects().filter(s => teacher.subjectIds.includes(s.id));
  }

  getSubjectName(subjectId?: number | null): string {
    if (!subjectId) return '';
    const sub = this.subjects().find(s => s.id === subjectId);
    return sub ? sub.name : '';
  }

  getTeacherName(teacherId?: number | null): string {
    if (!teacherId) return '';
    const teacher = this.users().find(u => u.id === teacherId);
    return teacher ? teacher.fullName : '';
  }

  formatTuition(amount?: number): string {
    if (amount === undefined || amount === null) return '0 k';
    return amount.toLocaleString() + ' k';
  }

  deleteClass(id: number) {
    if (confirm('Bạn có chắc chắn muốn xóa lớp học này? Chỉ lớp chưa có học sinh mới được xóa.')) {
      this.apiService.deleteClass(id).subscribe({
        next: () => {
          const semId = this.apiService.selectedSemesterId();
          if (semId) this.loadClasses(semId);
        },
        error: (err) => {
          console.error('Error deleting class', err);
          alert(err.error?.message || 'Không thể xóa lớp học.');
        }
      });
    }
  }

  // Add/Edit Class Modal
  openAddModal() {
    this.loadSubjects();
    this.loadUsers();
    this.formError.set('');
    this.modalMode.set('add');
    this.editForm = {
      id: 0,
      name: '',
      teacherId: null,
      subjectId: null,
      startDate: '',
      endDate: '',
      tuitionFee: 1200
    };
    this.showAddModal.set(true);
  }

  openEditModal(cls: Class) {
    this.loadSubjects();
    this.loadUsers();
    this.formError.set('');
    this.modalMode.set('edit');
    this.editForm = {
      id: cls.id,
      name: cls.name,
      teacherId: (cls as any).teacherId || null,
      subjectId: (cls as any).subjectId || null,
      startDate: (cls as any).startDate || '',
      endDate: (cls as any).endDate || '',
      tuitionFee: (cls as any).tuitionFee || 0
    };
    this.showAddModal.set(true);
  }

  closeAddModal() {
    this.formError.set('');
    this.showAddModal.set(false);
  }

  onTeacherChange() {
    const allowedSubjectIds = this.filteredSubjects().map(s => s.id);
    if (!this.editForm.subjectId || !allowedSubjectIds.includes(Number(this.editForm.subjectId))) {
      this.editForm.subjectId = null;
    }
  }

  saveClass() {
    const semId = this.apiService.selectedSemesterId();
    if (!semId) {
      this.formError.set('Chưa có học kỳ đang chọn. Vui lòng tạo hoặc import học kỳ trước khi lưu lớp.');
      return;
    }
    if (this.editForm.startDate && this.editForm.endDate && this.editForm.endDate < this.editForm.startDate) {
      this.formError.set('Ngày kết thúc lớp học phải lớn hơn hoặc bằng ngày bắt đầu.');
      return;
    }
    this.formError.set('');

    const payload = {
      id: this.editForm.id,
      name: this.editForm.name.trim(),
      semesterId: semId,
      teacherId: this.editForm.teacherId ? Number(this.editForm.teacherId) : null,
      subjectId: this.editForm.subjectId ? Number(this.editForm.subjectId) : null,
      startDate: this.editForm.startDate || null,
      endDate: this.editForm.endDate || null,
      tuitionFee: Number(this.editForm.tuitionFee)
    };

    const request = this.modalMode() === 'add'
      ? this.apiService.createClass(payload)
      : this.apiService.updateClass(this.editForm.id, payload);

    request.subscribe({
      next: () => {
        this.loadClasses(semId);
        this.closeAddModal();
      },
      error: (err) => {
        console.error('Error saving class', err);
        this.formError.set(err.error?.message || 'Không thể lưu lớp học. Vui lòng kiểm tra lại thông tin.');
      }
    });
  }

  // Schedule Modal
  openScheduleModal(cls: Class) {
    this.selectedClass.set(cls);
    this.tempSchedules.set([...(cls.schedules || [])]);
    this.newDay = 'T2';
    this.newStartTime = '';
    this.newEndTime = '';
    this.scheduleError.set('');
    this.showScheduleModal.set(true);
  }

  closeScheduleModal() {
    this.scheduleError.set('');
    this.showScheduleModal.set(false);
    this.selectedClass.set(null);
    this.tempSchedules.set([]);
  }

  addTempSchedule() {
    if (!this.newStartTime || !this.newEndTime) {
      this.scheduleError.set('Vui lòng chọn giờ bắt đầu và giờ kết thúc.');
      return;
    }

    if (this.newStartTime >= this.newEndTime) {
      this.scheduleError.set('Giờ kết thúc phải lớn hơn giờ bắt đầu.');
      return;
    }

    const timeSlot = `${this.newStartTime}-${this.newEndTime}`;
    const conflict = this.findLocalScheduleConflict(this.newDay, timeSlot);
    if (conflict) {
      this.scheduleError.set(conflict);
      return;
    }

    const newSlot: ClassSchedule = {
      dayOfWeek: this.newDay,
      timeSlot
    };
    this.tempSchedules.update(current => [...current, newSlot]);
    this.newStartTime = '';
    this.newEndTime = '';
    this.scheduleError.set('');
  }

  applySchedulePreset(preset: { start: string; end: string }) {
    this.newStartTime = preset.start;
    this.newEndTime = preset.end;
    this.scheduleError.set('');
  }

  removeTempSchedule(index: number) {
    this.tempSchedules.update(current => current.filter((_, idx) => idx !== index));
  }

  saveSchedules() {
    const cls = this.selectedClass();
    if (!cls) return;

    this.scheduleError.set('');
    this.apiService.setSchedules(cls.id, this.tempSchedules()).subscribe({
      next: () => {
        const semId = this.apiService.selectedSemesterId();
        if (semId) this.loadClasses(semId);
        this.closeScheduleModal();
      },
      error: (err) => {
        console.error('Error saving class schedules', err);
        this.scheduleError.set(err.error?.message || 'Không thể lưu lịch học. Vui lòng kiểm tra lại ca học.');
      }
    });
  }

  private findLocalScheduleConflict(dayOfWeek: string, timeSlot: string): string | null {
    if (!this.parseTimeSlot(timeSlot)) return 'Giờ học không hợp lệ.';

    const candidate = this.parseTimeSlot(timeSlot)!;
    const existingInModal = this.tempSchedules().find(s => {
      const parsed = this.parseTimeSlot(s.timeSlot);
      return s.dayOfWeek === dayOfWeek && parsed && this.timeRangesOverlap(candidate.start, candidate.end, parsed.start, parsed.end);
    });

    if (existingInModal) {
      return `Ca học bị trùng với lịch đang thêm: ${existingInModal.dayOfWeek} ${existingInModal.timeSlot}.`;
    }

    return null;
  }

  private parseTimeSlot(timeSlot: string): { start: string; end: string } | null {
    const parts = timeSlot.split('-').map(p => p.trim());
    if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
    return { start: parts[0], end: parts[1] };
  }

  private timeRangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
    return startA < endB && startB < endA;
  }
}

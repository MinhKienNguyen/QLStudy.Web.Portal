import { Component, OnInit, signal, computed, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Student } from '../api.service';

interface ScheduleSlot {
  classId: number;
  className: string;
  teacherName?: string | null;
}

type DayKey = 'T2' | 'T3' | 'T4' | 'T5' | 'T6' | 'T7' | 'CN';
type ScheduleCell = ScheduleSlot | ScheduleSlot[] | null;

interface ScheduleRow {
  timeSlot: string;
  T2: ScheduleCell;
  T3: ScheduleCell;
  T4: ScheduleCell;
  T5: ScheduleCell;
  T6: ScheduleCell;
  T7: ScheduleCell;
  CN: ScheduleCell;
}

@Component({
  selector: 'app-schedule',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="schedule-container">
      <div class="header-section">
        <h1>Thời Khóa Biểu Tuần</h1>
        <p>Lịch dạy của các lớp học trong tuần. Bấm vào lớp học để xem danh sách học sinh.</p>
      </div>

      <div class="schedule-layout-grid">
        <!-- Left Column: Weekly Schedule Grid -->
        <div class="schedule-main-panel">
          <div class="search-box-wrapper teacher-filter-box" style="max-width: 360px; margin-bottom: 0.75rem;">
            <span class="material-symbols-outlined search-icon">search</span>
            <input type="text"
                   class="form-control search-input"
                   placeholder="Tìm giáo viên..."
                   [ngModel]="teacherSearchQuery()"
                   (ngModelChange)="teacherSearchQuery.set($event)">
          </div>
          <div class="scroll-helper-badge">
            <span class="material-symbols-outlined">swipe_left</span>
            <span>Vuốt ngang để xem hết thời khóa biểu</span>
          </div>
          <div class="table-container">
            <table class="schedule-table">
              <thead>
                <tr>
                  <th>Ca Học</th>
                  <th>Thứ 2</th>
                  <th>Thứ 3</th>
                  <th>Thứ 4</th>
                  <th>Thứ 5</th>
                  <th>Thứ 6</th>
                  <th>Thứ 7</th>
                  <th>Chủ Nhật</th>
                </tr>
              </thead>
              <tbody>
                @for (row of filteredScheduleRows(); track row.timeSlot) {
                  <tr>
                    <td class="timeslot-cell">
                      <span class="material-symbols-outlined timeslot-icon">schedule</span>
                      {{ row.timeSlot }}
                    </td>
                    @for (day of ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']; track day) {
                      @let slots = getSlots(row, day);
                      <td class="class-cell" 
                          [ngClass]="{'empty-cell': slots.length === 0, 'active-cell': isSelectedCell(slots)}">
                        @if (slots.length > 0) {
                          <div class="class-stack">
                            @for (slot of slots; track slot.classId) {
                              <button type="button" class="class-block" [style.background-color]="getClassColor(slot.className)" (click)="onCellClick(slot)">
                                <span class="class-title">{{ slot.className }}</span>
                                @if (slot.teacherName) {
                                  <span class="teacher-name">{{ slot.teacherName }}</span>
                                }
                                <span class="view-tag">Xem lớp</span>
                              </button>
                            }
                          </div>
                        } @else {
                          <span class="empty-tag">-</span>
                        }
                      </td>
                    }
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--text-secondary);">
                      Không có dữ liệu thời khóa biểu cho học kỳ này.
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <!-- Right Column: Class Details Sidebar -->
        <div class="schedule-sidebar-panel">
          @if (selectedClassName()) {
            <div class="card sidebar-details-card">
              <div class="sidebar-details-header">
                <div>
                  <h3>Lớp {{ selectedClassName() }}</h3>
                  @if (selectedTeacherName()) {
                    <span class="teacher-lbl">GV: <strong>{{ selectedTeacherName() }}</strong></span>
                  }
                  <span class="student-count-lbl">Sĩ số: <strong>{{ classStudents().length }} học sinh</strong></span>
                </div>
                <button class="close-btn-secondary" (click)="selectedClassName.set(''); selectedTeacherName.set(''); selectedClassId.set(null);" title="Đóng chi tiết">
                  <span class="material-symbols-outlined">close</span>
                </button>
              </div>

              <!-- Search and Action Row -->
              <div class="sidebar-actions-row">
                <div class="search-box-wrapper">
                  <span class="material-symbols-outlined search-icon">search</span>
                  <input type="text" class="form-control search-input" 
                         placeholder="Tìm tên học sinh..." 
                         [ngModel]="studentSearchQuery()"
                         (ngModelChange)="studentSearchQuery.set($event)">
                </div>
                <button class="btn btn-primary add-student-btn" (click)="openAddStudentModal()" title="Thêm học sinh">
                  <span class="material-symbols-outlined">person_add</span>
                  <span>Thêm</span>
                </button>
              </div>

              <!-- Student Roster List -->
              <div class="student-list-container">
                @for (student of filteredClassStudents(); track student.id; let idx = $index) {
                  <div class="student-row-item">
                    <span class="student-num">{{ idx + 1 }}</span>
                    <div class="student-info-main">
                      <span class="student-name">{{ student.name }}</span>
                      <span class="badge-info-soft">Bắt đầu: {{ student.startMonth || 'T7' }}</span>
                    </div>
                    <div class="student-actions">
                      <button class="icon-btn-danger" (click)="deleteStudent(student.id)" title="Xóa">
                        <span class="material-symbols-outlined">delete</span>
                      </button>
                    </div>
                  </div>
                } @empty {
                  <div class="empty-roster">
                    <span class="material-symbols-outlined empty-icon">group</span>
                    <span>{{ studentSearchQuery().trim() ? 'Không tìm thấy học sinh phù hợp.' : 'Chưa có học sinh nào.' }}</span>
                  </div>
                }
              </div>
            </div>
          } @else {
            <div class="card sidebar-empty-card">
              <span class="material-symbols-outlined large-icon">school</span>
              <h3>Chi tiết lớp học</h3>
              <p>Bấm chọn một lớp học trên thời khóa biểu để xem danh sách học sinh và quản lý thông tin.</p>
            </div>
          }
        </div>
      </div>

      <!-- Modal Add / Edit Student -->
      @if (showStudentModal()) {
        <div class="modal-overlay">
          <div class="modal-container">
            <div class="modal-header">
              <h3>{{ isEditMode() ? 'Chỉnh sửa học sinh lớp ' : 'Thêm học sinh vào lớp ' }} {{ selectedClassName() }}</h3>
              <button class="close-btn" (click)="closeStudentModal()">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
            <div class="modal-body">
              <div class="form-group student-combobox">
                <label class="form-label">Chọn học sinh</label>
                <div class="combobox-input-wrap">
                  <input type="text" class="form-control" placeholder="Nhập tên học sinh để tìm..." 
                         [ngModel]="studentPickerSearchQuery()"
                         (focus)="studentDropdownOpen.set(true)"
                         (click)="studentDropdownOpen.set(true)"
                         (blur)="closeStudentDropdownSoon()"
                         (ngModelChange)="onStudentPickerSearchChange($event)">
                  <span class="material-symbols-outlined combobox-arrow">expand_more</span>
                </div>
                @if (studentDropdownOpen()) {
                  <div class="student-picker-dropdown">
                    @for (student of filteredAvailableStudents(); track student.id) {
                      <button type="button"
                              class="student-picker-item"
                              [class.selected]="selectedStudentId() === student.id"
                              (mousedown)="$event.preventDefault()"
                              (click)="selectStudentForClass(student)">
                        <span>{{ student.name }}</span>
                        @if (student.classNames?.length) {
                          <small>{{ student.classNames!.join(', ') }}</small>
                        } @else {
                          <small>Chưa tham gia lớp nào</small>
                        }
                      </button>
                    } @empty {
                      <div class="empty-picker">Không tìm thấy học sinh phù hợp.</div>
                    }
                  </div>
                }
              </div>
              <div class="form-group">
                <label class="form-label">Tháng bắt đầu học</label>
                <input type="text" class="form-control" placeholder="Ví dụ: T7, T9..." [(ngModel)]="studentForm.startMonth">
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeStudentModal()">Hủy</button>
              <button class="btn btn-primary" (click)="saveStudent()" [disabled]="!selectedStudentId()">Lưu</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .schedule-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
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

    /* Layout grid */
    .schedule-layout-grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) 340px;
      gap: 1.5rem;
      align-items: start;
    }
    @media (max-width: 1200px) {
      .schedule-layout-grid {
        grid-template-columns: 1fr;
      }
    }

    .schedule-main-panel {
      width: 100%;
      overflow: visible;
    }
    .schedule-main-panel .table-container {
      overflow-x: auto;
      max-width: 100%;
      -webkit-overflow-scrolling: touch;
    }

    /* Custom scrollbar for schedule board table container */
    .schedule-main-panel .table-container::-webkit-scrollbar {
      height: 6px;
    }
    .schedule-main-panel .table-container::-webkit-scrollbar-track {
      background: var(--bg-primary);
    }
    .schedule-main-panel .table-container::-webkit-scrollbar-thumb {
      background: var(--border-color);
      border-radius: 3px;
    }
    .schedule-main-panel .table-container::-webkit-scrollbar-thumb:hover {
      background: var(--text-muted);
    }

    /* Mobile scrollhelper */
    .scroll-helper-badge {
      display: none;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      background-color: var(--bg-secondary);
      border: 1px solid var(--border-light);
      border-radius: var(--radius-sm);
      padding: 0.5rem;
      font-size: 0.75rem;
      color: var(--text-secondary);
      margin-bottom: 0.75rem;
      width: 100%;
      box-shadow: var(--shadow-sm);
    }

    @media (max-width: 768px) {
      .scroll-helper-badge {
        display: flex;
      }
    }

    /* Grid Schedule Table styles */
    .schedule-table {
      width: 100%;
      border-collapse: collapse;
      text-align: center;
      table-layout: fixed;
      min-width: 800px;
    }
    .schedule-table th {
      background-color: rgba(255, 255, 255, 0.02);
      color: var(--text-secondary);
      font-weight: 600;
      font-size: 0.875rem;
      padding: 1.25rem 0.5rem;
      border-bottom: 1px solid var(--border-color);
      width: 12.5%;
    }
    .schedule-table td {
      padding: 0.35rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.02);
      border-right: 1px solid rgba(255, 255, 255, 0.02);
      vertical-align: top;
      height: 110px;
    }
    .schedule-table td:last-child {
      border-right: none;
    }
    .timeslot-cell {
      font-weight: 600;
      color: var(--text-primary);
      background-color: rgba(0, 0, 0, 0.05);
      font-size: 0.875rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.25rem;
      height: 95px !important;
      border-right: 1px solid var(--border-color) !important;
      padding: 0.5rem !important;
    }
    .timeslot-icon {
      font-size: 1.2rem;
      color: var(--text-secondary);
    }
    .class-cell {
      transition: background-color 0.2s;
    }
    .active-cell {
      outline: 2px solid var(--accent-primary);
      outline-offset: -2px;
      border-radius: var(--radius-md);
    }
    .class-stack {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      min-height: 100%;
    }
    .class-block {
      position: relative;
      width: 100%;
      min-height: 76px;
      border-radius: var(--radius-md);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 0.5rem;
      color: #ffffff;
      font-weight: 600;
      font-size: 0.825rem;
      box-shadow: var(--shadow-sm);
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      overflow: hidden;
      border: 0;
      cursor: pointer;
    }
    .class-block::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0) 100%);
      pointer-events: none;
    }
    .class-block:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md), 0 4px 12px rgba(0, 0, 0, 0.15);
      filter: brightness(1.15);
    }
    .class-title {
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      text-align: center;
      line-height: 1.25;
    }
    .teacher-name {
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-size: 0.7rem;
      font-weight: 600;
      opacity: 0.9;
      margin-top: 0.2rem;
      line-height: 1.2;
    }
    .view-tag {
      font-size: 0.65rem;
      opacity: 0.7;
      text-transform: uppercase;
      margin-top: 0.35rem;
      letter-spacing: 0.05em;
    }
    .empty-cell {
      cursor: default;
    }
    .empty-tag {
      color: var(--text-muted);
      font-weight: 300;
    }

    /* Sidebar Class Details */
    .schedule-sidebar-panel {
      position: sticky;
      top: 5rem;
    }
    @media (max-width: 1200px) {
      .schedule-sidebar-panel {
        position: static;
        margin-top: 1.5rem;
      }
    }
    .sidebar-details-card {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      padding: 1.25rem;
      min-height: 480px;
      border: 1px solid var(--border-light);
    }
    .sidebar-details-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 0.75rem;
    }
    .sidebar-details-header h3 {
      font-size: 1.25rem;
      font-weight: 700;
    }
    .student-count-lbl {
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin-top: 0.15rem;
      display: block;
    }
    .teacher-lbl {
      font-size: 0.8rem;
      color: var(--text-secondary);
      margin-top: 0.2rem;
      display: block;
    }
    .teacher-lbl strong {
      color: var(--text-primary);
      font-weight: 700;
    }
    .close-btn-secondary {
      background: transparent;
      border: none;
      color: var(--text-secondary);
      cursor: pointer;
      display: flex;
      align-items: center;
      border-radius: 50%;
      padding: 0.25rem;
      transition: background-color 0.2s, color 0.2s;
      outline: none;
    }
    .close-btn-secondary:hover {
      background-color: rgba(255, 255, 255, 0.05);
      color: var(--text-primary);
    }

    .sidebar-actions-row {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }
    .search-box-wrapper {
      position: relative;
      flex-grow: 1;
      display: flex;
      align-items: center;
    }
    .search-box-wrapper .search-icon {
      position: absolute;
      left: 0.75rem;
      font-size: 1.15rem;
      color: var(--text-muted);
      pointer-events: none;
    }
    .search-box-wrapper .search-input {
      padding-left: 2.25rem;
      font-size: 0.8rem;
      height: 36px;
      border-radius: var(--radius-sm);
    }
    .add-student-btn {
      height: 36px;
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      font-size: 0.8rem;
      padding: 0 0.75rem;
      border-radius: var(--radius-sm);
      white-space: nowrap;
    }

    /* Student List */
    .student-list-container {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-height: 400px;
      overflow-y: auto;
      padding-right: 4px;
    }
    .student-row-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.6rem 0.75rem;
      background-color: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      transition: transform 0.15s, border-color 0.15s;
    }
    .student-row-item:hover {
      transform: translateX(2px);
      border-color: var(--text-muted);
    }
    .student-num {
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--text-muted);
      width: 16px;
      text-align: center;
    }
    .student-info-main {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
      flex-grow: 1;
    }
    .student-name {
      font-weight: 600;
      font-size: 0.875rem;
      color: var(--text-primary);
    }
    .combobox-input-wrap {
      position: relative;
    }
    .combobox-arrow {
      position: absolute;
      right: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-secondary);
      pointer-events: none;
    }
    .student-picker-dropdown {
      display: flex;
      flex-direction: column;
      max-height: 240px;
      overflow-y: auto;
      margin-top: 0.35rem;
      margin-bottom: 1rem;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      background: var(--bg-secondary);
      box-shadow: var(--shadow-lg);
    }
    .student-picker-item {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      width: 100%;
      padding: 0.7rem 0.85rem;
      border: 0;
      border-bottom: 1px solid var(--border-color);
      background: var(--bg-primary);
      color: var(--text-primary);
      cursor: pointer;
      text-align: left;
    }
    .student-picker-item:hover,
    .student-picker-item.selected {
      background: rgba(99, 102, 241, 0.12);
    }
    .student-picker-item span {
      font-weight: 700;
    }
    .student-picker-item small,
    .empty-picker {
      color: var(--text-secondary);
      font-size: 0.78rem;
    }
    .empty-picker {
      padding: 0.9rem;
      text-align: center;
    }
    .badge-info-soft {
      font-size: 0.65rem;
      padding: 0.15rem 0.4rem;
      background-color: rgba(14, 165, 233, 0.1);
      color: var(--color-info);
      font-weight: 600;
      border-radius: 4px;
      width: fit-content;
    }
    .badge-status-soft {
      width: fit-content;
      padding: 0.12rem 0.4rem;
      border-radius: var(--radius-sm);
      background: rgba(245, 158, 11, 0.14);
      color: #fbbf24;
      font-size: 0.7rem;
      font-weight: 700;
    }
    .badge-status-soft.stopped {
      background: rgba(239, 68, 68, 0.14);
      color: #f87171;
    }
    .student-actions {
      display: flex;
      gap: 0.15rem;
      opacity: 0;
      transition: opacity 0.2s;
    }
    .student-row-item:hover .student-actions {
      opacity: 1;
    }
    .icon-btn-secondary, .icon-btn-danger {
      background: transparent;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: var(--radius-sm);
      color: var(--text-secondary);
      transition: all 0.2s;
      outline: none;
    }
    .icon-btn-secondary:hover {
      background-color: rgba(255, 255, 255, 0.05);
      color: var(--text-primary);
    }
    .icon-btn-danger:hover {
      background-color: rgba(239, 68, 68, 0.1);
      color: var(--color-danger);
    }

    .empty-roster {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 3rem 1rem;
      color: var(--text-muted);
      gap: 0.5rem;
      text-align: center;
      font-size: 0.8rem;
    }
    .empty-roster .empty-icon {
      font-size: 2rem;
    }

    /* Empty state */
    .sidebar-empty-card {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      text-align: center;
      padding: 4rem 1.5rem;
      gap: 1rem;
      color: var(--text-secondary);
      min-height: 480px;
      border: 1px solid var(--border-light);
    }
    .sidebar-empty-card .large-icon {
      font-size: 4rem;
      color: var(--text-muted);
      opacity: 0.4;
    }
    .sidebar-empty-card h3 {
      font-size: 1.15rem;
      font-weight: 600;
      color: var(--text-primary);
    }
    .sidebar-empty-card p {
      font-size: 0.8rem;
      line-height: 1.5;
      max-width: 240px;
    }

    /* Styling adjustments for light background mode active student name */
    [data-bg="white"] .student-name,
    [data-bg="yellow"] .student-name,
    [data-bg="pink"] .student-name {
      color: #0f172a;
    }
  `]
})
export class ScheduleComponent implements OnInit {
  private apiService = inject(ApiService);

  // States
  public scheduleRows = signal<ScheduleRow[]>([]);
  public selectedClassId = signal<number | null>(null);
  public selectedClassName = signal<string>('');
  public selectedTeacherName = signal<string>('');
  public classStudents = signal<Student[]>([]);
  public availableStudents = signal<Student[]>([]);
  
  // Search state
  public teacherSearchQuery = signal<string>('');
  public studentSearchQuery = signal<string>('');
  public studentPickerSearchQuery = signal<string>('');
  public selectedStudentId = signal<number | null>(null);
  public studentDropdownOpen = signal<boolean>(false);

  // Filtered computed list
  public filteredClassStudents = computed(() => {
    const query = this.studentSearchQuery().toLowerCase().trim();
    const students = this.classStudents();
    if (!query) return students;
    return students.filter(s => s.name.toLowerCase().includes(query));
  });

  public filteredScheduleRows = computed(() => {
    const query = this.teacherSearchQuery().toLowerCase().trim();
    const rows = this.scheduleRows();
    if (!query) return rows;

    const days: DayKey[] = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    return rows
      .map(row => {
        const filteredRow: ScheduleRow = { ...row };
        days.forEach(day => {
          filteredRow[day] = this.getCellSlots(row[day])
            .filter(slot => (slot.teacherName || '').toLowerCase().includes(query));
        });
        return filteredRow;
      })
      .filter(row => days.some(day => this.getCellSlots(row[day]).length > 0));
  });

  public filteredAvailableStudents = computed(() => {
    const query = this.studentPickerSearchQuery().toLowerCase().trim();
    const classId = this.selectedClassId();
    const currentStudentIds = new Set(this.classStudents().map(s => s.id));

    return this.availableStudents()
      .filter(s => !currentStudentIds.has(s.id) && (!classId || !(s.classIds || []).includes(classId)))
      .filter(s => !query || s.name.toLowerCase().includes(query));
  });

  // Add/Edit student form states
  public showStudentModal = signal<boolean>(false);
  public isEditMode = signal<boolean>(false);
  public studentForm = {
    id: 0,
    name: '',
    startMonth: 'T7'
  };

  // Colors mapping for classes (premium palettes)
  private classColors: { [className: string]: string } = {};
  private preselectedColors = [
    '#6366f1', // Indigo soft
    '#0d9488', // Teal-emerald
    '#7c3aed', // Violet
    '#e11d48', // Rose
    '#d97706', // Amber
    '#0891b2', // Cyan
    '#2563eb', // Slate blue
    '#db2777', // Pink
  ];
  private colorCounter = 0;

  constructor() {
    // Reload weekly schedule grid when semester selection changes
    effect(() => {
      const semId = this.apiService.selectedSemesterId();
      if (semId) {
        this.selectedClassName.set('');
        this.selectedTeacherName.set('');
        this.selectedClassId.set(null);
        this.classStudents.set([]);
        this.loadSchedule(semId);
      }
    });
  }

  ngOnInit() {}

  loadSchedule(semesterId: number) {
    this.apiService.getSchedule(semesterId).subscribe({
      next: (data) => {
        this.scheduleRows.set(data as ScheduleRow[]);
      },
      error: (err) => {
        console.error('Error loading schedule', err);
      }
    });
  }

  getSlots(row: ScheduleRow, day: string): ScheduleSlot[] {
    return this.getCellSlots(row[day as DayKey]);
  }

  private getCellSlots(cell: ScheduleCell): ScheduleSlot[] {
    if (!cell) return [];
    return Array.isArray(cell) ? cell : [cell];
  }

  isSelectedCell(slots: ScheduleSlot[]): boolean {
    const selectedId = this.selectedClassId();
    return !!selectedId && slots.some(slot => slot.classId === selectedId);
  }

  getClassColor(className: string): string {
    if (this.classColors[className]) {
      return this.classColors[className];
    }
    const color = this.preselectedColors[this.colorCounter % this.preselectedColors.length];
    this.colorCounter++;
    this.classColors[className] = color;
    return color;
  }

  onCellClick(slot: ScheduleSlot | null) {
    if (!slot) return;
    this.selectedClassId.set(slot.classId);
    this.selectedClassName.set(slot.className);
    this.selectedTeacherName.set(slot.teacherName || '');
    this.studentSearchQuery.set(''); // Clear search query when changing class
    
    // Fetch students of this class
    this.apiService.getStudents(slot.classId).subscribe({
      next: (data) => {
        this.classStudents.set(data);
        
        // Scroll to sidebar on mobile screens so it is not hidden below the fold
        if (window.innerWidth <= 1200) {
          setTimeout(() => {
            const sidebar = document.querySelector('.schedule-sidebar-panel');
            if (sidebar) {
              sidebar.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 80);
        }
      },
      error: (err) => {
        console.error('Error loading class students', err);
      }
    });
  }



  getStudentClassStartMonth(student: Student): string {
    const classId = this.selectedClassId();
    return classId && student.classStartMonths?.[classId] ? student.classStartMonths[classId] : (student.startMonth || 'T7');
  }

  getClassStatus(student: Student): string {
    const classId = this.selectedClassId();
    return classId && student.classStatuses?.[classId] ? student.classStatuses[classId] : 'Active';
  }

  formatClassStatus(status: string): string {
    if (status === 'Paused') return 'Tạm nghỉ';
    if (status === 'Stopped') return 'Nghỉ hẳn';
    return 'Đang học';
  }

  changeEnrollmentStatus(student: Student, action: 'pause' | 'resume' | 'stop') {
    const classId = this.selectedClassId();
    if (!classId) return;

    const actionText = action === 'pause' ? 'tạm nghỉ từ tháng' : action === 'resume' ? 'học lại từ tháng' : 'nghỉ hẳn từ tháng';
    const defaultMonth = this.getStudentClassStartMonth(student) || 'T7';
    const month = prompt('Nhập tháng ' + actionText + ' cho ' + student.name + ' (ví dụ T8 hoặc T9/2026):', defaultMonth);
    if (!month) return;

    const reason = prompt('Ghi chú lý do, có thể bỏ trống:', '') || '';
    this.apiService.updateStudentClassEnrollment(student.id, classId, action, month.trim(), reason.trim()).subscribe({
      next: () => {
        this.apiService.getStudents(classId).subscribe(data => this.classStudents.set(data));
      },
      error: (err) => {
        console.error('Error updating enrollment status', err);
        alert(err?.error?.message || 'Không thể cập nhật trạng thái học của học sinh.');
      }
    });
  }


  // Modal Add Student
  openAddStudentModal() {
    this.isEditMode.set(false);
    this.selectedStudentId.set(null);
    this.studentPickerSearchQuery.set('');
    this.studentDropdownOpen.set(false);
    this.studentForm = {
      id: 0,
      name: '',
      startMonth: 'T7'
    };
    this.apiService.getStudents().subscribe({
      next: (data) => this.availableStudents.set(data),
      error: (err) => console.error('Error loading available students', err)
    });
    this.showStudentModal.set(true);
  }

  selectStudentForClass(student: Student) {
    const classId = this.selectedClassId();
    this.selectedStudentId.set(student.id);
    this.studentPickerSearchQuery.set(student.name);
    this.studentDropdownOpen.set(false);
    this.studentForm = {
      id: student.id,
      name: student.name,
      startMonth: classId && student.classStartMonths?.[classId] ? student.classStartMonths[classId] : (student.startMonth || 'T7')
    };
  }

  onStudentPickerSearchChange(value: string) {
    this.studentPickerSearchQuery.set(value);
    this.studentDropdownOpen.set(true);

    const selectedId = this.selectedStudentId();
    if (!selectedId) return;

    const selectedStudent = this.availableStudents().find(s => s.id === selectedId);
    if (!selectedStudent || selectedStudent.name !== value) {
      this.selectedStudentId.set(null);
    }
  }

  closeStudentDropdownSoon() {
    setTimeout(() => this.studentDropdownOpen.set(false), 120);
  }

  // Modal Edit Student
  openEditStudentModal(student: Student) {
    this.isEditMode.set(true);
    this.studentForm = {
      id: student.id,
      name: student.name,
      startMonth: student.startMonth || 'T7'
    };
    this.showStudentModal.set(true);
  }

  closeStudentModal() {
    this.showStudentModal.set(false);
    this.selectedStudentId.set(null);
    this.studentPickerSearchQuery.set('');
    this.studentDropdownOpen.set(false);
  }

  saveStudent() {
    const classId = this.selectedClassId();
    if (!classId) return;

    if (this.isEditMode()) {
      const updatedStudent = {
        id: this.studentForm.id,
        name: this.studentForm.name.trim(),
        classId: classId,
        startMonth: this.studentForm.startMonth.trim()
      };
      this.apiService.updateStudent(this.studentForm.id, updatedStudent).subscribe({
        next: () => {
          this.apiService.getStudents(classId).subscribe(data => {
            this.classStudents.set(data);
          });
          this.closeStudentModal();
        },
        error: (err) => console.error('Error updating student', err)
      });
    } else {
      const selectedStudent = this.availableStudents().find(s => s.id === this.selectedStudentId());
      if (!selectedStudent) return;

      const classIds = Array.from(new Set([...(selectedStudent.classIds || []), classId]));
      const classStartMonths = { ...(selectedStudent.classStartMonths || {}) };
      classStartMonths[classId] = this.studentForm.startMonth.trim();

      const updatedStudent = {
        id: selectedStudent.id,
        name: selectedStudent.name,
        phoneNumber: selectedStudent.phoneNumber,
        email: selectedStudent.email,
        startMonth: selectedStudent.startMonth || this.studentForm.startMonth.trim(),
        classIds,
        classStartMonths,
        rewardIds: selectedStudent.rewardIds || []
      };

      this.apiService.updateStudent(selectedStudent.id, updatedStudent).subscribe({
        next: () => {
          this.apiService.getStudents(classId).subscribe(data => {
            this.classStudents.set(data);
          });
          this.closeStudentModal();
        },
        error: (err) => {
          console.error('Error adding student to class', err);
          alert(err?.error?.message || 'Không thể thêm học sinh vào lớp.');
        }
      });
    }
  }

  deleteStudent(id: number) {
    if (confirm('Bạn có chắc chắn muốn xoá học sinh này khỏi hệ thống?')) {
      this.apiService.deleteStudent(id).subscribe({
        next: () => {
          const classId = this.selectedClassId();
          if (classId) {
            this.apiService.getStudents(classId).subscribe(data => {
              this.classStudents.set(data);
            });
          }
        },
        error: (err) => {
          console.error('Error deleting student', err);
          alert(err?.error?.message || 'Không thể xoá học sinh này.');
        }
      });
    }
  }
}

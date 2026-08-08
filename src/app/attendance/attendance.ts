import { Component, OnInit, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Class, AttendanceRecord } from '../api.service';
import { App } from '../app';

@Component({
  selector: 'app-attendance',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './attendance.html',
  styleUrl: './attendance.css'
})
export class AttendanceComponent implements OnInit {
  private apiService = inject(ApiService);
  private app = inject(App);

  public classes = signal<Class[]>([]);
  public selectedClassId = signal<number | null>(null);
  public selectedDate = signal<string>(new Date().toISOString().substring(0, 10)); // yyyy-MM-dd
  public attendanceRecords = signal<AttendanceRecord[]>([]);
  public historyDates = signal<any[]>([]);
  public sessionStatus = signal<'Normal' | 'Holiday' | 'ClassOff'>('Normal');

  // Statistics signals
  public totalCount = signal<number>(0);
  public presentCount = signal<number>(0);
  public absentCount = signal<number>(0);
  public lateCount = signal<number>(0);

  constructor() {
    // Listen to active semester changes to reload classes
    effect(() => {
      const semesterId = this.apiService.selectedSemesterId();
      if (semesterId) {
        this.loadClasses(semesterId);
      }
    });

    // Automatically load attendance when selected class or date changes
    effect(() => {
      const classId = this.selectedClassId();
      const date = this.selectedDate();
      if (classId && date) {
        this.loadAttendance(classId, date);
      } else {
        this.attendanceRecords.set([]);
        this.updateStats();
      }
    });

    // Automatically load history when class changes
    effect(() => {
      const classId = this.selectedClassId();
      if (classId) {
        this.loadHistory(classId);
      } else {
        this.historyDates.set([]);
      }
    });
  }

  ngOnInit() {
    // Initial load classes if semester is already selected
    const semesterId = this.apiService.selectedSemesterId();
    if (semesterId) {
      this.loadClasses(semesterId);
    }
  }

  loadClasses(semesterId: number) {
    this.apiService.getClasses(semesterId).subscribe({
      next: (data) => {
        this.classes.set(data);
        if (data.length > 0) {
          // If current selection is not in the new list, select the first class
          const currentId = this.selectedClassId();
          if (!currentId || !data.some(c => c.id === currentId)) {
            this.selectedClassId.set(data[0].id);
          }
        } else {
          this.selectedClassId.set(null);
        }
      },
      error: (err) => console.error('Error loading classes', err)
    });
  }

  setSelectedClassId(value: number | string | null) {
    const classId = value === null || value === '' ? null : Number(value);
    this.selectedClassId.set(classId && !Number.isNaN(classId) ? classId : null);
  }

  loadAttendance(classId: number, date: string) {
    const numericClassId = Number(classId);
    if (!numericClassId || Number.isNaN(numericClassId)) return;

    this.apiService.getAttendance(numericClassId, date).subscribe({
      next: (data) => {
        this.attendanceRecords.set(data);
        
        // Analyze session status
        if (data.length > 0 && data.every(r => r.status === 'Holiday')) {
          this.sessionStatus.set('Holiday');
        } else if (data.length > 0 && data.every(r => r.status === 'ClassOff')) {
          this.sessionStatus.set('ClassOff');
        } else {
          this.sessionStatus.set('Normal');
        }

        this.updateStats();
      },
      error: (err) => {
        console.error('Error loading attendance', err);
        this.app.showToast('Không thể tải dữ liệu điểm danh.', 'danger');
      }
    });
  }

  loadHistory(classId: number) {
    const numericClassId = Number(classId);
    if (!numericClassId || Number.isNaN(numericClassId)) return;

    this.apiService.getAttendanceHistory(numericClassId).subscribe({
      next: (dates) => {
        this.historyDates.set(dates);
      },
      error: (err) => console.error('Error loading attendance history', err)
    });
  }

  updateStats() {
    const list = this.attendanceRecords();
    this.totalCount.set(list.length);
    this.presentCount.set(list.filter(r => r.status === 'Present').length);
    this.absentCount.set(list.filter(r => r.status === 'Absent').length);
    this.lateCount.set(list.filter(r => r.status === 'Late').length);
  }

  setStatus(record: AttendanceRecord, status: 'Present' | 'Absent' | 'Late') {
    record.status = status;
    this.updateStats();
  }

  setAllStatus(status: 'Present' | 'Absent' | 'Late') {
    this.sessionStatus.set('Normal');
    const list = this.attendanceRecords().map(r => ({ ...r, status }));
    this.attendanceRecords.set(list);
    this.updateStats();
  }

  setSessionStatus(status: 'Normal' | 'Holiday' | 'ClassOff') {
    this.sessionStatus.set(status);
    if (status === 'Holiday') {
      const list = this.attendanceRecords().map(r => ({ ...r, status: 'Holiday' }));
      this.attendanceRecords.set(list);
    } else if (status === 'ClassOff') {
      const list = this.attendanceRecords().map(r => ({ ...r, status: 'ClassOff' }));
      this.attendanceRecords.set(list);
    } else {
      const list = this.attendanceRecords().map(r => ({ ...r, status: 'Present' }));
      this.attendanceRecords.set(list);
    }
    this.updateStats();
  }

  saveAttendance() {
    const classId = this.selectedClassId();
    const date = this.selectedDate();
    if (!classId || !date) return;

    this.apiService.saveAttendance(classId, date, this.attendanceRecords()).subscribe({
      next: () => {
        this.app.showToast('Lưu thông tin điểm danh thành công!', 'success');
        this.loadHistory(classId); // Refresh history
      },
      error: (err) => {
        console.error('Error saving attendance', err);
        this.app.showToast('Lưu điểm danh thất bại.', 'danger');
      }
    });
  }

  selectHistoryDate(dateStr: string) {
    this.selectedDate.set(dateStr);
  }

  deleteHistoryDate(dateStr: string) {
    const classId = this.selectedClassId();
    if (!classId) return;
    if (!confirm(`Bạn có chắc chắn muốn xoá lịch sử điểm danh ngày ${dateStr}?`)) return;

    this.apiService.deleteAttendance(classId, dateStr).subscribe({
      next: () => {
        this.app.showToast('Đã xoá lịch sử điểm danh.', 'success');
        this.loadHistory(classId);
        if (this.selectedDate() === dateStr) {
          this.loadAttendance(classId, dateStr);
        }
      },
      error: (err) => {
        console.error('Error deleting attendance history', err);
        this.app.showToast('Xoá lịch sử điểm danh thất bại.', 'danger');
      }
    });
  }
}

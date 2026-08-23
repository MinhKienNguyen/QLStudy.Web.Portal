import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../api.service';

export interface Announcement {
  id: number;
  title: string;
  content: string;
  type: 'Center' | 'Class';
  classId?: number | null;
  class?: { name: string } | null;
  startDate?: string | null;
  endDate?: string | null;
  createdAt?: string;
}

@Component({
  selector: 'app-announcements',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="announcements-container" style="max-width: 1000px; margin: 0 auto; padding: 2rem 1.5rem;">
      <div class="header-section" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <div>
          <h1 style="color: #fff; font-size: 1.75rem; margin: 0 0 0.5rem; font-weight: 700;">Quản lý Thông Báo</h1>
          <p style="color: var(--text-muted); margin: 0; font-size: 0.9rem;">Cấu hình các thông tin, thông báo chung hoặc thông báo theo lớp học và thời gian.</p>
        </div>
        <button class="btn btn-primary add-btn" (click)="openAddModal()" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.25rem;">
          <span class="material-symbols-outlined">add</span>
          <span>Đăng thông báo mới</span>
        </button>
      </div>

      <!-- Alert Messages -->
      <div class="alert alert-danger" *ngIf="errorMessage()" style="padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1.5rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #fca5a5;">
        {{ errorMessage() }}
      </div>

      <div class="alert alert-success" *ngIf="successMessage()" style="padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1.5rem; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2); color: #86efac;">
        {{ successMessage() }}
      </div>

      <!-- Announcements Table -->
      <div class="table-container" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);">
        <table class="data-table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: rgba(255, 255, 255, 0.02); border-bottom: 1px solid var(--border-color);">
              <th style="text-align: left; padding: 1rem;">Tiêu đề & Nội dung</th>
              <th style="width: 180px; text-align: left; padding: 1rem;">Phạm vi</th>
              <th style="width: 200px; text-align: left; padding: 1rem;">Thời gian hiển thị</th>
              <th style="width: 150px; text-align: center; padding: 1rem;">Hành động</th>
            </tr>
          </thead>
          <tbody>
            @for (a of announcements(); track a.id) {
              <tr style="border-bottom: 1px solid var(--border-color); transition: background-color 0.2s;">
                <td style="padding: 1rem; vertical-align: top;">
                  <div style="font-weight: 700; color: #fff; margin-bottom: 0.25rem;">{{ a.title }}</div>
                  <div style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4; white-space: pre-wrap;">{{ a.content }}</div>
                </td>
                <td style="padding: 1rem; vertical-align: top;">
                  @if (a.type === 'Center') {
                    <span class="badge badge-info" style="background: rgba(14, 165, 233, 0.12); color: var(--color-info); font-weight: 700;">Toàn trung tâm</span>
                  } @else {
                    <span class="badge badge-warning" style="background: rgba(245, 158, 11, 0.12); color: var(--color-warning); font-weight: 700; display: inline-flex; flex-direction: column; align-items: flex-start; gap: 0.15rem; border-radius: 6px; padding: 0.35rem 0.6rem;">
                      <span>Theo lớp</span>
                      <strong style="font-size: 0.75rem; text-decoration: underline;">{{ a.class?.name || 'Chưa chọn lớp' }}</strong>
                    </span>
                  }
                </td>
                <td style="padding: 1rem; color: var(--text-secondary); font-size: 0.85rem; vertical-align: top; line-height: 1.4;">
                  <div>Bắt đầu: <strong>{{ a.startDate ? (a.startDate | date:'dd/MM/yyyy') : 'Ngay lập tức' }}</strong></div>
                  <div>Kết thúc: <strong>{{ a.endDate ? (a.endDate | date:'dd/MM/yyyy') : 'Vô thời hạn' }}</strong></div>
                </td>
                <td style="text-align: center; padding: 1rem; vertical-align: middle;">
                  <div class="actions-group" style="display: flex; justify-content: center; gap: 0.5rem;">
                    <button class="btn btn-secondary btn-sm" (click)="openEditModal(a)" style="padding: 0.375rem 0.75rem;">
                      <span>Sửa</span>
                    </button>
                    <button class="btn btn-danger btn-sm" (click)="deleteAnnouncement(a)" style="padding: 0.375rem 0.75rem;">
                      <span>Xóa</span>
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 3rem; font-style: italic;">
                  Chưa cấu hình thông báo nào trong hệ thống.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Add/Edit Modal (Dialog Popup) -->
      <div class="modal-overlay" *ngIf="showModal()">
        <div class="modal-container" style="max-width: 550px; width: 550px; background: #121824; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; display: flex; flex-direction: column; max-height: 90vh;">
          <div class="modal-header" style="border-bottom: 1px solid rgba(255,255,255,0.05); padding: 1.25rem 1.5rem; display: flex; justify-content: space-between; align-items: center;">
            <h3 style="color: #fff; margin: 0; font-size: 1.25rem; font-weight: 700;">{{ modalMode() === 'add' ? 'Đăng Thông Báo Mới' : 'Cập nhật Thông Báo' }}</h3>
            <button class="close-btn" (click)="closeModal()" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.2rem;">&times;</button>
          </div>

          <form (submit)="saveAnnouncement($event)" style="display: flex; flex-direction: column; overflow: hidden; height: 100%; margin: 0;">
            <div class="modal-body" style="overflow-y: auto; flex-grow: 1; padding: 1.5rem;">
              <div class="form-group" style="margin-bottom: 1.25rem;">
                <label style="display: block; margin-bottom: 0.5rem; color: #d1d5db; font-size: 0.85rem;">Tiêu đề thông báo *</label>
                <input
                  type="text"
                  name="title"
                  [(ngModel)]="announcementForm.title"
                  placeholder="Ví dụ: Lịch thi cuối kỳ, Thông báo nghỉ lễ..."
                  required
                  style="width: 100%; padding: 0.75rem 1rem; border-radius: 10px; border: 1px solid var(--border-color); background: rgba(31, 41, 55, 0.5); color: #fff; font-size: 0.9rem;"
                />
              </div>

              <div class="form-group" style="margin-bottom: 1.25rem;">
                <label style="display: block; margin-bottom: 0.5rem; color: #d1d5db; font-size: 0.85rem;">Nội dung thông báo *</label>
                <textarea
                  name="content"
                  [(ngModel)]="announcementForm.content"
                  placeholder="Nhập nội dung thông báo chi tiết..."
                  required
                  rows="4"
                  style="width: 100%; padding: 0.75rem 1rem; border-radius: 10px; border: 1px solid var(--border-color); background: rgba(31, 41, 55, 0.5); color: #fff; font-size: 0.9rem; font-family: inherit; resize: vertical;"
                ></textarea>
              </div>

              <div class="form-group" style="margin-bottom: 1.25rem;">
                <label style="display: block; margin-bottom: 0.5rem; color: #d1d5db; font-size: 0.85rem;">Phạm vi hiển thị</label>
                <select
                  name="type"
                  [(ngModel)]="announcementForm.type"
                  style="width: 100%; padding: 0.75rem 1rem; border-radius: 10px; border: 1px solid var(--border-color); background: rgba(31, 41, 55, 0.5); color: #fff; font-size: 0.9rem; cursor: pointer;"
                >
                  <option value="Center">Toàn trung tâm</option>
                  <option value="Class">Theo lớp học</option>
                </select>
              </div>

              <div class="form-group" style="margin-bottom: 1.25rem;" *ngIf="announcementForm.type === 'Class'">
                <label style="display: block; margin-bottom: 0.5rem; color: #d1d5db; font-size: 0.85rem;">Chọn lớp học áp dụng *</label>
                <select
                  name="classId"
                  [(ngModel)]="announcementForm.classId"
                  required
                  style="width: 100%; padding: 0.75rem 1rem; border-radius: 10px; border: 1px solid var(--border-color); background: rgba(31, 41, 55, 0.5); color: #fff; font-size: 0.9rem; cursor: pointer;"
                >
                  <option [value]="null" disabled>-- Chọn lớp học --</option>
                  @for (c of classes(); track c.id) {
                    <option [value]="c.id">{{ c.name }}</option>
                  }
                </select>
              </div>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
                <div class="form-group">
                  <label style="display: block; margin-bottom: 0.5rem; color: #d1d5db; font-size: 0.85rem;">Ngày bắt đầu hiển thị</label>
                  <input
                    type="date"
                    name="startDate"
                    [(ngModel)]="announcementForm.startDate"
                    style="width: 100%; padding: 0.75rem 1rem; border-radius: 10px; border: 1px solid var(--border-color); background: rgba(31, 41, 55, 0.5); color: #fff; font-size: 0.9rem;"
                  />
                </div>
                <div class="form-group">
                  <label style="display: block; margin-bottom: 0.5rem; color: #d1d5db; font-size: 0.85rem;">Ngày kết thúc hiển thị</label>
                  <input
                    type="date"
                    name="endDate"
                    [(ngModel)]="announcementForm.endDate"
                    style="width: 100%; padding: 0.75rem 1rem; border-radius: 10px; border: 1px solid var(--border-color); background: rgba(31, 41, 55, 0.5); color: #fff; font-size: 0.9rem;"
                  />
                </div>
              </div>
            </div>

            <div class="modal-footer" style="border-top: 1px solid rgba(255,255,255,0.05); padding: 1rem 1.5rem; display: flex; justify-content: flex-end; gap: 0.75rem;">
              <button type="button" class="btn btn-secondary" (click)="closeModal()">Hủy</button>
              <button type="submit" class="btn btn-primary">Lưu thông báo</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class AnnouncementsComponent implements OnInit {
  private apiService = inject(ApiService);

  public announcements = signal<Announcement[]>([]);
  public classes = signal<any[]>([]);
  public showModal = signal<boolean>(false);
  public modalMode = signal<'add' | 'edit'>('add');

  public announcementForm = {
    id: 0,
    title: '',
    content: '',
    type: 'Center' as 'Center' | 'Class',
    classId: null as number | null,
    startDate: '',
    endDate: ''
  };

  public errorMessage = signal<string>('');
  public successMessage = signal<string>('');

  ngOnInit() {
    this.loadAnnouncements();
    this.loadClasses();
  }

  loadAnnouncements() {
    (this.apiService as any).getAnnouncements().subscribe({
      next: (data: Announcement[]) => this.announcements.set(data),
      error: (err: any) => console.error(err)
    });
  }

  loadClasses() {
    this.apiService.getClasses().subscribe({
      next: (data) => this.classes.set(data),
      error: (err) => console.error(err)
    });
  }

  openAddModal() {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.modalMode.set('add');
    this.announcementForm = {
      id: 0,
      title: '',
      content: '',
      type: 'Center',
      classId: null,
      startDate: '',
      endDate: ''
    };
    this.showModal.set(true);
  }

  openEditModal(a: Announcement) {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.modalMode.set('edit');
    this.announcementForm = {
      id: a.id,
      title: a.title,
      content: a.content,
      type: a.type,
      classId: a.classId || null,
      startDate: this.formatDateForInput(a.startDate),
      endDate: this.formatDateForInput(a.endDate)
    };
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  formatDateForInput(dateStr: string | null | undefined): string {
    if (!dateStr) return '';
    return dateStr.substring(0, 10); // Extracts 'yyyy-MM-dd'
  }

  saveAnnouncement(event: Event) {
    event.preventDefault();
    this.errorMessage.set('');
    this.successMessage.set('');

    const payload = {
      id: this.announcementForm.id,
      title: this.announcementForm.title.trim(),
      content: this.announcementForm.content.trim(),
      type: this.announcementForm.type,
      classId: this.announcementForm.type === 'Class' ? this.announcementForm.classId : null,
      startDate: this.announcementForm.startDate ? new Date(this.announcementForm.startDate).toISOString() : null,
      endDate: this.announcementForm.endDate ? new Date(this.announcementForm.endDate).toISOString() : null
    };

    if (this.modalMode() === 'add') {
      (this.apiService as any).createAnnouncement(payload).subscribe({
        next: () => {
          this.successMessage.set('Đăng thông báo mới thành công!');
          this.loadAnnouncements();
          this.closeModal();
        },
        error: (err: any) => {
          this.errorMessage.set('Không thể tạo thông báo. Vui lòng thử lại!');
          console.error(err);
        }
      });
    } else {
      (this.apiService as any).updateAnnouncement(payload.id, payload).subscribe({
        next: () => {
          this.successMessage.set('Cập nhật thông báo thành công!');
          this.loadAnnouncements();
          this.closeModal();
        },
        error: (err: any) => {
          this.errorMessage.set('Không thể cập nhật thông báo. Vui lòng thử lại!');
          console.error(err);
        }
      });
    }
  }

  deleteAnnouncement(a: Announcement) {
    if (confirm(`Bạn có chắc chắn muốn xóa thông báo: "${a.title}" không?`)) {
      this.errorMessage.set('');
      this.successMessage.set('');
      (this.apiService as any).deleteAnnouncement(a.id).subscribe({
        next: () => {
          this.successMessage.set('Đã xóa thông báo thành công!');
          this.loadAnnouncements();
        },
        error: (err: any) => {
          this.errorMessage.set('Lỗi khi xóa thông báo. Vui lòng thử lại!');
          console.error(err);
        }
      });
    }
  }
}

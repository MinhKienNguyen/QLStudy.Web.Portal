import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, RewardOption } from '../api.service';

interface Subject {
  id: number;
  name: string;
}

@Component({
  selector: 'app-subjects',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="classes-container" style="max-width: 900px; margin: 0 auto; padding: 2rem 1.5rem;">
      <div class="header-section" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem;">
        <div>
          <h1 style="color: #fff; font-size: 1.75rem; margin: 0 0 0.5rem; font-weight: 700;">Quản lý Cấu hình Môn Học</h1>
          <p style="color: var(--text-muted); margin: 0; font-size: 0.9rem;">Cấu hình danh sách môn học phục vụ cho việc phân quyền dữ liệu giáo viên.</p>
        </div>
        <button class="btn btn-primary add-btn" (click)="openAddModal()" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.25rem;">
          <span class="material-symbols-outlined">add</span>
          <span>Thêm Môn Học</span>
        </button>
      </div>

      <!-- Alert Messages -->
      <div class="alert alert-danger" *ngIf="errorMessage()" style="padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1.5rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #fca5a5;">
        {{ errorMessage() }}
      </div>

      <div class="alert alert-success" *ngIf="successMessage()" style="padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1.5rem; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2); color: #86efac;">
        {{ successMessage() }}
      </div>

      <!-- Subjects Table -->
      <div class="table-container" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);">
        <table class="data-table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: rgba(255, 255, 255, 0.02); border-bottom: 1px solid var(--border-color);">
              <th style="width: 100px; text-align: center; padding: 1rem;">ID Môn</th>
              <th style="text-align: left; padding: 1rem;">Tên Môn Học</th>
              <th style="width: 160px; text-align: center; padding: 1rem;">Hành động</th>
            </tr>
          </thead>
          <tbody>
            @for (s of subjects(); track s.id) {
              <tr style="border-bottom: 1px solid var(--border-color); transition: background-color 0.2s;">
                <td style="text-align: center; color: var(--text-muted); padding: 1rem;">{{ s.id }}</td>
                <td style="font-weight: 600; color: #fff; padding: 1rem;">{{ s.name }}</td>
                <td style="text-align: center; padding: 1rem;">
                  <div class="actions-group" style="display: flex; justify-content: center; gap: 0.5rem;">
                    <button class="btn btn-secondary btn-sm" (click)="openEditModal(s)" style="padding: 0.375rem 0.75rem;">
                      <span>Sửa</span>
                    </button>
                    <button class="btn btn-danger btn-sm" (click)="deleteSubject(s)" style="padding: 0.375rem 0.75rem;">
                      <span>Xóa</span>
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="3" style="text-align: center; color: var(--text-muted); padding: 3rem; font-style: italic;">
                  Chưa cấu hình môn học nào trong hệ thống.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Subject Add/Edit Modal -->
      <div class="modal-backdrop" *ngIf="showModal()">
        <div class="modal-container" style="max-width: 450px; background: #121824; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; padding: 2rem; box-shadow: 0 20px 40px rgba(0,0,0,0.5);">
          <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
            <h3 style="color: #fff; margin: 0; font-size: 1.25rem; font-weight: 700;">{{ modalMode() === 'add' ? 'Thêm Môn Học Mới' : 'Cập nhật Môn Học' }}</h3>
            <button class="close-btn" (click)="closeModal()" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.2rem;">&times;</button>
          </div>

          <form (submit)="saveSubject($event)">
            <div class="form-group" style="margin-bottom: 1.5rem;">
              <label for="subject-name" style="display: block; margin-bottom: 0.5rem; color: #d1d5db; font-size: 0.875rem;">Tên môn học</label>
              <input
                type="text"
                id="subject-name"
                name="subjectName"
                [(ngModel)]="subjectForm.name"
                placeholder="Ví dụ: Toán, Lý, Hóa..."
                required
                style="width: 100%; padding: 0.75rem 1rem; border-radius: 10px; border: 1px solid var(--border-color); background: rgba(31, 41, 55, 0.5); color: #fff; font-size: 0.9375rem; box-sizing: border-box;"
              />
            </div>

            <div class="modal-actions" style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 2rem;">
              <button type="button" class="btn btn-secondary" (click)="closeModal()" style="padding: 0.625rem 1.25rem;">Hủy</button>
              <button type="submit" class="btn btn-primary" style="padding: 0.625rem 1.25rem;">Lưu</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class SubjectsComponent implements OnInit {
  private apiService = inject(ApiService);

  public subjects = signal<Subject[]>([]);
  public showModal = signal<boolean>(false);
  public modalMode = signal<'add' | 'edit'>('add');
  public subjectForm = { id: 0, name: '' };

  public errorMessage = signal<string>('');
  public successMessage = signal<string>('');

  ngOnInit() {
    this.loadSubjects();
  }

  loadSubjects() {
    this.apiService.getSemesters().subscribe({ // Using custom endpoint we'll register in ApiService or we can add to ApiService
      next: () => {
        // Fetch from custom endpoint
        (this.apiService as any).getSubjects().subscribe({
          next: (data: Subject[]) => this.subjects.set(data),
          error: (err: any) => console.error(err)
        });
      }
    });
  }

  openAddModal() {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.modalMode.set('add');
    this.subjectForm = { id: 0, name: '' };
    this.showModal.set(true);
  }

  openEditModal(subject: Subject) {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.modalMode.set('edit');
    this.subjectForm = { ...subject };
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  saveSubject(event: Event) {
    event.preventDefault();
    if (!this.subjectForm.name.trim()) return;

    this.errorMessage.set('');
    this.successMessage.set('');

    const request = this.modalMode() === 'add'
      ? (this.apiService as any).createSubject({ name: this.subjectForm.name.trim() })
      : (this.apiService as any).updateSubject(this.subjectForm.id, { id: this.subjectForm.id, name: this.subjectForm.name.trim() });

    request.subscribe({
      next: () => {
        this.successMessage.set(this.modalMode() === 'add' ? 'Đã thêm môn học thành công.' : 'Đã cập nhật môn học thành công.');
        this.closeModal();
        this.loadSubjects();
      },
      error: (err: any) => {
        this.errorMessage.set(err.error?.message || 'Có lỗi xảy ra khi lưu môn học.');
      }
    });
  }

  deleteSubject(subject: Subject) {
    if (confirm(`Bạn có chắc chắn muốn xóa môn học "${subject.name}"? Lớp học đang được gán cho môn này sẽ bị gỡ bỏ.`)) {
      this.errorMessage.set('');
      this.successMessage.set('');
      (this.apiService as any).deleteSubject(subject.id).subscribe({
        next: () => {
          this.successMessage.set('Đã xóa môn học.');
          this.loadSubjects();
        },
        error: (err: any) => {
          this.errorMessage.set(err.error?.message || 'Không thể xóa môn học.');
        }
      });
    }
  }
}

import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../api.service';

interface UserAccount {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: 'Manager' | 'Teacher';
  status: 'Active' | 'Locked';
  subjectIds: number[];
  subjects: string[];
}

interface ScreenPermission {
  id?: number;
  role: string;
  screenKey: string;
  isAllowed: boolean;
}

interface Subject {
  id: number;
  name: string;
}

@Component({
  selector: 'app-accounts',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="accounts-container" style="padding: 2rem 1.5rem; max-width: 1200px; margin: 0 auto;">
      <div class="header-section" style="margin-bottom: 2rem;">
        <h1 style="color: #fff; font-size: 1.75rem; font-weight: 700; margin: 0 0 0.5rem;">Cấu hình Tài khoản & Phân quyền</h1>
        <p style="color: var(--text-muted); margin: 0; font-size: 0.9rem;">Quản lý tài khoản giáo viên, phân quyền môn học và quản lý ma trận quyền truy cập màn hình.</p>
      </div>

      <!-- Tab Buttons -->
      <div class="tabs-header" style="display: flex; gap: 1rem; border-bottom: 1px solid var(--border-color); margin-bottom: 2rem; padding-bottom: 0.25rem;">
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'users'"
          (click)="activeTab.set('users')"
          style="background: none; border: none; border-bottom: 2px solid transparent; padding: 0.75rem 1.25rem; color: var(--text-muted); font-weight: 600; cursor: pointer; transition: all 0.2s;"
          [style.color]="activeTab() === 'users' ? '#fff' : 'var(--text-muted)'"
          [style.border-color]="activeTab() === 'users' ? 'var(--primary-color, #6366f1)' : 'transparent'"
        >
          Danh sách tài khoản
        </button>
        <button
          class="tab-btn"
          [class.active]="activeTab() === 'permissions'"
          (click)="activeTab.set('permissions')"
          style="background: none; border: none; border-bottom: 2px solid transparent; padding: 0.75rem 1.25rem; color: var(--text-muted); font-weight: 600; cursor: pointer; transition: all 0.2s;"
          [style.color]="activeTab() === 'permissions' ? '#fff' : 'var(--text-muted)'"
          [style.border-color]="activeTab() === 'permissions' ? 'var(--primary-color, #6366f1)' : 'transparent'"
        >
          Ma trận phân quyền màn hình
        </button>
      </div>

      <!-- Alert Messages -->
      <div class="alert alert-danger" *ngIf="errorMessage()" style="padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1.5rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #fca5a5;">
        {{ errorMessage() }}
      </div>
      <div class="alert alert-success" *ngIf="successMessage()" style="padding: 0.75rem 1rem; border-radius: 8px; margin-bottom: 1.5rem; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2); color: #86efac;">
        {{ successMessage() }}
      </div>

      <!-- Tab Content: Users Management -->
      <div *ngIf="activeTab() === 'users'">
        <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
          <button class="btn btn-primary" (click)="openAddUserModal()" style="display: flex; align-items: center; gap: 0.5rem; padding: 0.625rem 1.25rem;">
            <span class="material-symbols-outlined">add</span>
            <span>Tạo Tài Khoản</span>
          </button>
        </div>

        <div class="table-container" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);">
          <table class="data-table" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: rgba(255, 255, 255, 0.02); border-bottom: 1px solid var(--border-color);">
                <th style="text-align: left; padding: 1rem;">Họ và tên</th>
                <th style="text-align: left; padding: 1rem;">Email / Tài khoản</th>
                <th style="text-align: left; padding: 1rem;">Số điện thoại</th>
                <th style="text-align: center; padding: 1rem;">Vai trò</th>
                <th style="text-align: left; padding: 1rem;">Phạm vi môn học</th>
                <th style="text-align: center; padding: 1rem;">Trạng thái</th>
                <th style="width: 160px; text-align: center; padding: 1rem;">Hành động</th>
              </tr>
            </thead>
            <tbody>
              @for (u of users(); track u.id) {
                <tr style="border-bottom: 1px solid var(--border-color); transition: background-color 0.2s;">
                  <td style="font-weight: 600; color: #fff; padding: 1rem;">{{ u.fullName }}</td>
                  <td style="color: #d1d5db; padding: 1rem;">{{ u.email }}</td>
                  <td style="color: var(--text-muted); padding: 1rem;">{{ u.phoneNumber || 'N/A' }}</td>
                  <td style="text-align: center; padding: 1rem;">
                    <span [class]="u.role === 'Manager' ? 'badge badge-primary' : 'badge badge-info'" style="padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">
                      {{ u.role === 'Manager' ? 'Quản lý' : 'Giáo viên' }}
                    </span>
                  </td>
                  <td style="padding: 1rem;">
                    @if (u.role === 'Manager') {
                      <span style="color: #34d399; font-size: 0.85rem; font-weight: 600;">Xem toàn bộ trung tâm</span>
                    } @else {
                      <div style="display: flex; flex-wrap: wrap; gap: 0.25rem;">
                        @for (sub of u.subjects; track sub) {
                          <span style="background: rgba(99, 102, 241, 0.1); border: 1px solid rgba(99, 102, 241, 0.2); color: #a5b4fc; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.75rem;">
                            {{ sub }}
                          </span>
                        } @empty {
                          <span style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">Chưa gán môn nào</span>
                        }
                      </div>
                    }
                  </td>
                  <td style="text-align: center; padding: 1rem;">
                    <span [class]="u.status === 'Active' ? 'badge-active' : 'badge-locked'"
                          [style.color]="u.status === 'Active' ? '#34d399' : '#f87171'"
                          [style.background]="u.status === 'Active' ? 'rgba(52, 211, 153, 0.1)' : 'rgba(248, 113, 113, 0.1)'"
                          style="padding: 0.25rem 0.5rem; border-radius: 6px; font-size: 0.75rem; font-weight: 600;">
                      {{ u.status === 'Active' ? 'Đang hoạt động' : 'Bị khóa' }}
                    </span>
                  </td>
                  <td style="text-align: center; padding: 1rem;">
                    <div class="actions-group" style="display: flex; justify-content: center; gap: 0.5rem;">
                      <button class="btn btn-secondary btn-sm" (click)="openEditUserModal(u)" style="padding: 0.375rem 0.75rem;">Sửa</button>
                      <button class="btn btn-danger btn-sm" (click)="deleteUser(u)" style="padding: 0.375rem 0.75rem;">Xóa</button>
                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Tab Content: Permissions Matrix -->
      <div *ngIf="activeTab() === 'permissions'" style="max-width: 700px; margin: 0 auto;">
        <div class="table-container" style="background: var(--bg-card); border-radius: 16px; border: 1px solid var(--border-color); overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2); margin-bottom: 1.5rem;">
          <table class="data-table" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: rgba(255, 255, 255, 0.02); border-bottom: 1px solid var(--border-color);">
                <th style="text-align: left; padding: 1rem 1.5rem;">Chức năng đầu mục / Màn hình</th>
                <th style="width: 160px; text-align: center; padding: 1rem;">Trưởng bộ phận</th>
                <th style="width: 160px; text-align: center; padding: 1rem;">Giáo viên</th>
              </tr>
            </thead>
            <tbody>
              @for (key of screenKeys; track key) {
                <tr style="border-bottom: 1px solid var(--border-color);">
                  <td style="padding: 1rem 1.5rem;">
                    <div style="font-weight: 600; color: #fff; margin-bottom: 0.15rem;">{{ getScreenLabel(key) }}</div>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">Mã màn hình: {{ key }}</span>
                  </td>
                  <td style="text-align: center; padding: 1rem;">
                    <input
                      type="checkbox"
                      [checked]="getPermissionValue('Manager', key)"
                      (change)="togglePermissionValue('Manager', key)"
                      style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary-color, #6366f1);"
                    />
                  </td>
                  <td style="text-align: center; padding: 1rem;">
                    <input
                      type="checkbox"
                      [checked]="getPermissionValue('Teacher', key)"
                      (change)="togglePermissionValue('Teacher', key)"
                      style="width: 18px; height: 18px; cursor: pointer; accent-color: var(--primary-color, #6366f1);"
                    />
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>

        <div style="display: flex; justify-content: flex-end; margin-bottom: 2rem;">
          <button class="btn btn-primary" (click)="savePermissions()" style="padding: 0.75rem 1.5rem; font-weight: 600;">Lưu Ma Trận Phân Quyền</button>
        </div>
      </div>

      <!-- Account Edit/Create Modal -->
      <div class="modal-backdrop" *ngIf="showUserModal()">
        <div class="modal-container" style="max-width: 550px; background: #121824; border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 20px; padding: 2rem; box-shadow: 0 20px 40px rgba(0,0,0,0.5); max-height: 90vh; overflow-y: auto;">
          <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 0.5rem;">
            <h3 style="color: #fff; margin: 0; font-size: 1.25rem; font-weight: 700;">{{ userModalMode() === 'add' ? 'Tạo Tài Khoản Mới' : 'Cập Nhật Tài Khoản' }}</h3>
            <button class="close-btn" (click)="closeUserModal()" style="background: none; border: none; color: var(--text-muted); cursor: pointer; font-size: 1.2rem;">&times;</button>
          </div>

          <form (submit)="saveUser($event)">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
              <div class="form-group">
                <label style="display: block; margin-bottom: 0.5rem; color: #d1d5db; font-size: 0.85rem;">Họ và tên *</label>
                <input type="text" name="fullName" [(ngModel)]="userForm.fullName" required placeholder="Nguyễn Văn A" style="width: 100%; padding: 0.65rem 0.85rem; border-radius: 10px; border: 1px solid var(--border-color); background: rgba(31, 41, 55, 0.5); color: #fff; font-size: 0.9rem;" />
              </div>

              <div class="form-group">
                <label style="display: block; margin-bottom: 0.5rem; color: #d1d5db; font-size: 0.85rem;">Số điện thoại</label>
                <input type="text" name="phoneNumber" [(ngModel)]="userForm.phoneNumber" placeholder="0987654321" style="width: 100%; padding: 0.65rem 0.85rem; border-radius: 10px; border: 1px solid var(--border-color); background: rgba(31, 41, 55, 0.5); color: #fff; font-size: 0.9rem;" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
              <div class="form-group">
                <label style="display: block; margin-bottom: 0.5rem; color: #d1d5db; font-size: 0.85rem;">Email / Tài khoản đăng nhập *</label>
                <input type="email" name="email" [(ngModel)]="userForm.email" required placeholder="gv.toan@qlstudy.com" [disabled]="userModalMode() === 'edit'" style="width: 100%; padding: 0.65rem 0.85rem; border-radius: 10px; border: 1px solid var(--border-color); background: rgba(31, 41, 55, 0.5); color: #fff; font-size: 0.9rem;" />
              </div>

              <div class="form-group">
                <label style="display: block; margin-bottom: 0.5rem; color: #d1d5db; font-size: 0.85rem;">
                  {{ userModalMode() === 'add' ? 'Mật khẩu *' : 'Mật khẩu mới (bỏ trống nếu giữ nguyên)' }}
                </label>
                <input type="password" name="password" [(ngModel)]="userForm.password" [required]="userModalMode() === 'add'" placeholder="••••••••" style="width: 100%; padding: 0.65rem 0.85rem; border-radius: 10px; border: 1px solid var(--border-color); background: rgba(31, 41, 55, 0.5); color: #fff; font-size: 0.9rem;" />
              </div>
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem;">
              <div class="form-group">
                <label style="display: block; margin-bottom: 0.5rem; color: #d1d5db; font-size: 0.85rem;">Vai trò</label>
                <select name="role" [(ngModel)]="userForm.role" style="width: 100%; padding: 0.65rem 0.85rem; border-radius: 10px; border: 1px solid var(--border-color); background: rgba(31, 41, 55, 0.5); color: #fff; font-size: 0.9rem;">
                  <option value="Teacher">Giáo viên</option>
                  <option value="Manager">Trưởng bộ phận (Quản lý)</option>
                </select>
              </div>

              <div class="form-group">
                <label style="display: block; margin-bottom: 0.5rem; color: #d1d5db; font-size: 0.85rem;">Trạng thái</label>
                <select name="status" [(ngModel)]="userForm.status" style="width: 100%; padding: 0.65rem 0.85rem; border-radius: 10px; border: 1px solid var(--border-color); background: rgba(31, 41, 55, 0.5); color: #fff; font-size: 0.9rem;">
                  <option value="Active">Đang hoạt động</option>
                  <option value="Locked">Bị khóa</option>
                </select>
              </div>
            </div>

            <!-- Subjects checklist for Teachers -->
            <div *ngIf="userForm.role === 'Teacher'" style="background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.25rem; margin-bottom: 1.5rem;">
              <h4 style="color: #fff; margin: 0 0 0.75rem; font-size: 0.9rem; font-weight: 600;">Phân quyền Môn học được quản lý</h4>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                @for (sub of subjects(); track sub.id) {
                  <label style="display: flex; align-items: center; gap: 0.5rem; color: #d1d5db; font-size: 0.875rem; cursor: pointer;">
                    <input
                      type="checkbox"
                      [checked]="userForm.subjectIds.includes(sub.id)"
                      (change)="toggleUserFormSubject(sub.id)"
                      style="width: 16px; height: 16px; cursor: pointer; accent-color: var(--primary-color, #6366f1);"
                    />
                    <span>{{ sub.name }}</span>
                  </label>
                }
              </div>
            </div>

            <div class="modal-actions" style="display: flex; justify-content: flex-end; gap: 0.75rem; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1rem; margin-top: 2rem;">
              <button type="button" class="btn btn-secondary" (click)="closeUserModal()">Hủy</button>
              <button type="submit" class="btn btn-primary">Lưu</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `
})
export class AccountsComponent implements OnInit {
  private apiService = inject(ApiService);

  public activeTab = signal<'users' | 'permissions'>('users');
  public users = signal<UserAccount[]>([]);
  public subjects = signal<Subject[]>([]);
  public permissions = signal<ScreenPermission[]>([]);

  public showUserModal = signal<boolean>(false);
  public userModalMode = signal<'add' | 'edit'>('add');
  public userForm = {
    id: 0,
    fullName: '',
    email: '',
    phoneNumber: '',
    password: '',
    role: 'Teacher' as 'Manager' | 'Teacher',
    status: 'Active' as 'Active' | 'Locked',
    subjectIds: [] as number[]
  };

  public errorMessage = signal<string>('');
  public successMessage = signal<string>('');

  public screenKeys = [
    'dashboard', 'schedule', 'tuition', 'students', 'classes', 'attendance', 'penalties', 'reports', 'subjects', 'accounts'
  ];

  ngOnInit() {
    this.loadUsers();
    this.loadSubjects();
    this.loadPermissions();
  }

  loadUsers() {
    this.apiService.getUsers().subscribe({
      next: (data) => this.users.set(data),
      error: (err) => console.error(err)
    });
  }

  loadSubjects() {
    this.apiService.getSubjects().subscribe({
      next: (data) => this.subjects.set(data),
      error: (err) => console.error(err)
    });
  }

  loadPermissions() {
    this.apiService.getPermissions().subscribe({
      next: (data) => this.permissions.set(data),
      error: (err) => console.error(err)
    });
  }

  getScreenLabel(key: string): string {
    const labels: { [k: string]: string } = {
      dashboard: 'Bảng Điều Khiển (Dashboard)',
      schedule: 'Thời Khóa Biểu Tuần',
      tuition: 'Quản Lý Thu Học Phí',
      students: 'Quản Lý Học Sinh',
      classes: 'Quản Lý Lớp Học',
      attendance: 'Điểm Danh Lớp Học',
      penalties: 'Quản Lý Phạt',
      reports: 'Báo Cáo Học Phí & Thống Kê',
      subjects: 'Cấu Hình Môn Học (Hệ Thống)',
      accounts: 'Quản Lý Tài Khoản & Phân Quyền (Hệ Thống)'
    };
    return labels[key] || key;
  }

  getPermissionValue(role: string, key: string): boolean {
    const perm = this.permissions().find(p => p.role === role && p.screenKey === key);
    return perm?.isAllowed ?? false;
  }

  togglePermissionValue(role: string, key: string) {
    this.permissions.update(list => {
      const idx = list.findIndex(p => p.role === role && p.screenKey === key);
      if (idx !== -1) {
        const updated = [...list];
        updated[idx] = { ...updated[idx], isAllowed: !updated[idx].isAllowed };
        return updated;
      } else {
        return [...list, { role, screenKey: key, isAllowed: true }];
      }
    });
  }

  savePermissions() {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.apiService.updatePermissions(this.permissions()).subscribe({
      next: () => {
        this.successMessage.set('Đã cập nhật ma trận phân quyền màn hình thành công.');
        this.loadPermissions();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Có lỗi xảy ra khi lưu phân quyền.');
      }
    });
  }

  openAddUserModal() {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.userModalMode.set('add');
    this.userForm = {
      id: 0,
      fullName: '',
      email: '',
      phoneNumber: '',
      password: '',
      role: 'Teacher',
      status: 'Active',
      subjectIds: []
    };
    this.showUserModal.set(true);
  }

  openEditUserModal(user: UserAccount) {
    this.errorMessage.set('');
    this.successMessage.set('');
    this.userModalMode.set('edit');
    this.userForm = {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber,
      password: '',
      role: user.role,
      status: user.status,
      subjectIds: [...user.subjectIds]
    };
    this.showUserModal.set(true);
  }

  closeUserModal() {
    this.showUserModal.set(false);
  }

  toggleUserFormSubject(subId: number) {
    const list = this.userForm.subjectIds;
    if (list.includes(subId)) {
      this.userForm.subjectIds = list.filter(id => id !== subId);
    } else {
      this.userForm.subjectIds = [...list, subId];
    }
  }

  saveUser(event: Event) {
    event.preventDefault();
    if (!this.userForm.fullName || !this.userForm.email) return;

    this.errorMessage.set('');
    this.successMessage.set('');

    const payload = {
      id: this.userForm.id,
      fullName: this.userForm.fullName,
      email: this.userForm.email,
      phoneNumber: this.userForm.phoneNumber,
      password: this.userForm.password || null,
      role: this.userForm.role,
      status: this.userForm.status,
      subjectIds: this.userForm.role === 'Teacher' ? this.userForm.subjectIds : []
    };

    const request = this.userModalMode() === 'add'
      ? this.apiService.createUser(payload)
      : this.apiService.updateUser(this.userForm.id, payload);

    request.subscribe({
      next: () => {
        this.successMessage.set(this.userModalMode() === 'add' ? 'Đã tạo tài khoản thành công.' : 'Đã cập nhật thông tin tài khoản.');
        this.closeUserModal();
        this.loadUsers();
      },
      error: (err) => {
        this.errorMessage.set(err.error?.message || 'Có lỗi xảy ra khi lưu tài khoản.');
      }
    });
  }

  deleteUser(user: UserAccount) {
    if (confirm(`Bạn có chắc chắn muốn xóa tài khoản "${user.fullName}"?`)) {
      this.errorMessage.set('');
      this.successMessage.set('');
      this.apiService.deleteUser(user.id).subscribe({
        next: () => {
          this.successMessage.set('Đã xóa tài khoản.');
          this.loadUsers();
        },
        error: (err) => {
          this.errorMessage.set(err.error?.message || 'Không thể xóa tài khoản.');
        }
      });
    }
  }
}

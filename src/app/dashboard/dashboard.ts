import { Component, OnInit, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, StudentTuitionRow, TuitionMatrix, TuitionPeriod } from '../api.service';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- ADMIN / TEACHER DASHBOARD VIEW -->
    <div class="dashboard-container" *ngIf="isAdminOrTeacher()">
      <div class="welcome-header">
        <h1>Bảng Tổng Quan</h1>
        <p>Báo cáo tình hình giảng dạy và thu học phí của trung tâm trong kỳ.</p>
      </div>

      <!-- Stats Grid -->
      <div class="dashboard-grid">
        <!-- Stat Card 1 -->
        <div class="card stat-card">
          <div class="stat-info">
            <span class="stat-label">Học sinh hoạt động</span>
            <span class="stat-value">{{ totalStudents() }}</span>
          </div>
          <div class="stat-icon-wrapper bg-primary-soft">
            <span class="material-symbols-outlined">group</span>
          </div>
        </div>

        <!-- Stat Card 2 -->
        <div class="card stat-card">
          <div class="stat-info">
            <span class="stat-label">Lớp học hiện tại</span>
            <span class="stat-value">{{ totalClasses() }}</span>
          </div>
          <div class="stat-icon-wrapper bg-info-soft">
            <span class="material-symbols-outlined">school</span>
          </div>
        </div>

        <!-- Stat Card 3 -->
        <div class="card stat-card">
          <div class="stat-info">
            <span class="stat-label">Kỳ báo cáo</span>
            <span class="stat-value">{{ latestMonthName() }}</span>
          </div>
          <div class="stat-icon-wrapper bg-warning-soft">
            <span class="material-symbols-outlined">calendar_month</span>
          </div>
        </div>

        <!-- Stat Card 4 -->
        <div class="card stat-card">
          <div class="stat-info">
            <span class="stat-label">Doanh thu kỳ này</span>
            <span class="stat-value text-success">{{ (totalRevenue() * 1000).toLocaleString('vi-VN') }}đ</span>
          </div>
          <div class="stat-icon-wrapper bg-success-soft">
            <span class="material-symbols-outlined">payments</span>
          </div>
        </div>
      </div>

      <!-- Details Section -->
      <div class="details-grid">
        <!-- Tuition Progress Card -->
        <div class="card detail-card">
          <div class="detail-header">
            <h3>Tỷ lệ Thu Học phí ({{ latestMonthName() }})</h3>
            <span class="badge" [ngClass]="paymentRatio() >= 80 ? 'badge-success' : 'badge-warning'">
              {{ paymentRatio() >= 80 ? 'Tốt' : 'Cần đôn đốc' }}
            </span>
          </div>
          <p class="description">Phần trăm học sinh đã hoàn thành đóng học phí tháng này.</p>
          
          <div class="progress-section">
            <div class="progress-bar-container">
              <div class="progress-bar-fill" [style.width.%]="paymentRatio()"></div>
            </div>
            <div class="progress-stats">
              <span>Đã đóng: <strong>{{ paidCount() }}</strong> học sinh ({{ paymentRatio() | number:'1.0-1' }}%)</span>
              <span>Chưa đóng: <strong>{{ unpaidCount() }}</strong></span>
            </div>
          </div>
        </div>

        <!-- Classes breakdown Card -->
        <div class="card detail-card">
          <h3>Danh sách Lớp & Sĩ số</h3>
          <div class="classes-list">
            @for (cls of classBreakdown(); track cls.name) {
              <div class="class-item">
                <span class="class-name" [title]="cls.name">{{ cls.name }}</span>
                <div class="class-members-bar">
                  <div class="class-members-fill" [style.width.%]="(cls.count / maxClassSize()) * 100"></div>
                </div>
                <span class="class-count"><strong>{{ cls.count }}</strong> học sinh</span>
              </div>
            } @empty {
              <p style="color: var(--text-secondary); text-align: center; padding: 1rem;">Chưa có dữ liệu lớp học...</p>
            }
          </div>
        </div>
      </div>
    </div>

    <!-- PARENT / STUDENT DASHBOARD VIEW (Cozy, warm and simplified) -->
    <div class="student-dashboard-container" *ngIf="!isAdminOrTeacher()">
      <!-- Warm Banner -->
      <div class="welcome-banner-student">
        <div class="banner-content">
          <h1 *ngIf="!isParent()">Chào Học sinh {{ getUserName() }} 👋</h1>
          <h1 *ngIf="isParent()">Chào Phụ huynh {{ getUserName() }} 👋</h1>
          <p *ngIf="isParent() && selectedStudentName() !== 'N/A'">Đang xem thông tin học tập của con: <strong style="color: #fef08a;">{{ selectedStudentName() }}</strong></p>
          <p *ngIf="!isParent()">Chúc bạn một ngày học tập và trải nghiệm thật nhiều niềm vui!</p>
        </div>
        <div class="banner-artwork">📚</div>
      </div>

      <!-- Main Mobile Grid -->
      <div class="student-grid">
        <!-- Schedule Section -->
        <div class="card student-card">
          <div class="card-title-with-icon">
            <span class="material-symbols-outlined icon-schedule">calendar_today</span>
            <h3>Lịch học trong tuần</h3>
          </div>
          <div class="student-schedule-list">
            <div *ngIf="!studentDashboardData()?.schedules?.length" style="padding: 2rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.875rem;">
              Chưa có lịch học được ghi nhận trong tuần này.
            </div>
            <div class="schedule-item" *ngFor="let item of studentDashboardData()?.schedules" [class.active-today]="isTodayDayOfWeek(item.dayOfWeek)">
              <div class="schedule-day" [class.today-badge]="isTodayDayOfWeek(item.dayOfWeek)">
                {{ isTodayDayOfWeek(item.dayOfWeek) ? 'Hôm nay' : getDayOfWeekLabel(item.dayOfWeek) }}
              </div>
              <div class="schedule-details">
                <span class="schedule-class">{{ item.className }}</span>
                <span class="schedule-time">{{ item.timeSlot }} • {{ item.room }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Tuition Bill Section -->
        <div class="card student-card tuition-bill-card">
          <div class="card-title-with-icon">
            <span class="material-symbols-outlined icon-payment">payments</span>
            <h3>Học phí học tập</h3>
          </div>
          
          <div class="tuition-payment-status">
            <div class="payment-info-box">
              <span class="payment-lbl">Học phí tháng này ({{ studentDashboardData()?.tuition?.monthName || 'Chưa rõ' }})</span>
              <div class="payment-amount-status">
                <span class="payment-val">{{ (studentDashboardData()?.tuition?.amountDue || 0) | number:'1.0-0' }}đ</span>
                <span *ngIf="studentDashboardData()?.tuition?.isPaid" class="badge" style="background: rgba(16, 185, 129, 0.12); color: var(--color-success); font-weight: 700; padding: 6px 10px; border-radius: 8px;">Đã thanh toán</span>
                <span *ngIf="!studentDashboardData()?.tuition?.isPaid" class="badge badge-warning-premium">Chưa thanh toán</span>
              </div>
            </div>

            <div class="payment-action-area" *ngIf="!studentDashboardData()?.tuition?.isPaid">
              <p class="payment-note">Quét mã QR để đóng học phí nhanh qua ngân hàng hoặc thanh toán trực tuyến.</p>
              
              <div *ngIf="studentDashboardData()?.tuition?.isPayOSConfigured; else staticOnly" style="display: flex; gap: 0.75rem; width: 100%;">
                <button class="btn btn-secondary" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem; border-radius: 12px; border: 1px solid var(--border-color); background: rgba(255,255,255,0.03); color: #fff;" (click)="showQRModal()">
                  <span class="material-symbols-outlined" style="font-size: 1.2rem;">qr_code</span>
                  <span>Chuyển khoản thường</span>
                </button>
                <button class="btn btn-primary btn-pay-now" style="flex: 1; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem; border-radius: 12px;" (click)="payViaPayOS()">
                  <span class="material-symbols-outlined" style="font-size: 1.2rem;">payments</span>
                  <span>Thanh toán PayOS</span>
                </button>
              </div>
              
              <ng-template #staticOnly>
                <button class="btn btn-primary btn-pay-now" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.75rem; border-radius: 12px;" (click)="showQRModal()">
                  <span class="material-symbols-outlined" style="font-size: 1.2rem;">qr_code_scanner</span>
                  <span>Thanh toán bằng QR</span>
                </button>
              </ng-template>
            </div>
            
            <div class="payment-action-area" *ngIf="studentDashboardData()?.tuition?.isPaid" style="text-align: center; padding: 1rem 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.5rem;">
              <span class="material-symbols-outlined" style="font-size: 2.5rem; color: var(--color-success);">check_circle</span>
              <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0;">Bạn đã hoàn thành đóng học phí của tháng này. Cảm ơn bạn!</p>
            </div>
          </div>
        </div>

        <!-- Attendance Stats Card -->
        <div class="card student-card">
          <div class="card-title-with-icon">
            <span class="material-symbols-outlined icon-attendance">fact_check</span>
            <h3>Tỷ lệ đi học chuyên cần</h3>
          </div>
          <div class="attendance-radial-panel">
            <div class="attendance-score" [style.border-top-color]="(studentDashboardData()?.attendance?.attendanceRate || 100) >= 90 ? '#10b981' : '#f59e0b'">
              <span class="attendance-percent">{{ studentDashboardData()?.attendance?.attendanceRate || 100 }}%</span>
              <span class="attendance-lbl" [style.color]="(studentDashboardData()?.attendance?.attendanceRate || 100) >= 90 ? '#10b981' : '#f59e0b'">{{ studentDashboardData()?.attendance?.attendanceStatus || 'Xuất sắc' }}</span>
            </div>
            <div class="attendance-details-list">
              <div class="att-row"><span class="bullet present"></span><span>Đúng giờ: <strong>{{ studentDashboardData()?.attendance?.presentCount || 0 }}</strong> buổi</span></div>
              <div class="att-row"><span class="bullet late"></span><span>Muộn: <strong>{{ studentDashboardData()?.attendance?.lateCount || 0 }}</strong> buổi</span></div>
              <div class="att-row"><span class="bullet absent"></span><span>Nghỉ học: <strong>{{ studentDashboardData()?.attendance?.absentCount || 0 }}</strong> buổi</span></div>
            </div>
          </div>
        </div>

        <!-- Penalties Stats Card -->
        <div class="card student-card" *ngIf="studentDashboardData()?.penalties?.length > 0">
          <div class="card-title-with-icon">
            <span class="material-symbols-outlined icon-payment" style="color: var(--color-danger);">gavel</span>
            <h3>Thông tin phạt & Vi phạm</h3>
          </div>
          <div style="display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem; max-height: 200px; overflow-y: auto; padding-right: 0.25rem;">
            <div *ngFor="let item of studentDashboardData()?.penalties" style="background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.12); border-radius: 12px; padding: 0.875rem 1.25rem; display: flex; flex-direction: column; gap: 0.25rem;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 700; color: var(--color-danger); font-size: 0.9rem;">{{ item.ruleName }}</span>
                <span style="font-weight: 800; color: var(--color-danger); font-size: 0.95rem;">{{ item.amount | number:'1.0-0' }}đ</span>
              </div>
              <div style="font-size: 0.8rem; color: var(--text-secondary);">
                Lớp: <strong style="color: var(--text-primary);">{{ item.className }}</strong> • Ngày: <strong>{{ item.date | date:'dd/MM/yyyy' }}</strong>
              </div>
              <div *ngIf="item.note" style="font-size: 0.8rem; color: var(--text-muted); margin-top: 0.25rem; font-style: italic;">
                Ghi chú: "{{ item.note }}"
              </div>
            </div>
          </div>
        </div>

        <!-- Notification Panel Card -->
        <div class="card student-card notices-card">
          <div class="card-title-with-icon">
            <span class="material-symbols-outlined icon-notice">campaign</span>
            <h3>Thông báo từ trung tâm</h3>
          </div>
          <div class="notices-list">
            <div *ngIf="!studentDashboardData()?.announcements?.length" style="padding: 2rem 1rem; text-align: center; color: var(--text-muted); font-size: 0.875rem;">
              Chưa có thông báo mới nào từ trung tâm.
            </div>
            <div class="notice-item" *ngFor="let item of studentDashboardData()?.announcements; let isFirst = first">
              <span class="notice-tag tag-new" *ngIf="isFirst">Mới</span>
              <p class="notice-desc">
                <strong *ngIf="item.className" style="color: var(--accent-primary);">[{{ item.className }}] </strong>
                <strong>{{ item.title }}:</strong> {{ item.content }}
              </p>
              <span class="notice-time">{{ getRelativeTimeLabel(item.createdAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- QR Payment Modal -->
    <div class="modal-overlay" *ngIf="isQRModalVisible" (click)="hideQRModal()">
      <div class="modal-container qr-modal" (click)="$event.stopPropagation();" style="max-width: 480px; width: 480px; background: #121824; border: 1px solid rgba(255,255,255,0.08); border-radius: 20px;">
        <div class="modal-header" style="border-bottom: 1px solid rgba(255,255,255,0.05); padding: 1.25rem 1.5rem;">
          <h3 style="margin: 0; color: #fff;">Cổng Thanh Toán Học Phí</h3>
          <button class="close-btn" (click)="hideQRModal()" style="background: none; border: none; color: var(--text-secondary); cursor: pointer;">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body qr-body" style="padding: 1.5rem; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1.5rem;">
          <div class="qr-code-placeholder" style="display: flex; justify-content: center;">
            <div class="qr-border-visual" style="border: 2px solid var(--accent-primary); border-radius: 16px; padding: 1rem; background: #fff; width: 220px; height: 220px; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 25px rgba(0,0,0,0.15);">
              <img [src]="studentDashboardData()?.tuition?.qrUrl" alt="Mã QR thanh toán" style="max-width: 100%; max-height: 100%; object-fit: contain;">
            </div>
          </div>
          <div class="qr-payment-details" style="text-align: left; width: 100%; background: rgba(255,255,255,0.02); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.625rem;">
            <p class="bank-title" style="margin: 0; font-size: 0.85rem; color: var(--text-secondary);">Ngân hàng: <strong style="color: #fff;">{{ studentDashboardData()?.tuition?.bankTitle }}</strong></p>
            <p class="account-number" style="margin: 0; font-size: 0.85rem; color: var(--text-secondary);">Số tài khoản: <strong style="color: #fff;">{{ studentDashboardData()?.tuition?.accountNumber }}</strong></p>
            <p class="account-name" style="margin: 0; font-size: 0.85rem; color: var(--text-secondary);">Chủ tài khoản: <strong style="color: #fff;">{{ studentDashboardData()?.tuition?.accountName }}</strong></p>
            <p class="payment-amount" style="margin: 0; font-size: 0.85rem; color: var(--text-secondary);">Số tiền cần chuyển: <strong class="text-success-premium" style="font-size: 1.15rem; color: var(--color-success);">{{ ((studentDashboardData()?.tuition?.amountDue || 0) - (studentDashboardData()?.tuition?.amountPaid || 0)) | number:'1.0-0' }}đ</strong></p>
            <p class="payment-syntax" style="margin: 0; font-size: 0.85rem; color: var(--text-secondary);">Nội dung chuyển khoản: <strong class="syntax-highlight" style="background: rgba(99, 102, 241, 0.15); color: #8b5cf6; padding: 3px 8px; border-radius: 6px; font-family: monospace;">QLSTUDY {{ studentDashboardData()?.studentName }} HP {{ studentDashboardData()?.tuition?.monthName }}</strong></p>
          </div>
          <div *ngIf="studentDashboardData()?.tuition?.isPayOSConfigured" style="width: 100%; text-align: center; margin-top: 0.5rem;">
            <p style="color: var(--text-muted); font-size: 0.8rem; margin: 0 0 0.5rem;">Hoặc thanh toán tự động nhận tiền ngay qua cổng PayOS:</p>
            <button class="btn btn-primary btn-pay-now" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.5rem; padding: 0.65rem;" (click)="hideQRModal(); payViaPayOS();">
              <span class="material-symbols-outlined">bolt</span>
              <span>Thanh toán tự động bằng PayOS</span>
            </button>
          </div>
        </div>
        <div class="modal-footer" style="border-top: 1px solid rgba(255,255,255,0.05); padding: 1rem 1.5rem; display: flex; justify-content: flex-end; gap: 0.75rem;">
          <button class="btn btn-secondary" (click)="hideQRModal()">Đóng lại</button>
          <button class="btn btn-primary" (click)="simulatePaymentSuccess()">Xác nhận đã chuyển khoản</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* Admin/Teacher Dashboard Styles */
    .dashboard-container {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }
    .welcome-header h1 {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.35rem;
    }
    .welcome-header p {
      color: var(--text-secondary);
      font-size: 0.9rem;
    }
    .text-success {
      color: var(--color-success);
    }
    .details-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    @media (max-width: 900px) {
      .details-grid {
        grid-template-columns: 1fr;
      }
    }
    .detail-card {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .detail-card h3 {
      font-size: 1.15rem;
      font-weight: 600;
    }
    .detail-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .detail-card .description {
      color: var(--text-secondary);
      font-size: 0.85rem;
    }
    
    /* Progress Bar */
    .progress-section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 1rem;
    }
    .progress-bar-container {
      height: 12px;
      background-color: var(--bg-tertiary);
      border-radius: 99px;
      overflow: hidden;
      border: 1px solid var(--border-color);
    }
    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(to right, var(--accent-primary), var(--color-success));
      border-radius: 99px;
      transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 0 8px rgba(16, 185, 129, 0.4);
    }
    .progress-stats {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }
    
    /* Classes List */
    .classes-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-height: 320px;
      overflow-y: auto;
      padding-right: 0.25rem;
    }
    .class-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      font-size: 0.85rem;
    }
    .class-name {
      width: 120px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .class-members-bar {
      flex-grow: 1;
      height: 8px;
      background-color: var(--bg-tertiary);
      border-radius: 99px;
      overflow: hidden;
    }
    .class-members-fill {
      height: 100%;
      background: linear-gradient(to right, var(--color-info), var(--accent-primary));
      border-radius: 99px;
    }
    .class-count {
      width: 90px;
      text-align: right;
      color: var(--text-secondary);
    }

    /* =========================================
       COZY PARENT / STUDENT PORTAL STYLES
       ========================================= */
    .student-dashboard-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      animation: fadeIn 0.4s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .welcome-banner-student {
      background: linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%);
      border-radius: 20px;
      padding: 2rem;
      color: #ffffff;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 10px 24px rgba(139, 92, 246, 0.2);
      overflow: hidden;
      position: relative;
    }
    .welcome-banner-student::before {
      content: '';
      position: absolute;
      width: 200px;
      height: 200px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      top: -100px;
      right: -50px;
    }
    .banner-content h1 {
      font-size: 1.75rem;
      font-weight: 800;
      margin-bottom: 0.5rem;
      color: #ffffff;
    }
    .banner-content p {
      color: rgba(255, 255, 255, 0.85);
      font-size: 0.95rem;
      font-weight: 500;
    }
    .banner-artwork {
      font-size: 3.5rem;
      filter: drop-shadow(0 4px 8px rgba(0,0,0,0.15));
      animation: float 3s ease-in-out infinite;
    }
    @keyframes float {
      0% { transform: translateY(0px); }
      50% { transform: translateY(-8px); }
      100% { transform: translateY(0px); }
    }

    /* Student Grid */
    .student-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    @media (max-width: 768px) {
      .student-grid {
        grid-template-columns: 1fr;
        gap: 1.25rem;
      }
      .welcome-banner-student {
        padding: 1.5rem;
      }
      .banner-content h1 {
        font-size: 1.45rem;
      }
      .banner-artwork {
        display: none;
      }
    }

    .student-card {
      border-radius: 18px;
      border: 1px solid var(--border-color);
      box-shadow: var(--shadow-md);
      background-color: var(--bg-secondary);
    }
    .card-title-with-icon {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin-bottom: 1.25rem;
      border-bottom: 1px solid var(--border-light);
      padding-bottom: 0.75rem;
    }
    .card-title-with-icon h3 {
      font-size: 1.05rem;
      font-weight: 700;
      color: var(--text-primary);
    }
    .card-title-with-icon .material-symbols-outlined {
      font-size: 1.35rem;
      padding: 6px;
      border-radius: 10px;
    }
    .icon-schedule { background: rgba(139, 92, 246, 0.12); color: #8b5cf6; }
    .icon-payment { background: rgba(16, 185, 129, 0.12); color: #10b981; }
    .icon-attendance { background: rgba(14, 165, 233, 0.12); color: #0ea5e9; }
    .icon-notice { background: rgba(245, 158, 11, 0.12); color: #f59e0b; }

    /* Student Schedule */
    .student-schedule-list {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
    }
    .schedule-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem;
      border-radius: 12px;
      background: var(--bg-tertiary);
      border: 1px solid transparent;
    }
    .schedule-day {
      width: 70px;
      font-weight: 700;
      font-size: 0.8rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.02em;
    }
    .schedule-details {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    .schedule-class {
      font-weight: 700;
      font-size: 0.9rem;
      color: var(--text-primary);
    }
    .schedule-time {
      font-size: 0.75rem;
      color: var(--text-muted);
    }
    .schedule-item.active-today {
      background: rgba(139, 92, 246, 0.05);
      border-color: rgba(139, 92, 246, 0.2);
    }
    .app-container.role-student .schedule-item.active-today,
    .app-container.role-parent .schedule-item.active-today {
      background: rgba(139, 92, 246, 0.04);
      border-color: rgba(139, 92, 246, 0.15);
    }
    .today-badge {
      background: #8b5cf6;
      color: #ffffff !important;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 0.7rem !important;
      text-align: center;
      width: 70px;
    }

    /* Tuition Bill Box */
    .tuition-payment-status {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
    }
    .payment-info-box {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      background: var(--bg-tertiary);
      padding: 1rem;
      border-radius: 12px;
    }
    .payment-lbl {
      font-size: 0.8rem;
      color: var(--text-secondary);
      font-weight: 500;
    }
    .payment-amount-status {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .payment-val {
      font-size: 1.45rem;
      font-weight: 800;
      color: var(--text-primary);
      font-family: var(--font-display);
    }
    .badge-warning-premium {
      background: rgba(245, 158, 11, 0.12);
      color: #d97706;
      padding: 6px 10px;
      border-radius: 8px;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .payment-action-area {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .payment-note {
      font-size: 0.75rem;
      color: var(--text-muted);
      line-height: 1.4;
    }
    .btn-pay-now {
      background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
      color: #ffffff;
      border-radius: 12px;
      padding: 0.75rem;
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25);
    }
    .btn-pay-now:hover {
      background: linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%);
      box-shadow: 0 6px 16px rgba(139, 92, 246, 0.35);
    }

    /* Attendance Radial Panel */
    .attendance-radial-panel {
      display: flex;
      align-items: center;
      justify-content: space-around;
      gap: 1rem;
      padding: 0.5rem 0;
    }
    @media (max-width: 480px) {
      .attendance-radial-panel {
        flex-direction: column;
        gap: 1.5rem;
      }
    }
    .attendance-score {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      border: 8px solid rgba(14, 165, 233, 0.12);
      border-top-color: #0ea5e9;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      animation: spinBorder 1s ease-out;
    }
    .attendance-percent {
      font-size: 1.35rem;
      font-weight: 800;
      color: var(--text-primary);
      font-family: var(--font-display);
    }
    .attendance-lbl {
      font-size: 0.65rem;
      font-weight: 700;
      color: #0ea5e9;
      text-transform: uppercase;
    }
    .attendance-details-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .att-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }
    .bullet {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    .bullet.present { background-color: #10b981; }
    .bullet.late { background-color: #f59e0b; }
    .bullet.absent { background-color: #ef4444; }

    /* Notices List */
    .notices-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }
    .notice-item {
      padding-bottom: 0.875rem;
      border-bottom: 1px solid var(--border-light);
      position: relative;
    }
    .notice-item:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
    .notice-tag {
      display: inline-block;
      font-size: 0.65rem;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      margin-bottom: 0.35rem;
    }
    .notice-tag.tag-new {
      background-color: rgba(239, 68, 68, 0.12);
      color: #ef4444;
    }
    .notice-desc {
      font-size: 0.825rem;
      color: var(--text-primary);
      line-height: 1.45;
      margin-bottom: 0.25rem;
    }
    .notice-time {
      font-size: 0.7rem;
      color: var(--text-muted);
    }

    /* QR Mockup styles */
    .qr-modal {
      width: 440px;
    }
    .qr-body {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.5rem;
      padding: 1.5rem;
    }
    .qr-code-placeholder {
      background: #ffffff;
      padding: 1.5rem;
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
      position: relative;
    }
    .qr-border-visual {
      position: relative;
      width: 200px;
      height: 200px;
      overflow: hidden;
    }
    .qr-scanner-line {
      position: absolute;
      width: 100%;
      height: 2px;
      background-color: #8b5cf6;
      top: 0;
      left: 0;
      box-shadow: 0 0 8px #8b5cf6;
      animation: scan 2s linear infinite;
    }
    @keyframes scan {
      0% { top: 0; }
      50% { top: 100%; }
      100% { top: 0; }
    }
    .qr-payment-details {
      width: 100%;
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
      font-size: 0.85rem;
      color: var(--text-secondary);
      border-top: 1px solid var(--border-color);
      padding-top: 1rem;
    }
    .bank-title {
      font-weight: 700;
      color: var(--text-primary);
    }
    .qr-payment-details strong {
      color: var(--text-primary);
    }
    .text-success-premium {
      color: #10b981 !important;
      font-size: 1.1rem;
    }
    .syntax-highlight {
      background-color: var(--bg-tertiary);
      padding: 2px 6px;
      border-radius: 4px;
      border: 1px solid var(--border-color);
      font-family: monospace;
      color: #8b5cf6 !important;
    }
  `]
})
export class DashboardComponent implements OnInit {
  private apiService = inject(ApiService);
  private authService = inject(AuthService);

  // General States
  public totalStudents = signal<number>(0);
  public totalClasses = signal<number>(0);
  public latestMonthName = signal<string>('N/A');
  public totalRevenue = signal<number>(0);
  public paymentRatio = signal<number>(0);
  public paidCount = signal<number>(0);
  public unpaidCount = signal<number>(0);
  public classBreakdown = signal<Array<{ name: string, count: number }>>([]);
  public maxClassSize = signal<number>(1);

  // Student/Parent Specific States
  public isQRModalVisible = false;
  public selectedStudentName = signal<string>('N/A');
  public studentDashboardData = signal<any>(null);

  constructor() {
    // Reload dashboard metrics whenever selectedSemesterId changes (only for managers/teachers)
    effect(() => {
      const semId = this.apiService.selectedSemesterId();
      if (semId && this.isAdminOrTeacher()) {
        this.loadDashboardData(semId);
      }
    });

    // Update selectedStudentName whenever selectedStudentId changes
    effect(() => {
      const studentId = this.apiService.selectedStudentId();
      const currentUser = this.authService.currentUser();
      if (studentId) {
        if (currentUser?.role === 'Parent' && currentUser.associatedStudents) {
          const child = currentUser.associatedStudents.find(s => s.id === studentId);
          if (child) {
            this.selectedStudentName.set(child.name);
          }
        } else if (currentUser?.role === 'Student') {
          this.selectedStudentName.set(currentUser.fullName);
        }
      } else {
        this.selectedStudentName.set('N/A');
      }
    });

    // Fetch dashboard data when selectedStudentId changes
    effect(() => {
      const studentId = this.apiService.selectedStudentId();
      if (studentId && !this.isAdminOrTeacher()) {
        this.loadStudentDashboardData(studentId);
      }
    });
  }

  ngOnInit() {
    if (!this.isAdminOrTeacher()) {
      const studentId = this.apiService.selectedStudentId();
      if (studentId) {
        this.loadStudentDashboardData(studentId);
      }
    }
    this.checkPaymentStatus();
  }

  loadStudentDashboardData(studentId: number) {
    this.apiService.getStudentDashboardData(studentId).subscribe({
      next: (data) => {
        this.studentDashboardData.set(data);
      },
      error: (err) => console.error('Error loading student dashboard data', err)
    });
  }

  getDayOfWeekLabel(dayOfWeek: string): string {
    const map: { [key: string]: string } = {
      'T2': 'Thứ Hai',
      'T3': 'Thứ Ba',
      'T4': 'Thứ Tư',
      'T5': 'Thứ Năm',
      'T6': 'Thứ Sáu',
      'T7': 'Thứ Bảy',
      'CN': 'Chủ Nhật'
    };
    return map[dayOfWeek.toUpperCase()] || dayOfWeek;
  }

  isTodayDayOfWeek(dayOfWeek: string): boolean {
    const today = new Date().getDay(); // 0 is Sunday, 1 is Monday, etc.
    const map: { [key: string]: number } = {
      'CN': 0,
      'T2': 1,
      'T3': 2,
      'T4': 3,
      'T5': 4,
      'T6': 5,
      'T7': 6
    };
    return map[dayOfWeek.toUpperCase()] === today;
  }

  getRelativeTimeLabel(createdAtString: string): string {
    if (!createdAtString) return 'Vừa xong';
    const created = new Date(createdAtString);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Vừa xong';
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays === 1) return 'Hôm qua';
    return `${diffDays} ngày trước`;
  }

  isAdminOrTeacher(): boolean {
    const role = this.authService.currentUser()?.role;
    return role === 'Manager' || role === 'Teacher';
  }

  isParent(): boolean {
    return this.authService.currentUser()?.role === 'Parent';
  }

  getUserName(): string {
    return this.authService.currentUser()?.fullName || '';
  }

  // QR Modal interactions
  showQRModal() {
    this.isQRModalVisible = true;
  }

  hideQRModal() {
    this.isQRModalVisible = false;
  }

  simulatePaymentSuccess() {
    this.hideQRModal();
    alert('Hệ thống đã ghi nhận yêu cầu chuyển khoản của bạn. Vui lòng chờ nhân viên trung tâm phê duyệt trong vài phút!');
  }

  payViaPayOS() {
    const tuition = this.studentDashboardData()?.tuition;
    if (!tuition || !tuition.isPayOSConfigured) {
      alert('Hệ thống thanh toán online chưa được cấu hình. Vui lòng sử dụng chuyển khoản thường.');
      return;
    }

    const amountDue = tuition.amountDue - tuition.amountPaid;
    if (amountDue <= 0) {
      alert('Bạn không có khoản học phí nào cần thanh toán.');
      return;
    }

    // Call API service to create payment link
    this.apiService.createPayOSPaymentLink({
      studentId: tuition.studentId,
      periodId: tuition.periodId,
      amount: amountDue
    }).subscribe({
      next: (res: any) => {
        if (res && res.checkoutUrl) {
          // Redirect to PayOS page
          window.location.href = res.checkoutUrl;
        } else {
          alert('Không thể tạo link thanh toán. Vui lòng thử lại sau.');
        }
      },
      error: (err: any) => {
        console.error('Error creating payment link', err);
        alert(err.error || 'Có lỗi xảy ra khi tạo link thanh toán.');
      }
    });
  }

  checkPaymentStatus() {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get('paymentStatus');
    const transactionId = urlParams.get('transactionId');
    
    if (paymentStatus === 'success') {
      alert(`Thanh toán thành công cho mã giao dịch #${transactionId}! Hệ thống đã tự động ghi nhận học phí của bạn.`);
      // Clean query parameters from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (paymentStatus === 'cancel') {
      alert(`Giao dịch #${transactionId} đã bị hủy.`);
      // Clean query parameters from URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  loadDashboardData(semesterId: number) {
    this.totalStudents.set(0);
    this.totalClasses.set(0);
    this.apiService.getSemestersSummary().subscribe({
      next: (summaryList) => {
        const current = summaryList.find(s => s.semesterId === semesterId);
        if (current) {
          this.totalStudents.set(Number(current.totalStudents || 0));
          this.totalClasses.set(Number(current.totalClasses || 0));
        }
      },
      error: (err) => console.error('Error loading dashboard summary', err)
    });

    this.apiService.getTuitionMatrix(semesterId).subscribe({
      next: (matrix: TuitionMatrix) => {
        const studentList = matrix.students;
        const periods = matrix.periods;

        // Only count active enrollments
        const activeStudents = studentList.filter(s => s.enrollmentStatus === 'Active');

        // Calculate total unique students
        const uniqueStudentIds = new Set(activeStudents.map(s => Number(s.studentId)));
        this.totalStudents.set(uniqueStudentIds.size);

        // Calculate Class breakdown
        const classCounts: { [name: string]: number } = {};
        activeStudents.forEach(s => {
          classCounts[s.className] = (classCounts[s.className] || 0) + 1;
        });

        const breakdown = Object.keys(classCounts).map(name => ({
          name: name,
          count: classCounts[name]
        })).sort((a, b) => b.count - a.count);

        this.classBreakdown.set(breakdown);
        this.maxClassSize.set(Math.max(...breakdown.map(c => c.count), 1));
        this.totalClasses.set(breakdown.length);

        // Calculate current/relevant month tuition revenue and stats
        if (periods.length > 0 && studentList.length > 0) {
          const selectedPeriod = this.pickDashboardPeriod(periods, studentList);
          this.latestMonthName.set(selectedPeriod.monthName);

          let revenue = 0;
          let paid = 0;
          let unpaid = 0;

          const payableRows = studentList.filter(s => this.isPayableInPeriod(s, selectedPeriod.id));
          payableRows.forEach(s => {
            const payment = s.payments[selectedPeriod.id.toString()];
            if (payment && payment.amountPaid > 0) {
              revenue += payment.amountPaid;
              paid++;
            } else {
              unpaid++;
            }
          });

          this.totalRevenue.set(revenue);
          this.paidCount.set(paid);
          this.unpaidCount.set(unpaid);
          this.paymentRatio.set(payableRows.length > 0 ? (paid / payableRows.length) * 100 : 0);
        } else {
          this.latestMonthName.set('N/A');
          this.totalRevenue.set(0);
          this.paidCount.set(0);
          this.unpaidCount.set(0);
          this.paymentRatio.set(0);
          this.maxClassSize.set(1);
        }
      },
      error: (err) => {
        console.error('Error loading dashboard data', err);
      }
    });
  }

  private pickDashboardPeriod(periods: TuitionPeriod[], studentRows: StudentTuitionRow[]): TuitionPeriod {
    const today = new Date();
    const currentMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const sortedPeriods = [...periods].sort((a, b) => this.periodSortValue(a) - this.periodSortValue(b));

    const currentPeriod = sortedPeriods.find(period => {
      const periodStart = this.parsePeriodStart(period.monthName);
      return periodStart && periodStart.getTime() === currentMonthStart.getTime();
    });
    if (currentPeriod) return currentPeriod;

    const mostRecentPastPeriod = [...sortedPeriods].reverse().find(period => {
      const periodStart = this.parsePeriodStart(period.monthName);
      return periodStart && periodStart <= currentMonthStart && this.hasPayableOrPaidRows(period.id, studentRows);
    });
    if (mostRecentPastPeriod) return mostRecentPastPeriod;

    const periodWithData = [...sortedPeriods].reverse().find(period => this.hasPayableOrPaidRows(period.id, studentRows));
    return periodWithData || sortedPeriods[0];
  }

  private hasPayableOrPaidRows(periodId: number, studentRows: StudentTuitionRow[]): boolean {
    return studentRows.some(row => this.isPayableInPeriod(row, periodId) || Number(row.payments?.[String(periodId)]?.amountPaid || 0) > 0);
  }

  private isPayableInPeriod(row: StudentTuitionRow, periodId: number): boolean {
    const payablePeriodIds = (row.payablePeriodIds || []).map(Number);
    if (payablePeriodIds.length > 0) {
      return payablePeriodIds.includes(Number(periodId));
    }

    return (row.classPeriodIds || []).map(Number).includes(Number(periodId));
  }

  private periodSortValue(period: TuitionPeriod): number {
    const periodStart = this.parsePeriodStart(period.monthName);
    return periodStart ? periodStart.getFullYear() * 100 + periodStart.getMonth() + 1 : Number(period.id);
  }

  private parsePeriodStart(monthName: string): Date | null {
    const match = /^T(\d{1,2})\/(\d{4})$/i.exec((monthName || '').trim());
    if (match) {
      const month = Number(match[1]);
      const year = Number(match[2]);
      if (month >= 1 && month <= 12) {
        return new Date(year, month - 1, 1);
      }
    }

    const legacyMatch = /^T?(\d{1,2})$/i.exec((monthName || '').trim());
    if (legacyMatch) {
      const month = Number(legacyMatch[1]);
      if (month >= 1 && month <= 12) {
        return new Date(new Date().getFullYear(), month - 1, 1);
      }
    }

    return null;
  }
}

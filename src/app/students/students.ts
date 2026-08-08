import { Component, OnInit, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Student, Class, RewardOption, StudentScore } from '../api.service';

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="students-container">
      <div class="header-section">
        <h1>Quản lý Học Sinh</h1>
        <p>Danh sách học sinh. Thêm mới, chỉnh sửa thông tin liên hệ, lớp học và khen thưởng.</p>
        
        <div class="action-buttons-header">
          <button class="btn btn-secondary" (click)="openRewardConfigModal()">
            <span class="material-symbols-outlined">settings</span>
            <span>Cấu hình Khen thưởng</span>
          </button>
          <button class="btn btn-primary" (click)="openAddModal()">
            <span class="material-symbols-outlined">person_add</span>
            <span>Thêm Học Sinh</span>
          </button>
        </div>
      </div>

      <!-- Filters & Toolbar -->
      <div class="card toolbar-card">
        <div class="filters-row">
          <!-- Search -->
          <div class="form-group search-group">
            <span class="material-symbols-outlined search-icon">search</span>
            <input type="text" class="form-control search-input" 
                   placeholder="Tìm tên hoặc số điện thoại..." 
                   [(ngModel)]="searchQuery" (ngModelChange)="applyFilters()">
          </div>

          <!-- Class filter -->
          <div class="form-group select-group">
            <select class="form-control" [(ngModel)]="selectedClassId" (ngModelChange)="applyFilters()">
              <option [ngValue]="0">Tất cả lớp học</option>
              @for (c of classes(); track c.id) {
                <option [ngValue]="c.id">{{ c.name }}</option>
              }
            </select>
          </div>
        </div>
      </div>

      <!-- Students Table -->
      <div class="table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 60px; text-align: center;">ID</th>
              <th style="text-align: left; width: 180px;">Tên Học sinh</th>
              <th style="text-align: left; width: 140px;">Điện thoại</th>
              <th style="text-align: left; width: 180px;">Email</th>
              <th style="text-align: left;">Lớp đang học</th>
              <th style="text-align: left; width: 160px;">Khen thưởng</th>
              <th style="width: 110px; text-align: center;">Điểm</th>
              <th style="width: 140px; text-align: center;">Hành động</th>
            </tr>
          </thead>
          <tbody>
            @for (s of filteredStudents(); track s.id) {
              <tr>
                <td style="text-align: center; color: var(--text-muted);">{{ s.id }}</td>
                <td style="font-weight: 600;">{{ s.name }}</td>
                <td>{{ s.phoneNumber || '-' }}</td>
                <td style="font-size: 0.8rem; color: var(--text-secondary);">{{ s.email || '-' }}</td>
                <td>
                  <div class="classes-badges-row">
                    @for (classId of s.classIds; track classId) {
                      <span class="badge badge-info">{{ getClassName(classId) }} · {{ getStudentClassStartMonth(s, classId) }}</span>
                    } @empty {
                      <span style="color: var(--text-muted); font-size: 0.8rem; font-style: italic;">Chưa phân lớp</span>
                    }
                  </div>
                </td>
                <td>
                  <div class="rewards-badges-row">
                    @for (rName of s.rewardNames; track rName) {
                      <span class="badge badge-success">{{ rName }}</span>
                    }
                  </div>
                </td>
                <td style="text-align: center;">
                  <button class="btn btn-secondary btn-sm" (click)="openScoresModal(s)" title="Xem điểm kiểm tra">
                    <span class="material-symbols-outlined" style="font-size: 1.1rem;">grading</span>
                    <span>Điểm</span>
                  </button>
                </td>
                <td style="text-align: center;">
                  <div class="actions-group">
                    <button class="btn btn-secondary btn-sm" (click)="openEditModal(s)">
                      <span class="material-symbols-outlined" style="font-size: 1.1rem;">edit</span>
                    </button>
                    <button class="btn btn-danger btn-sm" (click)="deleteStudent(s.id)">
                      <span class="material-symbols-outlined" style="font-size: 1.1rem;">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            } @empty {
              <tr>
                <td colspan="8" style="text-align: center; padding: 2.5rem; color: var(--text-secondary);">
                  Chưa có học sinh nào phù hợp.
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>

      <!-- Add / Edit Student Modal -->
      @if (showModal()) {
        <div class="modal-overlay">
          <div class="modal-container" style="width: min(760px, calc(100vw - 2rem));">
            <div class="modal-header">
              <h3>{{ isEditMode() ? 'Chỉnh sửa thông tin Học sinh' : 'Thêm Học sinh mới' }}</h3>
              <button class="close-btn" (click)="closeModal()">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
            <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
              <!-- Name -->
              <div class="form-group">
                <label class="form-label">Họ và Tên <span style="color: var(--color-danger)">*</span></label>
                <input type="text" class="form-control" placeholder="Nhập tên học sinh..." [(ngModel)]="studentForm.name">
              </div>

              <!-- Phone -->
              <div class="form-group">
                <label class="form-label">Số điện thoại</label>
                <input type="text" class="form-control" placeholder="Ví dụ: 0987654321..." [(ngModel)]="studentForm.phoneNumber">
              </div>

              <!-- Email -->
              <div class="form-group">
                <label class="form-label">Email</label>
                <input type="email" class="form-control" placeholder="Ví dụ: hocsinh@gmail.com..." [(ngModel)]="studentForm.email">
              </div>

              <!-- Multiple Classes Selection -->
              <div class="form-group">
                <label class="form-label">Lớp học đăng ký <span style="color: var(--color-danger)">*</span></label>
                <p style="font-size: 0.75rem; color: var(--text-secondary); margin-top: -0.25rem; margin-bottom: 0.25rem;">Chọn lớp và tháng bắt đầu riêng cho từng lớp:</p>
                <div class="checkbox-group-container class-registration-list">
                  @for (c of classes(); track c.id) {
                    <label class="checkbox-label-item">
                      <input type="checkbox" [checked]="isClassSelected(c.id)" (change)="toggleClassSelection(c.id)">
                      <span>{{ c.name }}</span>
                    </label>
                    @if (isClassSelected(c.id)) {
                      <div class="enrollment-plan-box">
                        <div class="class-month-row">
                          <span>Tháng bắt đầu</span>
                          <select class="form-control" [ngModel]="getClassStartMonthValue(c.id)" (ngModelChange)="setClassStartMonth(c.id, $event)">
                            @for (month of availableStartMonthsForClass(c); track month) {
                              <option [value]="month">{{ month }}</option>
                            }
                          </select>
                        </div>
                        <div class="class-month-row">
                          <span>Trạng thái</span>
                          <select class="form-control" [ngModel]="getEnrollmentPlan(c.id).status" (ngModelChange)="setEnrollmentPlanStatus(c.id, $event)">
                            <option value="Active">Đang học liên tục</option>
                            <option value="Paused">Tạm nghỉ rồi có thể học lại</option>
                            <option value="Stopped">Nghỉ hẳn</option>
                          </select>
                        </div>
                        @if (getEnrollmentPlan(c.id).status !== 'Active') {
                          <div class="class-month-row">
                            <span>Nghỉ từ tháng</span>
                            <select class="form-control" [ngModel]="getEnrollmentPlan(c.id).inactiveFromMonth" (ngModelChange)="setEnrollmentPlanValue(c.id, 'inactiveFromMonth', $event)">
                              @for (month of availableEnrollmentMonthsForClass(c.id, c); track month) {
                                <option [value]="month">{{ month }}</option>
                              }
                            </select>
                          </div>
                        }
                        @if (getEnrollmentPlan(c.id).status === 'Paused') {
                          <div class="class-month-row">
                            <span>Học lại từ tháng</span>
                            <select class="form-control" [ngModel]="getEnrollmentPlan(c.id).resumeMonth" (ngModelChange)="setEnrollmentPlanValue(c.id, 'resumeMonth', $event)">
                              <option value="">Chưa xác định</option>
                              @for (month of availableEnrollmentMonthsForClass(c.id, c); track month) {
                                <option [value]="month">{{ month }}</option>
                              }
                            </select>
                          </div>
                        }
                        @if (getEnrollmentPlan(c.id).status !== 'Active') {
                          <div class="class-month-row note-row">
                            <span>Lý do</span>
                            <input type="text" class="form-control" placeholder="Ví dụ: nghỉ hè, bận lịch, học lại tháng sau..." [ngModel]="getEnrollmentPlan(c.id).reason" (ngModelChange)="setEnrollmentPlanValue(c.id, 'reason', $event)">
                          </div>
                        }
                      </div>
                    }
                  } @empty {
                    <span style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">Không tìm thấy lớp học nào trong học kỳ này. Hãy tạo lớp học trước!</span>
                  }
                </div>
              </div>

              <!-- Rewards Selection -->
              <div class="form-group">
                <label class="form-label">Khen thưởng</label>
                <div class="checkbox-group-container reward-list">
                  @for (r of rewardOptions(); track r.id) {
                    <label class="checkbox-label-item">
                      <input type="checkbox" [checked]="isRewardSelected(r.id)" (change)="toggleRewardSelection(r.id)">
                      <span>{{ r.name }}</span>
                    </label>
                  } @empty {
                    <span style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">Chưa có danh mục khen thưởng nào được tạo.</span>
                  }
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeModal()">Hủy</button>
              <button class="btn btn-primary" (click)="saveStudent()" [disabled]="!isFormValid()">Lưu</button>
            </div>
          </div>
        </div>
      }

      <!-- Reward Configuration Modal -->
      @if (showRewardConfigModal()) {
        <div class="modal-overlay">
          <div class="modal-container" style="width: 500px;">
            <div class="modal-header">
              <h3>Cấu hình Danh mục Khen thưởng</h3>
              <button class="close-btn" (click)="closeRewardConfigModal()">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
            <div class="modal-body">
              <!-- Current lists -->
              <div class="config-items-list">
                <h4>Các hạng mục hiện tại:</h4>
                @for (r of rewardOptions(); track r.id) {
                  <div class="config-item-row">
                    <span>{{ r.name }}</span>
                    <button class="close-btn" (click)="deleteRewardOption(r.id)">
                      <span class="material-symbols-outlined" style="color: var(--color-danger); font-size: 1.2rem;">delete</span>
                    </button>
                  </div>
                } @empty {
                  <p style="color: var(--text-muted); font-size: 0.85rem; font-style: italic;">Chưa có hạng mục khen thưởng nào.</p>
                }
              </div>

              <hr style="border: 0; border-top: 1px solid var(--border-color); margin: 1.25rem 0;">

              <!-- Form add reward -->
              <h4>Thêm hạng mục khen thưởng mới:</h4>
              <div style="display: flex; gap: 0.75rem; align-items: center; margin-top: 0.5rem;">
                <input type="text" class="form-control" style="flex-grow: 1;" 
                       placeholder="Ví dụ: Học sinh xuất sắc, Chuyên cần..." 
                       [(ngModel)]="newRewardName"
                       (keydown.enter)="saveNewRewardOption()">
                <button class="btn btn-primary" (click)="saveNewRewardOption()" [disabled]="!newRewardName.trim()">
                  Thêm
                </button>
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeRewardConfigModal()">Đóng</button>
            </div>
          </div>
        </div>
      }

      <!-- Scores Modal -->
      @if (showScoresModal()) {
        <div class="modal-overlay">
          <div class="modal-container" style="width: 680px;">
            <div class="modal-header">
              <h3>Điểm kiểm tra: {{ selectedScoreStudent()?.name }}</h3>
              <button class="close-btn" (click)="closeScoresModal()">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
            <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
              <div class="score-form-grid">
                <div class="form-group">
                  <label class="form-label">Lớp</label>
                  <select class="form-control" [(ngModel)]="scoreForm.classId">
                    @for (classId of selectedScoreStudent()?.classIds || []; track classId) {
                      <option [ngValue]="classId">{{ getClassName(classId) }}</option>
                    }
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Ngày kiểm tra</label>
                  <input type="date" class="form-control" [(ngModel)]="scoreForm.date">
                </div>
                <div class="form-group score-name-field">
                  <label class="form-label">Tên bài kiểm tra</label>
                  <input type="text" class="form-control" placeholder="Ví dụ: Test 15 phút, giữa kỳ..." [(ngModel)]="scoreForm.testName">
                </div>
                <div class="form-group">
                  <label class="form-label">Điểm</label>
                  <input type="number" class="form-control" min="0" step="0.25" [(ngModel)]="scoreForm.score">
                </div>
                <div class="form-group">
                  <label class="form-label">Thang điểm</label>
                  <input type="number" class="form-control" min="1" step="0.25" [(ngModel)]="scoreForm.maxScore">
                </div>
                <div class="form-group score-note-field">
                  <label class="form-label">Ghi chú</label>
                  <input type="text" class="form-control" placeholder="Ghi chú nếu có..." [(ngModel)]="scoreForm.note">
                </div>
                <button class="btn btn-primary add-score-btn" (click)="saveScore()" [disabled]="!canSaveScore()">
                  <span class="material-symbols-outlined">add</span>
                  Thêm điểm
                </button>
              </div>

              <div class="score-summary">
                <span>Số bài: <strong>{{ studentScores().length }}</strong></span>
                <span>Trung bình: <strong>{{ averageScoreText() }}</strong></span>
                <button class="btn btn-secondary btn-sm" (click)="showLearningReport.set(!showLearningReport())" [disabled]="studentScores().length === 0">
                  <span class="material-symbols-outlined" style="font-size: 1.1rem;">monitoring</span>
                  Báo cáo học tập
                </button>
              </div>

              @if (showLearningReport()) {
                <div class="learning-report">
                  <div class="report-head">
                    <div>
                      <h4>Báo cáo tình hình học tập</h4>
                      <span>{{ learningReport().comment }}</span>
                    </div>
                    <strong [class.good]="learningReport().trend === 'up'" [class.warn]="learningReport().trend === 'down'">
                      {{ learningReport().trendLabel }}
                    </strong>
                  </div>

                  <div class="report-metrics">
                    <div>
                      <span>Trung bình</span>
                      <strong>{{ learningReport().average }}</strong>
                    </div>
                    <div>
                      <span>Điểm gần nhất</span>
                      <strong>{{ learningReport().latest }}</strong>
                    </div>
                    <div>
                      <span>Cao nhất</span>
                      <strong>{{ learningReport().best }}</strong>
                    </div>
                    <div>
                      <span>Thấp nhất</span>
                      <strong>{{ learningReport().worst }}</strong>
                    </div>
                  </div>

                  <div class="trend-chart">
                    <div class="trend-chart-head">
                      <strong>Biểu đồ tăng giảm điểm</strong>
                      <span>Trái sang phải theo thứ tự thời gian</span>
                    </div>
                    <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Biểu đồ xu hướng điểm kiểm tra">
                      <line x1="0" y1="20" x2="100" y2="20" class="grid-line"></line>
                      <line x1="0" y1="50" x2="100" y2="50" class="grid-line"></line>
                      <line x1="0" y1="80" x2="100" y2="80" class="grid-line"></line>
                      @for (segment of learningReport().segments; track segment.key) {
                        <line [attr.x1]="segment.x1" [attr.y1]="segment.y1" [attr.x2]="segment.x2" [attr.y2]="segment.y2" [class.down]="segment.direction === 'down'" [class.flat]="segment.direction === 'flat'" class="trend-segment"></line>
                      }
                      @for (point of learningReport().chartPoints; track point.id) {
                        <circle [attr.cx]="point.x" [attr.cy]="point.y" r="2.2" class="trend-point"></circle>
                      }
                    </svg>
                    <div class="trend-axis">
                      <span>0</span>
                      <span>5</span>
                      <span>10</span>
                    </div>
                    <div class="trend-legend">
                      <span><i class="up"></i> Tăng</span>
                      <span><i class="down"></i> Giảm</span>
                      <span><i class="flat"></i> Giữ nguyên</span>
                    </div>
                  </div>

                  <div class="score-chart">
                    @for (item of learningReport().points; track item.id) {
                      <div class="score-chart-row">
                        <div class="score-chart-label">
                          <strong>{{ item.testName }}</strong>
                          <span>{{ item.date }} · {{ item.className }}</span>
                        </div>
                        <div class="score-chart-track">
                          <div class="score-chart-fill" [style.width.%]="item.percent" [class.low]="item.normalized < 5" [class.mid]="item.normalized >= 5 && item.normalized < 7"></div>
                        </div>
                        <b>{{ item.normalizedText }}</b>
                      </div>
                    }
                  </div>
                </div>
              }

              <div class="score-list">
                @for (score of studentScores(); track score.id) {
                  <div class="score-row">
                    <div class="score-main">
                      <strong>{{ score.testName }}</strong>
                      <span>{{ score.className }} · {{ score.date }}</span>
                      @if (score.note) {
                        <small>{{ score.note }}</small>
                      }
                    </div>
                    <div class="score-value">
                      <strong>{{ score.score }}/{{ score.maxScore }}</strong>
                      <button class="btn btn-danger btn-sm" (click)="deleteScore(score.id)" title="Xóa điểm">
                        <span class="material-symbols-outlined" style="font-size: 1.1rem;">delete</span>
                      </button>
                    </div>
                  </div>
                } @empty {
                  <div class="empty-score">Chưa có điểm kiểm tra nào.</div>
                }
              </div>
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" (click)="closeScoresModal()">Đóng</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    .students-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      min-height: 0;
    }
    .header-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }
    .header-section h1 {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
      width: 100%;
    }
    .header-section p {
      color: var(--text-secondary);
      font-size: 0.875rem;
      flex-grow: 1;
    }
    .action-buttons-header {
      display: flex;
      gap: 0.75rem;
    }
    .toolbar-card {
      padding: 1rem 1.5rem;
      flex-shrink: 0;
    }
    .filters-row {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      flex-wrap: wrap;
    }
    .search-group {
      position: relative;
      flex-grow: 1;
      max-width: 320px;
      margin-bottom: 0;
    }
    .search-icon {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      font-size: 1.25rem;
    }
    .search-input {
      padding-left: 2.5rem;
    }
    .select-group {
      margin-bottom: 0;
      width: 200px;
    }
    .table-container {
      max-height: calc(100vh - 310px);
      min-height: 320px;
      overflow: auto;
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
      min-width: 1120px;
    }
    .data-table thead th {
      position: sticky;
      top: 0;
      z-index: 2;
      background: var(--bg-secondary);
      box-shadow: 0 1px 0 var(--border-color);
    }
    .classes-badges-row, .rewards-badges-row {
      display: flex;
      flex-wrap: wrap;
      gap: 0.35rem;
    }
    .actions-group {
      display: flex;
      justify-content: center;
      gap: 0.5rem;
    }
    .btn-sm {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
      border-radius: var(--radius-sm);
    }
    @media (max-width: 900px) {
      .action-buttons-header {
        width: 100%;
        flex-wrap: wrap;
      }
      .action-buttons-header .btn {
        flex: 1 1 220px;
        justify-content: center;
      }
      .toolbar-card {
        padding: 0.875rem;
      }
      .filters-row {
        align-items: stretch;
        gap: 0.75rem;
      }
      .search-group,
      .select-group {
        width: 100%;
        max-width: none;
      }
      .table-container {
        max-height: calc(100vh - 360px);
        min-height: 260px;
      }
    }
    /* Checkbox group styling */
    .checkbox-group-container {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      overflow-y: auto;
      padding: 0.625rem;
      background-color: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
    }
    .class-registration-list {
      max-height: min(360px, 42vh);
      padding: 0.75rem;
    }
    .reward-list {
      max-height: 120px;
    }
    .checkbox-label-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      cursor: pointer;
      font-size: 0.875rem;
      user-select: none;
    }
    .checkbox-label-item input[type="checkbox"] {
      cursor: pointer;
      width: 16px;
      height: 16px;
    }
    .enrollment-plan-box {
      display: grid;
      gap: 0.55rem;
      margin: -0.15rem 0 0.55rem 1.55rem;
      padding: 0.75rem;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: rgba(15, 23, 42, 0.45);
    }
    .class-month-row {
      display: grid;
      grid-template-columns: minmax(130px, 1fr) minmax(190px, 260px);
      align-items: center;
      gap: 0.75rem;
      color: var(--text-secondary);
      font-size: 0.8125rem;
    }
    .class-month-row.note-row {
      grid-template-columns: 1fr;
    }
    /* Reward config styles */
    .config-items-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-height: 250px;
      overflow-y: auto;
      padding-right: 0.25rem;
    }
    .config-item-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.5rem 0.75rem;
      background-color: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      font-size: 0.875rem;
    }
    .score-form-grid {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.75rem;
      align-items: end;
    }
    .score-name-field,
    .score-note-field {
      grid-column: span 2;
    }
    .add-score-btn {
      height: 40px;
      white-space: nowrap;
    }
    .score-summary {
      display: flex;
      align-items: center;
      justify-content: space-between;
      flex-wrap: wrap;
      gap: 1rem;
      margin: 1rem 0;
      padding: 0.75rem;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: rgba(99, 102, 241, 0.08);
      color: var(--text-secondary);
    }
    .score-summary strong {
      color: var(--text-primary);
    }
    .learning-report {
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: rgba(15, 23, 42, 0.35);
      padding: 1rem;
      margin-bottom: 1rem;
    }
    .report-head {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: flex-start;
      margin-bottom: 0.85rem;
    }
    .report-head h4 {
      margin: 0 0 0.2rem;
      font-size: 1rem;
    }
    .report-head span {
      color: var(--text-secondary);
      font-size: 0.82rem;
    }
    .report-head > strong {
      color: var(--text-secondary);
      white-space: nowrap;
    }
    .report-head > strong.good {
      color: #10b981;
    }
    .report-head > strong.warn {
      color: #f59e0b;
    }
    .report-metrics {
      display: grid;
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.65rem;
      margin-bottom: 1rem;
    }
    .report-metrics div {
      display: grid;
      gap: 0.15rem;
      padding: 0.65rem;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-sm);
      background: var(--bg-primary);
    }
    .report-metrics span {
      color: var(--text-secondary);
      font-size: 0.72rem;
      font-weight: 700;
    }
    .report-metrics strong {
      color: var(--text-primary);
      font-size: 1rem;
    }
    .trend-chart {
      position: relative;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: var(--bg-primary);
      padding: 0.85rem 0.9rem 0.7rem;
      margin-bottom: 1rem;
    }
    .trend-chart-head {
      display: flex;
      justify-content: space-between;
      gap: 1rem;
      align-items: center;
      margin-bottom: 0.65rem;
    }
    .trend-chart-head span,
    .trend-legend span,
    .trend-axis span {
      color: var(--text-secondary);
      font-size: 0.72rem;
      font-weight: 700;
    }
    .trend-chart svg {
      width: 100%;
      height: 180px;
      display: block;
      overflow: visible;
    }
    .grid-line {
      stroke: rgba(148, 163, 184, 0.18);
      stroke-width: 0.5;
      vector-effect: non-scaling-stroke;
    }
    .trend-segment {
      stroke: #10b981;
      stroke-width: 3;
      stroke-linecap: round;
      vector-effect: non-scaling-stroke;
    }
    .trend-segment.down {
      stroke: #f59e0b;
    }
    .trend-segment.flat {
      stroke: #38bdf8;
    }
    .trend-point {
      fill: #ffffff;
      stroke: var(--accent-primary);
      stroke-width: 1.2;
      vector-effect: non-scaling-stroke;
    }
    .trend-axis,
    .trend-legend {
      display: flex;
      justify-content: space-between;
      gap: 0.75rem;
      margin-top: 0.45rem;
    }
    .trend-legend {
      justify-content: flex-start;
      flex-wrap: wrap;
    }
    .trend-legend i {
      display: inline-block;
      width: 18px;
      height: 3px;
      border-radius: 999px;
      margin-right: 0.35rem;
      vertical-align: middle;
      background: #10b981;
    }
    .trend-legend i.down {
      background: #f59e0b;
    }
    .trend-legend i.flat {
      background: #38bdf8;
    }
    .score-chart {
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }
    .score-chart-row {
      display: grid;
      grid-template-columns: minmax(160px, 1.2fr) minmax(120px, 1fr) 56px;
      align-items: center;
      gap: 0.75rem;
    }
    .score-chart-label {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .score-chart-label span {
      color: var(--text-secondary);
      font-size: 0.72rem;
    }
    .score-chart-track {
      height: 10px;
      background: rgba(148, 163, 184, 0.18);
      border-radius: 999px;
      overflow: hidden;
    }
    .score-chart-fill {
      height: 100%;
      background: #10b981;
      border-radius: inherit;
    }
    .score-chart-fill.mid {
      background: #f59e0b;
    }
    .score-chart-fill.low {
      background: #ef4444;
    }
    .score-chart-row b {
      color: var(--color-info);
      text-align: right;
    }
    .score-list {
      display: flex;
      flex-direction: column;
      gap: 0.55rem;
    }
    .score-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.75rem;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background: var(--bg-primary);
    }
    .score-main {
      display: flex;
      flex-direction: column;
      gap: 0.2rem;
    }
    .score-main span,
    .score-main small {
      color: var(--text-secondary);
      font-size: 0.78rem;
    }
    .score-value {
      display: flex;
      align-items: center;
      gap: 0.55rem;
      color: var(--color-info);
    }
    .empty-score {
      padding: 1.5rem;
      border: 1px dashed var(--border-color);
      border-radius: var(--radius-md);
      text-align: center;
      color: var(--text-secondary);
    }
    @media (max-width: 720px) {
      .score-form-grid {
        grid-template-columns: 1fr;
      }
      .score-name-field,
      .score-note-field {
        grid-column: auto;
      }
      .report-metrics,
      .score-chart-row {
        grid-template-columns: 1fr;
      }
      .score-chart-row b {
        text-align: left;
      }
      .class-registration-list {
        max-height: 44vh;
      }
      .class-month-row {
        grid-template-columns: 1fr;
        gap: 0.35rem;
      }
      .enrollment-plan-box {
        margin-left: 0.25rem;
      }
    }
  `]
})
export class StudentsComponent implements OnInit {
  private apiService = inject(ApiService);

  // States
  public students = signal<Student[]>([]);
  public filteredStudents = signal<Student[]>([]);
  public classes = signal<Class[]>([]);
  public rewardOptions = signal<RewardOption[]>([]);
  
  public showModal = signal<boolean>(false);
  public isEditMode = signal<boolean>(false);
  public showRewardConfigModal = signal<boolean>(false);
  public showScoresModal = signal<boolean>(false);
  public showLearningReport = signal<boolean>(false);
  public selectedScoreStudent = signal<Student | null>(null);
  public studentScores = signal<StudentScore[]>([]);
  public studentStartMonthError = signal<string>('');

  // Filters
  public searchQuery = '';
  public selectedClassId = 0;

  // Student Form State
  public studentForm = {
    id: 0,
    name: '',
    phoneNumber: '',
    email: '',
    classIds: [] as number[],
    classStartMonths: {} as { [classId: number]: string },
    classEnrollmentPlans: {} as { [classId: number]: { status: string; inactiveFromMonth: string; resumeMonth: string; reason: string } },
    rewardIds: [] as number[],
    startMonth: 'T7'
  };

  // Reward Config Form State
  public newRewardName = '';
  public scoreForm = {
    classId: null as number | null,
    date: this.today(),
    testName: '',
    score: 0,
    maxScore: 10,
    note: ''
  };

  constructor() {
    effect(() => {
      const semId = this.apiService.selectedSemesterId();
      if (semId) {
        this.loadClasses(semId);
        this.loadStudents(semId);
        this.loadRewardOptions();
      }
    });
  }

  ngOnInit() {}

  loadClasses(semesterId: number) {
    this.apiService.getClasses(semesterId).subscribe(data => this.classes.set(data));
  }

  loadRewardOptions() {
    this.apiService.getRewardOptions().subscribe(data => this.rewardOptions.set(data));
  }

  loadStudents(semesterId: number) {
    this.apiService.getStudents(undefined, semesterId).subscribe({
      next: (data) => {
        this.students.set(data);
        this.applyFilters();
      },
      error: (err) => console.error('Error loading students', err)
    });
  }

  applyFilters() {
    let list = this.students();

    // Search by Name or Phone
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      list = list.filter(s => 
        s.name.toLowerCase().includes(query) || 
        (s.phoneNumber && s.phoneNumber.includes(query))
      );
    }

    // Filter by Class ID
    const selectedClassId = Number(this.selectedClassId);
    if (selectedClassId > 0) {
      list = list.filter(s => s.classIds && s.classIds.map(Number).includes(selectedClassId));
    }

    this.filteredStudents.set(list);
  }

  getClassName(classId: number): string {
    return this.classes().find(c => c.id === classId)?.name || `Lớp ${classId}`;
  }

  getStudentClassStartMonth(student: Student, classId: number): string {
    return student.classStartMonths?.[classId] || student.startMonth || 'T1';
  }

  openScoresModal(student: Student) {
    this.selectedScoreStudent.set(student);
    const firstClassId = student.classIds?.[0] || null;
    this.scoreForm = {
      classId: firstClassId,
      date: this.today(),
      testName: '',
      score: 0,
      maxScore: 10,
      note: ''
    };
    this.showScoresModal.set(true);
    this.showLearningReport.set(false);
    this.loadStudentScores(student.id);
  }

  closeScoresModal() {
    this.showScoresModal.set(false);
    this.selectedScoreStudent.set(null);
    this.studentScores.set([]);
    this.showLearningReport.set(false);
  }

  loadStudentScores(studentId: number) {
    this.apiService.getStudentScores(studentId).subscribe({
      next: data => this.studentScores.set(data),
      error: err => console.error('Error loading student scores', err)
    });
  }

  canSaveScore(): boolean {
    return !!this.selectedScoreStudent()
      && !!this.scoreForm.classId
      && this.scoreForm.testName.trim().length > 0
      && Number(this.scoreForm.maxScore) > 0
      && Number(this.scoreForm.score) >= 0
      && Number(this.scoreForm.score) <= Number(this.scoreForm.maxScore);
  }

  saveScore() {
    const student = this.selectedScoreStudent();
    if (!student || !this.canSaveScore()) return;

    this.apiService.createStudentScore({
      studentId: student.id,
      classId: Number(this.scoreForm.classId),
      date: this.scoreForm.date,
      testName: this.scoreForm.testName.trim(),
      score: Number(this.scoreForm.score),
      maxScore: Number(this.scoreForm.maxScore),
      note: this.scoreForm.note
    }).subscribe({
      next: () => {
        this.scoreForm.testName = '';
        this.scoreForm.score = 0;
        this.scoreForm.note = '';
        this.loadStudentScores(student.id);
      },
      error: err => alert(err.error?.message || 'Không thể thêm điểm kiểm tra.')
    });
  }

  deleteScore(id: number) {
    const student = this.selectedScoreStudent();
    if (!student) return;
    if (!confirm('Bạn có chắc chắn muốn xóa điểm kiểm tra này?')) return;

    this.apiService.deleteStudentScore(id).subscribe({
      next: () => this.loadStudentScores(student.id),
      error: err => alert(err.error?.message || 'Không thể xóa điểm kiểm tra.')
    });
  }

  averageScoreText(): string {
    const scores = this.studentScores();
    if (!scores.length) return '-';
    const normalized = scores.map(s => Number(s.score) / Number(s.maxScore || 10) * 10);
    const avg = normalized.reduce((sum, score) => sum + score, 0) / normalized.length;
    return `${avg.toFixed(2)}/10`;
  }

  learningReport() {
    const points = [...this.studentScores()]
      .sort((a, b) => `${a.date}-${a.id}`.localeCompare(`${b.date}-${b.id}`))
      .map(score => {
        const normalized = Number(score.score) / Number(score.maxScore || 10) * 10;
        return {
          ...score,
          normalized,
          normalizedText: `${normalized.toFixed(2)}/10`,
          percent: Math.max(0, Math.min(100, normalized * 10))
        };
      });
    const chartPoints = points.map((point, index) => {
      const x = points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
      const y = 100 - point.percent;
      return {
        ...point,
        x: Number(x.toFixed(2)),
        y: Number(Math.max(4, Math.min(96, y)).toFixed(2))
      };
    });
    const segments = chartPoints.slice(1).map((point, index) => {
      const prev = chartPoints[index];
      const delta = point.normalized - prev.normalized;
      const direction = delta > 0.05 ? 'up' : (delta < -0.05 ? 'down' : 'flat');
      return {
        key: `${prev.id}-${point.id}`,
        x1: prev.x,
        y1: prev.y,
        x2: point.x,
        y2: point.y,
        direction
      };
    });

    if (!points.length) {
      return {
        average: '-',
        latest: '-',
        best: '-',
        worst: '-',
        trend: 'none',
        trendLabel: 'Chưa có dữ liệu',
        comment: 'Chưa có điểm kiểm tra để đánh giá.',
        points,
        chartPoints,
        segments
      };
    }

    const values = points.map(p => p.normalized);
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    const latest = points[points.length - 1].normalized;
    const best = Math.max(...values);
    const worst = Math.min(...values);

    let trend: 'up' | 'down' | 'flat' | 'none' = 'none';
    let trendLabel = 'Cần thêm dữ liệu';
    let comment = 'Cần ít nhất 2 bài kiểm tra để đánh giá xu hướng tiến bộ.';

    if (points.length >= 2) {
      const mid = Math.ceil(points.length / 2);
      const firstHalf = values.slice(0, mid);
      const secondHalf = values.slice(mid);
      const firstAvg = firstHalf.reduce((sum, value) => sum + value, 0) / firstHalf.length;
      const secondAvg = secondHalf.length
        ? secondHalf.reduce((sum, value) => sum + value, 0) / secondHalf.length
        : latest;
      const delta = secondAvg - firstAvg;

      if (delta >= 0.5) {
        trend = 'up';
        trendLabel = 'Đang tiến bộ';
        comment = `Điểm giai đoạn sau tăng khoảng ${delta.toFixed(2)} điểm so với giai đoạn đầu.`;
      } else if (delta <= -0.5) {
        trend = 'down';
        trendLabel = 'Có dấu hiệu giảm';
        comment = `Điểm giai đoạn sau giảm khoảng ${Math.abs(delta).toFixed(2)} điểm so với giai đoạn đầu.`;
      } else {
        trend = 'flat';
        trendLabel = 'Ổn định';
        comment = 'Điểm số tương đối ổn định, chưa có biến động lớn.';
      }
    }

    return {
      average: `${average.toFixed(2)}/10`,
      latest: `${latest.toFixed(2)}/10`,
      best: `${best.toFixed(2)}/10`,
      worst: `${worst.toFixed(2)}/10`,
      trend,
      trendLabel,
      comment,
      points,
      chartPoints,
      segments
    };
  }

  deleteStudent(id: number) {
    if (confirm('Bạn có chắc chắn muốn xóa học sinh này? Lịch sử đóng học phí của học sinh này cũng sẽ bị xóa.')) {
      this.apiService.deleteStudent(id).subscribe({
        next: () => {
          const semId = this.apiService.selectedSemesterId();
          if (semId) this.loadStudents(semId);
        },
        error: (err) => console.error('Error deleting student', err)
      });
    }
  }

  // Student Add / Edit Modals
  openAddModal() {
    this.isEditMode.set(false);
    const defaultClassIds = this.classes().length > 0 ? [this.classes()[0].id] : [];
    this.studentForm = {
      id: 0,
      name: '',
      phoneNumber: '',
      email: '',
      classIds: defaultClassIds,
      classStartMonths: this.buildDefaultClassStartMonths(defaultClassIds),
      classEnrollmentPlans: this.buildDefaultEnrollmentPlans(defaultClassIds),
      rewardIds: [],
      startMonth: this.getMinimumStartMonthForClasses(defaultClassIds)
    };
    this.studentStartMonthError.set('');
    this.showModal.set(true);
  }

  openEditModal(student: Student) {
    this.isEditMode.set(true);
    this.studentForm = {
      id: student.id,
      name: student.name,
      phoneNumber: student.phoneNumber || '',
      email: student.email || '',
      classIds: [...(student.classIds || [])],
      classStartMonths: { ...(student.classStartMonths || {}) },
      classEnrollmentPlans: this.buildEnrollmentPlansFromStudent(student),
      rewardIds: [...(student.rewardIds || [])],
      startMonth: student.startMonth || 'T7'
    };
    this.normalizeStudentStartMonths();
    this.showModal.set(true);
  }

  closeModal() {
    this.showModal.set(false);
  }

  isFormValid(): boolean {
    return this.studentForm.name.trim().length > 0
      && this.studentForm.classIds.length > 0
      && !this.studentStartMonthError();
  }

  saveStudent() {
    this.normalizeStudentStartMonths();
    if (!this.isFormValid()) return;
    const semId = this.apiService.selectedSemesterId();
    if (!semId) return;

    if (this.isEditMode()) {
      this.apiService.updateStudent(this.studentForm.id, this.studentForm).subscribe({
        next: () => {
          this.loadStudents(semId);
          this.closeModal();
        },
        error: (err) => {
          console.error('Error updating student', err);
          alert(err.error?.message || 'Không thể cập nhật học sinh.');
        }
      });
    } else {
      this.apiService.createStudent(this.studentForm).subscribe({
        next: () => {
          this.loadStudents(semId);
          this.closeModal();
        },
        error: (err) => {
          console.error('Error creating student', err);
          alert(err.error?.message || 'Không thể thêm học sinh.');
        }
      });
    }
  }

  // Checkbox helpers
  isClassSelected(id: number): boolean {
    return this.studentForm.classIds.includes(id);
  }

  toggleClassSelection(id: number) {
    const idx = this.studentForm.classIds.indexOf(id);
    if (idx >= 0) {
      this.studentForm.classIds.splice(idx, 1);
      delete this.studentForm.classStartMonths[id];
      delete this.studentForm.classEnrollmentPlans[id];
    } else {
      this.studentForm.classIds.push(id);
      this.studentForm.classStartMonths[id] = this.getMinimumStartMonthForClass(id);
      this.studentForm.classEnrollmentPlans[id] = this.createDefaultEnrollmentPlan(id);
    }
    this.normalizeStudentStartMonths();
  }

  getEnrollmentPlan(classId: number) {
    if (!this.studentForm.classEnrollmentPlans[classId]) {
      this.studentForm.classEnrollmentPlans[classId] = this.createDefaultEnrollmentPlan(classId);
    }
    return this.studentForm.classEnrollmentPlans[classId];
  }

  setEnrollmentPlanStatus(classId: number, status: string) {
    const plan = this.getEnrollmentPlan(classId);
    plan.status = status;
    if (status === 'Active') {
      plan.inactiveFromMonth = '';
      plan.resumeMonth = '';
      plan.reason = '';
    } else if (!plan.inactiveFromMonth) {
      plan.inactiveFromMonth = this.getClassStartMonthValue(classId);
    }
  }

  setEnrollmentPlanValue(classId: number, field: 'inactiveFromMonth' | 'resumeMonth' | 'reason', value: string) {
    const plan = this.getEnrollmentPlan(classId);
    plan[field] = value;
  }

  private createDefaultEnrollmentPlan(classId: number) {
    return {
      status: 'Active',
      inactiveFromMonth: this.getClassStartMonthValue(classId),
      resumeMonth: '',
      reason: ''
    };
  }

  private buildDefaultEnrollmentPlans(classIds: number[]): { [classId: number]: { status: string; inactiveFromMonth: string; resumeMonth: string; reason: string } } {
    return classIds.reduce((acc, classId) => {
      acc[classId] = this.createDefaultEnrollmentPlan(classId);
      return acc;
    }, {} as { [classId: number]: { status: string; inactiveFromMonth: string; resumeMonth: string; reason: string } });
  }

  private buildEnrollmentPlansFromStudent(student: Student): { [classId: number]: { status: string; inactiveFromMonth: string; resumeMonth: string; reason: string } } {
    const result: { [classId: number]: { status: string; inactiveFromMonth: string; resumeMonth: string; reason: string } } = {};
    for (const classId of student.classIds || []) {
      const activeEnrollment = (student.enrollments || []).filter(e => e.classId === classId && e.status === 'Active').pop();
      const latestInactive = (student.enrollments || []).filter(e => e.classId === classId && e.status !== 'Active').pop();
      result[classId] = {
        status: latestInactive && !activeEnrollment ? latestInactive.status : 'Active',
        inactiveFromMonth: latestInactive?.endMonth || this.getClassStartMonthValue(classId),
        resumeMonth: activeEnrollment && latestInactive ? activeEnrollment.startMonth : '',
        reason: latestInactive?.reason || ''
      };
    }
    return result;
  }

  availableEnrollmentMonthsForClass(classId: number, cls: Class): string[] {
    const classMinMonth = this.getClassStartMonth(cls);
    const selectedStartMonth = this.parseMonth(this.getClassStartMonthValue(classId));
    const minMonth = Math.max(classMinMonth, selectedStartMonth || classMinMonth);
    return Array.from({ length: 13 - minMonth }, (_, i) => `T${minMonth + i}`);
  }

  availableStartMonthsForClass(cls: Class): string[] {
    const minMonth = this.getClassStartMonth(cls);
    return Array.from({ length: 13 - minMonth }, (_, i) => `T${minMonth + i}`);
  }

  getClassStartMonthValue(classId: number): string {
    return this.studentForm.classStartMonths[classId] || this.getMinimumStartMonthForClass(classId);
  }

  setClassStartMonth(classId: number, month: string) {
    this.studentForm.classStartMonths[classId] = month;
    this.normalizeStudentStartMonths();
  }

  private normalizeStudentStartMonths() {
    for (const classId of this.studentForm.classIds) {
      const minMonth = this.getMinimumStartMonthNumberForClass(classId);
      const currentMonth = this.parseMonth(this.studentForm.classStartMonths[classId]);

      if (currentMonth < minMonth) {
        this.studentForm.classStartMonths[classId] = `T${minMonth}`;
      }
    }
    this.studentForm.startMonth = this.studentForm.classIds.length > 0
      ? this.getClassStartMonthValue(this.studentForm.classIds[0])
      : 'T1';
    this.studentStartMonthError.set('');
  }

  private getMinimumStartMonthForClasses(classIds: number[]): string {
    return classIds.length > 0 ? this.getMinimumStartMonthForClass(classIds[0]) : 'T1';
  }

  private getMinimumStartMonthForClass(classId: number): string {
    return `T${this.getMinimumStartMonthNumberForClass(classId)}`;
  }

  private getMinimumStartMonthNumberForClass(classId: number): number {
    const cls = this.classes().find(c => c.id === classId);
    return cls ? this.getClassStartMonth(cls) : 1;
  }

  private buildDefaultClassStartMonths(classIds: number[]): { [classId: number]: string } {
    return classIds.reduce((acc, classId) => {
      acc[classId] = this.getMinimumStartMonthForClass(classId);
      return acc;
    }, {} as { [classId: number]: string });
  }

  private getClassStartMonth(cls: Class): number {
    if (!cls.startDate) return 1;
    const date = new Date(cls.startDate);
    const month = date.getMonth() + 1;
    return Number.isFinite(month) && month >= 1 && month <= 12 ? month : 1;
  }

  private parseMonth(value: string): number {
    const parsed = Number((value || '').trim().toUpperCase().replace(/^T/, ''));
    return Number.isFinite(parsed) && parsed >= 1 && parsed <= 12 ? parsed : 0;
  }

  private today(): string {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
  }

  isRewardSelected(id: number): boolean {
    return this.studentForm.rewardIds.includes(id);
  }

  toggleRewardSelection(id: number) {
    const idx = this.studentForm.rewardIds.indexOf(id);
    if (idx >= 0) {
      this.studentForm.rewardIds.splice(idx, 1);
    } else {
      this.studentForm.rewardIds.push(id);
    }
  }

  // Reward Option Catalog Modals
  openRewardConfigModal() {
    this.newRewardName = '';
    this.showRewardConfigModal.set(true);
  }

  closeRewardConfigModal() {
    this.showRewardConfigModal.set(false);
  }

  saveNewRewardOption() {
    if (!this.newRewardName.trim()) return;
    const option = {
      name: this.newRewardName.trim()
    };
    this.apiService.createRewardOption(option).subscribe({
      next: () => {
        this.loadRewardOptions();
        this.newRewardName = '';
      },
      error: (err) => {
        console.error('Error creating reward option', err);
        alert(err.error || 'Thêm danh mục khen thưởng thất bại.');
      }
    });
  }

  deleteRewardOption(id: number) {
    if (confirm('Bạn có chắc chắn muốn xóa danh mục khen thưởng này? Học sinh đạt giải này sẽ bị hủy liên kết.')) {
      this.apiService.deleteRewardOption(id).subscribe({
        next: () => {
          this.loadRewardOptions();
          const semId = this.apiService.selectedSemesterId();
          if (semId) this.loadStudents(semId); // Reload students to update reward names in tables
        },
        error: (err) => console.error('Error deleting reward option', err)
      });
    }
  }
}

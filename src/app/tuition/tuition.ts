import { Component, OnInit, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, TuitionMatrix, TuitionPeriod, StudentTuitionRow, Class } from '../api.service';

export interface ClassGroup {
  classId: number;
  className: string;
  rows: StudentTuitionRow[];
}

@Component({
  selector: 'app-tuition',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="tuition-container">
      <div class="header-section">
        <h1>Bảng Học Phí Chi Tiết</h1>
        <p>Theo dõi và thu tiền học phí từng tháng. Chỉ cần <strong>tích chọn (✓)</strong> để đóng học phí chuẩn, hoặc nhập vào số tiền để sửa số tiền tùy ý.</p>
      </div>

      <!-- Filters Toolbar -->
      <div class="card toolbar-card">
        <div class="filters-row">
          <!-- Search -->
          <div class="form-group search-group">
            <span class="material-symbols-outlined search-icon">search</span>
            <input type="text" class="form-control search-input" 
                   placeholder="Tìm tên học sinh hoặc lớp..." 
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

          <!-- Payment Status filter -->
          <div class="form-group select-group">
            <select class="form-control" [(ngModel)]="paymentStatusFilter" (ngModelChange)="applyFilters()">
              <option value="all">Tất cả trạng thái</option>
              <option value="unpaid">Chưa đóng tháng gần nhất</option>
              <option value="paid">Đã đóng tháng gần nhất</option>
            </select>
          </div>
          <div class="form-group select-group month-select-group">
            <label>Từ tháng</label>
            <select class="form-control" [(ngModel)]="fromPeriodId" (ngModelChange)="applyFilters()">
              <option [ngValue]="0">Tất cả</option>
              @for (period of getPeriodOptions(); track period.id) {
                <option [ngValue]="period.id">{{ period.monthName }}</option>
              }
            </select>
          </div>
          <div class="form-group select-group month-select-group">
            <label>Đến tháng</label>
            <select class="form-control" [(ngModel)]="toPeriodId" (ngModelChange)="applyFilters()">
              <option [ngValue]="0">Tất cả</option>
              @for (period of getPeriodOptions(); track period.id) {
                <option [ngValue]="period.id">{{ period.monthName }}</option>
              }
            </select>
          </div>
        </div>
      </div>

      <!-- Tuition spreadsheet matrix -->
      <div class="class-tuition-list">
        @for (group of getGroupedStudents(); track group.classId) {
          @let groupPeriods = getGroupPeriods(group);
          <div class="table-container class-tuition-card">
            <div class="class-tuition-header">
              <div>
                <span class="material-symbols-outlined group-icon">class</span>
                <span class="group-title">Lớp: {{ group.className }}</span>
                <span class="group-count">({{ group.rows.length }} học sinh)</span>
              </div>
              <strong>{{ getGroupTotal(group, groupPeriods) | number:'1.0-0' }}k</strong>
            </div>

            <div class="spreadsheet-scroll">
            <table class="spreadsheet-table class-spreadsheet-table" [style.minWidth.px]="getTableMinWidth(groupPeriods.length)">
              <thead>
                <tr>
                  <th style="width: 240px; text-align: left; padding-left: 1.5rem;">Tên Học sinh</th>
                  <th style="width: 100px; text-align: center;">Tháng BĐ</th>
                  <th style="width: 120px; text-align: right; padding-right: 1.5rem;">Học phí chuẩn</th>
                  @for (period of groupPeriods; track period.id) {
                    <th style="text-align: center; width: 130px;">{{ period.monthName }}</th>
                  }
                  <th style="width: 120px; text-align: right;">Tổng Cộng</th>
                </tr>
              </thead>
              <tbody>
                @for (row of group.rows; track row.studentId + '-' + row.classId) {
                  <tr>
                    <td style="text-align: left; font-weight: 600; padding-left: 1.5rem;">
                      {{ row.studentName }}
                    </td>
                    <td style="text-align: center; color: var(--text-muted);">
                      {{ row.startMonth || 'T7' }}
                    </td>
                    <td style="text-align: right; color: #a5b4fc; font-weight: 600; padding-right: 1.5rem;">
                      {{ formatTuition(row.classTuitionFee) }}
                    </td>

                    @for (period of groupPeriods; track period.id) {
                      @let payment = row.payments[period.id.toString()];
                      @let isEditing = isCellEditing(row.studentId, row.classId, period.id);
                      @let isPayable = isPeriodPayable(row, period.id);

                      <td class="payment-cell"
                          [ngClass]="isPayable ? getPaymentClass(payment, row, period.id) : 'payment-disabled'">
                        @if (isPayable) {
                          @let amountDue = getAmountDue(row, period.id);
                          <div class="cell-content-wrapper">
                            @if (amountDue > 0) {
                              <input
                                type="checkbox"
                                [checked]="payment && payment.amountPaid > 0"
                                (change)="togglePayment(row, period.id, $event)"
                                class="payment-checkbox"
                                (click)="$event.stopPropagation()"
                              />
                              <span class="amount-val"
                                    (click)="startEditing(row.studentId, row.classId, period.id, payment?.amountPaid); $event.stopPropagation()">
                                {{ payment ? payment.amountPaid : '' }}
                              </span>
                            } @else {
                              <span class="waived-label">Miễn</span>
                            }
                            <button type="button"
                                    class="adjustment-button"
                                    [class.has-adjustment]="hasAdjustment(row, period.id)"
                                    title="Giảm hoặc miễn học phí tháng này"
                                    (click)="openAdjustmentModal(row, period); $event.stopPropagation()">
                              <span class="material-symbols-outlined">tune</span>
                            </button>
                            @if (payment?.notes) {
                              <span class="material-symbols-outlined note-icon" [title]="payment!.notes" style="position: static; font-size: 0.85rem; color: var(--text-secondary); cursor: help;">info</span>
                            }
                          </div>
                          @if (hasAdjustment(row, period.id)) {
                            <div class="adjustment-badge">{{ getAdjustmentLabel(row, period.id) }}</div>
                          }

                          @if (isEditing) {
                            <div class="edit-overlay" style="position: absolute; inset: 0; background: #1f2937; z-index: 10; display: flex; align-items: center; padding: 0.25rem;">
                              <input type="text" class="cell-input"
                                     [(ngModel)]="editValue"
                                     (blur)="saveEditing(row, period.id)"
                                     (keydown.enter)="saveEditing(row, period.id)"
                                     (keydown.escape)="cancelEditing()"
                                     #cellInput
                                     style="width: 100%; height: 100%; text-align: center; font-weight: 600; background: #111827; border: 1px solid var(--primary-color); color: #fff; border-radius: 6px;"
                                     (click)="$event.stopPropagation()"
                                     (vcref)="focusInput(cellInput)">
                            </div>
                          }
                        } @else {
                          <span style="color: var(--text-muted); opacity: 0.45;">-</span>
                        }
                      </td>
                    }

                    <td style="text-align: right; font-weight: 700; color: var(--color-info);">
                      {{ getStudentTotal(row, groupPeriods) | number:'1.0-0' }}k
                    </td>
                  </tr>
                }

                <tr class="totals-row">
                  <td colspan="3" style="text-align: right; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; padding-right: 1.5rem;">Tổng Cộng</td>
                  @for (period of groupPeriods; track period.id) {
                    <td style="text-align: center; font-weight: 800; color: var(--color-success);">
                      {{ getGroupPeriodTotal(group, period.id) | number:'1.0-0' }}k
                    </td>
                  }
                  <td style="text-align: right; font-weight: 800; color: var(--accent-primary);">
                    {{ getGroupTotal(group, groupPeriods) | number:'1.0-0' }}k
                  </td>
                </tr>
              </tbody>
            </table>
            </div>
          </div>
        } @empty {
          <div class="table-container empty-state">Không tìm thấy học sinh hoặc lớp học nào phù hợp.</div>
        }
      </div>
      @if (showAdjustmentModal()) {
        @let target = adjustmentTarget();
        <div class="modal-overlay">
          <div class="modal-container adjustment-modal">
            <div class="modal-header">
              <h3>Cấu hình học phí tháng</h3>
              <button type="button" class="icon-button" (click)="closeAdjustmentModal()">
                <span class="material-symbols-outlined">close</span>
              </button>
            </div>
            <div class="modal-body">
              @if (target) {
                <div class="adjustment-summary">
                  <div>
                    <span>Học sinh</span>
                    <strong>{{ target.row.studentName }}</strong>
                  </div>
                  <div>
                    <span>Lớp / tháng</span>
                    <strong>{{ target.row.className }} - {{ target.period.monthName }}</strong>
                  </div>
                  <div>
                    <span>Học phí chuẩn</span>
                    <strong>{{ formatTuition(target.row.classTuitionFee) }}</strong>
                  </div>
                  <div>
                    <span>Phải đóng</span>
                    <strong>{{ calculateAdjustmentPreview() | number:'1.0-0' }} k</strong>
                  </div>
                </div>

                <label class="form-label">Loại điều chỉnh</label>
                <select class="form-control" [(ngModel)]="adjustmentForm.adjustmentType">
                  <option value="None">Không giảm</option>
                  <option value="DiscountPercent">Giảm theo %</option>
                  <option value="DiscountAmount">Giảm số tiền</option>
                  <option value="FixedAmount">Số phải đóng cố định</option>
                  <option value="Free">Miễn học phí</option>
                </select>

                @if (requiresAdjustmentValue()) {
                  <label class="form-label">{{ getAdjustmentValueLabel() }}</label>
                  <input type="number" class="form-control" min="0" [(ngModel)]="adjustmentForm.adjustmentValue">
                }

                <label class="form-label">Ghi chú</label>
                <textarea class="form-control" rows="3" [(ngModel)]="adjustmentForm.note" placeholder="Ví dụ: giảm do học bổng, anh em ruột, nghỉ dài ngày..."></textarea>
              }
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" (click)="deleteAdjustment()" [disabled]="!target || !hasAdjustment(target.row, target.period.id)">Xóa giảm/miễn</button>
              <button type="button" class="btn btn-secondary" (click)="closeAdjustmentModal()">Hủy</button>
              <button type="button" class="btn btn-primary" (click)="saveAdjustment()">Lưu</button>
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: block;
      min-width: 0;
      max-width: 100%;
      overflow: hidden;
    }
    .tuition-container {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      min-height: 0;
      min-width: 0;
      max-width: 100%;
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
      width: 180px;
    }
    .month-select-group {
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
      width: 150px;
    }
    .month-select-group label {
      color: var(--text-secondary);
      font-size: 0.75rem;
      font-weight: 700;
    }
    .class-tuition-list {
      display: flex;
      flex-direction: column;
      gap: 1.25rem;
      min-width: 0;
      max-width: 100%;
      max-height: calc(100vh - 300px);
      min-height: 320px;
      overflow: auto;
      padding-right: 0.5rem;
      padding-bottom: 0.5rem;
      scrollbar-width: thin;
      scrollbar-color: rgba(148, 163, 184, 0.45) transparent;
    }
    .class-tuition-list::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    .class-tuition-list::-webkit-scrollbar-track {
      background: transparent;
    }
    .class-tuition-list::-webkit-scrollbar-thumb {
      background: rgba(148, 163, 184, 0.35);
      border-radius: 999px;
    }
    .class-tuition-list::-webkit-scrollbar-thumb:hover {
      background: rgba(148, 163, 184, 0.6);
    }
    .class-tuition-card {
      padding: 0;
      width: 100%;
      max-width: 100%;
      overflow: hidden;
      flex-shrink: 0;
    }
    .class-tuition-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      padding: 0.875rem 1.25rem;
      background: rgba(99, 102, 241, 0.08);
      border-bottom: 1px solid var(--border-color);
      color: var(--accent-primary);
      font-weight: 700;
    }
    .class-tuition-header > div {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      white-space: nowrap;
    }
    .class-tuition-header strong {
      color: var(--color-info);
      white-space: nowrap;
    }
    .class-tuition-header .group-icon {
      font-size: 1.2rem;
      color: var(--color-info);
    }
    .class-tuition-header .group-count {
      color: var(--text-muted);
      font-size: 0.85rem;
      font-weight: 500;
    }
    .class-spreadsheet-table {
      width: max-content;
    }
    /* Spreadsheet grid layout */
    .spreadsheet-scroll {
      display: block;
      overflow: scroll;
      max-height: min(460px, 52vh);
      max-width: 100%;
      width: 100%;
      scrollbar-gutter: stable both-edges;
      scrollbar-width: thin;
      scrollbar-color: rgba(96, 165, 250, 0.55) rgba(15, 23, 42, 0.85);
    }
    .spreadsheet-scroll::-webkit-scrollbar {
      width: 12px;
      height: 12px;
    }
    .spreadsheet-scroll::-webkit-scrollbar-track {
      background: rgba(15, 23, 42, 0.85);
      border-radius: 999px;
    }
    .spreadsheet-scroll::-webkit-scrollbar-thumb {
      background: rgba(96, 165, 250, 0.55);
      border-radius: 999px;
    }
    .spreadsheet-scroll::-webkit-scrollbar-thumb:hover {
      background: rgba(96, 165, 250, 0.8);
    }
    .spreadsheet-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.875rem;
    }
    .spreadsheet-table th {
      background-color: rgba(255, 255, 255, 0.02);
      color: var(--text-secondary);
      font-weight: 600;
      padding: 0.875rem;
      border-bottom: 2px solid var(--border-color);
      border-right: 1px solid rgba(255, 255, 255, 0.05);
      position: sticky;
      top: 0;
      z-index: 2;
      backdrop-filter: blur(8px);
    }
    .spreadsheet-table thead th {
      background-color: #151c2a;
    }
    .spreadsheet-table td {
      padding: 0.75rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.02);
      border-right: 1px solid rgba(255, 255, 255, 0.03);
      text-align: center;
      vertical-align: middle;
      height: 48px;
    }
    .spreadsheet-table td:last-child {
      border-right: none;
    }
    /* Group Header Row */
    .group-header-row {
      background-color: rgba(99, 102, 241, 0.08);
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    }
    .group-header-cell {
      padding: 0.625rem 1rem !important;
      text-align: left !important;
      font-weight: 700;
      color: var(--accent-primary);
      vertical-align: middle;
    }
    .group-header-cell .group-icon {
      font-size: 1.2rem;
      vertical-align: middle;
      margin-right: 0.5rem;
      color: var(--color-info);
    }
    .group-header-cell .group-title {
      font-size: 0.95rem;
      vertical-align: middle;
    }
    .group-header-cell .group-count {
      font-size: 0.8rem;
      font-weight: 400;
      color: var(--text-muted);
      margin-left: 0.5rem;
      vertical-align: middle;
    }
    /* Payment cells styling */
    .payment-cell {
      position: relative;
      font-weight: 600;
      transition: background-color 0.15s, box-shadow 0.15s;
    }
    .payment-cell:hover {
      background-color: rgba(255, 255, 255, 0.05);
      box-shadow: inset 0 0 0 1px var(--accent-primary);
    }
    .cell-content-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.4rem;
      width: 100%;
      min-height: 28px;
    }
    .payment-checkbox {
      cursor: pointer;
      width: 16px;
      height: 16px;
      accent-color: var(--primary-color, #6366f1);
      flex: 0 0 auto;
    }
    .amount-val {
      cursor: text;
      min-width: 24px;
      display: inline-block;
      text-align: center;
    }
    .adjustment-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 6px;
      background: rgba(15, 23, 42, 0.65);
      color: var(--text-muted);
      cursor: pointer;
      flex: 0 0 auto;
    }
    .adjustment-button:hover,
    .adjustment-button.has-adjustment {
      border-color: rgba(96, 165, 250, 0.75);
      color: var(--color-info);
      background: rgba(14, 165, 233, 0.12);
    }
    .adjustment-button .material-symbols-outlined {
      font-size: 1rem;
    }
    .adjustment-badge {
      margin: 0.2rem auto 0;
      width: fit-content;
      max-width: 110px;
      padding: 0.1rem 0.35rem;
      border-radius: 999px;
      background: rgba(14, 165, 233, 0.12);
      color: var(--color-info);
      font-size: 0.7rem;
      line-height: 1.2;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .waived-label {
      color: var(--color-success);
      font-weight: 800;
    }
    .payment-unpaid {
      color: var(--text-muted);
    }
    .payment-paid {
      background-color: rgba(16, 185, 129, 0.08);
      color: var(--color-success);
    }
    .payment-partial {
      background-color: rgba(245, 158, 11, 0.08);
      color: var(--color-warning);
    }
    .payment-free {
      background-color: rgba(20, 184, 166, 0.1);
      color: var(--color-success);
    }
    .payment-disabled {
      background-color: rgba(255, 255, 255, 0.015);
      color: var(--text-muted);
      cursor: not-allowed;
    }
    .payment-disabled:hover {
      box-shadow: none;
      background-color: rgba(255, 255, 255, 0.015);
    }
    /* Totals Row */
    .totals-row {
      background-color: rgba(0, 0, 0, 0.15);
      border-top: 2px solid var(--border-color);
      position: sticky;
      bottom: 0;
      z-index: 2;
    }
    .totals-row td {
      height: 54px;
      border-bottom: none;
      background-color: #101722;
    }
    .modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
      background: rgba(2, 6, 23, 0.72);
      backdrop-filter: blur(6px);
    }
    .modal-container {
      width: min(560px, 100%);
      max-height: 92vh;
      overflow: hidden;
      background: #111827;
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 14px;
      box-shadow: 0 22px 70px rgba(0, 0, 0, 0.45);
    }
    .modal-header,
    .modal-footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      padding: 1rem 1.25rem;
      border-bottom: 1px solid rgba(148, 163, 184, 0.16);
    }
    .modal-header h3 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 800;
    }
    .modal-footer {
      justify-content: flex-end;
      border-top: 1px solid rgba(148, 163, 184, 0.16);
      border-bottom: none;
    }
    .modal-body {
      display: flex;
      flex-direction: column;
      gap: 0.8rem;
      padding: 1.25rem;
      max-height: 68vh;
      overflow-y: auto;
    }
    .icon-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: none;
      border-radius: 8px;
      background: transparent;
      color: var(--text-muted);
      cursor: pointer;
    }
    .icon-button:hover {
      background: rgba(148, 163, 184, 0.12);
      color: var(--text-primary);
    }
    .adjustment-summary {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 0.75rem;
      margin-bottom: 0.25rem;
    }
    .adjustment-summary div {
      padding: 0.75rem;
      border: 1px solid rgba(148, 163, 184, 0.16);
      border-radius: 8px;
      background: rgba(15, 23, 42, 0.65);
    }
    .adjustment-summary span {
      display: block;
      margin-bottom: 0.25rem;
      color: var(--text-muted);
      font-size: 0.75rem;
    }
    .adjustment-summary strong {
      color: var(--text-primary);
      font-size: 0.95rem;
    }
    .form-label {
      color: var(--text-secondary);
      font-size: 0.85rem;
      font-weight: 700;
    }
    @media (max-width: 900px) {
      .filters-row {
        align-items: stretch;
        gap: 0.75rem;
      }
      .search-group,
      .select-group {
        width: 100%;
        max-width: none;
      }
      .toolbar-card {
        padding: 0.875rem;
      }
      .class-tuition-list {
        max-height: calc(100vh - 360px);
        min-height: 260px;
      }
      .adjustment-summary {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class TuitionComponent implements OnInit {
  private apiService = inject(ApiService);

  // States
  public periods = signal<TuitionPeriod[]>([]);
  public students = signal<StudentTuitionRow[]>([]);
  public filteredStudents = signal<StudentTuitionRow[]>([]);
  public classes = signal<Class[]>([]);

  // Filter Models
  public searchQuery = '';
  public selectedClassId = 0;
  public paymentStatusFilter = 'all';
  public fromPeriodId = 0;
  public toPeriodId = 0;

  // Cell editing state
  public editingStudentId: number | null = null;
  public editingClassId: number | null = null;
  public editingPeriodId: number | null = null;
  public editValue = '';

  public showAdjustmentModal = signal(false);
  public adjustmentTarget = signal<{ row: StudentTuitionRow; period: TuitionPeriod } | null>(null);
  public adjustmentForm = {
    adjustmentType: 'None',
    adjustmentValue: 0,
    note: ''
  };

  constructor() {
    effect(() => {
      const semId = this.apiService.selectedSemesterId();
      if (semId) {
        this.loadClasses(semId);
        this.loadTuitionMatrix(semId);
      }
    });
  }

  ngOnInit() {}

  loadClasses(semesterId: number) {
    this.apiService.getClasses(semesterId).subscribe(data => this.classes.set(data));
  }

  loadTuitionMatrix(semesterId: number) {
    this.apiService.getTuitionMatrix(semesterId).subscribe({
      next: (matrix: TuitionMatrix) => {
        this.periods.set(matrix.periods);
        this.students.set(matrix.students);
        this.applyFilters();
      },
      error: (err) => console.error('Error loading tuition matrix', err)
    });
  }


  getPeriodOptions(): TuitionPeriod[] {
    return [...this.periods()].sort((a, b) => this.getPeriodOrder(a) - this.getPeriodOrder(b));
  }

  getSelectedPeriodRange(): { from: number; to: number } | null {
    const fromPeriod = this.periods().find(period => period.id === Number(this.fromPeriodId));
    const toPeriod = this.periods().find(period => period.id === Number(this.toPeriodId));
    const allOrders = this.periods().map(period => this.getPeriodOrder(period));
    if (!allOrders.length) return null;

    let from = fromPeriod ? this.getPeriodOrder(fromPeriod) : Math.min(...allOrders);
    let to = toPeriod ? this.getPeriodOrder(toPeriod) : Math.max(...allOrders);
    if (from > to) {
      [from, to] = [to, from];
    }

    return { from, to };
  }

  isPeriodInSelectedRange(period: TuitionPeriod): boolean {
    const range = this.getSelectedPeriodRange();
    if (!range) return true;
    const order = this.getPeriodOrder(period);
    return order >= range.from && order <= range.to;
  }

  getFilteredPayablePeriodIds(row: StudentTuitionRow): number[] {
    const periodsById = new Map(this.periods().map(period => [period.id, period]));
    return (row.payablePeriodIds || []).filter(periodId => {
      const period = periodsById.get(periodId);
      return !!period && this.isPeriodInSelectedRange(period);
    });
  }

  private getPeriodOrder(period: TuitionPeriod): number {
    const displayOrder = Number((period as TuitionPeriod & { displayOrder?: number }).displayOrder);
    if (!Number.isNaN(displayOrder) && displayOrder > 0) return displayOrder;

    const match = (period.monthName || '').match(/T(\d{1,2})(?:\/(\d{2,4}))?/i);
    if (!match) return period.id;

    const month = Number(match[1]);
    const rawYear = match[2] ? Number(match[2]) : 0;
    const year = rawYear > 0 && rawYear < 100 ? 2000 + rawYear : rawYear;
    return (year || 0) * 100 + month;
  }
  applyFilters() {
    let list = this.students();

    // 1. Filter by Search Query
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase().trim();
      list = list.filter(s => 
        s.studentName.toLowerCase().includes(query) || 
        s.className.toLowerCase().includes(query)
      );
    }

    // 2. Filter by Class
    const selectedClassId = Number(this.selectedClassId);
    if (selectedClassId > 0) {
      list = list.filter(s => s.classId === selectedClassId);
    }

    // 3. Filter by Payment Status across all payable months in each row
    if (this.paymentStatusFilter !== 'all') {
      const hasPayableMonths = (row: StudentTuitionRow) => this.getFilteredPayablePeriodIds(row).length > 0;
      const isPeriodPaid = (row: StudentTuitionRow, periodId: number) => {
        if (this.getAmountDue(row, periodId) <= 0) return true;
        const payment = row.payments[periodId.toString()];
        return !!payment && payment.amountPaid > 0;
      };
      const isFullyPaid = (row: StudentTuitionRow) => {
        const payableIds = this.getFilteredPayablePeriodIds(row);
        return payableIds.length > 0 && payableIds.every(periodId => isPeriodPaid(row, periodId));
      };

      if (this.paymentStatusFilter === 'unpaid') {
        list = list.filter(s => hasPayableMonths(s) && !isFullyPaid(s));
      } else if (this.paymentStatusFilter === 'paid') {
        list = list.filter(s => isFullyPaid(s));
      }
    }

    this.filteredStudents.set(list);
  }

  getGroupedStudents(): ClassGroup[] {
    const list = this.filteredStudents();
    const groupsMap = new Map<number, ClassGroup>();
    
    list.forEach(row => {
      if (!groupsMap.has(row.classId)) {
        groupsMap.set(row.classId, {
          classId: row.classId,
          className: row.className,
          rows: []
        });
      }
      groupsMap.get(row.classId)!.rows.push(row);
    });
    
    return Array.from(groupsMap.values())
      .filter(group => this.getGroupPeriods(group).length > 0)
      .sort((a, b) => a.className.localeCompare(b.className));
  }

  getGroupPeriods(group: ClassGroup): TuitionPeriod[] {
    const periodIds: number[] = [];
    const seen = new Set<number>();

    group.rows.forEach(row => {
      const ids = row.classPeriodIds?.length ? row.classPeriodIds : (row.payablePeriodIds || []);
      ids.forEach(id => {
        if (!seen.has(id)) {
          seen.add(id);
          periodIds.push(id);
        }
      });
    });

    const periodsById = new Map(this.periods().map(period => [period.id, period]));
    return periodIds
      .map(id => periodsById.get(id))
      .filter((period): period is TuitionPeriod => !!period && this.isPeriodInSelectedRange(period))
      .sort((a, b) => this.getPeriodOrder(a) - this.getPeriodOrder(b));
  }

  getGroupPeriodTotal(group: ClassGroup, periodId: number): number {
    const periodIdStr = periodId.toString();
    return group.rows.reduce((sum, row) => {
      if (!this.isPeriodPayable(row, periodId)) return sum;
      const payment = row.payments[periodIdStr];
      return sum + (payment ? payment.amountPaid : 0);
    }, 0);
  }

  getGroupTotal(group: ClassGroup, periods: TuitionPeriod[] = this.getGroupPeriods(group)): number {
    return group.rows.reduce((sum, row) => sum + this.getStudentTotal(row, periods), 0);
  }

  getTableMinWidth(periodCount: number): number {
    return 240 + 100 + 120 + (periodCount * 130) + 120;
  }

  formatTuition(amount?: number): string {
    if (amount === undefined || amount === null) return '0 k';
    return amount.toLocaleString() + ' k';
  }

  getStudentTotal(row: StudentTuitionRow, periods?: TuitionPeriod[]): number {
    const visiblePeriodIds = new Set((periods || this.periods().filter(period => this.isPeriodInSelectedRange(period))).map(period => period.id.toString()));
    return Object.entries(row.payments)
      .filter(([periodId]) => visiblePeriodIds.has(periodId) && this.isPeriodPayable(row, Number(periodId)))
      .reduce((sum, [, p]) => sum + p.amountPaid, 0);
  }

  getPeriodTotal(periodId: number): number {
    const periodIdStr = periodId.toString();
    return this.filteredStudents().reduce((sum, s) => {
      if (!this.isPeriodPayable(s, periodId)) return sum;
      const payment = s.payments[periodIdStr];
      return sum + (payment ? payment.amountPaid : 0);
    }, 0);
  }

  getGrandTotal(): number {
    return this.filteredStudents().reduce((sum, s) => sum + this.getStudentTotal(s), 0);
  }

  getAmountDue(row: StudentTuitionRow, periodId: number): number {
    const periodIdStr = periodId.toString();
    const configuredAmount = row.amountDueByPeriod?.[periodIdStr];
    if (configuredAmount !== undefined && configuredAmount !== null) {
      return Number(configuredAmount);
    }

    return Number(row.classTuitionFee || 0);
  }

  hasAdjustment(row: StudentTuitionRow, periodId: number): boolean {
    const adjustment = row.adjustments?.[periodId.toString()];
    return !!adjustment && adjustment.adjustmentType !== 'None';
  }

  getAdjustmentLabel(row: StudentTuitionRow, periodId: number): string {
    const adjustment = row.adjustments?.[periodId.toString()];
    if (!adjustment) return '';

    switch (adjustment.adjustmentType) {
      case 'DiscountPercent':
        return `Giảm ${adjustment.adjustmentValue}%`;
      case 'DiscountAmount':
        return `Giảm ${Number(adjustment.adjustmentValue).toLocaleString()}k`;
      case 'FixedAmount':
        return `Cố định ${Number(adjustment.amountDue).toLocaleString()}k`;
      case 'Free':
        return 'Miễn phí';
      default:
        return '';
    }
  }

  getPaymentClass(payment: any, row: StudentTuitionRow, periodId: number) {
    const amountDue = this.getAmountDue(row, periodId);
    if (amountDue <= 0) {
      return 'payment-free';
    }
    if (!payment || payment.amountPaid <= 0) {
      return 'payment-unpaid';
    }
    if (payment.amountPaid >= amountDue) {
      return 'payment-paid';
    }
    return 'payment-partial';
  }

  isPeriodPayable(row: StudentTuitionRow, periodId: number): boolean {
    return (row.payablePeriodIds || []).includes(periodId);
  }

  isCellEditing(studentId: number, classId: number, periodId: number): boolean {
    return this.editingStudentId === studentId && this.editingClassId === classId && this.editingPeriodId === periodId;
  }

  startEditing(studentId: number, classId: number, periodId: number, currentAmount: number | undefined) {
    this.editingStudentId = studentId;
    this.editingClassId = classId;
    this.editingPeriodId = periodId;
    this.editValue = currentAmount !== undefined && currentAmount > 0 ? currentAmount.toString() : '';
  }

  focusInput(input: HTMLInputElement) {
    if (input) {
      setTimeout(() => input.focus(), 50);
    }
  }

  cancelEditing() {
    this.editingStudentId = null;
    this.editingClassId = null;
    this.editingPeriodId = null;
    this.editValue = '';
  }

  togglePayment(row: StudentTuitionRow, periodId: number, event: Event) {
    const checkbox = event.target as HTMLInputElement;
    const isChecked = checkbox.checked;
    
    const amount = isChecked ? this.getAmountDue(row, periodId) : 0;
    const notes = '';

    this.apiService.savePayment(row.studentId, row.classId, periodId, amount, notes).subscribe({
      next: (saved) => {
        const periodIdStr = periodId.toString();
        if (amount <= 0) {
          delete row.payments[periodIdStr];
        } else {
          row.payments[periodIdStr] = {
            amountPaid: Number(saved?.amountPaid ?? amount),
            notes: saved?.notes ?? notes,
            paidAt: saved?.paidAt ?? new Date().toISOString()
          };
        }
        
        this.students.set([...this.students()]);
        this.applyFilters();
      },
      error: (err) => {
        console.error('Error toggling payment', err);
        alert('Cập nhật học phí thất bại!');
        checkbox.checked = !isChecked; // revert checkbox
      }
    });
  }

  saveEditing(row: StudentTuitionRow, periodId: number) {
    const studentId = row.studentId;
    const amountStr = this.editValue.trim();

    const currentPayment = row.payments[periodId.toString()];
    const currentAmount = currentPayment ? currentPayment.amountPaid : 0;
    
    let parsedAmount = 0;
    if (amountStr.includes('+')) {
      const parts = amountStr.split('+');
      parts.forEach(p => {
        const val = parseFloat(p.trim());
        if (!isNaN(val)) parsedAmount += val;
      });
    } else {
      parsedAmount = parseFloat(amountStr);
      if (isNaN(parsedAmount)) parsedAmount = 0;
    }

    if (parsedAmount === currentAmount && !amountStr.includes('+')) {
      this.cancelEditing();
      return;
    }

    const notes = amountStr.includes('+') ? `Nhập tay: ${amountStr}` : '';

    this.apiService.savePayment(studentId, row.classId, periodId, parsedAmount, notes).subscribe({
      next: (saved) => {
        const periodIdStr = periodId.toString();
        if (parsedAmount <= 0) {
          delete row.payments[periodIdStr];
        } else {
          row.payments[periodIdStr] = {
            amountPaid: Number(saved?.amountPaid ?? parsedAmount),
            notes: saved?.notes ?? notes,
            paidAt: saved?.paidAt ?? new Date().toISOString()
          };
        }
        
        this.students.set([...this.students()]);
        this.applyFilters();
        this.cancelEditing();
      },
      error: (err) => {
        console.error('Error saving payment', err);
        alert('Cập nhật học phí thất bại!');
        this.cancelEditing();
      }
    });
  }

  openAdjustmentModal(row: StudentTuitionRow, period: TuitionPeriod) {
    const adjustment = row.adjustments?.[period.id.toString()];
    this.adjustmentTarget.set({ row, period });
    this.adjustmentForm = {
      adjustmentType: adjustment?.adjustmentType || 'None',
      adjustmentValue: Number(adjustment?.adjustmentValue || 0),
      note: adjustment?.note || ''
    };
    this.showAdjustmentModal.set(true);
  }

  closeAdjustmentModal() {
    this.showAdjustmentModal.set(false);
    this.adjustmentTarget.set(null);
    this.adjustmentForm = {
      adjustmentType: 'None',
      adjustmentValue: 0,
      note: ''
    };
  }

  requiresAdjustmentValue(): boolean {
    return ['DiscountPercent', 'DiscountAmount', 'FixedAmount'].includes(this.adjustmentForm.adjustmentType);
  }

  getAdjustmentValueLabel(): string {
    switch (this.adjustmentForm.adjustmentType) {
      case 'DiscountPercent':
        return 'Số % giảm';
      case 'DiscountAmount':
        return 'Số tiền giảm (nghìn đồng - k)';
      case 'FixedAmount':
        return 'Số phải đóng cố định (nghìn đồng - k)';
      default:
        return 'Giá trị';
    }
  }

  calculateAdjustmentPreview(): number {
    const target = this.adjustmentTarget();
    if (!target) return 0;

    const standardFee = Number(target.row.classTuitionFee || 0);
    const value = Math.max(0, Number(this.adjustmentForm.adjustmentValue || 0));
    let amountDue = standardFee;

    switch (this.adjustmentForm.adjustmentType) {
      case 'DiscountPercent':
        amountDue = standardFee * (100 - Math.min(100, value)) / 100;
        break;
      case 'DiscountAmount':
        amountDue = standardFee - value;
        break;
      case 'FixedAmount':
        amountDue = value;
        break;
      case 'Free':
        amountDue = 0;
        break;
    }

    return Math.max(0, Math.round(amountDue));
  }

  saveAdjustment() {
    const target = this.adjustmentTarget();
    if (!target) return;

    const payload = {
      studentId: target.row.studentId,
      classId: target.row.classId,
      periodId: target.period.id,
      adjustmentType: this.adjustmentForm.adjustmentType,
      adjustmentValue: this.requiresAdjustmentValue() ? Number(this.adjustmentForm.adjustmentValue || 0) : 0,
      note: this.adjustmentForm.note || ''
    };

    this.apiService.saveTuitionAdjustment(payload).subscribe({
      next: (saved) => {
        this.applyAdjustmentToRow(target.row, target.period.id, saved);
        this.students.set([...this.students()]);
        this.applyFilters();
        this.closeAdjustmentModal();
      },
      error: (err) => {
        console.error('Error saving tuition adjustment', err);
        alert('Cập nhật giảm/miễn học phí thất bại!');
      }
    });
  }

  deleteAdjustment() {
    const target = this.adjustmentTarget();
    if (!target) return;

    this.apiService.deleteTuitionAdjustment(target.row.studentId, target.row.classId, target.period.id).subscribe({
      next: (saved) => {
        this.applyAdjustmentToRow(target.row, target.period.id, saved);
        this.students.set([...this.students()]);
        this.applyFilters();
        this.closeAdjustmentModal();
      },
      error: (err) => {
        console.error('Error deleting tuition adjustment', err);
        alert('Xóa giảm/miễn học phí thất bại!');
      }
    });
  }

  private applyAdjustmentToRow(row: StudentTuitionRow, periodId: number, saved: any) {
    const periodIdStr = periodId.toString();
    row.amountDueByPeriod = row.amountDueByPeriod || {};
    row.adjustments = row.adjustments || {};
    row.amountDueByPeriod[periodIdStr] = Number(saved?.amountDue ?? row.classTuitionFee ?? 0);

    if (!saved || saved.adjustmentType === 'None') {
      delete row.adjustments[periodIdStr];
    } else {
      row.adjustments[periodIdStr] = {
        adjustmentType: saved.adjustmentType,
        adjustmentValue: Number(saved.adjustmentValue || 0),
        note: saved.note || '',
        amountDue: Number(saved.amountDue || 0)
      };
    }
  }
}

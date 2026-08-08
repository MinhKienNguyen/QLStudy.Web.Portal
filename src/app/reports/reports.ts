import { Component, OnInit, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, StudentTuitionRow, TuitionPeriod } from '../api.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="reports-container">
      <div class="header-section">
        <h1>Báo cáo & Thống kê</h1>
        <p>Phân tích tổng hợp doanh thu theo tháng, theo năm, hiệu quả lớp học và danh sách đóng học phí chi tiết.</p>
      </div>

      <div class="card report-filter-card">
        <div class="filter-title">
          <span class="material-symbols-outlined">filter_alt</span>
          <div>
            <strong>Lọc báo cáo theo tháng</strong>
            <span>{{ reportRangeLabel() }}</span>
          </div>
        </div>
        <div class="report-filter-controls">
          <label class="filter-field">
            <span>Từ tháng</span>
            <select class="form-control" [value]="reportFromPeriodId()" (change)="onReportFilterChange('from', $event)">
              @for (p of periods(); track p.id) {
                <option [value]="p.id">{{ p.monthName }}</option>
              }
            </select>
          </label>
          <label class="filter-field">
            <span>Đến tháng</span>
            <select class="form-control" [value]="reportToPeriodId()" (change)="onReportFilterChange('to', $event)">
              @for (p of periods(); track p.id) {
                <option [value]="p.id">{{ p.monthName }}</option>
              }
            </select>
          </label>
          <button class="btn btn-primary" (click)="queryReportFilter()">
            <span class="material-symbols-outlined">search</span>
            Truy vấn
          </button>
          <button class="btn btn-secondary" (click)="resetReportFilter()">
            <span class="material-symbols-outlined">restart_alt</span>
            Tất cả tháng
          </button>
          <button class="btn btn-primary" (click)="exportCombinedReport()">
            <span class="material-symbols-outlined">download</span>
            Xuất báo cáo
          </button>
        </div>
      </div>

      <!-- KPI Summary Cards -->
      <div class="kpi-grid">
        <!-- Semester Revenue KPI -->
        <div class="card kpi-card">
          <div class="kpi-icon-wrapper kpi-revenue">
            <span class="material-symbols-outlined">payments</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Doanh thu đã lọc</span>
            <span class="kpi-value">{{ semesterRevenue() | number:'1.0-0' }}k</span>
            <span class="kpi-subtext">Theo khoảng tháng đang chọn</span>
          </div>
        </div>

        <!-- Semester Students KPI -->
        <div class="card kpi-card">
          <div class="kpi-icon-wrapper kpi-students">
            <span class="material-symbols-outlined">group</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Tổng số Học sinh</span>
            <span class="kpi-value">{{ semesterStudents() }}</span>
            <span class="kpi-subtext">Học sinh đăng ký học</span>
          </div>
        </div>

        <!-- Semester Classes KPI -->
        <div class="card kpi-card">
          <div class="kpi-icon-wrapper kpi-classes">
            <span class="material-symbols-outlined">school</span>
          </div>
          <div class="kpi-info">
            <span class="kpi-label">Tổng số Lớp học</span>
            <span class="kpi-value">{{ semesterClasses() }}</span>
            <span class="kpi-subtext">Số lượng lớp trong học kỳ</span>
          </div>
        </div>
      </div>

      <!-- Monthly Revenue & Class Revenue Grid -->
      <div class="analytics-grid">
        <!-- Monthly Revenue CSS Bar Chart -->
        <div class="card chart-card">
          <div class="card-header report-card-header">
            <div>
              <h3>Doanh thu theo Tháng</h3>
              <span class="card-subtitle">Tổng doanh thu: <strong>{{ monthlyRevenueTotal() | number:'1.0-0' }}k</strong></span>
            </div>
            <button class="btn btn-secondary btn-sm" (click)="exportMonthlyRevenueDetails()">
              <span class="material-symbols-outlined" style="font-size: 1rem;">download</span>
              Xuất Excel
            </button>
          </div>
          <div class="chart-body monthly-revenue-scroll">
            @for (m of monthlyData(); track m.periodId) {
              <div class="chart-bar-row">
                <div class="chart-label">{{ m.monthName }}</div>
                <div class="chart-bar-container">
                  <div class="chart-bar-fill" [style.width.%]="(m.amount / maxMonthlyAmount()) * 100">
                    <span class="chart-bar-value">
                      @if (m.amount > 0) {
                        {{ m.amount | number:'1.0-0' }}k
                      }
                    </span>
                  </div>
                </div>
              </div>
            } @empty {
              <p class="empty-text">Không có dữ liệu doanh thu tháng.</p>
            }
          </div>
        </div>

        <!-- Class Performance Table -->
        <div class="card table-card">
          <div class="card-header report-card-header">
            <div>
              <h3>Doanh thu theo Lớp học</h3>
              <span class="card-subtitle">Tổng doanh thu: <strong>{{ classRevenueTotal() | number:'1.0-0' }}k</strong></span>
            </div>
            <button class="btn btn-secondary btn-sm" (click)="exportClassRevenueDetails()">
              <span class="material-symbols-outlined" style="font-size: 1rem;">download</span>
              Xuất Excel
            </button>
          </div>
          <div class="table-container class-revenue-table">
            <table class="report-table">
              <thead>
                <tr>
                  <th style="text-align: left;">Tên Lớp học</th>
                  <th style="text-align: center; width: 100px;">Học sinh</th>
                  <th style="text-align: right; width: 140px;">Doanh thu</th>
                </tr>
              </thead>
              <tbody>
                @for (c of classData(); track c.classId) {
                  <tr>
                    <td style="text-align: left; font-weight: 600;">{{ c.className }}</td>
                    <td style="text-align: center; color: var(--text-secondary);">{{ c.studentCount }}</td>
                    <td style="text-align: right; font-weight: 700; color: var(--color-success);">
                      {{ c.amount | number:'1.0-0' }}k
                    </td>
                  </tr>
                } @empty {
                  <tr>
                    <td colspan="3" class="empty-text">Chưa có dữ liệu lớp học.</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- Payment Status Roster -->
      <div class="card roster-card">
        <div class="roster-header-row">
          <div>
            <h3>Báo cáo Đóng Học Phí</h3>
            <p class="card-subtitle" style="margin-bottom: 0;">Theo dõi tình trạng đóng tiền của từng học sinh theo tháng</p>
          </div>
          
          <div class="roster-toolbar">
            <!-- Search Inside lists -->
            <div class="form-group search-group" style="margin-bottom: 0;">
              <span class="material-symbols-outlined search-icon">search</span>
              <input type="text" class="form-control search-input" 
                     placeholder="Tìm tên hoặc lớp..." 
                     [(ngModel)]="rosterSearchQuery" (ngModelChange)="applyRosterFilters()">
            </div>

            <!-- Month selector -->
            <div class="form-group select-group" style="margin-bottom: 0;">
              <select class="form-control" [value]="selectedPeriodId()" (change)="onPeriodChange($event)">
                @for (p of filteredReportPeriods(); track p.id) {
                  <option [value]="p.id">Tháng {{ p.monthName }}</option>
                }
              </select>
            </div>
          </div>
        </div>

        @if (loading()) {
          <div style="text-align: center; padding: 2.5rem; color: var(--text-secondary);">
            Đang tải dữ liệu đóng học phí...
          </div>
        } @else {
          <div class="roster-split-container">
            <!-- Column 1: Paid list -->
            <div class="roster-column paid-column">
              <div class="column-header column-header-paid">
                <div class="column-title">
                  <span class="material-symbols-outlined icon-success">check_circle</span>
                  <span>Đã đóng tiền ({{ filteredPaidStudents().length }} học sinh)</span>
                  <strong>{{ paidTotal() | number:'1.0-0' }}k</strong>
                </div>
                <button class="btn btn-secondary btn-sm" (click)="exportPaidStudents()">
                  <span class="material-symbols-outlined" style="font-size: 1rem;">download</span>
                  Excel
                </button>
              </div>
              <div class="column-list-wrapper">
                @for (s of filteredPaidStudents(); track s.studentId + '-' + s.classId) {
                  <div class="roster-item roster-item-paid">
                    <div class="roster-item-info">
                      <span class="student-name">{{ s.studentName }}</span>
                      <span class="class-name">Lớp: {{ s.className }}</span>
                      @if (s.notes) {
                        <span class="payment-notes">Ghi chú: {{ s.notes }}</span>
                      }
                    </div>
                    <div class="roster-item-amount">
                      +{{ s.amountPaid | number:'1.0-0' }}k
                    </div>
                  </div>
                } @empty {
                  <div class="empty-list-text">Không tìm thấy học sinh nào đã đóng.</div>
                }
              </div>
            </div>

            <!-- Column 2: Unpaid list -->
            <div class="roster-column unpaid-column">
              <div class="column-header column-header-unpaid">
                <div class="column-title">
                  <span class="material-symbols-outlined icon-danger">error</span>
                  <span>Chưa đóng tiền ({{ filteredUnpaidStudents().length }} học sinh)</span>
                  <strong>{{ unpaidTotal() | number:'1.0-0' }}k</strong>
                </div>
                <button class="btn btn-secondary btn-sm" (click)="exportUnpaidStudents()">
                  <span class="material-symbols-outlined" style="font-size: 1rem;">download</span>
                  Excel
                </button>
              </div>
              <div class="column-list-wrapper">
                @for (s of filteredUnpaidStudents(); track s.studentId + '-' + s.classId) {
                  <div class="roster-item roster-item-unpaid">
                    <div class="roster-item-info">
                      <span class="student-name">{{ s.studentName }}</span>
                      <span class="class-name">Lớp: {{ s.className }}</span>
                    </div>
                    <div class="roster-item-status">{{ s.amountDue | number:'1.0-0' }}k</div>
                  </div>
                } @empty {
                  <div class="empty-list-text">Mọi học sinh đã đóng đủ tháng này.</div>
                }
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [`
    .reports-container {
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

    .report-filter-card {
      padding: 1rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 1rem;
      flex-wrap: wrap;
    }
    .filter-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      min-width: 220px;
    }
    .filter-title .material-symbols-outlined { color: var(--accent-primary); }
    .filter-title div { display: flex; flex-direction: column; gap: 0.1rem; }
    .filter-title strong { font-size: 0.95rem; color: var(--text-primary); }
    .filter-title span:not(.material-symbols-outlined) { font-size: 0.78rem; color: var(--text-secondary); }
    .report-filter-controls {
      display: flex;
      align-items: flex-end;
      gap: 0.75rem;
      flex-wrap: wrap;
    }
    .filter-field { display: flex; flex-direction: column; gap: 0.35rem; min-width: 150px; margin: 0; }
    .filter-field span { font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); }
    .report-filter-controls .btn { height: 40px; white-space: nowrap; display: inline-flex; align-items: center; gap: 0.4rem; }

    /* KPI Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.25rem;
    }
    .kpi-card {
      display: flex;
      align-items: center;
      gap: 1.25rem;
      padding: 1.25rem 1.5rem;
    }
    .kpi-icon-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 48px;
      height: 48px;
      border-radius: var(--radius-md);
      font-size: 1.5rem;
    }
    .kpi-icon-wrapper span {
      font-size: 1.5rem;
    }
    .kpi-revenue {
      background-color: rgba(16, 185, 129, 0.1);
      color: var(--color-success);
    }
    .kpi-students {
      background-color: rgba(59, 130, 246, 0.1);
      color: var(--color-info);
    }
    .kpi-classes {
      background-color: rgba(139, 92, 246, 0.1);
      color: var(--accent-primary);
    }
    .kpi-info {
      display: flex;
      flex-direction: column;
    }
    .kpi-label {
      font-size: 0.8rem;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .kpi-value {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0.15rem 0;
      color: var(--text-primary);
    }
    .kpi-subtext {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    /* Analytics Grid */
    .analytics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 1.5rem;
    }
    .chart-card, .table-card {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      height: 560px;
    }
    .class-revenue-table {
      max-height: 100%;
      overflow-y: auto;
      width: 100%;
      flex: 1;
      min-height: 0;
    }
    .card-header {
      margin-bottom: 1.25rem;
    }
    .report-card-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
    }
    .report-card-header .btn,
    .column-header .btn {
      white-space: nowrap;
    }
    .card-header h3 {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 0.2rem;
    }
    .card-subtitle {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }

    /* CSS Bar Chart */
    .chart-body {
      display: flex;
      flex-direction: column;
      gap: 0.875rem;
      flex-grow: 1;
      justify-content: center;
    }
    .monthly-revenue-scroll {
      overflow-y: auto;
      min-height: 0;
      padding-right: 0.35rem;
      justify-content: flex-start;
      scrollbar-width: thin;
      scrollbar-color: rgba(148, 163, 184, 0.45) transparent;
    }
    .monthly-revenue-scroll::-webkit-scrollbar {
      width: 6px;
    }
    .monthly-revenue-scroll::-webkit-scrollbar-track {
      background: transparent;
    }
    .monthly-revenue-scroll::-webkit-scrollbar-thumb {
      background: rgba(148, 163, 184, 0.35);
      border-radius: 999px;
    }
    .monthly-revenue-scroll::-webkit-scrollbar-thumb:hover {
      background: rgba(148, 163, 184, 0.6);
    }
    @media (max-width: 900px) {
      .chart-card, .table-card {
        height: auto;
        min-height: 420px;
      }
    }
    .chart-bar-row {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    .chart-label {
      width: 40px;
      font-weight: 600;
      text-align: left;
      font-size: 0.85rem;
      color: var(--text-secondary);
    }
    .chart-bar-container {
      flex-grow: 1;
      height: 24px;
      background-color: rgba(255, 255, 255, 0.03);
      border-radius: var(--radius-sm);
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.02);
    }
    .chart-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--accent-primary) 0%, rgba(99, 102, 241, 0.6) 100%);
      border-radius: var(--radius-sm);
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 0.5rem;
      box-shadow: 0 0 10px 0 rgba(99, 102, 241, 0.2);
      transition: width 0.6s cubic-bezier(0.1, 0.8, 0.2, 1);
    }
    .chart-bar-value {
      font-size: 0.75rem;
      font-weight: 700;
      color: #ffffff;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
    }

    /* Tables */
    .report-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
    }
    .report-table th {
      padding: 0.625rem;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border-color);
      font-weight: 600;
    }
    .report-table td {
      padding: 0.75rem 0.625rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.02);
    }
    .empty-text {
      text-align: center;
      padding: 1.5rem;
      color: var(--text-muted);
      font-size: 0.85rem;
      font-style: italic;
    }

    /* Roster Cards */
    .roster-card {
      padding: 1.5rem;
    }
    .roster-header-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      margin-bottom: 1.5rem;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 1rem;
    }
    .roster-header-row h3 {
      font-size: 1.125rem;
      font-weight: 600;
      margin-bottom: 0.2rem;
    }
    .roster-toolbar {
      display: flex;
      gap: 0.75rem;
      align-items: center;
    }
    .search-group {
      position: relative;
      width: 220px;
    }
    .search-icon {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      font-size: 1.1rem;
    }
    .search-input {
      padding-left: 2.2rem;
      font-size: 0.8rem;
      height: 36px;
    }
    .select-group {
      width: 150px;
    }
    .select-group select {
      font-size: 0.8rem;
      height: 36px;
    }

    .roster-split-container {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.5rem;
    }
    .roster-column {
      display: flex;
      flex-direction: column;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      background-color: rgba(255, 255, 255, 0.01);
      overflow: hidden;
    }
    .column-header {
      padding: 0.75rem 1rem;
      font-weight: 700;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      justify-content: space-between;
      border-bottom: 1px solid var(--border-color);
    }
    .column-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      min-width: 0;
      flex-wrap: wrap;
    }
    .column-title strong {
      color: var(--text-primary);
      font-weight: 800;
    }
    .column-header-paid {
      background-color: rgba(16, 185, 129, 0.06);
      color: var(--color-success);
    }
    .column-header-unpaid {
      background-color: rgba(239, 68, 68, 0.06);
      color: var(--color-danger);
    }
    .icon-success {
      color: var(--color-success);
      font-size: 1.2rem;
    }
    .icon-danger {
      color: var(--color-danger);
      font-size: 1.2rem;
    }
    .column-list-wrapper {
      padding: 0.75rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-height: 400px;
      overflow-y: auto;
    }
    .roster-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem;
      border-radius: var(--radius-sm);
      border: 1px solid rgba(255, 255, 255, 0.02);
    }
    .roster-item-paid {
      background-color: rgba(255, 255, 255, 0.02);
      border-left: 3px solid var(--color-success);
    }
    .roster-item-unpaid {
      background-color: rgba(255, 255, 255, 0.01);
      border-left: 3px solid var(--text-muted);
    }
    .roster-item-info {
      display: flex;
      flex-direction: column;
      gap: 0.15rem;
    }
    .student-name {
      font-weight: 600;
      font-size: 0.85rem;
    }
    .class-name {
      font-size: 0.75rem;
      color: var(--text-secondary);
    }
    .payment-notes {
      font-size: 0.7rem;
      color: var(--color-warning);
      font-style: italic;
    }
    .roster-item-amount {
      font-weight: 700;
      font-size: 0.85rem;
      color: var(--color-success);
    }
    .roster-item-status {
      font-size: 0.75rem;
      color: var(--text-muted);
      font-weight: 500;
    }
    .empty-list-text {
      text-align: center;
      padding: 2rem;
      color: var(--text-muted);
      font-size: 0.8rem;
      font-style: italic;
    }

    @media (max-width: 768px) {
      .roster-split-container {
        grid-template-columns: 1fr;
      }
      .report-card-header,
      .column-header {
        align-items: stretch;
        flex-direction: column;
      }
      .report-card-header .btn,
      .column-header .btn {
        width: 100%;
        justify-content: center;
      }
    }
  `]
})
export class ReportsComponent implements OnInit {
  private apiService = inject(ApiService);

  // States
  public semesterRevenue = signal<number>(0);
  public semesterStudents = signal<number>(0);
  public semesterClasses = signal<number>(0);

  public monthlyData = signal<any[]>([]);
  public maxMonthlyAmount = signal<number>(1);
  public classData = signal<any[]>([]);
  public tuitionRows = signal<StudentTuitionRow[]>([]);

  public periods = signal<TuitionPeriod[]>([]);
  public reportFromPeriodId = signal<number>(0);
  public reportToPeriodId = signal<number>(0);
  public appliedReportFromPeriodId = signal<number>(0);
  public appliedReportToPeriodId = signal<number>(0);
  public selectedPeriodId = signal<number>(0);
  public paidStudents = signal<any[]>([]);
  public unpaidStudents = signal<any[]>([]);
  public filteredPaidStudents = signal<any[]>([]);
  public filteredUnpaidStudents = signal<any[]>([]);

  public rosterSearchQuery = '';
  public loading = signal<boolean>(false);

  constructor() {
    // Reload reports when semester changes
    effect(() => {
      const semId = this.apiService.selectedSemesterId();
      if (semId) {
        this.loadReports(semId);
      }
    });
  }

  ngOnInit() {}

  loadReports(semesterId: number) {
    this.loading.set(true);
    this.selectedPeriodId.set(0);
    this.reportFromPeriodId.set(0);
    this.reportToPeriodId.set(0);
    this.monthlyData.set([]);
    this.classData.set([]);
    this.tuitionRows.set([]);
    this.periods.set([]);
    this.paidStudents.set([]);
    this.unpaidStudents.set([]);
    this.filteredPaidStudents.set([]);
    this.filteredUnpaidStudents.set([]);

    this.apiService.getSemestersSummary().subscribe({
      next: (summaryList) => {
        const current = summaryList.find(s => s.semesterId === semesterId);
        if (current) {
          this.semesterClasses.set(current.totalClasses);
          this.semesterStudents.set(current.totalStudents);
        }
      },
      error: (err) => console.error('Error loading summary', err)
    });

    this.apiService.getTuitionMatrix(semesterId).subscribe({
      next: (matrix) => {
        const periods = matrix.periods || [];
        this.periods.set(periods);
        this.tuitionRows.set(matrix.students || []);

        if (periods.length > 0) {
          this.reportFromPeriodId.set(periods[0].id);
          this.reportToPeriodId.set(periods[periods.length - 1].id);
          this.applyReportRange();
          this.refreshReportsByAppliedRange(semesterId);
        } else {
          this.semesterRevenue.set(0);
          this.semesterStudents.set(0);
          this.semesterClasses.set(0);
          this.loading.set(false);
        }
      },
      error: (err) => {
        console.error('Error loading periods', err);
        this.loading.set(false);
      }
    });
  }

  onReportFilterChange(type: 'from' | 'to', event: Event) {
    const value = Number((event.target as HTMLSelectElement).value || 0);
    if (type === 'from') this.reportFromPeriodId.set(value);
    else this.reportToPeriodId.set(value);

    this.normalizeReportRange();
  }

  queryReportFilter() {
    this.normalizeReportRange();
    this.applyReportRange();

    const semId = this.apiService.selectedSemesterId();
    if (semId) this.refreshReportsByAppliedRange(semId);
  }
  resetReportFilter() {
    const periods = this.periods();
    if (!periods.length) return;

    this.reportFromPeriodId.set(periods[0].id);
    this.reportToPeriodId.set(periods[periods.length - 1].id);
    this.applyReportRange();

    const semId = this.apiService.selectedSemesterId();
    if (semId) this.refreshReportsByAppliedRange(semId);
  }

  private applyReportRange() {
    this.appliedReportFromPeriodId.set(this.reportFromPeriodId());
    this.appliedReportToPeriodId.set(this.reportToPeriodId());
  }
  private refreshReportsByAppliedRange(semesterId: number) {
    this.refreshRevenueReports(semesterId);
    this.refreshPaymentStatusForAppliedRange(semesterId);
  }

  private refreshPaymentStatusForAppliedRange(semesterId: number) {
    const periods = this.filteredReportPeriods();
    if (!periods.length) {
      this.selectedPeriodId.set(0);
      this.paidStudents.set([]);
      this.unpaidStudents.set([]);
      this.filteredPaidStudents.set([]);
      this.filteredUnpaidStudents.set([]);
      return;
    }

    const selectedId = Number(this.selectedPeriodId());
    const periodId = periods.some(period => Number(period.id) === selectedId) ? selectedId : periods[0].id;
    this.selectedPeriodId.set(periodId);
    this.loading.set(true);
    this.loadPaymentStatus(semesterId, periodId);
  }

  private refreshRevenueReports(semesterId: number) {
    const fromPeriodId = this.appliedReportFromPeriodId() || this.reportFromPeriodId() || null;
    const toPeriodId = this.appliedReportToPeriodId() || this.reportToPeriodId() || null;

    this.apiService.getMonthlyRevenue(semesterId, fromPeriodId, toPeriodId).subscribe({
      next: (data) => {
        this.monthlyData.set(data);
        const max = Math.max(...data.map(m => Number(m.amount || 0)), 0);
        this.maxMonthlyAmount.set(max > 0 ? max : 1);
        this.semesterRevenue.set(this.monthlyRevenueTotal());
        this.updateFilteredOverviewCards();
        this.selectDefaultPaymentPeriod(semesterId);
      },
      error: (err) => console.error('Error loading monthly revenue', err)
    });

    this.apiService.getClassRevenue(semesterId, fromPeriodId, toPeriodId).subscribe({
      next: (data) => {
        this.classData.set(data);
        this.updateFilteredOverviewCards();
      },
      error: (err) => console.error('Error loading class revenue', err)
    });
  }


  private updateFilteredOverviewCards() {
    const selectedPeriodIds = new Set(this.filteredReportPeriods().map(period => Number(period.id)));
    if (!selectedPeriodIds.size) {
      this.semesterRevenue.set(0);
      this.semesterStudents.set(0);
      this.semesterClasses.set(0);
      return;
    }

    const rowsInRange = this.tuitionRows().filter(row => {
      const candidatePeriodIds = (row.payablePeriodIds?.length ? row.payablePeriodIds : row.classPeriodIds) || [];
      if (candidatePeriodIds.length) {
        return candidatePeriodIds.some(periodId => selectedPeriodIds.has(Number(periodId)));
      }

      return Array.from(selectedPeriodIds).some(periodId => {
        const key = String(periodId);
        return !!row.payments?.[key] || row.amountDueByPeriod?.[key] !== undefined;
      });
    });

    this.semesterStudents.set(new Set(rowsInRange.map(row => row.studentId)).size);
    this.semesterClasses.set(new Set(rowsInRange.map(row => row.classId)).size);
  }
  private normalizeReportRange() {
    const periods = this.periods();
    const fromIndex = periods.findIndex(p => p.id === Number(this.reportFromPeriodId()));
    const toIndex = periods.findIndex(p => p.id === Number(this.reportToPeriodId()));

    if (fromIndex >= 0 && toIndex >= 0 && fromIndex > toIndex) {
      const from = this.reportFromPeriodId();
      this.reportFromPeriodId.set(this.reportToPeriodId());
      this.reportToPeriodId.set(from);
    }
  }

  private selectDefaultPaymentPeriod(semesterId: number) {
    const periods = this.periods();
    const monthly = this.monthlyData();
    if (!periods.length || !monthly.length || this.selectedPeriodId()) return;

    const paidPeriod = monthly.find(m => Number(m.amount) > 0 && periods.some(p => p.id === m.periodId));
    const periodId = paidPeriod?.periodId || periods[0].id;

    this.selectedPeriodId.set(periodId);
    this.loading.set(true);
    this.loadPaymentStatus(semesterId, periodId);
  }

  onPeriodChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const value = parseInt(select.value, 10);
    this.selectedPeriodId.set(value);
    
    const semId = this.apiService.selectedSemesterId();
    if (semId) {
      this.loading.set(true);
      this.loadPaymentStatus(semId, value);
    }
  }

  loadPaymentStatus(semesterId: number, periodId: number) {
    this.apiService.getPaymentStatusReport(semesterId, periodId).subscribe({
      next: (data) => {
        this.paidStudents.set(data.paid || []);
        this.unpaidStudents.set(data.unpaid || []);
        this.applyRosterFilters();
        this.loading.set(false);
      },
      error: (err) => {
        console.error('Error loading payment status', err);
        this.loading.set(false);
      }
    });
  }

  applyRosterFilters() {
    const query = this.rosterSearchQuery.toLowerCase().trim();
    let paid = this.paidStudents();
    let unpaid = this.unpaidStudents();

    if (query) {
      paid = paid.filter(s => 
        s.studentName.toLowerCase().includes(query) || 
        s.className.toLowerCase().includes(query)
      );
      unpaid = unpaid.filter(s => 
        s.studentName.toLowerCase().includes(query) || 
        s.className.toLowerCase().includes(query)
      );
    }

    this.filteredPaidStudents.set(paid);
    this.filteredUnpaidStudents.set(unpaid);
  }

  classRevenueTotal(): number {
    return this.classData().reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }

  monthlyRevenueTotal(): number {
    return this.monthlyData().reduce((sum, item) => sum + Number(item.amount || 0), 0);
  }

  paidTotal(): number {
    return this.filteredPaidStudents().reduce((sum, item) => sum + Number(item.amountPaid || 0), 0);
  }

  unpaidTotal(): number {
    return this.filteredUnpaidStudents().reduce((sum, item) => sum + Number(item.amountDue || 0), 0);
  }

  exportClassRevenueDetails() {
    const periods = this.filteredReportPeriods();
    const rows: Record<string, unknown>[] = [];

    this.tuitionRows()
      .slice()
      .sort((a, b) => a.className.localeCompare(b.className, 'vi') || a.studentName.localeCompare(b.studentName, 'vi'))
      .forEach(studentRow => {
        periods.forEach(period => {
          const payment = studentRow.payments?.[String(period.id)];
          const amountPaid = Number(payment?.amountPaid || 0);

          if (amountPaid > 0) {
            rows.push({
              'Lớp học': studentRow.className,
              'Học sinh': studentRow.studentName,
              'Tháng': period.monthName,
              'Số tiền đã đóng (k)': amountPaid,
              'Thời gian đóng': this.formatPaidAt(payment?.paidAt),
              'Ghi chú': payment?.notes || ''
            });
          }
        });
      });

    this.exportCsv(`doanh-thu-theo-lop-${this.reportFilterSuffix()}`, rows);
  }

  exportMonthlyRevenueDetails() {
    const periods = this.filteredReportPeriods();
    const rows: Record<string, unknown>[] = [];

    this.tuitionRows()
      .slice()
      .sort((a, b) => a.className.localeCompare(b.className, 'vi') || a.studentName.localeCompare(b.studentName, 'vi'))
      .forEach(studentRow => {
        periods.forEach(period => {
          const payment = studentRow.payments?.[String(period.id)];
          const amountPaid = Number(payment?.amountPaid || 0);

          if (amountPaid > 0) {
            rows.push({
              'Tháng': period.monthName,
              'Lớp học': studentRow.className,
              'Học sinh': studentRow.studentName,
              'Số tiền đã đóng (k)': amountPaid,
              'Thời gian đóng': this.formatPaidAt(payment?.paidAt),
              'Ghi chú': payment?.notes || ''
            });
          }
        });
      });

    this.exportCsv(`doanh-thu-theo-thang-${this.reportFilterSuffix()}`, rows);
  }

  exportPaidStudents() {
    const periodName = this.currentPeriodName();
    const rows = this.filteredPaidStudents()
      .slice()
      .sort((a, b) => a.className.localeCompare(b.className, 'vi') || a.studentName.localeCompare(b.studentName, 'vi'))
      .map(item => ({
        'Lớp học': item.className,
        'Học sinh': item.studentName,
        'Tháng': periodName,
        'Số tiền phải đóng (k)': Number(item.amountDue || 0),
        'Số tiền đã đóng (k)': Number(item.amountPaid || 0),
        'Thời gian đóng': this.formatPaidAt(item.paidAt),
        'Ghi chú': item.notes || ''
      }));

    this.exportCsv(`hoc-sinh-da-dong-${this.safeFilePart(periodName)}`, rows);
  }

  exportUnpaidStudents() {
    const periodName = this.currentPeriodName();
    const rows = this.filteredUnpaidStudents()
      .slice()
      .sort((a, b) => a.className.localeCompare(b.className, 'vi') || a.studentName.localeCompare(b.studentName, 'vi'))
      .map(item => ({
        'Lớp học': item.className,
        'Học sinh': item.studentName,
        'Tháng': periodName,
        'Số tiền chưa đóng (k)': Number(item.amountDue || 0),
        'Trạng thái': 'Chưa đóng'
      }));

    this.exportCsv(`hoc-sinh-chua-dong-${this.safeFilePart(periodName)}`, rows);
  }

  exportCombinedReport() {
    const range = this.reportRangeLabel();
    const rows: Record<string, unknown>[] = [];

    this.monthlyData().forEach(item => {
      rows.push({
        'Loại báo cáo': 'Doanh thu theo tháng',
        'Khoảng tháng': range,
        'Tháng': item.monthName,
        'Lớp học': '',
        'Học sinh': '',
        'Số tiền (k)': Number(item.amount || 0),
        'Thời gian đóng': '',
        'Ghi chú': ''
      });
    });

    this.classData().forEach(item => {
      rows.push({
        'Loại báo cáo': 'Doanh thu theo lớp',
        'Khoảng tháng': range,
        'Tháng': '',
        'Lớp học': item.className,
        'Học sinh': item.studentCount,
        'Số tiền (k)': Number(item.amount || 0),
        'Thời gian đóng': '',
        'Ghi chú': ''
      });
    });

    this.tuitionRows()
      .slice()
      .sort((a, b) => a.className.localeCompare(b.className, 'vi') || a.studentName.localeCompare(b.studentName, 'vi'))
      .forEach(studentRow => {
        this.filteredReportPeriods().forEach((period: TuitionPeriod) => {
          const payment = studentRow.payments?.[String(period.id)];
          const amountPaid = Number(payment?.amountPaid || 0);
          if (amountPaid > 0) {
            rows.push({
              'Loại báo cáo': 'Chi tiết học sinh đóng tiền',
              'Khoảng tháng': range,
              'Tháng': period.monthName,
              'Lớp học': studentRow.className,
              'Học sinh': studentRow.studentName,
              'Số tiền (k)': amountPaid,
              'Thời gian đóng': this.formatPaidAt(payment?.paidAt),
              'Ghi chú': payment?.notes || ''
            });
          }
        });
      });

    this.exportCsv(`bao-cao-tong-hop-${this.reportFilterSuffix()}`, rows);
  }

  reportRangeLabel(): string {
    const periods = this.periods();
    if (!periods.length) return 'Chưa có tháng để lọc';

    const fromId = this.appliedReportFromPeriodId() || this.reportFromPeriodId();
    const toId = this.appliedReportToPeriodId() || this.reportToPeriodId();
    const from = periods.find(p => p.id === Number(fromId)) || periods[0];
    const to = periods.find(p => p.id === Number(toId)) || periods[periods.length - 1];
    return `${from.monthName} - ${to.monthName}`;
  }
  private reportFilterSuffix(): string {
    return this.safeFilePart(this.reportRangeLabel());
  }

  filteredReportPeriods(): TuitionPeriod[] {
    const periods = this.periods();
    const fromId = this.appliedReportFromPeriodId() || this.reportFromPeriodId();
    const toId = this.appliedReportToPeriodId() || this.reportToPeriodId();
    const fromIndex = periods.findIndex(p => p.id === Number(fromId));
    const toIndex = periods.findIndex(p => p.id === Number(toId));

    if (fromIndex < 0 || toIndex < 0) return periods;

    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);
    return periods.slice(start, end + 1);
  }
  private currentPeriodName(): string {
    const selectedId = Number(this.selectedPeriodId());
    return this.periods().find(period => period.id === selectedId)?.monthName || '';
  }

  private formatPaidAt(value?: string | null): string {
    if (!value) return '';

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  private exportCsv(filename: string, rows: Record<string, unknown>[]) {
    if (!rows.length) {
      alert('Không có dữ liệu để xuất.');
      return;
    }

    const headers = Object.keys(rows[0]);
    const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const csv = '\uFEFF' + [
      headers.map(escapeCsv).join(','),
      ...rows.map(row => headers.map(header => escapeCsv(row[header])).join(','))
    ].join('\r\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename || 'bao-cao'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private safeFilePart(value: string): string {
    return (value || 'bao-cao')
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, '-')
      .toLowerCase();
  }
}








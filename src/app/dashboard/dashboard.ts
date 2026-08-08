import { Component, OnInit, signal, effect, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, StudentTuitionRow, TuitionMatrix, TuitionPeriod } from '../api.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard-container">
      <div class="welcome-header">
        <h1>Bảng Tổng Quan</h1>
        <p>Báo cáo tình hình dạy học và đóng học phí trong kỳ.</p>
      </div>

      <!-- Stats Grid -->
      <div class="dashboard-grid">
        <!-- Stat Card 1 -->
        <div class="card stat-card">
          <div class="stat-info">
            <span class="stat-label">Tổng số Học sinh</span>
            <span class="stat-value">{{ totalStudents() }}</span>
          </div>
          <div class="stat-icon-wrapper bg-primary-soft">
            <span class="material-symbols-outlined">group</span>
          </div>
        </div>

        <!-- Stat Card 2 -->
        <div class="card stat-card">
          <div class="stat-info">
            <span class="stat-label">Số Lớp học</span>
            <span class="stat-value">{{ totalClasses() }}</span>
          </div>
          <div class="stat-icon-wrapper bg-info-soft">
            <span class="material-symbols-outlined">school</span>
          </div>
        </div>

        <!-- Stat Card 3 -->
        <div class="card stat-card">
          <div class="stat-info">
            <span class="stat-label">Tháng gần nhất</span>
            <span class="stat-value">{{ latestMonthName() }}</span>
          </div>
          <div class="stat-icon-wrapper bg-warning-soft">
            <span class="material-symbols-outlined">calendar_month</span>
          </div>
        </div>

        <!-- Stat Card 4 -->
        <div class="card stat-card">
          <div class="stat-info">
            <span class="stat-label">Doanh thu tháng này</span>
            <span class="stat-value text-success">{{ totalRevenue().toLocaleString() }}k</span>
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
          <h3>Tỷ lệ Thu Học phí ({{ latestMonthName() }})</h3>
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
                <span class="class-name">{{ cls.name }}</span>
                <div class="class-members-bar">
                <div class="class-members-fill" [style.width.%]="(cls.count / maxClassSize()) * 100"></div>
                </div>
                <span class="class-count"><strong>{{ cls.count }}</strong> học sinh</span>
              </div>
            } @empty {
              <p style="color: var(--text-secondary); text-align: center; padding: 1rem;">Đang tải lớp học...</p>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }
    .welcome-header h1 {
      font-size: 2rem;
      font-weight: 700;
      margin-bottom: 0.25rem;
    }
    .welcome-header p {
      color: var(--text-secondary);
      font-size: 0.875rem;
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
      font-size: 1.125rem;
      font-weight: 600;
    }
    .detail-card .description {
      color: var(--text-secondary);
      font-size: 0.875rem;
    }
    /* Progress bar styles */
    .progress-section {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-top: 1rem;
    }
    .progress-bar-container {
      height: 16px;
      background-color: var(--bg-primary);
      border-radius: 9999px;
      overflow: hidden;
      border: 1px solid var(--border-color);
    }
    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(to right, var(--accent-primary), var(--color-success));
      border-radius: 9999px;
      transition: width 0.5s ease-out;
    }
    .progress-stats {
      display: flex;
      justify-content: space-between;
      font-size: 0.875rem;
      color: var(--text-secondary);
    }
    /* Classes list styles */
    .classes-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-height: 300px;
      overflow-y: auto;
      padding-right: 0.25rem;
    }
    .class-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      font-size: 0.875rem;
    }
    .class-name {
      width: 100px;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .class-members-bar {
      flex-grow: 1;
      height: 8px;
      background-color: var(--bg-primary);
      border-radius: 9999px;
      overflow: hidden;
    }
    .class-members-fill {
      height: 100%;
      background-color: var(--color-info);
      border-radius: 9999px;
    }
    .class-count {
      width: 100px;
      text-align: right;
      color: var(--text-secondary);
    }
  `]
})
export class DashboardComponent implements OnInit {
  private apiService = inject(ApiService);

  // States
  public totalStudents = signal<number>(0);
  public totalClasses = signal<number>(0);
  public latestMonthName = signal<string>('N/A');
  public totalRevenue = signal<number>(0);
  public paymentRatio = signal<number>(0);
  public paidCount = signal<number>(0);
  public unpaidCount = signal<number>(0);
  public classBreakdown = signal<Array<{ name: string, count: number }>>([]);
  public maxClassSize = signal<number>(1);

  constructor() {
    // Reload dashboard metrics whenever selectedSemesterId changes
    effect(() => {
      const semId = this.apiService.selectedSemesterId();
      if (semId) {
        this.loadDashboardData(semId);
      }
    });
  }

  ngOnInit() {}

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

        // Calculate total unique students. A student can join multiple classes,
        // so dashboard totals should not count the same student more than once.
        const uniqueStudentIds = new Set(studentList.map(s => Number(s.studentId)));
        if (!this.totalStudents()) {
          this.totalStudents.set(uniqueStudentIds.size);
        }

        // Calculate Class breakdown
        const classCounts: { [name: string]: number } = {};
        studentList.forEach(s => {
          classCounts[s.className] = (classCounts[s.className] || 0) + 1;
        });

        const breakdown = Object.keys(classCounts).map(name => ({
          name: name,
          count: classCounts[name]
        })).sort((a, b) => b.count - a.count);

        this.classBreakdown.set(breakdown);
        this.maxClassSize.set(Math.max(...breakdown.map(c => c.count), 1));
        if (!this.totalClasses()) {
          this.totalClasses.set(breakdown.length);
        }

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

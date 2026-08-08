import { Component, OnInit, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Class, PenaltyRule, Student, StudentPenalty } from '../api.service';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-penalties',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="penalties-page">
      <div class="header-section">
        <h1>Quản lý Phạt</h1>
        <p>Cấu hình lỗi phạt, ghi nhận từng buổi học và xem tổng kết theo tuần hoặc tháng.</p>
      </div>

      <div class="top-grid">
        <section class="card entry-card">
          <div class="section-title">
            <div>
              <h3>Ghi phạt theo buổi học</h3>
              <span>Chọn lớp, ngày học, học sinh và lỗi phạt.</span>
            </div>
          </div>

          <div class="form-grid">
            <label>
              <span>Lớp học</span>
              <select class="form-control" [ngModel]="selectedClassId()" (ngModelChange)="onClassChange($event)">
                <option [ngValue]="null">-- Chọn lớp --</option>
                @for (c of classes(); track c.id) {
                  <option [ngValue]="c.id">{{ c.name }}</option>
                }
              </select>
            </label>
            <label>
              <span>Ngày học</span>
              <input type="date" class="form-control" [ngModel]="selectedDate()" (ngModelChange)="selectedDate.set($event); loadPenalties()">
            </label>
          </div>

          <div class="form-grid">
            <label>
              <span>Học sinh</span>
              <select class="form-control" [(ngModel)]="penaltyForm.studentId">
                <option [ngValue]="null">-- Chọn học sinh --</option>
                @for (s of students(); track s.id) {
                  <option [ngValue]="s.id">{{ s.name }}</option>
                }
              </select>
            </label>
            <label>
              <span>Lỗi phạt</span>
              <select class="form-control" [(ngModel)]="penaltyForm.penaltyRuleId" (ngModelChange)="onRuleChange()">
                <option [ngValue]="null">-- Chọn lỗi phạt --</option>
                @for (r of activeRules(); track r.id) {
                  <option [ngValue]="r.id">{{ r.name }} - {{ r.defaultAmount | number:'1.0-0' }}k</option>
                }
              </select>
            </label>
          </div>

          <div class="form-grid amount-note-grid">
            <label>
              <span>Số tiền phạt (k)</span>
              <input type="number" class="form-control" min="0" [(ngModel)]="penaltyForm.amount">
            </label>
            <label>
              <span>Ghi chú</span>
              <input type="text" class="form-control" placeholder="Ví dụ: nhắc lần 2, quên vở..." [(ngModel)]="penaltyForm.note">
            </label>
            <button class="btn btn-primary add-btn" (click)="savePenalty()" [disabled]="!canSavePenalty()">
              <span class="material-symbols-outlined">add_circle</span>
              Thêm phạt
            </button>
          </div>

          <div class="penalty-list">
            <div class="list-header">
              <strong>Danh sách phạt trong buổi</strong>
              <span>{{ dayTotal() | number:'1.0-0' }}k</span>
            </div>
            @for (p of penalties(); track p.id) {
              <div class="penalty-row">
                <div>
                  <strong>{{ p.studentName }}</strong>
                  <span>{{ p.ruleName }}</span>
                  @if (p.note) {
                    <small>{{ p.note }}</small>
                  }
                </div>
                <div class="row-actions">
                  <strong>{{ p.amount | number:'1.0-0' }}k</strong>
                  <button class="icon-danger" (click)="deletePenalty(p.id)" title="Xóa phạt">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            } @empty {
              <div class="empty-box">Chưa có khoản phạt nào cho buổi này.</div>
            }
          </div>
        </section>

        <section class="card rules-card">
          <div class="section-title">
            <div>
              <h3>Cấu hình lỗi phạt</h3>
              <span>Mức tiền tính theo nghìn đồng (k).</span>
            </div>
          </div>

          @if (auth.currentUser()?.role === 'Manager') {
            <div class="rule-form">
              <input class="form-control" placeholder="Tên lỗi phạt" [(ngModel)]="ruleForm.name">
              <input class="form-control amount-input" type="number" min="0" [(ngModel)]="ruleForm.defaultAmount">
              <button class="btn btn-secondary" (click)="saveRule()">
                {{ editingRuleId() ? 'Lưu' : 'Thêm' }}
              </button>
            </div>
          }

          <div class="rules-list">
            @for (r of rules(); track r.id) {
              <div class="rule-row" [class.inactive]="!r.isActive">
                <div>
                  <strong>{{ r.name }}</strong>
                  <span>{{ r.defaultAmount | number:'1.0-0' }}k</span>
                </div>
                @if (auth.currentUser()?.role === 'Manager') {
                  <div class="rule-actions">
                    <button class="icon-btn" (click)="editRule(r)" title="Sửa">
                      <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button class="icon-btn" (click)="toggleRule(r)" [title]="r.isActive ? 'Khóa' : 'Mở khóa'">
                      <span class="material-symbols-outlined">{{ r.isActive ? 'visibility_off' : 'visibility' }}</span>
                    </button>
                    <button class="icon-danger" (click)="deleteRule(r)" title="Xóa">
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                }
              </div>
            }
          </div>
        </section>
      </div>

      <section class="card summary-card">
        <div class="summary-toolbar">
          <div>
            <h3>Báo cáo tổng kết phạt</h3>
            <span>Tổng hợp theo học sinh, từng tuần hoặc từng tháng.</span>
          </div>
          <div class="summary-filters">
            <select class="form-control" [ngModel]="summaryMode()" (ngModelChange)="summaryMode.set($event); loadSummary()">
              <option value="week">Theo tuần</option>
              <option value="month">Theo tháng</option>
            </select>
            <input type="date" class="form-control" [ngModel]="fromDate()" (ngModelChange)="fromDate.set($event); loadSummary()">
            <input type="date" class="form-control" [ngModel]="toDate()" (ngModelChange)="toDate.set($event); loadSummary()">
            <button class="btn btn-secondary export-btn" (click)="exportSummaryExcel()">
              <span class="material-symbols-outlined">download</span>
              Xuất Excel
            </button>
          </div>
        </div>

        @for (group of summary(); track group.period) {
          <div class="summary-group">
            <div class="summary-group-head">
              <strong>{{ group.period }}</strong>
              <span>{{ group.totalCount }} lỗi - {{ group.totalAmount | number:'1.0-0' }}k</span>
            </div>
            <div class="student-summary-grid">
              @for (s of group.students; track s.studentName) {
                <div class="student-summary-item">
                  <strong>{{ s.studentName }}</strong>
                  <span>{{ s.totalCount }} lỗi</span>
                  <b>{{ s.totalAmount | number:'1.0-0' }}k</b>
                </div>
              }
            </div>
          </div>
        } @empty {
          <div class="empty-box">Chưa có dữ liệu phạt trong khoảng thời gian đã chọn.</div>
        }
      </section>
    </div>
  `,
  styles: [`
    .penalties-page { display: flex; flex-direction: column; gap: 1.5rem; }
    .header-section h1 { font-size: 2rem; font-weight: 800; margin-bottom: .25rem; }
    .header-section p, .section-title span, .summary-toolbar span { color: var(--text-secondary); font-size: .88rem; }
    .top-grid { display: grid; grid-template-columns: minmax(0, 1.35fr) minmax(320px, .65fr); gap: 1.25rem; align-items: start; }
    .card { border: 1px solid var(--border-light); }
    .section-title, .summary-toolbar, .list-header, .summary-group-head { display: flex; justify-content: space-between; gap: 1rem; align-items: center; }
    .section-title h3, .summary-toolbar h3 { font-size: 1.15rem; margin: 0; }
    .form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .85rem; margin-top: 1rem; }
    label span { display: block; color: var(--text-secondary); font-size: .82rem; font-weight: 700; margin-bottom: .35rem; }
    .amount-note-grid { grid-template-columns: 150px minmax(0, 1fr) auto; align-items: end; }
    .add-btn { height: 40px; white-space: nowrap; }
    .penalty-list, .rules-list { display: flex; flex-direction: column; gap: .55rem; margin-top: 1.1rem; }
    .list-header { padding-top: .9rem; border-top: 1px solid var(--border-color); }
    .list-header span, .summary-group-head span, .student-summary-item b { color: var(--color-info); font-weight: 800; }
    .penalty-row, .rule-row { display: flex; justify-content: space-between; gap: 1rem; align-items: center; padding: .75rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); background: var(--bg-primary); }
    .penalty-row div:first-child, .rule-row div:first-child { display: flex; flex-direction: column; gap: .2rem; }
    .penalty-row span, .rule-row span, .penalty-row small { color: var(--text-secondary); font-size: .78rem; }
    .row-actions, .rule-actions { display: flex; align-items: center; gap: .4rem; }
    .icon-btn, .icon-danger { border: 0; border-radius: var(--radius-sm); width: 34px; height: 34px; display: inline-flex; align-items: center; justify-content: center; cursor: pointer; background: rgba(148, 163, 184, .1); color: var(--text-primary); }
    .icon-danger { background: rgba(239, 68, 68, .12); color: var(--color-danger); }
    .rule-form { display: grid; grid-template-columns: minmax(0, 1fr) 100px auto; gap: .55rem; margin-top: 1rem; }
    .rule-row.inactive { opacity: .55; }
    .summary-filters { display: flex; gap: .6rem; flex-wrap: wrap; justify-content: flex-end; }
    .summary-filters .form-control { width: auto; min-width: 140px; }
    .export-btn { height: 40px; white-space: nowrap; display: inline-flex; align-items: center; gap: .4rem; }
    .export-btn .material-symbols-outlined { font-size: 1.1rem; }
    .summary-group { margin-top: 1rem; border: 1px solid var(--border-color); border-radius: var(--radius-md); overflow: hidden; }
    .summary-group-head { padding: .85rem 1rem; background: rgba(99, 102, 241, .12); }
    .student-summary-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: .65rem; padding: .9rem; }
    .student-summary-item { display: grid; gap: .15rem; padding: .7rem; background: var(--bg-primary); border: 1px solid var(--border-color); border-radius: var(--radius-sm); }
    .student-summary-item span { color: var(--text-secondary); font-size: .78rem; }
    .empty-box { padding: 1.25rem; color: var(--text-secondary); border: 1px dashed var(--border-color); border-radius: var(--radius-md); text-align: center; }
    @media (max-width: 1100px) { .top-grid { grid-template-columns: 1fr; } }
    @media (max-width: 680px) { .form-grid, .amount-note-grid, .rule-form { grid-template-columns: 1fr; } .summary-toolbar { align-items: flex-start; flex-direction: column; } .summary-filters { width: 100%; justify-content: stretch; } .summary-filters .form-control, .summary-filters .export-btn { width: 100%; justify-content: center; } }
  `]
})
export class PenaltiesComponent implements OnInit {
  private api = inject(ApiService);
  public auth = inject(AuthService);

  public classes = signal<Class[]>([]);
  public students = signal<Student[]>([]);
  public rules = signal<PenaltyRule[]>([]);
  public penalties = signal<StudentPenalty[]>([]);
  public summary = signal<any[]>([]);
  public selectedClassId = signal<number | null>(null);
  public selectedDate = signal<string>(this.today());
  public summaryMode = signal<'week' | 'month'>('week');
  public fromDate = signal<string>('');
  public toDate = signal<string>('');
  public editingRuleId = signal<number | null>(null);

  public penaltyForm = {
    studentId: null as number | null,
    penaltyRuleId: null as number | null,
    amount: 0,
    note: ''
  };

  public ruleForm = {
    name: '',
    defaultAmount: 5,
    isActive: true
  };

  public activeRules = computed(() => this.rules().filter(r => r.isActive));
  public dayTotal = computed(() => this.penalties().reduce((sum, p) => sum + Number(p.amount || 0), 0));

  constructor() {
    effect(() => {
      const semId = this.api.selectedSemesterId();
      if (semId) {
        this.loadClasses(semId);
        this.loadSummary();
      }
    });
  }

  ngOnInit() {
    this.loadRules();
  }

  loadClasses(semesterId: number) {
    this.api.getClasses(semesterId).subscribe(data => {
      this.classes.set(data);
      if (!this.selectedClassId() && data.length) {
        this.onClassChange(data[0].id);
      }
    });
  }

  onClassChange(classId: number | null) {
    this.selectedClassId.set(classId ? Number(classId) : null);
    this.penaltyForm.studentId = null;
    this.students.set([]);
    if (!classId) {
      this.penalties.set([]);
      return;
    }
    this.api.getStudents(Number(classId)).subscribe(data => this.students.set(data));
    this.loadPenalties();
  }

  loadRules() {
    this.api.getPenaltyRules().subscribe(data => this.rules.set(data));
  }

  loadPenalties() {
    this.api.getPenalties(this.selectedClassId(), this.selectedDate()).subscribe(data => this.penalties.set(data));
  }

  onRuleChange() {
    const rule = this.rules().find(r => r.id === Number(this.penaltyForm.penaltyRuleId));
    if (rule) this.penaltyForm.amount = rule.defaultAmount;
  }

  canSavePenalty(): boolean {
    return !!this.selectedClassId() && !!this.penaltyForm.studentId && !!this.penaltyForm.penaltyRuleId && this.penaltyForm.amount >= 0;
  }

  savePenalty() {
    if (!this.canSavePenalty()) return;
    this.api.createPenalty({
      studentId: Number(this.penaltyForm.studentId),
      classId: Number(this.selectedClassId()),
      penaltyRuleId: Number(this.penaltyForm.penaltyRuleId),
      date: this.selectedDate(),
      amount: Number(this.penaltyForm.amount),
      note: this.penaltyForm.note
    }).subscribe({
      next: () => {
        this.penaltyForm.penaltyRuleId = null;
        this.penaltyForm.amount = 0;
        this.penaltyForm.note = '';
        this.loadPenalties();
        this.loadSummary();
      },
      error: err => alert(err.error?.message || 'Không thể lưu khoản phạt.')
    });
  }

  deletePenalty(id: number) {
    if (!confirm('Bạn có chắc chắn muốn xóa khoản phạt này?')) return;
    this.api.deletePenalty(id).subscribe(() => {
      this.loadPenalties();
      this.loadSummary();
    });
  }

  saveRule() {
    if (!this.ruleForm.name.trim()) return;
    const payload = { ...this.ruleForm, name: this.ruleForm.name.trim(), defaultAmount: Number(this.ruleForm.defaultAmount) };
    const id = this.editingRuleId();
    const request = id ? this.api.updatePenaltyRule(id, payload) : this.api.createPenaltyRule(payload);
    request.subscribe({
      next: () => {
        this.ruleForm = { name: '', defaultAmount: 5, isActive: true };
        this.editingRuleId.set(null);
        this.loadRules();
      },
      error: err => alert(err.error?.message || 'Không thể lưu lỗi phạt.')
    });
  }

  editRule(rule: PenaltyRule) {
    this.editingRuleId.set(rule.id);
    this.ruleForm = { name: rule.name, defaultAmount: rule.defaultAmount, isActive: rule.isActive };
  }

  toggleRule(rule: PenaltyRule) {
    this.api.updatePenaltyRule(rule.id, { name: rule.name, defaultAmount: rule.defaultAmount, isActive: !rule.isActive })
      .subscribe(() => this.loadRules());
  }

  deleteRule(rule: PenaltyRule) {
    if (!confirm('Bạn có chắc chắn muốn xóa lỗi phạt này?')) return;
    this.api.deletePenaltyRule(rule.id).subscribe({
      next: () => this.loadRules(),
      error: err => alert(err.error?.message || 'Không thể xóa lỗi phạt này.')
    });
  }

  loadSummary() {
    const semId = this.api.selectedSemesterId();
    if (!semId) return;
    this.api.getPenaltySummary(semId, this.summaryMode(), this.fromDate(), this.toDate())
      .subscribe(data => this.summary.set(data));
  }

  exportSummaryExcel() {
    const rows: Record<string, unknown>[] = [];
    this.summary().forEach(group => {
      (group.students || []).forEach((student: any) => {
        rows.push({
          'Kỳ báo cáo': group.period,
          'Học sinh': student.studentName,
          'Số lỗi': Number(student.totalCount || 0),
          'Tổng tiền phạt (k)': Number(student.totalAmount || 0)
        });
      });
    });

    this.exportCsv(`bao-cao-tong-ket-phat-${this.summaryMode()}-${this.safeFilePart(this.fromDate() || 'all')}-${this.safeFilePart(this.toDate() || 'all')}`, rows);
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
    link.download = `${filename || 'bao-cao-phat'}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  private safeFilePart(value: string): string {
    return (value || 'bao-cao')
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, '-')
      .toLowerCase();
  }

  private today(): string {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
  }
}

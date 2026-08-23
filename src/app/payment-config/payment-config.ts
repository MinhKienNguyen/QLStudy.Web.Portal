import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../api.service';

@Component({
  selector: 'app-payment-config',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="payment-config-container" style="max-width: 800px; margin: 0 auto; padding: 2rem 1.5rem;">
      <div class="header-section" style="margin-bottom: 2rem;">
        <h1 style="color: #fff; font-size: 1.75rem; margin: 0 0 0.5rem; font-weight: 700; display: flex; align-items: center; gap: 0.75rem;">
          <span class="material-symbols-outlined" style="font-size: 2.25rem; color: var(--accent-primary);">qr_code_2</span>
          Cấu hình Thông tin thanh toán
        </h1>
        <p style="color: var(--text-muted); margin: 0; font-size: 0.9rem;">Cấu hình tài khoản ngân hàng nhận học phí và mã QR Code chuyển khoản hiển thị cho Phụ huynh/Học sinh.</p>
      </div>

      <!-- Alert Messages -->
      <div class="alert alert-danger" *ngIf="errorMessage()" style="padding: 0.75rem 1rem; border-radius: 12px; margin-bottom: 1.5rem; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); color: #fca5a5; display: flex; align-items: center; gap: 0.5rem;">
        <span class="material-symbols-outlined">error</span>
        <span>{{ errorMessage() }}</span>
      </div>

      <div class="alert alert-success" *ngIf="successMessage()" style="padding: 0.75rem 1rem; border-radius: 12px; margin-bottom: 1.5rem; background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.2); color: #86efac; display: flex; align-items: center; gap: 0.5rem;">
        <span class="material-symbols-outlined">check_circle</span>
        <span>{{ successMessage() }}</span>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 300px; gap: 2rem; align-items: start;">
        <!-- Left Column: Form Details -->
        <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 20px; padding: 2rem; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);">
          <form (submit)="saveSettings($event)" style="display: flex; flex-direction: column; gap: 1.5rem;">
            
            <div class="form-group">
              <label style="display: block; margin-bottom: 0.5rem; color: #d1d5db; font-size: 0.875rem; font-weight: 600;">Tên ngân hàng *</label>
              <input
                type="text"
                name="bankName"
                [(ngModel)]="form.bankName"
                placeholder="Ví dụ: BIDV, Vietcombank, MBBank..."
                required
                style="width: 100%; padding: 0.75rem 1rem; border-radius: 10px; border: 1px solid var(--border-color); background: rgba(31, 41, 55, 0.5); color: #fff; font-size: 0.9375rem; box-sizing: border-box;"
              />
            </div>

            <div class="form-group">
              <label style="display: block; margin-bottom: 0.5rem; color: #d1d5db; font-size: 0.875rem; font-weight: 600;">Số tài khoản *</label>
              <input
                type="text"
                name="bankAccountNumber"
                [(ngModel)]="form.bankAccountNumber"
                placeholder="Nhập số tài khoản ngân hàng..."
                required
                style="width: 100%; padding: 0.75rem 1rem; border-radius: 10px; border: 1px solid var(--border-color); background: rgba(31, 41, 55, 0.5); color: #fff; font-size: 0.9375rem; box-sizing: border-box;"
              />
            </div>

            <div class="form-group">
              <label style="display: block; margin-bottom: 0.5rem; color: #d1d5db; font-size: 0.875rem; font-weight: 600;">Tên chủ tài khoản *</label>
              <input
                type="text"
                name="bankAccountName"
                [(ngModel)]="form.bankAccountName"
                placeholder="Nhập tên chủ tài khoản (viết hoa không dấu)..."
                required
                style="width: 100%; padding: 0.75rem 1rem; border-radius: 10px; border: 1px solid var(--border-color); background: rgba(31, 41, 55, 0.5); color: #fff; font-size: 0.9375rem; box-sizing: border-box;"
              />
            </div>

            <!-- PayOS Config Section -->
            <div style="border-top: 1px solid var(--border-color); padding-top: 1.5rem; margin-top: 0.5rem; display: flex; flex-direction: column; gap: 1.5rem;">
              <h3 style="color: #fff; font-size: 1.1rem; margin: 0; font-weight: 700; display: flex; align-items: center; gap: 0.5rem;">
                <span class="material-symbols-outlined" style="color: #6366f1;">link</span>
                Tích hợp Cổng thanh toán PayOS (VietQR Động)
              </h3>
              
              <div class="form-group">
                <label style="display: block; margin-bottom: 0.5rem; color: #d1d5db; font-size: 0.875rem; font-weight: 600;">PayOS Client ID</label>
                <input
                  type="text"
                  name="payOSClientId"
                  [(ngModel)]="form.payOSClientId"
                  placeholder="Nhập Client ID từ my.payos.vn..."
                  style="width: 100%; padding: 0.75rem 1rem; border-radius: 10px; border: 1px solid var(--border-color); background: rgba(31, 41, 55, 0.5); color: #fff; font-size: 0.9375rem; box-sizing: border-box;"
                />
              </div>

              <div class="form-group">
                <label style="display: block; margin-bottom: 0.5rem; color: #d1d5db; font-size: 0.875rem; font-weight: 600;">PayOS API Key</label>
                <input
                  type="text"
                  name="payOSApiKey"
                  [(ngModel)]="form.payOSApiKey"
                  placeholder="Nhập API Key từ my.payos.vn..."
                  style="width: 100%; padding: 0.75rem 1rem; border-radius: 10px; border: 1px solid var(--border-color); background: rgba(31, 41, 55, 0.5); color: #fff; font-size: 0.9375rem; box-sizing: border-box;"
                />
              </div>

              <div class="form-group">
                <label style="display: block; margin-bottom: 0.5rem; color: #d1d5db; font-size: 0.875rem; font-weight: 600;">PayOS Checksum Key</label>
                <input
                  type="password"
                  name="payOSChecksumKey"
                  [(ngModel)]="form.payOSChecksumKey"
                  placeholder="Nhập Checksum Key từ my.payos.vn..."
                  style="width: 100%; padding: 0.75rem 1rem; border-radius: 10px; border: 1px solid var(--border-color); background: rgba(31, 41, 55, 0.5); color: #fff; font-size: 0.9375rem; box-sizing: border-box;"
                />
              </div>
            </div>

            <div style="margin-top: 1rem;">
              <button type="submit" class="btn btn-primary" style="padding: 0.75rem 2rem; font-weight: 700; width: 100%;">
                Lưu cấu hình thanh toán
              </button>
            </div>

          </form>
        </div>

        <!-- Right Column: QR Code Config & Preview -->
        <div style="display: flex; flex-direction: column; gap: 1.5rem;">
          <div class="card" style="background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 20px; padding: 1.5rem; text-align: center; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);">
            <h4 style="color: #fff; margin: 0 0 1rem; font-size: 0.95rem; font-weight: 700;">Ảnh mã QR thanh toán</h4>
            
            <div style="background: rgba(255, 255, 255, 0.02); border: 2px dashed rgba(255,255,255,0.08); border-radius: 16px; padding: 1rem; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 200px; position: relative;">
              @if (form.paymentQrCode) {
                <img [src]="form.paymentQrCode" alt="Mã QR thanh toán" style="max-width: 100%; max-height: 180px; border-radius: 8px; object-fit: contain;">
              } @else {
                <span class="material-symbols-outlined" style="font-size: 3rem; color: var(--text-muted); margin-bottom: 0.5rem;">qr_code_scanner</span>
                <span style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.4;">Chưa tải lên mã QR tĩnh. Hệ thống sẽ tự động sinh mã VietQR động theo tiền học phí.</span>
              }
            </div>

            <div style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem;">
              <label class="brand-upload-btn" style="margin: 0; padding: 0.5rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; font-size: 0.8rem; border-radius: 8px; cursor: pointer; border: 1px solid var(--border-color); background: rgba(255,255,255,0.03); color: #fff;">
                <span class="material-symbols-outlined" style="font-size: 1.15rem;">upload</span>
                Tải ảnh QR tĩnh lên
                <input type="file" accept="image/*" (change)="onQrFileSelected($event)" style="display: none;">
              </label>

              <button class="btn btn-secondary btn-sm" *ngIf="form.paymentQrCode" (click)="clearQrCode()" style="padding: 0.5rem; font-size: 0.75rem; border-color: rgba(239,68,68,0.2); color: #fca5a5; width: 100%;">
                Xóa QR tĩnh (Dùng VietQR động)
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PaymentConfigComponent implements OnInit {
  private apiService = inject(ApiService);

  public form = {
    bankName: '',
    bankAccountNumber: '',
    bankAccountName: '',
    paymentQrCode: '',
    payOSClientId: '',
    payOSApiKey: '',
    payOSChecksumKey: ''
  };

  public errorMessage = signal<string>('');
  public successMessage = signal<string>('');

  ngOnInit() {
    this.loadSettings();
  }

  loadSettings() {
    (this.apiService as any).getPaymentSettings().subscribe({
      next: (res: any) => {
        this.form = {
          bankName: res.bankName || '',
          bankAccountNumber: res.bankAccountNumber || '',
          bankAccountName: res.bankAccountName || '',
          paymentQrCode: res.paymentQrCode || '',
          payOSClientId: res.payOSClientId || '',
          payOSApiKey: res.payOSApiKey || '',
          payOSChecksumKey: res.payOSChecksumKey || ''
        };
      },
      error: (err: any) => {
        console.error(err);
        this.errorMessage.set('Không thể tải cấu hình thanh toán hiện tại.');
      }
    });
  }

  saveSettings(event?: Event) {
    if (event) event.preventDefault();
    this.errorMessage.set('');
    this.successMessage.set('');

    (this.apiService as any).savePaymentSettings(this.form).subscribe({
      next: () => {
        this.successMessage.set('Lưu cấu hình thanh toán thành công!');
        // Trigger page re-fetch if needed
      },
      error: (err: any) => {
        console.error(err);
        this.errorMessage.set('Lỗi khi lưu cấu hình thanh toán. Vui lòng thử lại!');
      }
    });
  }

  onQrFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('Vui lòng chọn file ảnh QR Code.');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      this.form.paymentQrCode = String(reader.result || '');
      this.saveSettings();
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  clearQrCode() {
    this.form.paymentQrCode = '';
    this.saveSettings();
  }
}

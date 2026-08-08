import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  public email = '';
  public password = '';
  public mode = signal<'login' | 'forgot'>('login'); // login, forgot
  public errorMessage = signal<string>('');
  public successMessage = signal<string>('');
  public isLoading = signal<boolean>(false);

  onSubmit(event: Event) {
    event.preventDefault();
    this.errorMessage.set('');
    this.successMessage.set('');

    if (!this.email) {
      this.errorMessage.set('Vui lòng nhập Email.');
      return;
    }

    if (this.mode() === 'login') {
      if (!this.password) {
        this.errorMessage.set('Vui lòng nhập mật khẩu.');
        return;
      }

      this.isLoading.set(true);
      this.authService.login(this.email, this.password).subscribe({
        next: () => {
          this.isLoading.set(false);
          this.router.navigate(['/dashboard']);
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.error?.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại.');
        }
      });
    } else {
      // Forgot password
      this.isLoading.set(true);
      this.authService.forgotPassword(this.email).subscribe({
        next: (res) => {
          this.isLoading.set(false);
          this.successMessage.set(
            `Mật khẩu đã được khôi phục về mặc định: "${res.defaultPassword}". Vui lòng đăng nhập lại với mật khẩu này.`
          );
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set(err.error?.message || 'Yêu cầu khôi phục mật khẩu thất bại.');
        }
      });
    }
  }

  setMode(newMode: 'login' | 'forgot') {
    this.mode.set(newMode);
    this.errorMessage.set('');
    this.successMessage.set('');
    this.password = '';
  }
}

import { Injectable, signal, inject } from '@angular/core';
import { HttpClient, HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap, catchError, throwError, of } from 'rxjs';

export interface User {
  id: number;
  fullName: string;
  email: string;
  phoneNumber: string;
  role: 'Manager' | 'Teacher';
  token?: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);
  private apiUrl = '/api';

  public currentUser = signal<User | null>(null);
  public permissions = signal<{ [key: string]: boolean }>({});
  public isInitialized = signal<boolean>(false);

  constructor() {
    // Empty constructor, initialized via APP_INITIALIZER
  }

  initializeSession(): Promise<void> {
    return new Promise<void>((resolve) => {
      const isLoggedInFlag = localStorage.getItem('qlstudy_logged_in') === 'true';
      const savedToken = localStorage.getItem('qlstudy_token');
      if (isLoggedInFlag || savedToken) {
        this.loadCurrentUser().subscribe({
          next: () => {
            this.isInitialized.set(true);
            resolve();
          },
          error: () => {
            this.clearSession();
            this.isInitialized.set(true);
            resolve();
          }
        });
      } else {
        this.isInitialized.set(true);
        resolve();
      }
    });
  }

  isLoggedIn(): boolean {
    return this.currentUser() !== null;
  }

  hasPermission(screenKey: string): boolean {
    const user = this.currentUser();
    if (!user) return false;
    if (user.role === 'Manager') return true;
    return this.permissions()[screenKey] === true;
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/login`, { email, password }).pipe(
      tap(res => {
        if (res.user && res.user.token) {
          localStorage.setItem('qlstudy_token', res.user.token);
          localStorage.setItem('qlstudy_logged_in', 'true');
          this.currentUser.set(res.user);
          this.permissions.set(res.permissions || {});
        }
      })
    );
  }

  logout(): void {
    this.http.post(`${this.apiUrl}/auth/logout`, {}).subscribe({
      next: () => this.clearSessionAndRedirect(),
      error: () => this.clearSessionAndRedirect()
    });
  }

  forgotPassword(email: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/forgot-password`, { email });
  }

  changePassword(oldPassword: string, newPassword: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/auth/change-password`, { oldPassword, newPassword });
  }

  private loadCurrentUser(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/auth/me`).pipe(
      tap(res => {
        this.currentUser.set(res.user);
        this.permissions.set(res.permissions || {});
      }),
      catchError(err => {
        this.clearSession();
        return throwError(() => err);
      })
    );
  }

  private clearSession(): void {
    localStorage.removeItem('qlstudy_token');
    localStorage.removeItem('qlstudy_logged_in');
    this.currentUser.set(null);
    this.permissions.set({});
  }

  private clearSessionAndRedirect(): void {
    this.clearSession();
    this.router.navigate(['/login']);
  }
}

// Functional HTTP Interceptor for JWT/Bearer token & HttpOnly Cookie
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = localStorage.getItem('qlstudy_token');
  
  const cloneParams: any = {
    withCredentials: true
  };
  
  if (token) {
    cloneParams.setHeaders = {
      Authorization: `Bearer ${token}`
    };
  }
  
  req = req.clone(cloneParams);
  return next(req);
};

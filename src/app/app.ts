import { Component, OnInit, signal, effect, HostListener, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { ApiService, Semester } from './api.service';
import { AuthService } from './auth.service';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'danger';
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  public authService = inject(AuthService);
  public semesters = signal<Semester[]>([]);
  public toasts = signal<Toast[]>([]);
  private toastIdCounter = 0;
  public activeTheme = 'indigo';
  public activeBg = 'black';
  public isSidebarCollapsed = signal<boolean>(false);
  public showSettingsDropdown = signal<boolean>(false);
  public centerName = signal<string>('QLStudy');
  public centerLogoIcon = signal<string>('auto_stories');
  public centerLogoImage = signal<string>('');
  public logoIconOptions = ['auto_stories', 'school', 'menu_book', 'local_library', 'workspace_premium', 'psychology', 'calculate', 'emoji_events'];

  constructor(public apiService: ApiService) {
    // When the selected semester changes, update the name of the active semester
    effect(() => {
      const id = this.apiService.selectedSemesterId();
      const semList = this.semesters();
      const current = semList.find(s => s.id === id);
      if (current) {
        this.apiService.activeSemesterName.set(current.name);
      }
    }, { allowSignalWrites: true });

    // When the user logs in, load semesters
    effect(() => {
      if (this.authService.isLoggedIn()) {
        this.loadSemesters();
      }
    }, { allowSignalWrites: true });
  }

  ngOnInit() {
    if (this.authService.isLoggedIn()) {
      this.loadSemesters();
    }
    const savedTheme = localStorage.getItem('theme') || 'indigo';
    this.changeTheme(savedTheme);
    const savedBg = localStorage.getItem('bg-theme') || 'black';
    this.changeBg(savedBg);
    const savedSidebar = localStorage.getItem('sidebar-collapsed') === 'true';
    this.isSidebarCollapsed.set(savedSidebar);
    this.centerName.set(localStorage.getItem('center-name') || 'QLStudy');
    this.centerLogoIcon.set(localStorage.getItem('center-logo-icon') || 'auto_stories');
    this.centerLogoImage.set(localStorage.getItem('center-logo-image') || '');
  }

  changeTheme(themeName: string) {
    this.activeTheme = themeName;
    document.documentElement.setAttribute('data-theme', themeName);
    localStorage.setItem('theme', themeName);
  }

  changeBg(bgName: string) {
    this.activeBg = bgName;
    document.documentElement.setAttribute('data-bg', bgName);
    localStorage.setItem('bg-theme', bgName);
  }

  toggleSidebar() {
    const newState = !this.isSidebarCollapsed();
    this.isSidebarCollapsed.set(newState);
    localStorage.setItem('sidebar-collapsed', String(newState));
  }

  toggleSettingsDropdown() {
    this.showSettingsDropdown.set(!this.showSettingsDropdown());
  }

  updateCenterName(value: string) {
    const name = (value || '').trimStart();
    this.centerName.set(name || 'QLStudy');
    localStorage.setItem('center-name', name || 'QLStudy');
  }

  updateCenterLogoIcon(icon: string) {
    this.centerLogoIcon.set(icon);
    this.centerLogoImage.set('');
    localStorage.setItem('center-logo-icon', icon);
    localStorage.removeItem('center-logo-image');
  }

  onLogoFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      this.showToast('Vui lòng chọn file ảnh logo.', 'danger');
      input.value = '';
      return;
    }

    const maxSizeBytes = 512 * 1024;
    if (file.size > maxSizeBytes) {
      this.showToast('Logo nên nhỏ hơn 512KB để tải nhanh.', 'danger');
      input.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      this.centerLogoImage.set(dataUrl);
      localStorage.setItem('center-logo-image', dataUrl);
      input.value = '';
    };
    reader.readAsDataURL(file);
  }

  clearLogoImage() {
    this.centerLogoImage.set('');
    localStorage.removeItem('center-logo-image');
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    this.showSettingsDropdown.set(false);
  }

  loadSemesters() {
    this.apiService.getSemesters().subscribe({
      next: (data) => {
        this.semesters.set(data);
        if (data.length > 0) {
          // Select the active one or the first one
          const active = data.find(s => s.isActive) || data[0];
          this.apiService.selectedSemesterId.set(active.id);
        }
      },
      error: (err) => {
        this.showToast('Không thể kết nối tới máy chủ Backend.', 'danger');
        console.error(err);
      }
    });
  }

  onSemesterChange(event: Event) {
    const select = event.target as HTMLSelectElement;
    const value = parseInt(select.value, 10);
    this.apiService.selectedSemesterId.set(value);
    this.showToast(`Đã chuyển sang: ${this.apiService.activeSemesterName()}`, 'success');
  }

  showToast(message: string, type: 'success' | 'danger' = 'success') {
    const id = ++this.toastIdCounter;
    const newToast: Toast = { id, message, type };
    this.toasts.update(current => [...current, newToast]);

    // Auto-remove after 4 seconds
    setTimeout(() => {
      this.toasts.update(current => current.filter(t => t.id !== id));
    }, 4000);
  }
}

import { Component, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { BulkImportService, BulkImportResult } from '../../../data/services/bulk-import.service';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-bulk-upload',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bulk-upload.component.html',
})
export class BulkUploadComponent {
  activeTab: 'students' | 'teachers' = 'students';
  selectedFile: File | null = null;
  uploading = false;
  result: BulkImportResult | null = null;
  error = '';

  private cdr = inject(ChangeDetectorRef);
  private tenantId: string;

  constructor(
    private bulkImportService: BulkImportService,
    private authService: AuthService,
    private router: Router,
  ) {
    const user = this.authService.currentUser$;
    this.tenantId = '';
    this.authService.currentUser$.subscribe(u => {
      if (u) this.tenantId = u.tenantId;
    });
  }

  switchTab(tab: 'students' | 'teachers'): void {
    this.activeTab = tab;
    this.reset();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files?.length) {
      this.selectedFile = input.files[0];
      this.error = '';
      this.result = null;
    }
  }

  upload(): void {
    if (!this.selectedFile || !this.tenantId) return;
    this.uploading = true;
    this.error = '';
    this.result = null;

    const obs = this.activeTab === 'students'
      ? this.bulkImportService.importStudents(this.selectedFile, this.tenantId)
      : this.bulkImportService.importTeachers(this.selectedFile, this.tenantId);

    obs.subscribe({
      next: (res) => {
        this.result = res;
        this.uploading = false;
        this.cdr.detectChanges();
        // Navigate to Classes page after short delay so user sees success
        setTimeout(() => this.router.navigate(['/admin/classes']), 1500);
      },
      error: (err) => {
        this.error = err.error?.message || 'Upload failed. Check your file format and try again.';
        this.uploading = false;
        this.cdr.detectChanges();
      },
    });
  }

  reset(): void {
    this.selectedFile = null;
    this.result = null;
    this.error = '';
    this.uploading = false;
  }

  get studentColumns(): string[] {
    return ['first_name', 'last_name', 'dob', 'gender', 'class_name', 'section_name',
            'father_name', 'father_email', 'father_phone', 'mother_name', 'mother_email', 'mother_phone'];
  }

  get teacherColumns(): string[] {
    return ['name', 'email', 'phone', 'qualification', 'experience'];
  }
}

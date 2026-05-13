import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivityService, TeacherAssignment } from '../../../data/services/activity.service';
import { PlannerService, ClassPlanner } from '../../../data/services/planner.service';
import { AuthService } from '../../../core/services/auth.service';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

@Component({
  selector: 'app-planner-upload',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './planner-upload.component.html',
})
export class PlannerUploadComponent implements OnInit {
  readonly months = MONTHS;
  readonly currentYear = new Date().getFullYear();
  readonly years = [this.currentYear - 1, this.currentYear, this.currentYear + 1];

  assignments: TeacherAssignment[] = [];
  loadingAssignments = true;

  selectedClassId = '';
  selectedMonth = MONTHS[new Date().getMonth()]; // current month
  selectedYear = this.currentYear;
  selectedFile: File | null = null;
  fileError = '';

  uploading = false;
  successMessage = '';
  errorMessage = '';

  /** Existing planner for the selected class/month/year, if any. */
  existingPlanner: ClassPlanner | null = null;
  checkingExisting = false;

  private userId = '';

  constructor(
    private readonly activityService: ActivityService,
    private readonly plannerService: PlannerService,
    private readonly authService: AuthService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const user = this.authService['currentUserSubject'].value;
    if (user) this.userId = user.userId;

    this.activityService.getClassesByTeacher(this.userId).subscribe({
      next: (a) => {
        this.assignments = a;
        this.loadingAssignments = false;
        if (a.length === 1) {
          this.selectedClassId = a[0].class_id;
          this.checkExisting();
        }
        this.cdr.detectChanges();
      },
      error: () => {
        this.loadingAssignments = false;
        this.cdr.detectChanges();
      },
    });
  }

  get selectedAssignment(): TeacherAssignment | undefined {
    return this.assignments.find(a => a.class_id === this.selectedClassId);
  }

  get classLabel(): string {
    const a = this.selectedAssignment;
    if (!a) return '';
    const cls = a.assignedClass?.name ?? '';
    const sec = a.section?.name ? ` — ${a.section.name}` : '';
    return `${cls}${sec}`;
  }

  onClassChange(): void {
    this.existingPlanner = null;
    this.checkExisting();
  }

  onMonthYearChange(): void {
    this.existingPlanner = null;
    this.checkExisting();
  }

  private checkExisting(): void {
    if (!this.selectedClassId || !this.selectedMonth || !this.selectedYear) return;
    this.checkingExisting = true;
    this.plannerService.getForClass(this.selectedClassId, this.selectedMonth, this.selectedYear).subscribe({
      next: (p) => {
        this.existingPlanner = p;
        this.checkingExisting = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.checkingExisting = false;
        this.cdr.detectChanges();
      },
    });
  }

  onFileChange(event: Event): void {
    this.fileError = '';
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    if (!file) { this.selectedFile = null; return; }

    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      this.fileError = 'Only PDF and image files are accepted.';
      this.selectedFile = null;
      input.value = '';
      return;
    }
    if (file.type === 'application/pdf' && file.size > 5 * 1024 * 1024) {
      this.fileError = 'PDF must be under 5 MB.';
      this.selectedFile = null;
      input.value = '';
      return;
    }
    this.selectedFile = file;
  }

  async submit(): Promise<void> {
    if (!this.selectedClassId || !this.selectedFile || !this.selectedMonth || !this.selectedYear) return;
    this.uploading = true;
    this.successMessage = '';
    this.errorMessage = '';
    this.cdr.detectChanges();

    let fileToUpload = this.selectedFile;

    // Compress images to ≤ 500 KB before upload
    if (this.selectedFile.type.startsWith('image/')) {
      try {
        const { default: imageCompression } = await import('browser-image-compression');
        fileToUpload = await imageCompression(this.selectedFile, {
          maxSizeMB: 0.5,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
          initialQuality: 0.8,
        });
      } catch {
        // fall back to original if compression fails
      }
    }

    const assignment = this.selectedAssignment;
    const sectionId = assignment?.section_id ?? null;

    this.plannerService.upload(
      this.selectedClassId,
      sectionId,
      this.selectedMonth,
      this.selectedYear,
      fileToUpload,
    ).subscribe({
      next: (planner) => {
        this.existingPlanner = planner;
        this.selectedFile = null;
        this.uploading = false;
        this.successMessage = `Planner for ${this.selectedMonth} has been shared with your class parents. ✅`;
        this.cdr.detectChanges();
      },
      error: () => {
        this.uploading = false;
        this.errorMessage = 'Upload failed. Please try again.';
        this.cdr.detectChanges();
      },
    });
  }

  deleteExisting(): void {
    if (!this.existingPlanner) return;
    this.plannerService.delete(this.existingPlanner.id).subscribe({
      next: () => {
        this.existingPlanner = null;
        this.cdr.detectChanges();
      },
    });
  }
}

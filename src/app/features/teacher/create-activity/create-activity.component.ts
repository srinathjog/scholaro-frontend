import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  ActivityService,
  CreateActivityDto,
  TeacherAssignment,
} from '../../../data/services/activity.service';
import { UploadService } from '../../../core/services/upload.service';
import { AuthService } from '../../../core/services/auth.service';
import { AttendanceService } from '../../../data/services/attendance.service';
import { Router, ActivatedRoute } from '@angular/router';
import { StudentService } from '../../../data/services/student.service';

@Component({
  selector: 'app-create-activity',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-activity.component.html',
})
export class CreateActivityComponent implements OnInit {
  audienceType: 'class' | 'student' = 'class';
  students: any[] = [];
  form!: FormGroup;
  assignments: TeacherAssignment[] = [];
  selectedFiles: File[] = [];
  previews: string[] = [];
  loadingPreviews = 0;
  submitting = false;
  uploading = false;
  compressing = false;
  attendanceMissing = false;
  compressionProgress = 0;
  uploadProgress = 0;
  successMessage = '';
  errorMessage = '';

  activityTypes = [
    { value: 'moment', label: 'Classroom Moment 📸' },
    { value: 'notice', label: 'School Notice 📢' },
    { value: 'curriculum', label: 'Learning Update 📖' },
  ];

  isEditMode = false;
  activityId: string | null = null;
  isDataLoading = false;

  constructor(
    private fb: FormBuilder,
    private activityService: ActivityService,
    private uploadService: UploadService,
    private authService: AuthService,
    private attendanceService: AttendanceService,
    private studentService: StudentService,
    public router: Router,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      class_id: ['', Validators.required],
      activity_type: ['moment'],
      title: ['', [Validators.required, Validators.maxLength(255)]],
      description: [''],
      student_id: [''],
    });

    this.form.get('class_id')?.valueChanges.subscribe(() => {
      this.onClassChange();
    });

    this.route.paramMap.subscribe(params => {
      const id = params.get('activityId') || params.get('id');
      if (id) {
        this.isEditMode = true;
        this.activityId = id;
        this.isDataLoading = true;
        this.activityService.getActivityById(id).subscribe(act => {
          this.form.patchValue({
            class_id: act.class_id,
            activity_type: act.activity_type,
            title: act.title,
            description: act.description || '',
          });
          this.previews = act.media.map(m => m.media_url);
          this.selectedFiles = [];
          this.isDataLoading = false;
          this.cdr.detectChanges();
        });
      }
    });

    const user = this.authService['currentUserSubject'].value;
    if (user) {
      this.activityService.getClassesByTeacher(user.userId).subscribe({
        next: (data) => {
          this.assignments = data;
          // Auto-select and auto-load if teacher has exactly one class
          if (data.length === 1) {
            // emitEvent:false prevents double-call from valueChanges
            this.form.get('class_id')?.setValue(data[0].class_id, { emitEvent: false });
            this.onClassChange(); // explicitly trigger student fetch
          }
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Could not load your classes.';
          this.cdr.detectChanges();
        },
      });
    }
  }

  get isClassSelected(): boolean {
    return !!this.form.get('class_id')?.value;
  }

  onClassChange(): void {
    const classId = this.form.value.class_id;

    // Always reset previously selected student when class changes
    this.students = [];
    this.form.get('student_id')?.setValue('', { emitEvent: false });
    this.attendanceMissing = false;

    if (!classId) return;

    this.studentService.getStudentsByClass(classId).subscribe({
      next: (students) => {
        this.students = students;
        this.cdr.detectChanges();
      },
      error: () => {
        this.students = [];
        this.cdr.detectChanges();
      },
    });

    this.attendanceService.isAttendanceMarked(classId).subscribe({
      next: (marked) => {
        this.attendanceMissing = !marked;
        this.cdr.detectChanges();
      },
      error: () => {
        // Don't block posting if the check fails
        this.attendanceMissing = false;
        this.cdr.detectChanges();
      },
    });
  }

  async onFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const rawFiles = Array.from(input.files);
    input.value = '';

    this.compressing = true;
    this.compressionProgress = 0;
    this.cdr.detectChanges();

    const { default: imageCompression } = await import('browser-image-compression');

    const options = {
      maxSizeMB: 0.3,          // Target ~300KB per image
      maxWidthOrHeight: 1280,   // Max dimension
      useWebWorker: true,
      initialQuality: 0.7,
    };

    let processed = 0;
    for (const file of rawFiles) {
      try {
        const compressed = await imageCompression(file, options);
        this.selectedFiles.push(compressed);

        // Generate preview from compressed file
        const url = URL.createObjectURL(compressed);
        this.previews.push(url);
      } catch {
        // If compression fails, use original
        this.selectedFiles.push(file);
        const url = URL.createObjectURL(file);
        this.previews.push(url);
      }
      processed++;
      this.compressionProgress = Math.round((processed / rawFiles.length) * 100);
      this.cdr.detectChanges();
    }

    this.compressing = false;
    this.cdr.detectChanges();
  }

  removeImage(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.previews.splice(index, 1);
  }

  get overflowCount(): number {
    return Math.max(0, this.previews.length - 4);
  }

  get visiblePreviews(): string[] {
    return this.previews.slice(0, 4);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;

    this.submitting = true;
    this.uploading = false;
    this.successMessage = '';
    this.errorMessage = '';

    try {
      // ── Step 1: Compress + Upload images ──────────────────────────────────
      let mediaUrls: string[] = [];
      if (this.selectedFiles.length) {
        this.uploading = true;
        this.uploadProgress = 0;
        this.cdr.detectChanges();
        mediaUrls = await this.uploadService.uploadImages(
          this.selectedFiles,
          (pct) => { this.uploadProgress = pct; this.cdr.detectChanges(); },
        );
        this.uploading = false;
        this.cdr.detectChanges();
      }

      // ── Step 2: Edit mode ─────────────────────────────────────────────────
      if (this.isEditMode && this.activityId) {
        const patch: any = {
          class_id: this.form.value.class_id,
          title: this.form.value.title,
          description: this.form.value.description || undefined,
          activity_type: this.form.value.activity_type || 'moment',
        };
        if (mediaUrls.length) patch.media_urls = mediaUrls;

        await this.activityService.updateActivity(this.activityId, patch).toPromise();
        this.successMessage = 'Post updated ✓';
        this.cdr.detectChanges();
        setTimeout(() => this.router.navigate(['/teacher/history']), 1200);
        return;
      }

      // ── Step 3: Build payload ─────────────────────────────────────────────
      const payload: CreateActivityDto = {
        class_id: this.form.value.class_id,
        title: this.form.value.title,
        description: this.form.value.description || undefined,
        activity_type: this.form.value.activity_type || 'moment',
        media_urls: mediaUrls,          // ← always passes upload result here
      };
      // Include student_id if posting to a specific student
      if (this.audienceType === 'student' && this.form.value.student_id) {
        (payload as any).student_id = this.form.value.student_id;
      }

      // ── Step 4: POST to backend ───────────────────────────────────────────
      await this.activityService.postActivity(payload).toPromise();

      this.successMessage = 'Post Shared with Parents ✓';
      this.form.reset();
      this.selectedFiles = [];
      this.previews = [];
      this.students = [];
      this.audienceType = 'class';
      this.cdr.detectChanges();
      setTimeout(() => this.router.navigate(['/teacher/history']), 1500);

    } catch (err: any) {
      // ── Any failure in the chain lands here ──────────────────────────────
      this.errorMessage = err?.error?.message || err?.message || 'Something went wrong. Please try again.';
      this.cdr.detectChanges();
    } finally {
      // ── Loader always stops, no matter what ──────────────────────────────
      this.submitting = false;
      this.uploading = false;
      this.cdr.detectChanges();
    }
  }
}

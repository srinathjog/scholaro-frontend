import { Component, OnInit, ChangeDetectorRef, HostListener, ViewChild, ElementRef } from '@angular/core';
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
  /** Max total media files (images + videos) allowed per post. */
  readonly MAX_MEDIA = 40;

  audienceType: 'class' | 'student' = 'class';
  showStudentList = false;
  students: any[] = [];

  @ViewChild('studentDropdownEl') studentDropdownEl?: ElementRef;

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (
      this.showStudentList &&
      this.studentDropdownEl &&
      !this.studentDropdownEl.nativeElement.contains(event.target as Node)
    ) {
      this.showStudentList = false;
    }
  }
  /** UUIDs of the students currently checked in the multi-select list. */
  selectedStudentIds: string[] = [];
  form!: FormGroup;
  assignments: TeacherAssignment[] = [];
  selectedFiles: File[] = [];
  previews: string[] = [];
  loadingPreviews = 0;
  submitting = false;
  uploading = false;
  compressing = false;
  compressionCurrent = 0;   // which photo is being compressed right now (1-based)
  compressionTotal = 0;    // total photos in this batch
  attendanceMissing = false;
  compressionProgress = 0;
  uploadProgress = 0;
  uploadCurrent = 0;   // which file is being uploaded right now (1-based)
  uploadTotal = 0;     // total files to upload in this submission
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
  /** ISO date string (YYYY-MM-DD) of the activity being edited; null for new posts. */
  private activityDate: string | null = null;

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
          // Store the original post date so we can skip the today-only attendance check
          this.activityDate = act.created_at ? act.created_at.slice(0, 10) : null;
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

  /** Toggle a student in/out of the selectedStudentIds array and close the dropdown. */
  toggleStudent(studentId: string): void {
    const idx = this.selectedStudentIds.indexOf(studentId);
    if (idx >= 0) {
      this.selectedStudentIds.splice(idx, 1);
    } else {
      this.selectedStudentIds.push(studentId);
    }
    this.showStudentList = false;
  }

  isStudentSelected(studentId: string): boolean {
    return this.selectedStudentIds.includes(studentId);
  }

  onClassChange(): void {
    const classId = this.form.value.class_id;

    // Always reset previously selected student when class changes
    this.students = [];
    this.selectedStudentIds = [];
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

    // Only check attendance for posts being made today.
    // Retrospective edits (activityDate !== today) should never be blocked.
    const todayStr = new Date().toISOString().slice(0, 10);
    const isPostForToday = !this.isEditMode || this.activityDate === todayStr;
    if (!isPostForToday) {
      this.attendanceMissing = false;
      this.cdr.detectChanges();
    } else {
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
  }

  async onFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const rawFiles = Array.from(input.files);
    input.value = '';

    // ── Hard limit: max MAX_MEDIA files total ─────────────────────────────
    const slotsRemaining = this.MAX_MEDIA - this.selectedFiles.length;
    if (slotsRemaining <= 0) {
      this.errorMessage = `⚠️ You can upload up to 40 photos for this classroom moment.`;
      this.cdr.detectChanges();
      return;
    }
    // Only allow image files (video uploads disabled)
    const imageFiles = rawFiles.filter(f => f.type.startsWith('image/'));
    let filesToProcess = imageFiles;
    if (imageFiles.length > slotsRemaining) {
      filesToProcess = imageFiles.slice(0, slotsRemaining);
      this.errorMessage = `⚠️ Only the first ${slotsRemaining} photo${slotsRemaining !== 1 ? 's' : ''} were added (40-photo limit per post).`;
    } else {
      this.errorMessage = '';
    }

    if (!filesToProcess.length) {
      this.cdr.detectChanges();
      return;
    }

    // Store raw files immediately — compression happens one-by-one at submit time
    for (const file of filesToProcess) {
      this.selectedFiles.push(file);
      this.previews.push(URL.createObjectURL(file));
    }
    this.cdr.detectChanges();
  }

  removeMedia(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.previews.splice(index, 1);
  }

  /** @deprecated use removeMedia */
  removeImage(index: number): void { this.removeMedia(index); }

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
      // ── Step 1: Sequential queue — compress then upload each photo one-by-one ─
      const mediaUrls: string[] = [];
      const mediaTypes: string[] = [];
      if (this.selectedFiles.length) {
        this.uploading = true;
        this.uploadCurrent = 0;
        this.uploadTotal = this.selectedFiles.length;
        this.uploadProgress = 0;
        this.cdr.detectChanges();

        const { default: imageCompression } = await import('browser-image-compression');
        const compressionOptions = {
          maxSizeMB: 0.3,
          maxWidthOrHeight: 1080,
          useWebWorker: true,
          initialQuality: 0.7,
        };

        for (let i = 0; i < this.selectedFiles.length; i++) {
          this.uploadCurrent = i + 1;
          // Overall progress: each file is worth (100 / total)% of the bar.
          // Start each file at the % already completed by previous files.
          const baseProgress = Math.round((i / this.selectedFiles.length) * 100);
          const fileShare = 100 / this.selectedFiles.length;
          this.uploadProgress = baseProgress;
          this.cdr.detectChanges();

          // Compress first, then upload — keeps memory low (one file at a time)
          let fileToUpload = this.selectedFiles[i];
          if (fileToUpload.type.startsWith('image/')) {
            try {
              fileToUpload = await imageCompression(fileToUpload, compressionOptions);
            } catch {
              // compression failed — upload original
            }
          }

          let result: { url: string; media_type: string };
          try {
            result = await this.uploadService.uploadSingleFile(
              fileToUpload,
              (pct) => {
                // Map per-file XHR progress (0–100) into this file's slice of the bar
                this.uploadProgress = Math.round(baseProgress + (pct / 100) * fileShare);
                this.cdr.detectChanges();
              },
            );
          } catch {
            throw new Error(`Upload failed at photo ${i + 1} of ${this.selectedFiles.length}. Please check your connection and try again.`);
          }
          // Ensure bar reaches the end of this file's slice on completion
          this.uploadProgress = Math.round(((i + 1) / this.selectedFiles.length) * 100);
          this.cdr.detectChanges();
          mediaUrls.push(result.url);
          mediaTypes.push(result.media_type);
        }

        this.uploading = false;
        this.cdr.detectChanges();

        // Guard: all files must have uploaded successfully before calling backend
        if (mediaUrls.length !== this.selectedFiles.length) {
          throw new Error(`Upload incomplete: only ${mediaUrls.length} of ${this.selectedFiles.length} photos were uploaded. Please try again.`);
        }
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
        media_urls: mediaUrls,
        media_types: mediaTypes,
      };
      // Include student_ids if posting to specific students
      if (this.audienceType === 'student' && this.selectedStudentIds.length > 0) {
        payload.student_ids = [...this.selectedStudentIds];
      }

      // ── Step 4: POST to backend ───────────────────────────────────────────
      await this.activityService.postActivity(payload).toPromise();

      this.successMessage = 'Post Shared with Parents ✓';
      this.form.reset();
      this.selectedFiles = [];
      this.previews = [];
      this.students = [];
      this.selectedStudentIds = [];
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

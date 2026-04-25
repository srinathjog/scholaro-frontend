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
import { VideoCompressionService } from '../../../core/services/video-compression.service';
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
  readonly MAX_MEDIA = 20;

  audienceType: 'class' | 'student' = 'class';
  students: any[] = [];
  form!: FormGroup;
  assignments: TeacherAssignment[] = [];
  selectedFiles: File[] = [];
  previews: string[] = [];
  isVideoFile: boolean[] = [];   // parallel array: true if selectedFiles[i] is a video
  videoError = '';
  videoCompressing = false;
  videoCompressionProgress = 0;
  videoCompressionMessage = '';
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
    private videoCompressionService: VideoCompressionService,
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

  /** Validate a video file: max 20 MB and max 30 seconds duration. */
  private validateVideo(file: File): Promise<string | null> {
    return new Promise((resolve) => {
      const MAX_MB = 150;
      const MAX_SECONDS = 30;
      if (file.size > MAX_MB * 1024 * 1024) {
        resolve(`"${file.name}" is too large. Videos must be under ${MAX_MB} MB.`);
        return;
      }
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        if (video.duration > MAX_SECONDS) {
          resolve(`"${file.name}" is ${Math.round(video.duration)}s. Videos must be 30 seconds or less.`);
        } else {
          resolve(null);
        }
      };
      video.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
      video.src = url;
    });
  }

  async onFilesSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const rawFiles = Array.from(input.files);
    input.value = '';
    this.videoError = '';

    // ── Hard limit: max MAX_MEDIA files total ─────────────────────────────
    const slotsRemaining = this.MAX_MEDIA - this.selectedFiles.length;
    if (slotsRemaining <= 0) {
      this.errorMessage = `⚠️ You can upload a maximum of ${this.MAX_MEDIA} photos/videos per post for better quality.`;
      this.cdr.detectChanges();
      return;
    }
    let filesToProcess = rawFiles;
    if (rawFiles.length > slotsRemaining) {
      filesToProcess = rawFiles.slice(0, slotsRemaining);
      this.errorMessage = `⚠️ Only the first ${slotsRemaining} file${slotsRemaining !== 1 ? 's' : ''} were added (${this.MAX_MEDIA}-file limit per post).`;
    } else {
      this.errorMessage = '';
    }

    // Separate images and videos
    const imageFiles = filesToProcess.filter(f => f.type.startsWith('image/'));
    const videoFiles = filesToProcess.filter(f => f.type.startsWith('video/'));

    // Validate videos first
    for (const vf of videoFiles) {
      const err = await this.validateVideo(vf);
      if (err) {
        this.videoError = err;
        this.cdr.detectChanges();
        return;
      }
    }

    // Add videos directly (with optional compression for large files)
    for (const vf of videoFiles) {
      this.videoCompressing = true;
      this.videoCompressionProgress = 0;
      this.videoCompressionMessage = 'Loading compression engine…';
      this.cdr.detectChanges();

      const compressed = await this.videoCompressionService.compressVideo(
        vf,
        (message, pct) => {
          this.videoCompressionMessage = message;
          this.videoCompressionProgress = pct;
          this.cdr.detectChanges();
        },
      );

      this.videoCompressing = false;
      this.selectedFiles.push(compressed);
      this.isVideoFile.push(true);
      this.previews.push(URL.createObjectURL(compressed));
      this.cdr.detectChanges();
    }

    if (!imageFiles.length) {
      this.cdr.detectChanges();
      return;
    }

    // Compress images sequentially — one at a time to avoid RAM spikes
    this.compressing = true;
    this.compressionProgress = 0;
    this.compressionCurrent = 0;
    this.compressionTotal = imageFiles.length;
    this.cdr.detectChanges();

    const { default: imageCompression } = await import('browser-image-compression');

    const options = {
      maxSizeMB: 0.3,
      maxWidthOrHeight: 1280,
      useWebWorker: true,
      initialQuality: 0.7,
    };

    let processed = 0;
    for (const file of imageFiles) {
      this.compressionCurrent = processed + 1;
      this.cdr.detectChanges();
      try {
        const compressed = await imageCompression(file, options);
        this.selectedFiles.push(compressed);
        this.isVideoFile.push(false);
        this.previews.push(URL.createObjectURL(compressed));
      } catch {
        this.selectedFiles.push(file);
        this.isVideoFile.push(false);
        this.previews.push(URL.createObjectURL(file));
      }
      processed++;
      this.compressionProgress = Math.round((processed / imageFiles.length) * 100);
      this.cdr.detectChanges();
    }

    this.compressing = false;
    this.cdr.detectChanges();
  }

  removeMedia(index: number): void {
    this.selectedFiles.splice(index, 1);
    this.previews.splice(index, 1);
    this.isVideoFile.splice(index, 1);
    this.videoError = '';
  }

  /** @deprecated use removeMedia */
  removeImage(index: number): void { this.removeMedia(index); }

  get overflowCount(): number {
    return Math.max(0, this.previews.length - 4);
  }

  get visiblePreviews(): string[] {
    return this.previews.slice(0, 4);
  }

  /** True when at least one of the queued files is a video — used for upload UX messaging. */
  get isUploadingVideo(): boolean {
    return this.isVideoFile.some(v => v);
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) return;

    this.submitting = true;
    this.uploading = false;
    this.successMessage = '';
    this.errorMessage = '';

    try {
      // ── Step 1: Upload media sequentially — one file at a time ───────────────
      const mediaUrls: string[] = [];
      const mediaTypes: string[] = [];
      if (this.selectedFiles.length) {
        this.uploading = true;
        this.uploadCurrent = 0;
        this.uploadTotal = this.selectedFiles.length;
        this.uploadProgress = 0;
        this.cdr.detectChanges();

        for (let i = 0; i < this.selectedFiles.length; i++) {
          this.uploadCurrent = i + 1;
          this.uploadProgress = 0;
          this.cdr.detectChanges();

          const result = await this.uploadService.uploadSingleFile(
            this.selectedFiles[i],
            (pct) => { this.uploadProgress = pct; this.cdr.detectChanges(); },
          );
          mediaUrls.push(result.url);
          mediaTypes.push(result.media_type);
        }

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
        media_urls: mediaUrls,
        media_types: mediaTypes,
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
      this.isVideoFile = [];
      this.videoError = '';
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

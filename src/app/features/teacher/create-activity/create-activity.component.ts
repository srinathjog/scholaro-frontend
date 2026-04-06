import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import {
  ActivityService,
  CreateActivityDto,
  TeacherAssignment,
} from '../../../data/services/activity.service';
import { UploadService } from '../../../core/services/upload.service';
import { AuthService } from '../../../core/services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-create-activity',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-activity.component.html',
})
export class CreateActivityComponent implements OnInit {
  form!: FormGroup;
  assignments: TeacherAssignment[] = [];
  selectedFiles: File[] = [];
  previews: string[] = [];
  loadingPreviews = 0;
  submitting = false;
  uploading = false;
  successMessage = '';
  errorMessage = '';

  activityTypes = [
    { value: 'moment', label: 'Classroom Moment 📸' },
    { value: 'notice', label: 'School Notice 📢' },
    { value: 'curriculum', label: 'Learning Update 📖' },
  ];

  constructor(
    private fb: FormBuilder,
    private activityService: ActivityService,
    private uploadService: UploadService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      class_id: ['', Validators.required],
      activity_type: ['moment'],
      title: ['', [Validators.required, Validators.maxLength(255)]],
      description: [''],
    });

    const user = this.authService['currentUserSubject'].value;
    if (user) {
      this.activityService.getClassesByTeacher(user.userId).subscribe({
        next: (data) => (this.assignments = data),
        error: () => (this.errorMessage = 'Could not load your classes.'),
      });
    }
  }

  onFilesSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files) return;

    const newFiles = Array.from(input.files);
    this.selectedFiles.push(...newFiles);
    this.loadingPreviews += newFiles.length;

    for (const file of newFiles) {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previews.push(e.target?.result as string);
        this.loadingPreviews--;
      };
      reader.readAsDataURL(file);
    }

    input.value = '';
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
    this.successMessage = '';
    this.errorMessage = '';

    try {
      let mediaUrls: string[] = [];
      if (this.selectedFiles.length) {
        this.uploading = true;
        mediaUrls = await this.uploadService.uploadImages(this.selectedFiles);
        this.uploading = false;
      }

      const payload: CreateActivityDto = {
        class_id: this.form.value.class_id,
        title: this.form.value.title,
        description: this.form.value.description || undefined,
        activity_type: this.form.value.activity_type || 'moment',
        media_urls: mediaUrls,
      };

      this.activityService.postActivity(payload).subscribe({
        next: () => {
          this.successMessage = 'Post Shared with Parents ✓';
          this.form.reset();
          this.selectedFiles = [];
          this.previews = [];
          setTimeout(() => this.router.navigate(['/teacher/history']), 1500);
        },
        error: (err) => {
          this.errorMessage =
            err?.error?.message || 'Failed to post activity. Please try again.';
        },
        complete: () => (this.submitting = false),
      });
    } catch (err: any) {
      this.errorMessage = err.message || 'Image upload failed.';
      this.submitting = false;
      this.uploading = false;
    }
  }
}

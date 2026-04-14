import { Component, OnInit, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { todayLocal } from '../../../utils/date.util';
import {
  AttendanceService,
  AttendanceRecord,
} from '../../../data/services/attendance.service';
import {
  DailyLogService,
  EnrolledStudent,
} from '../../../data/services/daily-log.service';
import {
  ActivityService,
  TeacherAssignment,
} from '../../../data/services/activity.service';
import { AuthService } from '../../../core/services/auth.service';

const PICKUP_PERSONS = [
  { key: 'Mother', icon: '👩' },
  { key: 'Father', icon: '👨' },
  { key: 'Grandparent', icon: '👴' },
  { key: 'Authorized Driver', icon: '🚗' },
  { key: 'Other', icon: '👤' },
];

@Component({
  selector: 'app-pickup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pickup.component.html',
})
export class PickupComponent implements OnInit {
  @ViewChild('videoEl') videoRef!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasEl') canvasRef!: ElementRef<HTMLCanvasElement>;

  assignments: TeacherAssignment[] = [];
  students: EnrolledStudent[] = [];
  records: AttendanceRecord[] = [];

  selectedClassId = '';
  today = todayLocal();
  loading = false;
  successMessage = '';
  errorMessage = '';

  // Modal state
  modalOpen = false;
  modalStudent: EnrolledStudent | null = null;
  modalRecord: AttendanceRecord | null = null;
  pickupPerson = '';
  customPickupName = '';
  pickupPhoto: string | null = null;
  pickupNotes = '';
  confirming = false;
  cameraActive = false;
  cameraError = false;
  private mediaStream: MediaStream | null = null;

  pickupPersons = PICKUP_PERSONS;

  // Bulk checkout state
  selectedIds = new Set<string>();
  bulkLoading = false;
  searchQuery = '';

  todayFormatted = new Date().toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short',
  });

  constructor(
    private attendanceService: AttendanceService,
    private dailyLogService: DailyLogService,
    private activityService: ActivityService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    const user = this.authService['currentUserSubject'].value;
    if (!user) return;
    this.activityService.getClassesByTeacher(user.userId).subscribe({
      next: (assignments) => {
        this.assignments = assignments;
        if (assignments.length === 1) {
          this.selectedClassId = assignments[0].class_id;
          this.onClassChange();
        }
        this.cdr.detectChanges();
      },
    });
  }

  onClassChange(): void {
    if (!this.selectedClassId) return;
    this.loading = true;
    this.successMessage = '';
    this.errorMessage = '';

    forkJoin({
      students: this.dailyLogService.getStudentsByClass(this.selectedClassId),
      records: this.attendanceService.getAttendanceByClass(this.selectedClassId, this.today),
    }).subscribe({
      next: ({ students, records }) => {
        this.students = students;
        this.records = records;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.errorMessage = 'Failed to load class data.';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  /** Students who are checked in (present) but NOT yet checked out */
  get checkedInStudents(): EnrolledStudent[] {
    return this.students.filter((s) => {
      const rec = this.records.find((r) => r.enrollment_id === s.id);
      return rec && (rec.status === 'present' || rec.status === 'late') && !rec.check_out_time;
    });
  }

  /** Checked-in students filtered by search query */
  get filteredCheckedInStudents(): EnrolledStudent[] {
    if (!this.searchQuery.trim()) return this.checkedInStudents;
    const q = this.searchQuery.toLowerCase().trim();
    return this.checkedInStudents.filter((s) => {
      const name = `${s.student.first_name} ${s.student.last_name}`.toLowerCase();
      return name.includes(q);
    });
  }

  /** Students already checked out */
  get checkedOutStudents(): EnrolledStudent[] {
    return this.students.filter((s) => {
      const rec = this.records.find((r) => r.enrollment_id === s.id);
      return rec && rec.check_out_time;
    });
  }

  getRecord(enrollmentId: string): AttendanceRecord | undefined {
    return this.records.find((r) => r.enrollment_id === enrollmentId);
  }

  getInitials(student: EnrolledStudent): string {
    return (student.student.first_name?.[0] || '') + (student.student.last_name?.[0] || '');
  }

  getClassName(): string {
    const a = this.assignments.find((x) => x.class_id === this.selectedClassId);
    return a?.assignedClass?.name || 'Class';
  }

  // ─── MODAL ───

  openModal(student: EnrolledStudent): void {
    this.modalStudent = student;
    this.modalRecord = this.getRecord(student.id) || null;
    this.pickupPerson = '';
    this.customPickupName = '';
    this.pickupPhoto = null;
    this.pickupNotes = '';
    this.cameraActive = false;
    this.cameraError = false;
    this.confirming = false;
    this.modalOpen = true;
  }

  closeModal(): void {
    this.stopCamera();
    this.modalOpen = false;
    this.modalStudent = null;
    this.modalRecord = null;
  }

  selectPickupPerson(key: string): void {
    this.pickupPerson = key;
    if (key !== 'Other') this.customPickupName = '';
  }

  get resolvedPickupName(): string {
    return this.pickupPerson === 'Other' ? this.customPickupName : this.pickupPerson;
  }

  get canConfirm(): boolean {
    return !!this.resolvedPickupName && !this.confirming;
  }

  // ─── CAMERA ───

  async startCamera(): Promise<void> {
    this.cameraError = false;
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } },
      });
      this.cameraActive = true;
      this.cdr.detectChanges();
      // Wait for ViewChild to be available
      setTimeout(() => {
        if (this.videoRef?.nativeElement) {
          this.videoRef.nativeElement.srcObject = this.mediaStream;
          this.videoRef.nativeElement.play();
        }
      }, 100);
    } catch {
      this.cameraError = true;
      this.cdr.detectChanges();
    }
  }

  capturePhoto(): void {
    const video = this.videoRef?.nativeElement;
    const canvas = this.canvasRef?.nativeElement;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      this.pickupPhoto = canvas.toDataURL('image/jpeg', 0.7);
    }
    this.stopCamera();
  }

  retakePhoto(): void {
    this.pickupPhoto = null;
    this.startCamera();
  }

  private stopCamera(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    this.cameraActive = false;
  }

  // ─── CONFIRM HANDOVER ───

  confirmHandover(): void {
    if (!this.modalRecord || !this.resolvedPickupName || this.confirming) return;
    this.confirming = true;

    this.attendanceService
      .checkoutStudent(
        this.modalRecord.id,
        this.resolvedPickupName,
        this.pickupPhoto || undefined,
        this.pickupNotes || undefined,
      )
      .subscribe({
        next: (updated) => {
          // Update local record
          const idx = this.records.findIndex((r) => r.id === updated.id);
          if (idx >= 0) this.records[idx] = updated;

          const name = this.modalStudent?.student.first_name || 'Student';
          this.successMessage = `${name} picked up by ${this.resolvedPickupName} ✅`;
          setTimeout(() => { this.successMessage = ''; this.cdr.detectChanges(); }, 4000);

          this.confirming = false;
          this.closeModal();
          this.cdr.detectChanges();
        },
        error: () => {
          this.errorMessage = 'Handover failed. Please try again.';
          this.confirming = false;
          this.cdr.detectChanges();
        },
      });
  }

  // ─── BULK CHECKOUT ───

  toggleSelect(attendanceId: string): void {
    if (this.selectedIds.has(attendanceId)) {
      this.selectedIds.delete(attendanceId);
    } else {
      this.selectedIds.add(attendanceId);
    }
  }

  toggleSelectAll(): void {
    const eligible = this.checkedInStudents
      .map(s => this.getRecord(s.id))
      .filter((r): r is AttendanceRecord => !!r);

    if (this.selectedIds.size === eligible.length) {
      this.selectedIds.clear();
    } else {
      this.selectedIds.clear();
      eligible.forEach(r => this.selectedIds.add(r.id));
    }
  }

  get allSelected(): boolean {
    const eligible = this.checkedInStudents
      .map(s => this.getRecord(s.id))
      .filter(r => !!r);
    return eligible.length > 0 && this.selectedIds.size === eligible.length;
  }

  onBulkCheckout(): void {
    if (this.selectedIds.size === 0 || this.bulkLoading) return;
    this.bulkLoading = true;
    this.errorMessage = '';

    this.attendanceService.bulkCheckout(Array.from(this.selectedIds)).subscribe({
      next: (result) => {
        this.successMessage = `${result.checkedOut} student${result.checkedOut > 1 ? 's' : ''} handed over to parents! ✅`;
        this.selectedIds.clear();
        this.bulkLoading = false;
        this.onClassChange(); // refresh list
        setTimeout(() => { this.successMessage = ''; this.cdr.detectChanges(); }, 4000);
      },
      error: () => {
        this.errorMessage = 'Bulk checkout failed. Please try again.';
        this.bulkLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  /** Open secure photo modal for the single selected student */
  openModalForSelected(): void {
    if (this.selectedIds.size !== 1) return;
    const attendanceId = Array.from(this.selectedIds)[0];
    const record = this.records.find(r => r.id === attendanceId);
    if (!record) return;
    const student = this.students.find(s => s.id === record.enrollment_id);
    if (student) this.openModal(student);
  }
}

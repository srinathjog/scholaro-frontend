import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { StudentService, Student } from '../../../data/services/student.service';

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './students.component.html',
})
export class StudentsComponent implements OnInit {
  students: Student[] = [];
  loading = true;
  error = '';
  classFilter = '';
  showInactive = false;
  /** Tracks which student ID is currently being toggled (for loading state). */
  settingStatusId = '';

  private cdr = inject(ChangeDetectorRef);

  constructor(private studentService: StudentService) {}

  ngOnInit(): void {
    this.studentService.getAll().subscribe({
      next: (data) => {
        this.students = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to load students';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  get classNames(): string[] {
    const names = new Set(this.students.map(s => s.current_class).filter(Boolean) as string[]);
    return Array.from(names).sort();
  }

  get filteredStudents(): Student[] {
    return this.students.filter(s => {
      if (!this.showInactive && s.status === 'inactive') return false;
      if (this.classFilter && s.current_class !== this.classFilter) return false;
      return true;
    });
  }

  get inactiveCount(): number {
    return this.students.filter(s => s.status === 'inactive').length;
  }

  setStatus(student: Student, status: 'active' | 'inactive'): void {
    this.settingStatusId = student.id;
    this.studentService.setStatus(student.id, status).subscribe({
      next: (updated) => {
        const idx = this.students.findIndex(s => s.id === updated.id);
        if (idx >= 0) this.students[idx] = { ...this.students[idx], status: updated.status };
        this.settingStatusId = '';
        this.cdr.detectChanges();
      },
      error: () => {
        this.settingStatusId = '';
        this.cdr.detectChanges();
      },
    });
  }
}

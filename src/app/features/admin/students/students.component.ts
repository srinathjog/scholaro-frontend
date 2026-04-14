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
    if (!this.classFilter) return this.students;
    return this.students.filter(s => s.current_class === this.classFilter);
  }
}

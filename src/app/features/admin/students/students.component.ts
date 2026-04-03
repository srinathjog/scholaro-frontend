import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { StudentService, Student } from '../../../data/services/student.service';

@Component({
  selector: 'app-students',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './students.component.html',
})
export class StudentsComponent implements OnInit {
  students: Student[] = [];
  loading = true;
  error = '';

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
}

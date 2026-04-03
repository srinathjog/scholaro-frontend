import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AcademicService,
  SchoolClass,
  Section,
  AcademicYear,
  TeacherAssignment,
} from '../../../data/services/academic.service';
import { StaffService, StaffMember } from '../../../data/services/staff.service';
import { forkJoin } from 'rxjs';

@Component({
  selector: 'app-teacher-assignment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './teacher-assignment.component.html',
})
export class TeacherAssignmentComponent implements OnInit {
  // Data
  teachers: StaffMember[] = [];
  classes: SchoolClass[] = [];
  sections: Section[] = [];
  academicYears: AcademicYear[] = [];
  assignments: TeacherAssignment[] = [];

  // Form model
  selectedTeacherId = '';
  selectedClassId = '';
  selectedSectionId = '';
  selectedAcademicYearId = '';

  // UI state
  loading = true;
  saving = false;
  error = '';
  successMsg = '';

  private cdr = inject(ChangeDetectorRef);

  constructor(
    private academicService: AcademicService,
    private staffService: StaffService,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    forkJoin({
      staff: this.staffService.getAll(),
      classes: this.academicService.getClasses(),
      years: this.academicService.getAcademicYears(),
      assignments: this.academicService.getAssignments(),
    }).subscribe({
      next: ({ staff, classes, years, assignments }) => {
        this.teachers = staff.filter(s => s.roles?.includes('TEACHER'));
        this.classes = classes;
        this.academicYears = years;
        this.enrichAssignments(assignments);

        // Auto-select active academic year
        const active = years.find(y => y.is_active);
        if (active) this.selectedAcademicYearId = active.id;

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to load data';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  onClassChange(): void {
    this.selectedSectionId = '';
    this.sections = [];
    if (!this.selectedClassId) return;
    this.academicService.getSectionsByClass(this.selectedClassId).subscribe({
      next: (sections) => {
        this.sections = sections;
        this.cdr.detectChanges();
      },
    });
  }

  assign(): void {
    if (!this.selectedTeacherId || !this.selectedClassId || !this.selectedAcademicYearId) return;

    this.saving = true;
    this.error = '';
    this.successMsg = '';

    this.academicService.assignTeacher({
      teacher_id: this.selectedTeacherId,
      class_id: this.selectedClassId,
      section_id: this.selectedSectionId || undefined,
      academic_year_id: this.selectedAcademicYearId,
    }).subscribe({
      next: () => {
        this.successMsg = 'Teacher assigned successfully!';
        this.saving = false;
        this.selectedTeacherId = '';
        this.selectedClassId = '';
        this.selectedSectionId = '';
        this.sections = [];
        this.refreshAssignments();
        this.cdr.detectChanges();
        setTimeout(() => { this.successMsg = ''; this.cdr.detectChanges(); }, 3000);
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to assign teacher';
        this.saving = false;
        this.cdr.detectChanges();
      },
    });
  }

  deleteAssignment(id: string): void {
    this.academicService.deleteAssignment(id).subscribe({
      next: () => {
        this.refreshAssignments();
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to delete assignment';
        this.cdr.detectChanges();
      },
    });
  }

  get canAssign(): boolean {
    return !!(this.selectedTeacherId && this.selectedClassId && this.selectedAcademicYearId);
  }

  private refreshAssignments(): void {
    this.academicService.getAssignments().subscribe({
      next: (assignments) => {
        this.enrichAssignments(assignments);
        this.cdr.detectChanges();
      },
    });
  }

  private enrichAssignments(assignments: TeacherAssignment[]): void {
    const teacherMap = new Map(this.teachers.map(t => [t.id, t.name]));
    const yearMap = new Map(this.academicYears.map(y => [y.id, y.name]));
    this.assignments = assignments.map(a => ({
      ...a,
      teacherName: teacherMap.get(a.teacher_id) || a.teacher_id.substring(0, 8) + '…',
      academicYearName: yearMap.get(a.academic_year_id) || '—',
    }));
  }
}

import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AcademicService,
  AcademicYear,
} from '../../../data/services/academic.service';

@Component({
  selector: 'app-academic-year-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './academic-year-list.component.html',
})
export class AcademicYearListComponent implements OnInit {
  years: AcademicYear[] = [];

  // Form model
  showModal = false;
  formYear = '';
  formStartDate = '';
  formEndDate = '';
  formIsActive = false;

  // UI state
  loading = true;
  saving = false;
  error = '';
  successMsg = '';

  private cdr = inject(ChangeDetectorRef);

  constructor(private academicService: AcademicService) {}

  ngOnInit(): void {
    this.loadYears();
  }

  loadYears(): void {
    this.loading = true;
    this.academicService.getAcademicYears().subscribe({
      next: (years) => {
        this.years = years.sort((a, b) =>
          new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
        );
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Failed to load academic years';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  openAddModal(): void {
    this.formYear = '';
    this.formStartDate = '';
    this.formEndDate = '';
    this.formIsActive = this.years.length === 0; // auto-active if first year
    this.error = '';
    this.showModal = true;
    this.cdr.detectChanges();
  }

  closeModal(): void {
    this.showModal = false;
    this.cdr.detectChanges();
  }

  saveYear(): void {
    if (!this.formYear || !this.formStartDate || !this.formEndDate) return;

    if (new Date(this.formStartDate) >= new Date(this.formEndDate)) {
      this.error = 'Start date must be before end date';
      this.cdr.detectChanges();
      return;
    }

    this.saving = true;
    this.error = '';
    this.academicService.createAcademicYear({
      year: this.formYear,
      start_date: this.formStartDate,
      end_date: this.formEndDate,
      is_active: this.formIsActive,
    }).subscribe({
      next: () => {
        this.saving = false;
        this.showModal = false;
        this.successMsg = 'Academic year created!';
        this.loadYears();
        this.cdr.detectChanges();
        setTimeout(() => { this.successMsg = ''; this.cdr.detectChanges(); }, 3000);
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to create academic year';
        this.saving = false;
        this.cdr.detectChanges();
      },
    });
  }

  setActive(id: string): void {
    this.academicService.setActiveAcademicYear(id).subscribe({
      next: () => {
        this.successMsg = 'Active year updated!';
        this.loadYears();
        this.cdr.detectChanges();
        setTimeout(() => { this.successMsg = ''; this.cdr.detectChanges(); }, 3000);
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to set active year';
        this.cdr.detectChanges();
      },
    });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }
}

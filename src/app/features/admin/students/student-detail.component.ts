import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import {
  StudentService,
  StudentDetail,
  ParentInfo,
  ParentSearchResult,
} from '../../../data/services/student.service';

@Component({
  selector: 'app-student-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './student-detail.component.html',
})
export class StudentDetailComponent implements OnInit {
  student: StudentDetail | null = null;
  loading = true;
  error = '';

  // Add Parent Modal
  showAddParent = false;
  addParentMode: 'search' | 'create' = 'search';
  searchEmail = '';
  searchResults: ParentSearchResult[] = [];
  searching = false;

  // New parent form
  newParentName = '';
  newParentEmail = '';
  newParentPhone = '';
  newParentRelationship = 'father';

  // Link existing
  linkRelationship = 'father';

  saving = false;
  successMessage = '';

  // Custom fee
  savingFeeId = '';
  feeEdits: Record<string, string> = {};

  private cdr = inject(ChangeDetectorRef);
  private studentId = '';

  constructor(
    private studentService: StudentService,
    private route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    this.studentId = this.route.snapshot.paramMap.get('id') || '';
    this.loadStudent();
  }

  loadStudent(): void {
    this.loading = true;
    this.studentService.getDetail(this.studentId).subscribe({
      next: (data) => {
        this.student = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to load student details';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  openAddParent(): void {
    this.showAddParent = true;
    this.addParentMode = 'search';
    this.searchEmail = '';
    this.searchResults = [];
    this.resetNewParentForm();
    this.successMessage = '';
  }

  closeAddParent(): void {
    this.showAddParent = false;
  }

  searchParents(): void {
    if (this.searchEmail.length < 2) return;
    this.searching = true;
    this.studentService.searchParents(this.searchEmail).subscribe({
      next: (results) => {
        this.searchResults = results;
        this.searching = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.searchResults = [];
        this.searching = false;
        this.cdr.detectChanges();
      },
    });
  }

  linkExistingParent(parent: ParentSearchResult): void {
    this.saving = true;
    this.studentService
      .linkParent(this.studentId, parent.id, this.linkRelationship)
      .subscribe({
        next: () => {
          this.saving = false;
          this.showAddParent = false;
          this.loadStudent();
        },
        error: (err) => {
          this.error = err.error?.message || 'Failed to link parent';
          this.saving = false;
          this.cdr.detectChanges();
        },
      });
  }

  createParent(): void {
    if (!this.newParentName || !this.newParentEmail) return;
    this.saving = true;
    this.studentService
      .createAndLinkParent(this.studentId, {
        name: this.newParentName,
        email: this.newParentEmail,
        phone: this.newParentPhone || undefined,
        relationship: this.newParentRelationship,
      })
      .subscribe({
        next: () => {
          this.saving = false;
          this.showAddParent = false;
          this.successMessage = 'Parent created and linked successfully!';
          this.loadStudent();
        },
        error: (err) => {
          this.error = err.error?.message || 'Failed to create parent';
          this.saving = false;
          this.cdr.detectChanges();
        },
      });
  }

  private resetNewParentForm(): void {
    this.newParentName = '';
    this.newParentEmail = '';
    this.newParentPhone = '';
    this.newParentRelationship = 'father';
  }

  onFeeChange(enrollment: { id: string }, value: string): void {
    this.feeEdits[enrollment.id] = value;
  }

  saveCustomFee(enrollment: { id: string; custom_fee_amount: string | null }): void {
    const value = this.feeEdits[enrollment.id] ?? enrollment.custom_fee_amount;
    this.savingFeeId = enrollment.id;
    this.studentService
      .updateCustomFee(enrollment.id, value || null)
      .subscribe({
        next: () => {
          enrollment.custom_fee_amount = value || null;
          this.savingFeeId = '';
          this.successMessage = 'Custom fee updated!';
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.error = err.error?.message || 'Failed to update fee';
          this.savingFeeId = '';
          this.cdr.detectChanges();
        },
      });
  }
}

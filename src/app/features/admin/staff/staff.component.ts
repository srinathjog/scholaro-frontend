import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StaffService, StaffMember } from '../../../data/services/staff.service';

@Component({
  selector: 'app-staff',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './staff.component.html',
})
export class StaffComponent implements OnInit {
  staff: StaffMember[] = [];
  loading = true;
  error = '';

  /** The staff member pending confirmation for deletion. */
  confirmTarget: StaffMember | null = null;
  deletingId: string | null = null;

  private cdr = inject(ChangeDetectorRef);

  constructor(private staffService: StaffService) {}

  ngOnInit(): void {
    this.loadStaff();
  }

  loadStaff(): void {
    this.loading = true;
    this.error = '';
    this.staffService.getAll().subscribe({
      next: (data) => {
        this.staff = data;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to load staff';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  confirmDelete(member: StaffMember): void {
    this.confirmTarget = member;
  }

  cancelDelete(): void {
    this.confirmTarget = null;
  }

  doDelete(): void {
    if (!this.confirmTarget) return;
    const id = this.confirmTarget.id;
    this.deletingId = id;
    this.confirmTarget = null;
    this.staffService.remove(id).subscribe({
      next: () => {
        this.staff = this.staff.filter(m => m.id !== id);
        this.deletingId = null;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to remove staff member';
        this.deletingId = null;
        this.cdr.detectChanges();
      },
    });
  }
}

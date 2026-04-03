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

  private cdr = inject(ChangeDetectorRef);

  constructor(private staffService: StaffService) {}

  ngOnInit(): void {
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
}

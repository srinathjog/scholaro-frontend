import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../../../core/services/auth.service';
import { environment } from '../../../../../environments/environment';

interface ParentChild {
  id: string;
  name: string;
  relationship: string;
}

interface ParentItem {
  id: string;
  name: string;
  email: string;
  status: string;
  created_at: string;
  children: ParentChild[];
}

@Component({
  selector: 'app-parent-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './parent-list.html',
})
export class ParentList implements OnInit {
  parents: ParentItem[] = [];
  filteredParents: ParentItem[] = [];
  loading = true;
  error = '';
  searchQuery = '';
  resettingId: string | null = null;
  successMessage = '';

  // Create Parent modal
  showCreateModal = false;
  newParentName = '';
  newParentEmail = '';
  newParentPhone = '';
  creating = false;

  private cdr = inject(ChangeDetectorRef);
  private api = `${environment.apiUrl}/parents`;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.loadParents();
  }

  loadParents(): void {
    this.loading = true;
    this.error = '';
    this.http.get<ParentItem[]>(`${this.api}/admin/list`).subscribe({
      next: (data) => {
        this.parents = data;
        this.applyFilter();
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to load parents';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  applyFilter(): void {
    if (!this.searchQuery.trim()) {
      this.filteredParents = this.parents;
      return;
    }
    const q = this.searchQuery.toLowerCase();
    this.filteredParents = this.parents.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.children.some(c => c.name.toLowerCase().includes(q)),
    );
  }

  onSearch(): void {
    this.applyFilter();
    this.cdr.detectChanges();
  }

  resetPassword(parent: ParentItem): void {
    this.resettingId = parent.id;
    this.successMessage = '';
    this.http.post<{ message: string }>(`${this.api}/admin/${parent.id}/reset-password`, {}).subscribe({
      next: () => {
        this.resettingId = null;
        this.successMessage = `Password reset for ${parent.name} to Welcome@Scholaro2026`;
        this.cdr.detectChanges();
        setTimeout(() => {
          this.successMessage = '';
          this.cdr.detectChanges();
        }, 4000);
      },
      error: (err) => {
        this.resettingId = null;
        this.error = err.error?.message || 'Failed to reset password';
        this.cdr.detectChanges();
      },
    });
  }

  openCreateModal(): void {
    this.showCreateModal = true;
    this.newParentName = '';
    this.newParentEmail = '';
    this.newParentPhone = '';
    this.error = '';
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  createParent(): void {
    if (!this.newParentName || !this.newParentEmail) return;
    this.creating = true;
    this.http.post(`${this.api}/admin/create`, {
      name: this.newParentName,
      email: this.newParentEmail,
      phone: this.newParentPhone || undefined,
    }).subscribe({
      next: () => {
        this.creating = false;
        this.showCreateModal = false;
        this.successMessage = `Parent "${this.newParentName}" created with password Welcome@Scholaro2026`;
        this.loadParents();
        this.cdr.detectChanges();
        setTimeout(() => {
          this.successMessage = '';
          this.cdr.detectChanges();
        }, 4000);
      },
      error: (err) => {
        this.creating = false;
        this.error = err.error?.message || 'Failed to create parent';
        this.cdr.detectChanges();
      },
    });
  }
}

import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  SchoolDocumentsService,
  SchoolDocument,
} from '../../../data/services/school-documents.service';

@Component({
  selector: 'app-admin-documents',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="max-w-3xl mx-auto px-4 py-8">

      <!-- Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-extrabold text-gray-900">School Documents</h1>
        <p class="text-sm text-gray-500 mt-1">
          Upload PDFs or images (monthly planners, notices, timetables). Parents can view and download them.
        </p>
      </div>

      <!-- Upload card -->
      <div class="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-6">
        <h2 class="text-base font-bold text-gray-800 mb-4">Upload New Document</h2>

        <div class="space-y-4">
          <!-- Title -->
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">Document Title</label>
            <input [(ngModel)]="newTitle"
                   type="text"
                   maxlength="255"
                   placeholder="e.g. May 2024 Academic Planner"
                   class="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm
                          focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition" />
          </div>

          <!-- File picker -->
          <div>
            <label class="block text-xs font-semibold text-gray-600 mb-1">File (PDF or Image, max 20 MB)</label>
            <input #fileInput type="file" accept=".pdf,image/*" (change)="onFileSelected($event)"
                   class="w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-4
                          file:rounded-full file:border-0 file:text-xs file:font-semibold
                          file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer" />
            <p *ngIf="selectedFile" class="text-xs text-emerald-600 mt-1">
              ✓ {{ selectedFile.name }} ({{ (selectedFile.size / 1024 / 1024).toFixed(2) }} MB)
            </p>
          </div>

          <!-- Error -->
          <p *ngIf="uploadError" class="text-sm text-red-600 font-medium">{{ uploadError }}</p>

          <!-- Submit -->
          <button (click)="upload()"
                  [disabled]="uploading || !newTitle.trim() || !selectedFile"
                  class="px-6 py-2.5 rounded-full text-white font-semibold text-sm
                         bg-gradient-to-r from-indigo-600 to-purple-600
                         hover:from-indigo-700 hover:to-purple-700 transition-all
                         disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed
                         flex items-center gap-2">
            <svg *ngIf="uploading" class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
            </svg>
            {{ uploading ? 'Uploading…' : '⬆️ Upload Document' }}
          </button>
        </div>
      </div>

      <!-- Documents list -->
      <div>
        <h2 class="text-base font-bold text-gray-800 mb-3">Published Documents ({{ documents.length }})</h2>

        <div *ngIf="loading" class="text-sm text-gray-400 py-8 text-center">Loading…</div>

        <div *ngIf="!loading && documents.length === 0"
             class="bg-white rounded-2xl border border-dashed border-gray-200 p-10 text-center">
          <span class="text-4xl">📄</span>
          <p class="text-sm font-semibold text-gray-500 mt-3">No documents uploaded yet.</p>
        </div>

        <div *ngIf="!loading && documents.length > 0" class="space-y-3">
          <div *ngFor="let doc of documents"
               class="bg-white rounded-2xl border border-gray-200 shadow-sm px-5 py-4
                      flex items-center gap-4">

            <!-- Icon -->
            <div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-xl"
                 [class]="doc.file_type === 'pdf' ? 'bg-red-50' : 'bg-indigo-50'">
              {{ doc.file_type === 'pdf' ? '📕' : '🖼️' }}
            </div>

            <!-- Info -->
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-gray-900 text-sm truncate">{{ doc.title }}</p>
              <p class="text-xs text-gray-400 mt-0.5">
                {{ doc.file_type.toUpperCase() }} · Uploaded {{ doc.created_at | date:'d MMM y' }}
              </p>
            </div>

            <!-- Actions -->
            <div class="flex items-center gap-2 shrink-0">
              <a [href]="doc.file_url" target="_blank" rel="noopener noreferrer"
                 class="px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 text-xs font-semibold
                        hover:bg-indigo-100 transition-colors">
                View
              </a>
              <button (click)="delete(doc)"
                      class="px-3 py-1.5 rounded-lg bg-red-50 text-red-500 text-xs font-semibold
                             hover:bg-red-100 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>

    </div>
  `,
})
export class AdminDocumentsComponent implements OnInit {
  documents: SchoolDocument[] = [];
  loading = true;
  uploading = false;
  newTitle = '';
  selectedFile: File | null = null;
  uploadError = '';

  constructor(
    private readonly service: SchoolDocumentsService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadDocuments();
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.selectedFile = input.files?.[0] ?? null;
    this.uploadError = '';
    this.cdr.detectChanges();
  }

  upload(): void {
    if (!this.newTitle.trim() || !this.selectedFile) return;
    this.uploading = true;
    this.uploadError = '';
    this.service.uploadDocument(this.newTitle.trim(), this.selectedFile).subscribe({
      next: (doc) => {
        this.documents.unshift(doc);
        this.newTitle = '';
        this.selectedFile = null;
        this.uploading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.uploadError = err?.error?.message || 'Upload failed. Please try again.';
        this.uploading = false;
        this.cdr.detectChanges();
      },
    });
  }

  delete(doc: SchoolDocument): void {
    if (!confirm(`Delete "${doc.title}"? This cannot be undone.`)) return;
    this.service.deleteDocument(doc.id).subscribe({
      next: () => {
        this.documents = this.documents.filter((d) => d.id !== doc.id);
        this.cdr.detectChanges();
      },
      error: () => {
        this.cdr.detectChanges();
      },
    });
  }

  private loadDocuments(): void {
    this.service.getDocuments().subscribe({
      next: (docs) => {
        this.documents = docs;
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }
}

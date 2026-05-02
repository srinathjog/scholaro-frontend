import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcademicService, SchoolClass, Section, SectionCount, ClassCount } from '../../../data/services/academic.service';
import { StudentService } from '../../../data/services/student.service';
import { forkJoin } from 'rxjs';
import * as XLSX from 'xlsx';

interface ClassCard {
  cls: SchoolClass;
  sections: Section[];
  studentCounts: Map<string, number>;  // section_id → count (for per-section display)
  totalStudents: number;                // class-level total (includes no-section enrollments)
  expanded: boolean;
  addingSection: boolean;
  newSectionName: string;
}

@Component({
  selector: 'app-class-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './class-list.component.html',
})
export class ClassListComponent implements OnInit {
  cards: ClassCard[] = [];
  loading = true;
  error = '';
  /** Tracks which class ID is currently being exported (for loading state). */
  exportingClassId = '';
  /** The class card pending deletion (triggers confirmation modal). */
  deleteTarget: ClassCard | null = null;
  deleting = false;

  // ── Add Class ──────────────────────────────────────────────────────────
  showAddClass = false;
  newClassName = '';
  savingClass = false;
  addClassError = '';

  /** Title-case preview shown live as the user types, matching backend normalization. */
  get previewClassName(): string {
    return this.newClassName.trim().replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  }

  private cdr = inject(ChangeDetectorRef);

  constructor(
    private academicService: AcademicService,
    private studentService: StudentService,
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    forkJoin({
      classes: this.academicService.getClasses(),
      sectionCounts: this.academicService.getSectionStudentCounts(),
      classCounts: this.academicService.getClassStudentCounts(),
    }).subscribe({
      next: ({ classes, sectionCounts, classCounts }) => {
        const sectionCountMap = new Map<string, number>();
        sectionCounts.forEach(c => sectionCountMap.set(c.section_id, c.count));

        const classCountMap = new Map<string, number>();
        classCounts.forEach(c => classCountMap.set(c.class_id, c.count));

        this.cards = classes.map(cls => ({
          cls,
          sections: [],
          studentCounts: sectionCountMap,
          totalStudents: classCountMap.get(cls.id) ?? 0,
          expanded: true,
          addingSection: false,
          newSectionName: '',
        }));

        // Load sections for each class
        classes.forEach((cls, i) => {
          this.academicService.getSectionsByClass(cls.id).subscribe({
            next: (sections) => {
              this.cards[i].sections = sections;
              this.cdr.detectChanges();
            },
          });
        });

        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to load school structure';
        this.loading = false;
        this.cdr.detectChanges();
      },
    });
  }

  getStudentCount(card: ClassCard, sectionId: string): number {
    return card.studentCounts.get(sectionId) || 0;
  }

  getTotalStudents(card: ClassCard): number {
    // Use class-level count which includes students with no section
    return card.totalStudents;
  }

  toggleAddSection(card: ClassCard): void {
    card.addingSection = !card.addingSection;
    card.newSectionName = '';
  }

  saveSection(card: ClassCard): void {
    const name = card.newSectionName.trim();
    if (!name) return;

    this.academicService.createSection({ name, class_id: card.cls.id }).subscribe({
      next: (section) => {
        card.sections.push(section);
        card.addingSection = false;
        card.newSectionName = '';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to create section';
        this.cdr.detectChanges();
      },
    });
  }

  confirmDelete(card: ClassCard): void {
    this.deleteTarget = card;
    this.error = '';
  }

  cancelDelete(): void {
    this.deleteTarget = null;
  }

  executeDelete(): void {
    if (!this.deleteTarget) return;
    this.deleting = true;
    this.academicService.deleteClass(this.deleteTarget.cls.id).subscribe({
      next: () => {
        this.cards = this.cards.filter(c => c.cls.id !== this.deleteTarget!.cls.id);
        this.deleteTarget = null;
        this.deleting = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.error = err?.error?.message || 'Failed to delete class.';
        this.deleteTarget = null;
        this.deleting = false;
        this.cdr.detectChanges();
      },
    });
  }

  addClass(): void {
    const name = this.newClassName.trim();
    if (!name || this.savingClass) return;
    this.savingClass = true;
    this.addClassError = '';
    this.academicService.createClass({ name }).subscribe({
      next: (cls) => {
        this.cards.push({
          cls,
          sections: [],
          studentCounts: new Map(),
          totalStudents: 0,
          expanded: true,
          addingSection: false,
          newSectionName: '',
        });
        this.newClassName = '';
        this.showAddClass = false;
        this.savingClass = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.addClassError = err?.error?.message || 'Failed to create class. It may already exist.';
        this.savingClass = false;
        this.cdr.detectChanges();
      },
    });
  }

  exportClass(card: ClassCard): void {
    this.exportingClassId = card.cls.id;
    this.studentService.exportClassBioData(card.cls.id).subscribe({
      next: (rows) => {
        const sheetData = rows.map(r => ({
          'Name':          r.name,
          'Date of Birth': r.date_of_birth
            ? new Date(r.date_of_birth).toLocaleDateString('en-IN')
            : '',
          'Gender':        r.gender ?? '',
          'Academic Year': r.academic_year ?? '',
          'Class':         r.class_name ?? '',
          'Section':       r.section_name ?? '',
          'Status':        r.status ?? '',
          'Joining Year':  r.admission_date
            ? new Date(r.admission_date).getFullYear().toString()
            : '',
          'Joining Class': r.joining_class ?? '',
        }));

        const ws = XLSX.utils.json_to_sheet(sheetData);

        // Auto-size columns
        const colWidths = Object.keys(sheetData[0] ?? {}).map(key => ({
          wch: Math.max(key.length, ...sheetData.map(r => String((r as any)[key] ?? '').length))
        }));
        ws['!cols'] = colWidths;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, card.cls.name.slice(0, 31));
        XLSX.writeFile(wb, `biodata-${card.cls.name.replace(/\s+/g, '-').toLowerCase()}.xlsx`);

        this.exportingClassId = '';
        this.cdr.detectChanges();
      },
      error: () => {
        this.error = 'Export failed. Please try again.';
        this.exportingClassId = '';
        this.cdr.detectChanges();
      },
    });
  }
}

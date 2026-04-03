import { Component, OnInit, ChangeDetectorRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AcademicService, SchoolClass, Section, SectionCount } from '../../../data/services/academic.service';
import { forkJoin } from 'rxjs';

interface ClassCard {
  cls: SchoolClass;
  sections: Section[];
  studentCounts: Map<string, number>;
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

  private cdr = inject(ChangeDetectorRef);

  constructor(private academicService: AcademicService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    forkJoin({
      classes: this.academicService.getClasses(),
      counts: this.academicService.getSectionStudentCounts(),
    }).subscribe({
      next: ({ classes, counts }) => {
        const countMap = new Map<string, number>();
        counts.forEach(c => countMap.set(c.section_id, c.count));

        this.cards = classes.map(cls => ({
          cls,
          sections: [],
          studentCounts: countMap,
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
    return card.sections.reduce((sum, s) => sum + (card.studentCounts.get(s.id) || 0), 0);
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
}

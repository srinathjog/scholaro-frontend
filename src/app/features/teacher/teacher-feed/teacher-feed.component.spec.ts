import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TeacherFeedComponent } from './teacher-feed.component';

describe('TeacherFeedComponent', () => {
  let component: TeacherFeedComponent;
  let fixture: ComponentFixture<TeacherFeedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TeacherFeedComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(TeacherFeedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

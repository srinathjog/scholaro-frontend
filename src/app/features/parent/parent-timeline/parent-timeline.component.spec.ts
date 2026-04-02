import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ParentTimelineComponent } from './parent-timeline.component';

describe('ParentTimelineComponent', () => {
  let component: ParentTimelineComponent;
  let fixture: ComponentFixture<ParentTimelineComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParentTimelineComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(ParentTimelineComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ParentList } from './parent-list';

describe('ParentList', () => {
  let component: ParentList;
  let fixture: ComponentFixture<ParentList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParentList],
    }).compileComponents();

    fixture = TestBed.createComponent(ParentList);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

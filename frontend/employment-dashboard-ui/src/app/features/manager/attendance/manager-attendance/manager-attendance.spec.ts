import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManagerAttendance } from './manager-attendance.component';

describe('ManagerAttendance', () => {
  let component: ManagerAttendance;
  let fixture: ComponentFixture<ManagerAttendance>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManagerAttendance],
    }).compileComponents();

    fixture = TestBed.createComponent(ManagerAttendance);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

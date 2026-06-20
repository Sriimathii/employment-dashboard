import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationsView } from './notifications-view.component';

describe('NotificationsView', () => {
  let component: NotificationsView;
  let fixture: ComponentFixture<NotificationsView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationsView],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationsView);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

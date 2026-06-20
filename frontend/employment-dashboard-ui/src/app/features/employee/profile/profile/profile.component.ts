import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { EmployeeService } from '../../../../core/services/employee.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ProfileService } from '../../../../core/services/profile.service';
import { FormGroup } from '@angular/forms'; 

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatButtonModule, MatIconModule, MatDividerModule, MatSnackBarModule
  ],
  template: `
<div class="page-container">
  <h1 class="page-title">My Profile</h1>
 
  <div class="profile-layout">
    <!-- Profile Card -->
    <mat-card class="profile-card">
      <div class="profile-photo-area">
        <div class="avatar-large" *ngIf="!employee()?.profileImage">{{ initials() }}</div>
        <img *ngIf="employee()?.profileImage" [src]="employee()?.profileImage" class="avatar-img">
        <button mat-icon-button class="photo-upload-btn" (click)="photoInput.click()">
          <mat-icon>photo_camera</mat-icon>
        </button>
        <input #photoInput type="file" accept="image/*" hidden (change)="onPhotoChange($event)">
      </div>
      <h2>{{ employee()?.fullName }}</h2>
      <span class="role-chip">{{ employee()?.roleName }}</span>
      <mat-divider style="margin: 1rem 0"></mat-divider>
      <div class="profile-detail" *ngFor="let d of details()">
        <mat-icon>{{ d.icon }}</mat-icon>
        <div>
          <span class="detail-label">{{ d.label }}</span>
          <span class="detail-value">{{ d.value }}</span>
        </div>
      </div>
    </mat-card>
 
    <!-- Edit Form -->
    <div class="edit-area">
      <mat-card>
        <mat-card-header><mat-card-title>Edit Information</mat-card-title></mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" class="edit-form">
            <mat-form-field appearance="outline" class="full">
              <mat-label>Phone Number</mat-label>
              <mat-icon matPrefix>phone</mat-icon>
              <input matInput formControlName="phoneNumber">
            </mat-form-field>
            <mat-form-field appearance="outline" class="full">
              <mat-label>Address</mat-label>
              <textarea matInput formControlName="address" rows="3"></textarea>
            </mat-form-field>
            <button mat-raised-button color="primary" (click)="save()" [disabled]="saving()">
              <mat-icon>save</mat-icon> Save Changes
            </button>
          </form>
        </mat-card-content>
      </mat-card>
 
      <!-- Change Password -->
      <mat-card style="margin-top: 1rem">
        <mat-card-header><mat-card-title>Change Password</mat-card-title></mat-card-header>
        <mat-card-content>
          <form [formGroup]="pwdForm" class="edit-form">
            <mat-form-field appearance="outline" class="full">
              <mat-label>Current Password</mat-label>
              <input matInput type="password" formControlName="currentPassword">
            </mat-form-field>
            <mat-form-field appearance="outline" class="full">
              <mat-label>New Password</mat-label>
              <input matInput type="password" formControlName="newPassword">
            </mat-form-field>
            <button mat-raised-button color="accent" (click)="changePassword()" [disabled]="pwdForm.invalid">
              <mat-icon>lock_reset</mat-icon> Change Password
            </button>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  </div>
</div>`,
  styles: [`
    .page-container { padding: 1.5rem; }
    .page-title { font-size: 1.75rem; font-weight: 700; color: #1a237e; margin: 0 0 1.5rem; }
    :host-context([data-theme='dark']) .page-title { color: #82b1ff; }
    .profile-layout { display: grid; grid-template-columns: 300px 1fr; gap: 1.5rem; }
    .profile-card { border-radius: 12px !important; text-align: center; padding: 1.5rem; }
    .profile-photo-area { position: relative; display: inline-block; margin-bottom: 1rem; }
    .avatar-large {
      width: 100px; height: 100px; border-radius: 50%; background: #1a237e; color: white;
      display: flex; align-items: center; justify-content: center; font-size: 2rem; font-weight: 700;
    }
    .avatar-img { width: 100px; height: 100px; border-radius: 50%; object-fit: cover; }
    .photo-upload-btn { position: absolute; bottom: 0; right: 0; background: #1a237e !important; color: white !important; }
    .profile-card h2 { font-size: 1.25rem; font-weight: 700; margin: 0 0 0.5rem; }
    .role-chip { background: #e3f2fd; color: #1565c0; padding: 3px 12px; border-radius: 12px; font-size: 0.8rem; }
    .profile-detail { display: flex; align-items: flex-start; gap: 0.75rem; margin: 0.75rem 0; text-align: left; }
    .profile-detail mat-icon { color: #1565c0; margin-top: 2px; flex-shrink: 0; }
    .detail-label { display: block; font-size: 0.75rem; color: #888; }
    .detail-value { display: block; font-size: 0.9rem; font-weight: 500; }
    .edit-form { display: flex; flex-direction: column; gap: 0.75rem; margin-top: 1rem; }
    .full { width: 100%; }
    @media (max-width: 768px) { .profile-layout { grid-template-columns: 1fr; } }
  `]
})
export class ProfileComponent implements OnInit {

  employee = signal<any>(null);
  saving = signal(false);
  details = signal<any[]>([]);

  form!: FormGroup;
  pwdForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private empSvc: EmployeeService,
    private profileSvc: ProfileService,
    public auth: AuthService,
    private snack: MatSnackBar
  ) {}

  ngOnInit(): void {

    this.form = this.fb.group({
      phoneNumber: [''],
      address: ['']
    });

    this.pwdForm = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(8)]]
    });

    const empId = this.auth.currentUser()?.employeeId;

    if (!empId) {
      return;
    }

    this.empSvc.getById(empId).subscribe({
      next: (emp: any) => {

        this.employee.set(emp);

        this.form.patchValue({
          phoneNumber: emp.phoneNumber,
          address: emp.address
        });

        this.details.set([
          {
            icon: 'badge',
            label: 'Employee Code',
            value: emp.employeeCode
          },
          {
            icon: 'email',
            label: 'Email',
            value: emp.email
          },
          {
            icon: 'phone',
            label: 'Phone',
            value: emp.phoneNumber ?? '—'
          },
          {
            icon: 'business',
            label: 'Department',
            value: emp.departmentName ?? '—'
          },
          {
            icon: 'work',
            label: 'Role',
            value: emp.roleName ?? '—'
          },
          {
            icon: 'calendar_today',
            label: 'Joining Date',
            value: emp.joiningDate
          },
          {
            icon: 'circle',
            label: 'Status',
            value: emp.status
          }
        ]);
      },
      error: (err: any) => {
        console.error(err);
      }
    });
  }

  initials(): string {
    return (this.employee()?.fullName ?? '')
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  save(): void {
    this.saving.set(true);

    this.profileSvc.updateProfile(this.form.value).subscribe({
      next: () => {
        this.snack.open(
          'Profile updated!',
          'Close',
          { duration: 3000 }
        );
        this.saving.set(false);
      },
      error: (err: any) => {
        this.snack.open(
          err?.error?.message ?? 'Update failed',
          'Close',
          { duration: 3000 }
        );
        this.saving.set(false);
      }
    });
  }

  onPhotoChange(event: Event): void {

    const file = (event.target as HTMLInputElement).files?.[0];

    if (!file) {
      return;
    }

    const empId = this.auth.currentUser()?.employeeId;

    if (!empId) {
      return;
    }

    this.empSvc.uploadPhoto(empId, file).subscribe({
      next: (r: any) => {

        this.employee.update((e: any) => ({
          ...e,
          profileImage: r.url
        }));

        this.snack.open(
          'Photo updated!',
          'Close',
          { duration: 3000 }
        );
      },
      error: (err: any) => {
        this.snack.open(
          err?.error?.message ?? 'Upload failed',
          'Close',
          { duration: 3000 }
        );
      }
    });
  }

  changePassword(): void {

    if (this.pwdForm.invalid) {
      return;
    }

    const currentPassword =
      this.pwdForm.get('currentPassword')?.value;

    const newPassword =
      this.pwdForm.get('newPassword')?.value;

    this.auth.changePassword(
      currentPassword,
      newPassword
    ).subscribe({
      next: () => {

        this.snack.open(
          'Password changed!',
          'Close',
          { duration: 3000 }
        );

        this.pwdForm.reset();
      },
      error: (err: any) => {

        this.snack.open(
          err?.error?.message ?? 'Failed',
          'Close',
          { duration: 3000 }
        );
      }
    });
  }
}

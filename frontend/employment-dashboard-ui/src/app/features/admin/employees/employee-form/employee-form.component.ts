import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule, FormBuilder, Validators,
  AbstractControl, ValidationErrors, FormGroup
} from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatStepperModule } from '@angular/material/stepper';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { EmployeeService } from '../../../../core/services/employee.service';

// FIX 3: Custom validator — exactly 10 digits, no letters or special chars
function phoneValidator(control: AbstractControl): ValidationErrors | null {
  const val = (control.value ?? '').toString().trim();
  if (!val) return null; // optional field
  if (!/^\d{10}$/.test(val)) {
    return { phone: 'Phone number must be exactly 10 digits (numbers only)' };
  }
  return null;
}

const DEPARTMENTS = [
  { id: 1, name: 'Human Resources' }, { id: 2, name: 'Information Technology' },
  { id: 3, name: 'Finance' },         { id: 4, name: 'Marketing' },
  { id: 5, name: 'Sales' },           { id: 6, name: 'Operations' },
  { id: 7, name: 'Customer Support' },{ id: 8, name: 'Research & Development' },
  { id: 9, name: 'Administration' },  { id: 10, name: 'Quality Assurance' }
];
const ROLES = [
  { id: 1, name: 'Admin' }, { id: 2, name: 'Manager' }, { id: 3, name: 'Employee' }
];

@Component({
  selector: 'app-employee-form',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, RouterModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatButtonModule, MatIconModule, MatDatepickerModule, MatNativeDateModule,
    MatCardModule, MatDividerModule, MatSnackBarModule,
    MatProgressSpinnerModule, MatStepperModule, MatCheckboxModule
  ],
  template: `
<div class="page-container">
  <div class="page-header">
    <button mat-icon-button routerLink="../" class="back-btn">
      <mat-icon>arrow_back</mat-icon>
    </button>
    <div>
      <h1>{{ isEdit ? 'Edit Employee' : 'Add New Employee' }}</h1>
      <p>{{ isEdit ? 'Update employee information' : 'Fill in the details to add a new employee' }}</p>
    </div>
  </div>

  <mat-stepper linear #stepper orientation="horizontal" class="stepper">

    <!-- ── Step 1: Personal Info ─────────────────────────── -->
    <mat-step [stepControl]="personalForm" label="Personal Info">
      <form [formGroup]="personalForm" class="step-form">

        <div class="photo-section">
          <div class="photo-preview" (click)="photoInput.click()">
            <img *ngIf="photoPreview()" [src]="photoPreview()" alt="Profile">
            <div *ngIf="!photoPreview()" class="photo-placeholder">
              <mat-icon>add_a_photo</mat-icon>
              <span>Upload Photo</span>
            </div>
          </div>
          <input #photoInput type="file" accept="image/*" hidden (change)="onPhotoSelected($event)">
        </div>

        <div class="form-grid">

          <!-- FIX 2: Employee Code auto-populated, read-only for new employees -->
          <mat-form-field appearance="outline">
            <mat-label>Employee Code <span class="req">*</span></mat-label>
            <mat-icon matPrefix>badge</mat-icon>
            <input matInput formControlName="employeeCode" [placeholder]="codeLoading ? 'Loading...' : 'EMP001'">
            <mat-hint *ngIf="!isEdit">Auto-generated — next available code</mat-hint>
            <mat-error *ngIf="personalForm.get('employeeCode')?.hasError('required')">Required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Full Name <span class="req">*</span></mat-label>
            <input matInput formControlName="fullName" placeholder="John Smith">
            <mat-error *ngIf="personalForm.get('fullName')?.hasError('required')">Required</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Email Address <span class="req">*</span></mat-label>
            <mat-icon matPrefix>email</mat-icon>
            <input matInput formControlName="email" type="email" placeholder="john@company.com">
            <mat-error *ngIf="personalForm.get('email')?.hasError('email')">Invalid email</mat-error>
            <mat-error *ngIf="personalForm.get('email')?.hasError('required')">Required</mat-error>
          </mat-form-field>

          <!-- FIX 3: Phone — 10 digits only, keypress blocks non-numeric -->
          <mat-form-field appearance="outline">
            <mat-label>Phone Number</mat-label>
            <mat-icon matPrefix>phone</mat-icon>
            <input matInput formControlName="phoneNumber"
                   placeholder="9876543210"
                   inputmode="numeric"
                   maxlength="10"
                   (keypress)="blockNonDigit($event)"
                   (paste)="onPhonePaste($event)">
            <mat-hint>10 digits only, no spaces or symbols</mat-hint>
            <mat-error *ngIf="personalForm.get('phoneNumber')?.hasError('phone')">
              {{ personalForm.get('phoneNumber')?.getError('phone') }}
            </mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-col">
            <mat-label>Address</mat-label>
            <textarea matInput formControlName="address" rows="3"
                      placeholder="Street, City, State, PIN"></textarea>
          </mat-form-field>
        </div>

        <div class="step-actions">
          <ng-container *ngIf="!isEdit">
            <button mat-raised-button color="primary" matStepperNext
                    [disabled]="personalForm.invalid || codeLoading">
              Next <mat-icon iconPositionEnd>navigate_next</mat-icon>
            </button>
          </ng-container>
          <ng-container *ngIf="isEdit">
            <button mat-raised-button color="primary" (click)="save()" [disabled]="saving() || personalForm.invalid">
              <mat-spinner diameter="20" *ngIf="saving()"></mat-spinner>
              <span *ngIf="!saving()"><mat-icon>save</mat-icon> Update Employee</span>
            </button>
          </ng-container>
        </div>
      </form>
    </mat-step>

    <!-- ── Step 2: Employment ──────────────────────────── -->
    <mat-step [stepControl]="employmentForm" label="Employment" *ngIf="!isEdit">
      <form [formGroup]="employmentForm" class="step-form">
        <div class="form-grid">
          <mat-form-field appearance="outline">
            <mat-label>Department <span class="req">*</span></mat-label>
            <mat-select formControlName="departmentId" [disabled]="isEdit">
              <mat-option *ngFor="let d of departments" [value]="d.id">{{ d.name }}</mat-option>
            </mat-select>
            <mat-error>Required</mat-error>
            <mat-hint *ngIf="isEdit" style="color:#888">Not editable</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Role <span class="req">*</span></mat-label>
            <mat-select formControlName="roleId" [disabled]="isEdit">
              <mat-option *ngFor="let r of roles" [value]="r.id">{{ r.name }}</mat-option>
            </mat-select>
            <mat-error>Required</mat-error>
            <mat-hint *ngIf="isEdit" style="color:#888">Not editable</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Salary (₹)</mat-label>
            <mat-icon matPrefix>currency_rupee</mat-icon>
            <input matInput formControlName="salary" type="number" placeholder="50000" [readonly]="isEdit">
            <mat-hint *ngIf="isEdit" style="color:#888">Not editable</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Joining Date <span class="req">*</span></mat-label>
            <input matInput [matDatepicker]="picker" formControlName="joiningDate" [readonly]="isEdit">
            <mat-datepicker-toggle matSuffix [for]="picker" [disabled]="isEdit"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
            <mat-error>Required</mat-error>
            <mat-hint *ngIf="isEdit" style="color:#888">Not editable</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Status <span class="req">*</span></mat-label>
            <mat-select formControlName="status">
              <mat-option value="Active">Active</mat-option>
              <mat-option *ngIf="isEdit" value="Inactive">Inactive</mat-option>
            </mat-select>
          </mat-form-field>
        </div>

        <div class="step-actions">
          <button mat-stroked-button matStepperPrevious>
            <mat-icon>navigate_before</mat-icon> Back
          </button>
          <button mat-raised-button color="primary" matStepperNext [disabled]="employmentForm.invalid">
            Next <mat-icon iconPositionEnd>navigate_next</mat-icon>
          </button>
        </div>
      </form>
    </mat-step>

    <!-- ── Step 3: Account (new employees only) ─────────── -->
    <mat-step label="Account" *ngIf="!isEdit">
      <form [formGroup]="accountForm" class="step-form">
        <div class="account-notice">
          <mat-icon>info</mat-icon>
          <span>Create login credentials for this employee (optional)</span>
        </div>

        <mat-checkbox formControlName="createAccount" color="primary">
          Create login account for this employee
        </mat-checkbox>

        <div class="form-grid" *ngIf="accountForm.get('createAccount')?.value" style="margin-top:1rem">
          <mat-form-field appearance="outline">
            <mat-label>Username</mat-label>
            <mat-icon matPrefix>person</mat-icon>
            <input matInput formControlName="username" placeholder="emp001">
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Password</mat-label>
            <mat-icon matPrefix>lock</mat-icon>
            <input matInput [type]="showPwd() ? 'text' : 'password'"
                   formControlName="password" placeholder="Min 8 chars">
            <button mat-icon-button matSuffix type="button" (click)="showPwd.set(!showPwd())">
              <mat-icon>{{ showPwd() ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
          </mat-form-field>
        </div>

        <div class="step-actions">
          <button mat-stroked-button matStepperPrevious>
            <mat-icon>navigate_before</mat-icon> Back
          </button>
          <button mat-raised-button color="primary" (click)="save()" [disabled]="saving()">
            <mat-spinner diameter="20" *ngIf="saving()"></mat-spinner>
            <span *ngIf="!saving()"><mat-icon>save</mat-icon> Save Employee</span>
          </button>
        </div>
      </form>
    </mat-step>



  </mat-stepper>
</div>`,
 styles: [`
  /* ==========================================
     PAGE LAYOUT
  ========================================== */

  .page-container {
    padding: 1.75rem;
    animation: fadeIn .4s ease;
  }

  .page-header {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 2rem;
  }

  .page-header h1 {
    margin: 0;

    font-size: 2rem;
    font-weight: 800;
    letter-spacing: -.5px;

    background: linear-gradient(
      135deg,
      #1a237e,
      #3949ab,
      #5c6bc0
    );

    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  .page-header p {
    margin: .35rem 0 0;
    color: #64748b;
    font-size: .95rem;
    font-weight: 500;
  }

  :host-context([data-theme='dark']) .page-header h1 {
    background: linear-gradient(
      135deg,
      #82b1ff,
      #64b5f6,
      #90caf9
    );

    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  :host-context([data-theme='dark']) .page-header p {
    color: #94a3b8;
  }

  /* ==========================================
     BACK BUTTON
  ========================================== */

  .back-btn {
    color: #4f46e5;
    transition: all .3s ease;
  }

  .back-btn:hover {
    transform: translateX(-3px);
  }

  :host-context([data-theme='dark']) .back-btn {
    color: #82b1ff;
  }

  /* ==========================================
     STEPPER CONTAINER
  ========================================== */

  .stepper {
    border-radius: 28px;

    background: rgba(255,255,255,.78);

    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);

    border: 1px solid rgba(255,255,255,.25);

    box-shadow:
      0 15px 35px rgba(15,23,42,.08),
      0 5px 15px rgba(15,23,42,.05);

    overflow: hidden;
  }

  :host-context([data-theme='dark']) .stepper {
    background: rgba(15,23,42,.75);
    border: 1px solid rgba(255,255,255,.08);

    box-shadow:
      0 20px 45px rgba(0,0,0,.4),
      inset 0 1px 0 rgba(255,255,255,.04);
  }

  /* ==========================================
     STEP CONTENT
  ========================================== */

  .step-form {
    padding: 2rem;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    margin: 1.5rem 0;
  }

  .full-col {
    grid-column: 1 / -1;
  }

  @media(max-width: 768px) {
    .form-grid {
      grid-template-columns: 1fr;
    }
  }

  /* ==========================================
     PHOTO SECTION
  ========================================== */

  .photo-section {
    display: flex;
    justify-content: center;
    margin-bottom: 2rem;
  }

  .photo-preview {
    position: relative;

    width: 140px;
    height: 140px;

    border-radius: 50%;
    overflow: hidden;
    cursor: pointer;

    background: rgba(255,255,255,.7);
    backdrop-filter: blur(15px);

    border: 3px dashed #4f46e5;

    box-shadow:
      0 10px 25px rgba(79,70,229,.15);

    transition: all .35s ease;
  }

  .photo-preview:hover {
    transform: translateY(-4px) scale(1.03);

    border-color: #6366f1;

    box-shadow:
      0 20px 35px rgba(79,70,229,.25);
  }

  .photo-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  :host-context([data-theme='dark']) .photo-preview {
    background: rgba(30,41,59,.7);
    border-color: #82b1ff;
  }

  /* ==========================================
     PHOTO PLACEHOLDER
  ========================================== */

  .photo-placeholder {
    height: 100%;

    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    gap: .75rem;

    color: #4f46e5;
  }

  .photo-placeholder mat-icon {
    width: 42px;
    height: 42px;
    font-size: 42px;
  }

  .photo-placeholder span {
    font-size: .8rem;
    font-weight: 600;
  }

  :host-context([data-theme='dark']) .photo-placeholder {
    color: #82b1ff;
  }

  /* ==========================================
     REQUIRED FIELD
  ========================================== */

  .req {
    color: #ef4444;
    font-weight: 700;
  }

  /* ==========================================
     ACCOUNT NOTICE
  ========================================== */

  .account-notice {
    display: flex;
    align-items: center;
    gap: .85rem;

    padding: 1rem 1.2rem;
    margin-bottom: 1.5rem;

    border-radius: 16px;

    background: rgba(59,130,246,.10);

    border: 1px solid rgba(59,130,246,.15);

    color: #2563eb;

    backdrop-filter: blur(10px);
  }

  :host-context([data-theme='dark']) .account-notice {
    background: rgba(59,130,246,.12);
    color: #93c5fd;
    border-color: rgba(147,197,253,.15);
  }

  /* ==========================================
     STEP ACTIONS
  ========================================== */

  .step-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;

    margin-top: 2rem;
    padding-top: 1rem;
  }

  .step-actions button {
    min-width: 120px;
    border-radius: 12px;
    transition: all .3s ease;
  }

  .step-actions button:hover {
    transform: translateY(-2px);
  }

  /* ==========================================
     REVIEW SCREEN
  ========================================== */

  .review-section {
    padding: 3rem 1rem;
    text-align: center;
  }

  .review-info {
    display: flex;
    flex-direction: column;
    align-items: center;

    gap: 1rem;
    margin-bottom: 2rem;
  }

  .review-info mat-icon {
    width: 72px;
    height: 72px;
    font-size: 72px;

    color: #10b981;

    filter:
      drop-shadow(
        0 8px 18px rgba(16,185,129,.25)
      );
  }

  .review-info p {
    max-width: 600px;

    font-size: 1.1rem;
    font-weight: 500;

    color: #64748b;
    line-height: 1.7;
  }

  :host-context([data-theme='dark']) .review-info p {
    color: #cbd5e1;
  }

  /* ==========================================
     ANGULAR MATERIAL FORM FIELDS
  ========================================== */

  ::ng-deep .mat-mdc-form-field {
    width: 100%;
  }

  ::ng-deep .mat-mdc-text-field-wrapper {
    border-radius: 14px !important;
  }

  :host-context([data-theme='dark'])
  ::ng-deep .mat-mdc-text-field-wrapper {
    background: rgba(255,255,255,.03);
  }

  /* ==========================================
     ANIMATION
  ========================================== */

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(8px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`]
})
export class EmployeeFormComponent implements OnInit {
  isEdit     = false;
  employeeId = 0;
  codeLoading = false;
  saving     = signal(false);
  showPwd    = signal(false);
  photoPreview = signal<string | null>(null);
  selectedPhoto: File | null = null;

  departments = DEPARTMENTS;
  roles       = ROLES;

  personalForm!:   FormGroup;
  employmentForm!: FormGroup;
  accountForm!:    FormGroup;

  constructor(
    private fb:     FormBuilder,
    private empSvc: EmployeeService,
    private route:  ActivatedRoute,
    private router: Router,
    private snack:  MatSnackBar
  ) {
    this.personalForm = this.fb.group({
      // FIX 3: phone validator
      employeeCode: ['', Validators.required],
      fullName:     ['', Validators.required],
      email:        ['', [Validators.required, Validators.email]],
      phoneNumber:  ['', [phoneValidator]],
      address:      ['']
    });
    this.employmentForm = this.fb.group({
      departmentId: [null, Validators.required],
      roleId:       [null, Validators.required],
      salary:       [null],
      joiningDate:  [null, Validators.required],
      status:       ['Active', Validators.required]
    });
    this.accountForm = this.fb.group({
      createAccount: [false],
      username:      [''],
      password:      ['']
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEdit = true;
      this.employeeId = +id;
      this.loadEmployee(this.employeeId);
    } else {
      // FIX 2: Auto-generate next employee code for new employees
      this.loadNextCode();
    }
  }

  // FIX 2: Fetch next code and pre-fill the field
  private loadNextCode(): void {
    this.codeLoading = true;
    this.empSvc.getNextCode().subscribe({
      next: r => {
        this.personalForm.patchValue({ employeeCode: r.code });
        this.codeLoading = false;
      },
      error: () => {
        this.codeLoading = false;
        // Fallback — leave blank for manual entry
      }
    });
  }

  loadEmployee(id: number): void {
    this.empSvc.getById(id).subscribe((emp: any) => {
      this.personalForm.patchValue({
        employeeCode: emp.employeeCode, fullName:     emp.fullName,
        email:        emp.email,        phoneNumber:  emp.phoneNumber,
        address:      emp.address
      });
      this.employmentForm.patchValue({
        departmentId: emp.departmentId, roleId:      emp.roleId,
        salary:       emp.salary,       joiningDate: emp.joiningDate ? new Date(emp.joiningDate) : null,
        status:       emp.status
      });
      if (emp.profileImage) this.photoPreview.set(emp.profileImage);
    });
  }

  // FIX 3: Block non-digit key presses on phone field
  blockNonDigit(event: KeyboardEvent): boolean {
    const char = event.key;
    // Allow: digits, backspace, delete, tab, arrows, home, end
    if (/^\d$/.test(char) || ['Backspace','Delete','Tab','ArrowLeft','ArrowRight','Home','End'].includes(char)) {
      return true;
    }
    event.preventDefault();
    return false;
  }

  // FIX 3: Strip non-digits from pasted content
  onPhonePaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted  = event.clipboardData?.getData('text') ?? '';
    const digitsOnly = pasted.replace(/\D/g, '').slice(0, 10);
    this.personalForm.patchValue({ phoneNumber: digitsOnly });
  }

  onPhotoSelected(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.selectedPhoto = file;
    const reader = new FileReader();
    reader.onload = (e: any) => this.photoPreview.set(e.target.result);
    reader.readAsDataURL(file);
  }

  save(): void {
    if (this.personalForm.invalid || this.employmentForm.invalid) {
      this.personalForm.markAllAsTouched();
      this.employmentForm.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const pv = this.personalForm.value;
    const ev = this.employmentForm.value;
    const av = this.accountForm.value;
    const joiningDate = ev.joiningDate ? new Date(ev.joiningDate).toISOString().split('T')[0] : null;

    if (this.isEdit) {
      this.empSvc.update(this.employeeId, { ...pv, ...ev, joiningDate }).subscribe({
        next: () => {
          if (this.selectedPhoto) this.empSvc.uploadPhoto(this.employeeId, this.selectedPhoto).subscribe();
          this.snack.open('Employee updated successfully!', 'Close', { duration: 3000 });
          this.router.navigate(['/admin/employees']);
        },
        error: (err: any) => {
          this.snack.open(err.error?.message || 'Update failed', 'Close', { duration: 4000 });
          this.saving.set(false);
        }
      });
    } else {
      const createDto = { ...pv, ...ev, joiningDate,
        username: av.createAccount ? av.username : null,
        password: av.createAccount ? av.password : null };
      this.empSvc.create(createDto).subscribe({
        next: (emp: any) => {
          if (this.selectedPhoto) this.empSvc.uploadPhoto(emp.employeeId, this.selectedPhoto).subscribe();
          this.snack.open('Employee created successfully!', 'Close', { duration: 3000 });
          this.router.navigate(['/admin/employees']);
        },
        error: (err: any) => {
          this.snack.open(err.error?.message || 'Create failed', 'Close', { duration: 4000 });
          this.saving.set(false);
        }
      });
    }
  }
}
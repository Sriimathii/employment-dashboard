// ============================================================
// features/auth/login/login.component.ts  (FIXED VERSION)
// ============================================================
import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, ReactiveFormsModule, FormsModule, RouterModule,
    MatFormFieldModule, MatInputModule, MatButtonModule,
    MatIconModule, MatProgressSpinnerModule, MatSnackBarModule
  ],
   templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  form = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  loading      = signal(false);
  errorMsg     = signal('');
  showPassword = signal(false);
  showForgot   = signal(false);
  sendingReset = signal(false);
  forgotEmail  = '';
  resetSent = false;
  newTempPwd = '';

  get f() { return this.form.controls; }

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router,
    private snack: MatSnackBar
  ) {}

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.errorMsg.set('');

    const { username, password } = this.form.value;

    this.auth.login({ username: username!.trim(), password: password! }).subscribe({
      next: (res) => {
        // ── Role-based redirect ──────────────────────
        const roleRoutes: Record<string, string> = {
          'Admin':    '/admin/dashboard',
          'Manager':  '/manager/dashboard',
          'Employee': '/employee/dashboard',
        };
        const route = roleRoutes[res.role] ?? '/employee/dashboard';
        this.router.navigate([route]);
      },
      error: (err) => {
        this.loading.set(false);
        if (err.status === 401) {
          this.errorMsg.set('Invalid username or password. Please try again.');
        } else if (err.status === 0) {
          this.errorMsg.set('Cannot connect to server. Please check your connection.');
        } else {
          this.errorMsg.set(err.error?.message ?? 'Login failed. Please try again.');
        }
      }
    });
  }

  fillDemo(username: string, password: string) {
    this.form.setValue({ username, password });
    this.errorMsg.set('');
  }

 sendReset() {
  if (!this.forgotEmail) return;

  this.sendingReset.set(true);

  this.auth.forgotPassword(this.forgotEmail).subscribe({
    next: (res: any) => {

      this.sendingReset.set(false);

      this.resetSent = true;

      if (res?.tempPassword) {
        this.newTempPwd = res.tempPassword;
      }
    },
    error: () => {
      this.sendingReset.set(false);

      this.snack.open(
        'Failed to reset password',
        'Close',
        { duration: 3000 }
      );
    }
  });
}

closeForgotPassword() {
  this.showForgot.set(false);
  this.resetSent = false;
  this.newTempPwd = '';
  this.forgotEmail = '';
}

copyTempPwd() {
  navigator.clipboard.writeText(this.newTempPwd);

  this.snack.open(
    'Temporary password copied!',
    'Close',
    { duration: 2000 }
  );
}
}

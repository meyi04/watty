import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { AuthService, authErrorMessage } from '../auth.service';

@Component({ selector: 'app-tabs', templateUrl: 'tabs.page.html', styleUrls: ['tabs.page.scss'], standalone: false })
export class TabsPage {
  readonly auth = inject(AuthService);
  private changeDetector = inject(ChangeDetectorRef);
  email = '';
  password = '';
  confirmPassword = '';
  registering = false;
  busy = false;
  error = '';
  message = '';

  switchMode() {
    this.registering = !this.registering;
    this.password = '';
    this.confirmPassword = '';
    this.error = '';
    this.message = '';
  }
  async submit() {
    if (this.busy) return;
    this.error = '';
    this.message = '';
    if (!this.email.trim() || !this.password) { this.error = 'Enter your email and password.'; return; }
    if (this.registering && this.password !== this.confirmPassword) { this.error = 'The passwords do not match.'; return; }
    this.busy = true;
    try {
      if (this.registering) await this.auth.register(this.email, this.password);
      else await this.auth.signIn(this.email, this.password);
      this.password = '';
      this.confirmPassword = '';
    } catch (error) { this.error = authErrorMessage(error); }
    finally { this.busy = false; this.changeDetector.markForCheck(); }
  }
  async resetPassword() {
    if (this.busy) return;
    this.error = '';
    this.message = '';
    if (!this.email.trim()) { this.error = 'Enter your email address first.'; return; }
    this.busy = true;
    try {
      await this.auth.resetPassword(this.email);
      this.message = 'If an account matches this email, a password reset link will be sent.';
    } catch (error) { this.error = authErrorMessage(error); }
    finally { this.busy = false; this.changeDetector.markForCheck(); }
  }
}

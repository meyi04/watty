import { Injectable, OnDestroy, signal } from '@angular/core';
import { createUserWithEmailAndPassword, getAuth, onAuthStateChanged, sendPasswordResetEmail, signInWithEmailAndPassword, signOut, User } from 'firebase/auth';
import { firebaseApp } from './firebase';

export function authErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code) : '';
  switch (code) {
    case 'auth/operation-not-allowed': return 'Email/password sign-in is not enabled for this app yet. Enable it in Firebase Authentication.';
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found': return 'The email or password is incorrect. Please try again.';
    case 'auth/email-already-in-use': return 'This email already has an account. Sign in or reset your password.';
    case 'auth/invalid-email': return 'Enter a valid email address.';
    case 'auth/weak-password': return 'Choose a stronger password with at least 6 characters.';
    case 'auth/too-many-requests': return 'Too many attempts. Please wait a moment and try again.';
    case 'auth/network-request-failed': return 'Check your internet connection and try again.';
    default: return 'Unable to access your account. Please try again.';
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService implements OnDestroy {
  private auth = getAuth(firebaseApp);
  readonly user = signal<User | null>(null);
  readonly loading = signal(true);
  private unsubscribe = onAuthStateChanged(this.auth, user => {
    this.user.set(user);
    this.loading.set(false);
  }, () => { this.user.set(null); this.loading.set(false); });

  async signIn(email: string, password: string) {
    await signInWithEmailAndPassword(this.auth, email.trim(), password);
  }
  async register(email: string, password: string) {
    await createUserWithEmailAndPassword(this.auth, email.trim(), password);
  }
  async resetPassword(email: string) {
    await sendPasswordResetEmail(this.auth, email.trim());
  }
  async signOut() { await signOut(this.auth); }
  ngOnDestroy() { this.unsubscribe(); }
}

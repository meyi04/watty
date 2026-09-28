import { ChangeDetectorRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AlertController, AlertOptions } from '@ionic/angular';
import { vi } from 'vitest';
import { AuthService } from './auth.service';
import { StoryService } from './story.service';
import { Tab3Page } from './tab3/tab3.page';
import { TabsPage } from './tabs/tabs.page';

describe('Account actions', () => {
  const auth = {
    user: signal({ uid: 'owner', email: 'writer@example.com' }),
    loading: signal(false),
    signIn: vi.fn(async () => undefined),
    register: vi.fn(async () => undefined),
    signOut: vi.fn(async () => undefined),
    resetPassword: vi.fn(async () => undefined)
  };
  let confirm: (() => void) | undefined;
  beforeEach(() => {
    vi.clearAllMocks();
    confirm = undefined;
    TestBed.configureTestingModule({ providers: [
      { provide: AuthService, useValue: auth },
      { provide: StoryService, useValue: { stories: signal([]) } },
      { provide: ChangeDetectorRef, useValue: { markForCheck: vi.fn() } },
      { provide: AlertController, useValue: {
        create: vi.fn(async (options: AlertOptions) => {
          const button = options.buttons?.find(item => typeof item !== 'string' && item.text === 'Sign out');
          if (button && typeof button !== 'string') confirm = () => { button.handler?.(undefined); };
          return { present: vi.fn(async () => undefined) };
        })
      } }
    ] });
  });
  it('signs out only after confirmation', async () => {
    const page = TestBed.runInInjectionContext(() => new Tab3Page());
    await page.signOut();
    expect(auth.signOut).not.toHaveBeenCalled();
    expect(confirm).toBeDefined();
    confirm?.();
    await Promise.resolve();
    expect(auth.signOut).toHaveBeenCalledOnce();
    expect(page.signingOut).toBe(false);
  });
  it('keeps the account signed in when confirmation is not accepted', async () => {
    const page = TestBed.runInInjectionContext(() => new Tab3Page());
    await page.signOut();
    expect(auth.signOut).not.toHaveBeenCalled();
  });
  it('rejects a mismatched registration password before calling Firebase', async () => {
    const page = TestBed.runInInjectionContext(() => new TabsPage());
    page.registering = true;
    page.email = 'writer@example.com';
    page.password = 'secret123';
    page.confirmPassword = 'different123';
    await page.submit();
    expect(auth.register).not.toHaveBeenCalled();
    expect(page.error).toContain('do not match');
  });
  it('clears the password after successful sign-in', async () => {
    const page = TestBed.runInInjectionContext(() => new TabsPage());
    page.email = 'writer@example.com';
    page.password = 'secret123';
    await page.submit();
    expect(auth.signIn).toHaveBeenCalledWith('writer@example.com', 'secret123');
    expect(page.password).toBe('');
    expect(page.busy).toBe(false);
  });
});

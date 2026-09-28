import { AlertController } from '@ionic/angular';
import { AuthService, authErrorMessage } from '../auth.service';
import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { GENRES, StoryService } from '../story.service';
@Component({ selector: 'app-tab3', templateUrl: 'tab3.page.html', styleUrls: ['tab3.page.scss'], standalone: false })
export class Tab3Page {
  store = inject(StoryService);
  readonly auth = inject(AuthService);
  private alerts = inject(AlertController);
  private changeDetector = inject(ChangeDetectorRef);
  signingOut = false;
  accountError = '';

  async signOut() {
    const alert = await this.alerts.create({
      header: 'Sign out of your studio?',
      message: 'Published stories stay in your account. Unsaved editor changes will be lost. Device drafts stay on this browser.',
      buttons: [
        { text: 'Stay signed in', role: 'cancel' },
        { text: 'Sign out', handler: () => { void this.finishSignOut(); } }
      ]
    });
    await alert.present();
  }
  private async finishSignOut() {
    this.signingOut = true;
    this.accountError = '';
    this.changeDetector.markForCheck();
    try { await this.auth.signOut(); }
    catch (error) { this.accountError = authErrorMessage(error); }
    finally { this.signingOut = false; this.changeDetector.markForCheck(); }
  }

  get totalReads() { return this.store.stories().reduce((sum, s) => sum + s.reads, 0); }
  get totalVotes() { return this.store.stories().reduce((sum, s) => sum + s.votes, 0); }
  get completed() { return this.store.stories().filter(s => s.status === 'Completed').length; }
  get ongoing() { return this.store.stories().filter(s => s.status !== 'Completed'); }
  get topStories() { return [...this.store.stories()].sort((a,b) => b.reads - a.reads).slice(0, 5); }
  get genreBreakdown() {
    const stories = this.store.stories();
    return [...new Set([...GENRES, ...stories.map(s => s.genre)])].map(name => ({
      name, count: stories.filter(s => s.genre === name).length,
      percent: stories.length ? stories.filter(s => s.genre === name).length / stories.length * 100 : 0
    })).filter(g => g.count > 0);
  }
}

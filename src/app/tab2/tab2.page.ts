import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { GENRES, Story, StoryService } from '../story.service';
@Component({ selector: 'app-tab2', templateUrl: 'tab2.page.html', styleUrls: ['tab2.page.scss'], standalone: false })
export class Tab2Page {
  private changeDetector = inject(ChangeDetectorRef);
  store = inject(StoryService);
  private toastCtrl = inject(ToastController);

  private get savedKey() { return 'story-studio-saved-' + this.store.ownerId; }
  searchTerm = '';
  selectedGenre = 'All';
  sort = 'newest';
  savedOnly = false;
  selectedStory?: Story;
  genres = ['All', ...GENRES];
  savedIds: string[] = [];
  deletingId = '';
  deleteCandidate?: Story;
  constructor() {
    try { const saved: unknown = JSON.parse(localStorage.getItem(this.savedKey) || '[]'); this.savedIds = Array.isArray(saved) ? saved.filter((id): id is string => typeof id === 'string') : []; } catch { this.savedIds = []; }
  }
  get filteredStories() {
    const term = this.searchTerm.trim().toLowerCase();
    return this.store.stories().filter(s =>
      (!term || (s.title + ' ' + s.author + ' ' + s.description).toLowerCase().includes(term)) &&
      (this.selectedGenre === 'All' || s.genre === this.selectedGenre) &&
      (!this.savedOnly || this.savedIds.includes(s.id)))
      .sort((a, b) => this.sort === 'title' ? a.title.localeCompare(b.title) : this.sort === 'reads' ? b.reads - a.reads : b.createdAt - a.createdAt);
  }
  clearFilters() { this.searchTerm = ''; this.selectedGenre = 'All'; this.savedOnly = false; }
  async toggleSaved(story: Story) {
    const next = this.savedIds.includes(story.id) ? this.savedIds.filter(id => id !== story.id) : [...this.savedIds, story.id];
    try { localStorage.setItem(this.savedKey, JSON.stringify(next)); this.savedIds = next; }
    catch { await this.notify('Bookmarks could not be saved on this device.'); }
  }
  async handleRefresh(event: CustomEvent) {
    try { await this.store.refresh(); }
    catch { await this.notify('Unable to refresh. Check your connection and try again.'); }
    finally { await (event.target as HTMLIonRefresherElement).complete(); }
  }
  deleteStory(story: Story) {
    this.deleteCandidate = story;
  }
  cancelDelete() {
    if (!this.deletingId) this.deleteCandidate = undefined;
  }
  async confirmDelete() {
    const story = this.deleteCandidate;
    if (!story || this.deletingId) return;
    await this.remove(story);
  }
  private async remove(story: Story) {
    this.deletingId = story.id; this.changeDetector.markForCheck();
    try { await this.store.remove(story.id); this.deleteCandidate = undefined; if (this.selectedStory?.id === story.id) this.selectedStory = undefined; await this.notify('Story deleted.'); }
    catch { await this.notify('Could not delete the story. Check your connection and access.'); }
    finally { this.deletingId = ''; this.changeDetector.markForCheck(); }
  }
  private async notify(message: string) { const toast = await this.toastCtrl.create({ message, duration: 3000 }); await toast.present(); }
}

import { ChangeDetectorRef, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../auth.service';
import { blankStory, GENRES, StoryInput, StoryService } from '../story.service';

@Component({
  selector: 'app-tab1',
  templateUrl: 'tab1.page.html',
  styleUrls: ['tab1.page.scss'],
  standalone: false,
})
export class Tab1Page implements OnInit {
  private store = inject(StoryService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private changeDetector = inject(ChangeDetectorRef);
  private auth = inject(AuthService);
  private destroyRef = inject(DestroyRef);

  newStory: StoryInput = blankStory();
  busy = false;
  loading = false;
  loadFailed = false;
  error = '';
  editingId?: string;
  draftAvailable = false;
  colors = ['#b84e32', '#3d6ea7', '#6a8a4f', '#b77b29', '#7f4d9f', '#c7597e', '#3b7d66', '#d9c29a'];

  pickerOpen = false;
  pickerField: 'genre' | 'status' | null = null;
  pickerTitle = '';
  pickerOptions: string[] = [];
  pickerValue = '';

  get wordCount() {
    const text = this.newStory.content.trim();
    return text ? text.split(/\s+/).length : 0;
  }

  ngOnInit() {
    this.loadDraftState();
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(params => {
      const editId = params.get('edit') || undefined;
      if (editId === this.editingId) return;
      const wasEditing = !!this.editingId;
      this.editingId = editId;
      if (editId) {
        void this.loadStoryForEditing(editId);
      } else if (wasEditing) {
        this.newStory = blankStory();
        this.loadFailed = false;
        this.error = '';
        this.changeDetector.markForCheck();
      }
    });
  }

  openPicker(field: 'genre' | 'status') {
    this.pickerField = field;
    this.pickerTitle = field === 'genre' ? 'Choose a genre' : 'Choose a story status';
    this.pickerOptions = field === 'genre' ? [...GENRES] : ['Ongoing', 'Completed'];
    this.pickerValue = this.newStory[field];
    this.pickerOpen = true;
    this.changeDetector.markForCheck();
  }

  selectOption(option: string) {
    if (!this.pickerField) return;
    this.newStory[this.pickerField] = option;
    this.pickerValue = option;
    this.cancelPicker();
  }

  cancelPicker() {
    this.pickerOpen = false;
    this.pickerField = null;
    this.pickerTitle = '';
    this.pickerOptions = [];
    this.pickerValue = '';
    this.changeDetector.markForCheck();
  }

  async addStory() {
    if (this.busy) return;
    this.error = '';
    this.busy = true;
    this.changeDetector.markForCheck();
    try {
      await this.store.save(this.newStory, this.editingId);
      this.clearDraft();
      this.newStory = blankStory();
      this.editingId = undefined;
      await this.router.navigate(['/tabs/tab2']);
    } catch (error) {
      this.error = error instanceof Error ? error.message : 'Unable to save your story.';
    } finally {
      this.busy = false;
      this.changeDetector.markForCheck();
    }
  }

  saveDraft() {
    try {
      localStorage.setItem(this.draftKey, JSON.stringify(this.newStory));
      this.draftAvailable = true;
      this.error = '';
    } catch {
      this.error = 'Could not save a device draft on this browser.';
    }
    this.changeDetector.markForCheck();
  }

  restoreDraft() {
    try {
      const draft = localStorage.getItem(this.draftKey);
      if (!draft) return;
      const saved = JSON.parse(draft) as Partial<StoryInput>;
      this.newStory = { ...blankStory(), ...saved };
      this.error = '';
      this.draftAvailable = true;
    } catch {
      this.error = 'Your saved draft could not be restored.';
    }
    this.changeDetector.markForCheck();
  }

  clearDraft() {
    try { localStorage.removeItem(this.draftKey); } catch { }
    this.draftAvailable = false;
  }

  reset() {
    this.newStory = blankStory();
    this.error = '';
    this.clearDraft();
    this.editingId = undefined;
    this.changeDetector.markForCheck();
  }

  private get draftKey() {
    return 'story-studio-draft-' + (this.auth.user()?.uid || 'guest');
  }

  private loadDraftState() {
    try {
      this.draftAvailable = !!localStorage.getItem(this.draftKey);
    } catch {
      this.draftAvailable = false;
    }
  }

  private async loadStoryForEditing(id: string) {
    this.loading = true;
    this.loadFailed = false;
    this.error = '';
    this.newStory = blankStory();
    this.changeDetector.markForCheck();
    try {
      const story = await this.store.get(id);
      this.newStory = {
        title: story.title,
        author: story.author,
        genre: story.genre,
        description: story.description,
        content: story.content,
        status: story.status,
        coverColor: story.coverColor,
      };
    } catch {
      this.loadFailed = true;
      this.error = 'This story could not be opened for editing.';
    } finally {
      this.loading = false;
      this.changeDetector.markForCheck();
    }
  }
}


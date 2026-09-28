import { AuthService } from './auth.service';
import { TestBed } from '@angular/core/testing';
import { ChangeDetectorRef, signal, Type } from '@angular/core';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { ToastController } from '@ionic/angular';
import { BehaviorSubject, of } from 'rxjs';
import { vi } from 'vitest';
import { blankStory, Story, StoryService } from './story.service';
import { Tab1Page } from './tab1/tab1.page';
import { Tab2Page } from './tab2/tab2.page';
import { Tab3Page } from './tab3/tab3.page';

const stories: Story[] = [
  { ...blankStory(), id: 'one', title: 'Moonlight', author: 'Ada', genre: 'Fantasy', reads: 12, votes: 3, createdAt: 1 },
  { ...blankStory(), id: 'two', title: 'A New Day', author: 'Ben', genre: 'Romance', status: 'Completed', reads: 8, votes: 2, createdAt: 2 }
];
function fakeStore() { return { ownerId: 'test-user', stories: signal(stories), get: vi.fn(async (id: string) => stories.find(story => story.id === id) ?? stories[0]), save: vi.fn(), remove: vi.fn(), refresh: vi.fn() }; }
const toast = { create: vi.fn(async () => ({ present: vi.fn() })) } as unknown as ToastController;

describe('Library flows', () => {
  beforeEach(() => localStorage.clear());
  it('combines search, genre and saved filters, and sorts without mutating the store', () => {
    const store = fakeStore();
    const page = createPage(Tab2Page, store);
    expect(page.filteredStories.map(s => s.id)).toEqual(['two', 'one']);
    page.searchTerm = ' ADA ';
    page.selectedGenre = 'Fantasy';
    expect(page.filteredStories.map(s => s.id)).toEqual(['one']);
    page.savedOnly = true;
    expect(page.filteredStories).toEqual([]);
    page.savedIds = ['one'];
    expect(page.filteredStories.length).toBe(1);
    page.clearFilters();
    page.sort = 'title';
    expect(page.filteredStories[0].title).toBe('A New Day');
    expect(store.stories()[0].id).toBe('one');
  });
  it('persists bookmarks and removes them on a second click', async () => {
    const page = createPage(Tab2Page, fakeStore());
    await page.toggleSaved(stories[0]);
    expect(JSON.parse(localStorage.getItem('story-studio-saved-test-user') || '[]')).toEqual(['one']);
    await page.toggleSaved(stories[0]);
    expect(page.savedIds).toEqual([]);
  });
  it('always completes refresh after a failure', async () => {
    const store = fakeStore();
    store.refresh.mockRejectedValue(new Error('offline'));
    const complete = vi.fn();
    const page = createPage(Tab2Page, store);
    await page.handleRefresh({ target: { complete } } as unknown as CustomEvent);
    expect(complete).toHaveBeenCalledOnce();
  });
  it('waits for confirmation before deleting a story', async () => {
    const store = fakeStore();
    const page = createPage(Tab2Page, store);
    page.deleteStory(stories[0]);
    expect(store.remove).not.toHaveBeenCalled();
    await page.confirmDelete();
    expect(store.remove).toHaveBeenCalledWith('one');
    expect(page.deleteCandidate).toBeUndefined();
  });
});
describe('Insights', () => {
  it('derives totals and genre shares from library data', () => {
    const store = fakeStore();
    const page = createPage(Tab3Page, store);
    expect(page.totalReads).toBe(20);
    expect(page.totalVotes).toBe(5);
    expect(page.completed).toBe(1);
    expect(page.ongoing.map(s => s.id)).toEqual(['one']);
    expect(page.genreBreakdown.map(g => g.percent)).toEqual([50, 50]);
    store.stories.set([]);
    expect(page.totalReads).toBe(0);
    expect(page.genreBreakdown).toEqual([]);
  });
});
describe('Writing flow', () => {
  it('retains the manuscript and releases the save button after failure', async () => {
    const store = fakeStore();
    store.save.mockRejectedValue(new Error('permission denied'));
    const router = { navigate: vi.fn() };
    const page = createPage(Tab1Page, store, router);
    page.newStory = { ...blankStory(), title: 'My story', author: 'Ada', content: 'Keep this manuscript.' };
    await page.addStory();
    expect(page.newStory.content).toBe('Keep this manuscript.');
    expect(page.error).toBeTruthy();
    expect(page.busy).toBe(false);
    expect(router.navigate).not.toHaveBeenCalled();
  });
  it('prevents duplicate submissions while publishing', async () => {
    const store = fakeStore();
    const page = createPage(Tab1Page, store);
    page.busy = true;
    await page.addStory();
    expect(store.save).not.toHaveBeenCalled();
  });
  it('opens a centered modal picker and applies the selected value', () => {
    const page = createPage(Tab1Page, fakeStore());
    page.openPicker('genre');
    expect(page.pickerOpen).toBe(true);
    expect(page.pickerTitle).toBe('Choose a genre');
    expect(page.pickerOptions).toContain('Mystery');
    page.selectOption('Fantasy');
    expect(page.newStory.genre).toBe('Fantasy');
    expect(page.pickerOpen).toBe(false);
  });
  it('loads an existing story when the edit query changes on a reused tab', async () => {
    const queryParams = new BehaviorSubject(convertToParamMap({}));
    const store = fakeStore();
    const page = createPage(Tab1Page, store, {}, { queryParamMap: queryParams.asObservable() });
    page.ngOnInit();
    queryParams.next(convertToParamMap({ edit: 'one' }));
    await vi.waitFor(() => expect(page.newStory.title).toBe('Moonlight'));
    expect(page.editingId).toBe('one');
  });
});

function createPage<T>(page: Type<T>, store: ReturnType<typeof fakeStore>, router = {}, route: Partial<ActivatedRoute> = {}) {
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: { user: signal({ uid: 'test-user', email: 'writer@example.com' }) } },
      { provide: ChangeDetectorRef, useValue: { markForCheck: vi.fn() } },
      { provide: StoryService, useValue: store },
      { provide: ToastController, useValue: toast },
      { provide: ActivatedRoute, useValue: { queryParamMap: of(convertToParamMap({})), ...route } },
      { provide: Router, useValue: router }
    ]
  });
  return TestBed.runInInjectionContext(() => new page());
}

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { vi } from 'vitest';
import { User } from 'firebase/auth';
import { AuthService } from './auth.service';
import { blankStory, FIRESTORE_API, StoryService } from './story.service';

describe('Private Firestore persistence', () => {
  let user: ReturnType<typeof signal<User | null>>;
  let service: StoryService;
  const stop = vi.fn();
  const api = {
    getFirestore: vi.fn(() => ({})),
    collection: vi.fn(() => ({ path: 'stories' })),
    doc: vi.fn((_db, name, id) => ({ path: name + '/' + id })),
    query: vi.fn((...args) => args),
    where: vi.fn((...args) => args),
    serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
    onSnapshot: vi.fn(() => stop),
    addDoc: vi.fn(async () => ({ id: 'saved-story' })),
    updateDoc: vi.fn(async () => undefined),
    getDoc: vi.fn(), getDocsFromServer: vi.fn(), deleteDoc: vi.fn()
  };
  beforeEach(() => {
    vi.clearAllMocks();
    user = signal({ uid: 'owner-123' } as User);
    TestBed.configureTestingModule({ providers: [
      StoryService, { provide: AuthService, useValue: { user } }, { provide: FIRESTORE_API, useValue: api }
    ] });
    service = TestBed.inject(StoryService);
  });
  it('writes a new story to Firestore with its owner and server timestamps', async () => {
    const id = await service.save({ ...blankStory(), title: '  Cloud story  ', author: ' Writer ', content: 'My manuscript' });
    expect(id).toBe('saved-story');
    expect(api.addDoc).toHaveBeenCalledWith({ path: 'stories' }, expect.objectContaining({
      title: 'Cloud story', author: 'Writer', content: 'My manuscript', ownerId: 'owner-123',
      createdAt: 'SERVER_TIMESTAMP', updatedAt: 'SERVER_TIMESTAMP'
    }));
  });
  it('updates the existing document without changing its owner or creation date', async () => {
    await service.save({ ...blankStory(), title: 'Revised', author: 'Writer' }, 'existing');
    expect(api.addDoc).not.toHaveBeenCalled();
    expect(api.updateDoc).toHaveBeenCalledWith({ path: 'stories/existing' }, expect.objectContaining({ title: 'Revised' }));
  });
  it('queries only the current owners library and unsubscribes on sign-out', () => {
    TestBed.tick();
    expect(api.where).toHaveBeenCalledWith('ownerId', '==', 'owner-123');
    expect(api.query).toHaveBeenCalled();
    user.set(null);
    TestBed.tick();
    expect(stop).toHaveBeenCalled();
    expect(service.stories()).toEqual([]);
  });
  it('rejects publishing without an account', async () => {
    user.set(null);
    await expect(service.save({ ...blankStory(), title: 'Story', author: 'Writer' })).rejects.toThrow('Sign in');
    expect(api.addDoc).not.toHaveBeenCalled();
  });
  it('propagates a rejected cloud write instead of reporting success', async () => {
    api.addDoc.mockRejectedValueOnce({ code: 'permission-denied' });
    await expect(service.save({ ...blankStory(), title: 'Story', author: 'Writer' })).rejects.toEqual({ code: 'permission-denied' });
  });
});

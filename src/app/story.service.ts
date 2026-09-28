import { Injectable, InjectionToken, effect, inject, signal } from '@angular/core';
import { addDoc, collection, deleteDoc, doc, getDoc, getDocsFromServer, getFirestore, onSnapshot, query, serverTimestamp, Timestamp, updateDoc, where } from 'firebase/firestore';
import { AuthService } from './auth.service';
import { firebaseApp } from './firebase';
import { firestoreErrorMessage } from './firestore-errors';

export const FIRESTORE_API = new InjectionToken('Firestore API', {
  providedIn: 'root',
  factory: () => ({ getFirestore, collection, doc, query, where, serverTimestamp, onSnapshot, addDoc, updateDoc, getDoc, getDocsFromServer, deleteDoc })
});

export interface Story {
  id: string; title: string; author: string; genre: string; description: string;
  content: string; status: string; coverColor: string; reads: number; votes: number; createdAt: number;
}
export type StoryInput = Omit<Story, 'id' | 'reads' | 'votes' | 'createdAt'>;
export const GENRES = ['Romance', 'Fantasy', 'Mystery', 'Adventure', 'Sci-Fi', 'Horror'];
export function blankStory(): StoryInput {
  return { title: '', author: '', genre: 'Romance', description: '', content: '', status: 'Ongoing', coverColor: '#b84e32' };
}
export function validateStory(story: StoryInput): string {
  if (!story.title.trim() || !story.author.trim()) return 'Add a title and author before saving.';
  if (story.title.trim().length > 120 || story.author.trim().length > 80) return 'Use a title under 121 characters and an author under 81 characters.';
  if (story.description.length > 2000 || story.content.length > 200000) return 'Keep the synopsis under 2,001 characters and story text under 200,001 characters.';
  if (!GENRES.includes(story.genre) || !['Ongoing', 'Completed'].includes(story.status)) return 'Choose a valid genre and status.';
  if (!/^#[0-9a-f]{6}$/i.test(story.coverColor)) return 'Choose a valid cover color.';
  return '';
}
@Injectable({ providedIn: 'root' })
export class StoryService {
  private api = inject(FIRESTORE_API);
  private auth = inject(AuthService);
  private db = this.api.getFirestore(firebaseApp);
  private storiesRef = this.api.collection(this.db, 'stories');
  private retry = signal(0);
  readonly stories = signal<Story[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');

  constructor() {
    effect(onCleanup => {
      const user = this.auth.user();
      this.retry();
      this.stories.set([]);
      this.error.set('');
      if (!user) { this.loading.set(false); return; }
      this.loading.set(true);
      const stop = this.api.onSnapshot(this.ownerQuery(user.uid), { includeMetadataChanges: true }, snapshot => {
        // Pending local writes are not published stories until Firestore acknowledges them.
        this.stories.set(snapshot.docs.filter(item => !item.metadata.hasPendingWrites).map(item => this.normalize(item.id, item.data())));
        this.loading.set(false);
        this.error.set('');
      }, error => {
        this.loading.set(false);
        this.error.set(firestoreErrorMessage(error));
      });
      onCleanup(stop);
    });
  }
  get ownerId() { return this.auth.user()?.uid || ''; }
  connect() { this.retry.update(value => value + 1); }
  private ownerQuery(uid: string) { return this.api.query(this.storiesRef, this.api.where('ownerId', '==', uid)); }
  private requireUser() {
    const user = this.auth.user();
    if (!user) throw new Error('Sign in to access your stories.');
    return user;
  }
  private normalize(id: string, data: Record<string, unknown>): Story {
    return {
      ...blankStory(), id,
      title: String(data['title'] || 'Untitled'), author: String(data['author'] || 'Unknown author'),
      genre: String(data['genre'] || 'Romance'), description: String(data['description'] || ''),
      content: String(data['content'] || ''), status: String(data['status'] || 'Ongoing'),
      coverColor: /^#[0-9a-f]{6}$/i.test(String(data['coverColor'])) ? String(data['coverColor']) : '#b84e32',
      reads: Number(data['reads']) || 0, votes: Number(data['votes']) || 0,
      createdAt: data['createdAt'] instanceof Timestamp ? data['createdAt'].toMillis() : Number(data['createdAt']) || 0
    };
  }
  async get(id: string) {
    const user = this.requireUser();
    const snapshot = await this.api.getDoc(this.api.doc(this.db, 'stories', id));
    if (!snapshot.exists() || snapshot.data()['ownerId'] !== user.uid) throw new Error('This story is unavailable for your account.');
    return this.normalize(snapshot.id, snapshot.data());
  }
  async save(input: StoryInput, id?: string) {
    const user = this.requireUser();
    const error = validateStory(input);
    if (error) throw new Error(error);
    if (typeof navigator !== 'undefined' && !navigator.onLine) throw new Error('You are offline. Save a device draft and publish when connected.');
    const data = {
      title: input.title.trim(), author: input.author.trim(), genre: input.genre,
      description: input.description.trim(), content: input.content.trim(), status: input.status,
      coverColor: input.coverColor, updatedAt: this.api.serverTimestamp()
    };
    if (id) { await this.api.updateDoc(this.api.doc(this.db, 'stories', id), data); return id; }
    const result = await this.api.addDoc(this.storiesRef, {
      ...data, ownerId: user.uid, reads: 0, votes: 0, createdAt: this.api.serverTimestamp()
    });
    return result.id;
  }
  async remove(id: string) {
    this.requireUser();
    if (!navigator.onLine) throw new Error('Connect to the internet to delete a story.');
    await this.api.deleteDoc(this.api.doc(this.db, 'stories', id));
  }
  async refresh() {
    const user = this.requireUser();
    await this.api.getDocsFromServer(this.ownerQuery(user.uid));
    this.connect();
  }
}

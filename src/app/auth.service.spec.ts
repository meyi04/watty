import { authErrorMessage } from './auth.service';
import { firestoreErrorMessage } from './firestore-errors';
describe('Cloud access errors', () => {
  it('explains blocked Firestore access instead of reporting a successful save', () => {
    expect(firestoreErrorMessage({ code: 'permission-denied' })).toContain('permission');
    expect(firestoreErrorMessage({ code: 'unavailable' })).toContain('internet');
  });
  it('explains provider setup and invalid sign-in credentials', () => {
    expect(authErrorMessage({ code: 'auth/operation-not-allowed' })).toContain('not enabled');
    expect(authErrorMessage({ code: 'auth/invalid-credential' })).toContain('incorrect');
  });
});

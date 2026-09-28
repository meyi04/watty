export function firestoreErrorMessage(error: unknown): string {
  const code = typeof error === 'object' && error !== null && 'code' in error ? String(error.code).replace('firestore/', '') : '';
  switch (code) {
    case 'permission-denied':
      return 'Cloud access was denied. The app does not have permission to access these stories. Check the Firestore rules and sign-in requirements for this project.';
    case 'unauthenticated':
      return 'Firestore requires you to sign in before accessing stories.';
    case 'unavailable':
    case 'deadline-exceeded':
      return 'The cloud connection is unavailable. Check your internet connection and try again.';
    case 'resource-exhausted':
      return 'The database usage limit has been reached. Please try again later.';
    default:
      return error instanceof Error && !code ? error.message : 'Could not connect to your story library. Please try again.';
  }
}

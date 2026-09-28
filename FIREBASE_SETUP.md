# Connect your private story library

Project: `watty-fc663`. Development and production use this same Firebase project.

1. Open [Firebase Authentication](https://console.firebase.google.com/project/watty-fc663/authentication/providers). Enable the **Email/Password** provider and save. Email-link sign-in is not needed.
2. Open [Firestore Rules](https://console.firebase.google.com/project/watty-fc663/firestore/rules). Replace the current deny-all rules with the complete contents of [firestore.rules](firestore.rules), then click **Publish**.
3. Run `npm start`. Create an account in the app, write a story, and click **Publish story**.
4. In Firestore's Data tab, inspect `stories/{documentId}`. Each new story includes your account's `ownerId`, its text and details, and server-generated creation/update timestamps.
5. Sign out and sign in with the same account on another device to see the same library.

Publishing waits for Firestore to acknowledge the write before showing success. If access is denied, the editor retains your text and displays the error. **Save device draft** is local-only; it does not publish to Firestore. Drafts and bookmarks are scoped to the signed-in account on the current browser.

The rules keep each library private. The app queries stories by the signed-in user's ID, so it cannot list another user's stories. Do not change the rules to public write access.

Existing documents without an `ownerId` will not appear under an account. A project administrator must explicitly assign the correct owner's Authentication UID and migrate their timestamps/schema before those documents can be edited with these rules. The app does not automatically claim old documents.

These local files do not deploy Firebase settings. Enabling the provider and publishing rules in the console are required before cloud saves work.

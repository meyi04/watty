import { getApp, getApps, initializeApp } from 'firebase/app';
import { environment } from '../environments/environment';

export const firebaseApp = getApps().some(app => app.name === '[DEFAULT]')
  ? getApp()
  : initializeApp(environment.firebaseConfig);

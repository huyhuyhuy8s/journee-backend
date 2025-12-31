import admin from 'firebase-admin';
import type {ServiceAccount} from 'firebase-admin/app';
import {type FirebaseApp, type FirebaseOptions, initializeApp} from 'firebase/app';
import {getFirestore} from 'firebase/firestore';
import {config} from '@/config/env';
import {existsSync, readFileSync} from 'fs';
import {join} from 'path';

let serviceAccountKey: ServiceAccount | undefined;
try {
  const saPath = join(process.cwd(), 'etc/secrets/serviceAccountKey.json');
  if (existsSync(saPath)) {
    serviceAccountKey = JSON.parse(readFileSync(saPath, 'utf-8'));
  } else {
    console.warn(
      `Firebase service account file not found at ${saPath}, falling back to env or application default credentials.`,
    );
  }
} catch (err) {
  // If parsing fails or readFileSync throws, warn and continue to do fall back
  console.warn(
    'Error reading firebase service account file, falling back to env or application default credentials.',
    err,
  );
}

const serviceAccount =
  config.NODE_ENV === 'production'
    ? {
      type: config.FIRESTORE_ADMIN_TYPE,
      project_id: config.FIRESTORE_ADMIN_PROJECT_ID,
      private_key_id: config.FIRESTORE_ADMIN_PRIVATE_KEY_ID,
      private_key: config.FIRESTORE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      client_email: config.FIRESTORE_ADMIN_CLIENT_EMAIL,
      client_id: config.FIRESTORE_ADMIN_CLIENT_ID,
      auth_uri: config.FIRESTORE_ADMIN_AUTH_URI,
      token_uri: config.FIRESTORE_ADMIN_TOKEN_URI,
      auth_provider_x509_cert_url:
      config.FIRESTORE_ADMIN_AUTH_PROVIDER_X509_CERT_URL,
      client_x509_cert_url: config.FIRESTORE_ADMIN_CLIENT_X509_CERT_URL,
      universe_domain: config.FIRESTORE_ADMIN_UNIVERSE_DOMAIN,
    }
    : serviceAccountKey;

const credential = serviceAccount
  ? admin.credential.cert(serviceAccount as ServiceAccount)
  : admin.credential.applicationDefault();

const initOptions: { credential: admin.credential.Credential; databaseURL?: string } = {credential};
if (config.FIRESTORE_ADMIN_PROJECT_ID) {
  initOptions.databaseURL = `https://${config.FIRESTORE_ADMIN_PROJECT_ID}.firebaseio.com`;
}

admin.initializeApp(initOptions);

const adminDb: admin.firestore.Firestore = admin.firestore();

const firebaseOptions: FirebaseOptions = {
  apiKey: config.FIRESTORE_CLIENT_API_KEY,
  authDomain: config.FIRESTORE_CLIENT_AUTH_DOMAIN,
  projectId: config.FIRESTORE_ADMIN_PROJECT_ID,
  storageBucket: config.FIRESTORE_CLIENT_STORAGE_BUCKET,
  messagingSenderId: config.FIRESTORE_CLIENT_MESSAGING_SENDER_ID,
  appId: config.FIRESTORE_CLIENT_APP_ID,
  measurementId: config.FIRESTORE_CLIENT_MEASUREMENT_ID,
};

const clientApp: FirebaseApp = initializeApp(firebaseOptions);
const clientDb = getFirestore(clientApp);

export {adminDb, clientDb, admin, clientApp};

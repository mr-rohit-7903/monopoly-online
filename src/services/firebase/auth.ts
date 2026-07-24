import { auth, firebaseSignInAnonymously } from './config';

export async function loginAnonymously(): Promise<string> {
  const userCredential = await firebaseSignInAnonymously(auth);
  return userCredential.user.uid;
}

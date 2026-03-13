import {
  doc, setDoc, deleteDoc, getDoc, increment, updateDoc,
  collection, query, where, getDocs,
} from "firebase/firestore";
import { db } from "./firebase";

export async function likeTrack(userId: string, trackId: string) {
  const likeRef = doc(db, "likes", `${userId}_${trackId}`);
  await setDoc(likeRef, { userId, trackId, createdAt: new Date() });
  await updateDoc(doc(db, "tracks", trackId), { likes: increment(1) });
}

export async function unlikeTrack(userId: string, trackId: string) {
  const likeRef = doc(db, "likes", `${userId}_${trackId}`);
  await deleteDoc(likeRef);
  await updateDoc(doc(db, "tracks", trackId), { likes: increment(-1) });
}

export async function hasLiked(userId: string, trackId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "likes", `${userId}_${trackId}`));
  return snap.exists();
}

export async function getLikedTrackIds(userId: string, trackIds: string[]): Promise<Set<string>> {
  if (trackIds.length === 0) return new Set();
  const batches: string[][] = [];
  for (let i = 0; i < trackIds.length; i += 10) {
    batches.push(trackIds.slice(i, i + 10));
  }
  const liked = new Set<string>();
  for (const batch of batches) {
    const q = query(
      collection(db, "likes"),
      where("userId", "==", userId),
      where("trackId", "in", batch)
    );
    const snap = await getDocs(q);
    snap.docs.forEach((d) => liked.add(d.data().trackId));
  }
  return liked;
}

export async function followUser(followerId: string, targetId: string) {
  const followRef = doc(db, "follows", `${followerId}_${targetId}`);
  await setDoc(followRef, { followerId, targetId, createdAt: new Date() });
  await updateDoc(doc(db, "users", targetId), { followersCount: increment(1) });
  await updateDoc(doc(db, "users", followerId), { followingCount: increment(1) });
}

export async function unfollowUser(followerId: string, targetId: string) {
  const followRef = doc(db, "follows", `${followerId}_${targetId}`);
  await deleteDoc(followRef);
  await updateDoc(doc(db, "users", targetId), { followersCount: increment(-1) });
  await updateDoc(doc(db, "users", followerId), { followingCount: increment(-1) });
}

export async function isFollowing(followerId: string, targetId: string): Promise<boolean> {
  const snap = await getDoc(doc(db, "follows", `${followerId}_${targetId}`));
  return snap.exists();
}

export async function incrementPlayCount(trackId: string) {
  await updateDoc(doc(db, "tracks", trackId), { plays: increment(1) });
}

export const onAuthStateChanged = (auth, cb) => {
  setTimeout(() => cb(auth.currentUser), 0);
  return () => {};
};

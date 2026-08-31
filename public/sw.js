// Cstle Livn installability worker.
//
// Do not add application/data caching here without a deliberate offline-data
// design. Fetches stay network-native so logo reloads and new deployments are
// always current and Supabase authorization remains authoritative.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Presence of a fetch handler satisfies standalone installation checks;
  // leaving the event unanswered preserves the browser's normal network path.
});

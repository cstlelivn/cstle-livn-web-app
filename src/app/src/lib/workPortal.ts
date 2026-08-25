// work.cstle.ca (or work.cstlelivn.ca) is a separate hostname pointed at
// the same deployment,
// used to hand associates a plain "my tasks" link instead of the admin app
// URL -- it shouldn't look or feel like they're logging into a back office.
// Detected purely by hostname so it works the same in prod and in a local
// preview (append ?portal=work to test it without owning the real domain).
export function isWorkPortalHost(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  if (/^work\./i.test(host)) return true;
  return new URLSearchParams(window.location.search).get("portal") === "work";
}

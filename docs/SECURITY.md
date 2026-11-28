# VolunteerHub security review

The review covered Firestore permissions and query scope, write validation, email/password authentication, the browser’s rendering and export paths, third-party scripts, browser storage, and the files and configuration used at deployment. Research on AI-generated applications informed the emphasis on access control, input validation, authentication, and insecure defaults. [OWASP Top 10](https://top10.owasp.org/) · [Empirical study of AI-assisted code](https://doi.org/10.1145/3716848) · [Firebase security checklist](https://firebase.google.com/support/guides/security-checklist)

| Finding | Change |
| --- | --- |
| The UI hid some records even though Firestore permissions were broader. | Firestore now filters club events and targeted announcements by audience. Private profiles and reports have explicit rules. Volunteers use a separate verified-organizer directory with display fields only. |
| Some writes trusted client-supplied roles, record fields, and status values. | Rules check ownership, required fields, field types, length, permitted changes, and role-based transitions. New registrations use one document per volunteer and event with a server timestamp. |
| Listing, attendance, and club actions were insufficiently tied to approved roles. | Public event publishing and attendance require an approved coordinator or the applicable club manager. Only site admins can verify organizers, moderate concerns, and change public organization settings. |
| Account controls did not require email verification. Live data could persist in the browser. | Live data requires a verified email. Sign-in is session-scoped, persistent Firestore storage is disabled, and old cache cleanup is attempted during startup. Account deletion requires password reauthentication. |
| Untrusted text entered HTML templates and exported files. | The app validates fields by purpose, encodes dynamic values in markup, treats formula-like CSV strings as text, and escapes calendar line breaks. A Content Security Policy blocks inline scripts. The loaded Firebase SDK files have integrity hashes. |
| Club join codes were short and their records changed independently. | New codes use 12 cryptographically random characters. Creation and rotation update both records atomically. |
| Workspace users could interact while the initial live event queries were still running. | Workspace navigation and actions are inert during the load. Retry and Sign out provide a way to recover. Pending event saves still block duplicate submissions. |

## Before using real records

- Use a separate staging Firebase project with fictional records. Run the emulator suite and test both roles against staging before publishing rules or changing the public website. GitHub Pages and Firestore rules deploy independently.
- In Firebase Authentication, set the password policy to **Require**, with a minimum of **15** characters and a maximum of **128**. The app accepts spaces and symbols. Enable email-enumeration protection, review authorized domains and authentication quotas, and test password reset and verification with the published domain. Test existing accounts before enforcing any mandatory password upgrade. [Firebase Authentication](https://firebase.google.com/docs/auth/web/password-auth) · [Firebase security checklist](https://firebase.google.com/support/guides/security-checklist)
- Register the production domain and public reCAPTCHA Enterprise site key for App Check, set `FIREBASE_APP_CHECK_SITE_KEY` in the web configuration, and monitor accepted traffic before enforcing App Check for Firestore. Review read/write usage and quotas with a staging load test. [Firebase App Check](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider) · [Cloud Firestore quotas](https://firebase.google.com/docs/firestore/quotas)
- If the database already has live records, back them up and plan a coordinated cutover. Ensure all public events have explicit `clubId: null`. Populate `organizers/{uid}` for verified coordinators using just `id`, `name`, `org`, and `verified`. Normalize existing registrations to `{eventId}_{userId}`, carrying over the corresponding `id` and original creation time when available. Resolve duplicate records manually to preserve attendance and service history. Old targeted announcements stay coordinator-only unless a trusted admin can verify their original recipients. Rotate legacy join codes. On shared devices, close earlier app tabs and clear old site data after sign-out if cache cleanup could not run.
- Apply the hosting headers in `firebase.json` if using Firebase Hosting. The HTML itself carries most of the CSP on GitHub Pages. Preventing framing requires a response header, so use a host or proxy that sets `frame-ancestors 'none'` if anti-framing is required. Keep Firebase Admin credentials out of browser code and Git.

## Remaining launch boundaries

**Treat this branch as staging-ready.** The current client still reads registration identifiers across accounts to show capacity and waitlist position. Capacity and waitlist promotion are still reconciled by browsers. Before a public launch with real volunteer rosters, move booking and waitlist transitions to a trusted transaction and expose only counts publicly. Restrict registration reads to the volunteer and authorized staff once that path is in place.

Each Firebase project is one organization-wide trust boundary. Verified coordinators can read volunteer records across that project. Independent organizations that should not share records need separate Firebase projects or a tenant-aware authorization model.

Firestore evaluates the current date in UTC for registration and attendance restrictions. Confirm how late-evening events should behave in the deployment’s time zone. Volunteer self-deletion removes sign-in and profile access, but retained service records follow the organization’s policy. A site admin handles partial deletion or coordinator account removal.

## Verification

Run the ordinary browser suite and the Firestore rules suite. The rules tests require a loopback emulator and use the `demo-volunteerhub` project ID. The browser tests use fictional records and a local Firebase fixture. [Test instructions](../tests/README.md)

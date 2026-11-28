# Gmail hour alerts

A site administrator connects the organization's sending mailbox. An adviser then enables alerts for a club and chooses its shortfall threshold. Firebase runs the check every day at **9 a.m. America/Chicago**, including days when everyone has the website closed.

## Activate a sending account

1. Use the Firebase project that hosts the site's live records. Scheduled Firebase Functions require a billing-enabled project. Enable the **Gmail API** in its Google Cloud project. Configure the Google Auth Platform consent screen and create a **Web application** OAuth client. A Workspace administrator can use an internal app where appropriate. During external-app testing, add the sender as a test user. External testing grants for Gmail can expire after seven days. Production authorization may require Google verification. [Firebase scheduled functions](https://firebase.google.com/docs/functions/schedule-functions) · [Google OAuth application policies](https://developers.google.com/identity/protocols/oauth2/policies) · [Refresh token expiration](https://developers.google.com/identity/protocols/oauth2#expiration)
2. Register the exact authorized redirect URI. For the repository's configured project it is `https://us-central1-volunteerhub-12975.cloudfunctions.net/gmailConnector/callback`. For another project substitute its ID here, in the website's Firebase configuration and in the connector host allowed by the site's Content Security Policy.
3. From the repository root, install the Functions dependencies and set the OAuth client secret using the Firebase CLI. Enter the secret at the CLI prompt. The client ID and site URL are deployment parameters. The site URL must be the actual location of the web app, including its subdirectory and a trailing slash.

   ```sh
   npm --prefix functions ci
   firebase functions:secrets:set GMAIL_CLIENT_SECRET --project YOUR_PROJECT_ID
   ```

   Put the following two values in the locally ignored `functions/.env.YOUR_PROJECT_ID` file.

   ```dotenv
   GMAIL_CLIENT_ID=YOUR_WEB_CLIENT_ID.apps.googleusercontent.com
   VOLUNTEERHUB_URL=https://anancodes.github.io/FBLA-Project/volunteerhub-web/vh-web/
   ```

4. If upgrading an existing Firestore deployment, complete the existing-record migration in the project's release guide first. Deploy the rules and the two functions. The configured predeploy build copies the same pace calculation used by the browser into the Functions package. The runtime service account needs Firestore data access, Firebase Auth user-read access, and access to the client secret. Publish the matching frontend through the site's usual release process. [Existing-record release notes](SECURITY.md) · [Firebase configuration and secrets](https://firebase.google.com/docs/functions/config-env)

   ```sh
   firebase deploy --only firestore:rules,functions:gmailConnector,functions:checkServiceHours --project YOUR_PROJECT_ID
   ```

5. Sign in to the **live** website as a verified site administrator. In **Settings → Gmail hour alerts**, choose **Connect Gmail** and approve the sending mailbox on Google's consent screen. Returning to Settings displays the connected address. Google grants permission to create and send drafts. The refresh token stays in a server-only Firestore document. [Google OAuth web-server flow](https://developers.google.com/identity/protocols/oauth2/web-server) · [Gmail draft lifecycle](https://developers.google.com/workspace/gmail/api/guides/drafts)
6. In **People & clubs → Clubs → Edit club**, enter the term dates and goal, enable Gmail hour alerts, and save. Existing clubs start with delivery off. The demo shows a preview with fictional recipients and works offline.

## Who receives a check-in

The volunteer receives the email. The adviser who owns that club's term receives a blind copy in the same message. The job resolves both addresses from verified, enabled Firebase Authentication accounts and confirms the adviser's membership. If either recipient is unavailable, the job records a missing recipient and checks again on the next run. The person listed on an individual outside-service log supervises that activity only.

The threshold defaults to **2 hours**, capped at the term goal for small requirements. Advisers can enter a custom threshold in quarter-hour increments. Only attended club shifts and approved outside hours within the term count. Personal lifetime goals have no deadline and do not trigger these alerts.

For example, halfway through a 20-hour term, the expected total is 10 hours. A member with 8 approved hours reaches a 2-hour threshold. A member with 8.25 approved hours stays above it. The calculation uses calendar days on the scheduled timezone, starts at zero on the first day and reaches the full goal on the last. A check before or after the term sends nothing.

## Delivery and verification

- A Firestore transaction reserves each member's alert for their current club and term. The worker saves the Gmail draft ID before sending. Retries reuse that draft. A later daily check that finds the member back on pace resets eligibility for a subsequent shortfall.
- Settings lists the last check, messages sent, missing recipients, failures and deliveries needing review. If Gmail loses a send acknowledgement or a saved draft disappears, check the sender's Sent folder before intervening. Server-only `hourAlertLedger` records include the club, member, term and draft ID. Disconnecting the mailbox pauses delivery organization-wide.
- To verify real inbox delivery during deployment, use a staging club with two consenting test accounts. Enter a term already in progress, enable a threshold the test volunteer meets, and run the deployed scheduler job once. Confirm both inboxes receive the same message, then repeat the job and check that no additional copy arrives. The emulator suite exercises the same workflow with a simulated Gmail provider. [Firebase scheduler operation](https://firebase.google.com/docs/functions/schedule-functions)

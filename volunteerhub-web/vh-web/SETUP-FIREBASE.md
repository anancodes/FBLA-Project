# Turning on Live mode (Firebase)

Live mode gives VolunteerHub real accounts and one shared database, so volunteers and coordinators on different devices see the same events and sign-ups. It uses Firebase's free plan. Setup takes about 15 minutes. You need a Google account, so ask a parent if you need one.

Until you finish these steps, the site keeps working as an offline demo.

## 1. Create the project
1. Go to **console.firebase.google.com** and click **Create a project**.
2. Name it `volunteerhub`. You can turn off Google Analytics. Click **Create project**.

## 2. Turn on email and password sign-in
1. In the left menu, choose **Build → Authentication**, then **Get started**.
2. Under **Sign-in method**, choose **Email/Password**, switch on the first toggle, and click **Save**.
3. Open the **Settings** tab, then **Authorized domains**, then **Add domain**, and enter `anancodes.github.io`.

## 3. Create the database
1. Choose **Build → Firestore Database**, then **Create database**.
2. Pick a location near you (for example `us-central`) and choose **Start in production mode**.
3. Open the **Rules** tab. Delete what's there, paste the whole `firestore.rules` file from this folder, and click **Publish**.

## 4. Connect the website
1. Click the gear icon, then **Project settings**. Under **Your apps**, click the web icon `</>`.
2. Enter a nickname such as `volunteerhub-web`, leave Hosting unchecked, and click **Register app**.
3. You'll see a `firebaseConfig` block. Copy each value into `js/firebase-config.js`: `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, and `appId`.
4. Commit and push to GitHub. These values are safe to publish, because the rules from step 3 control who can see and change data.

## 5. Make yourself the site admin
1. Open the live site, click **Create an account**, and choose **Coordinate volunteers**.
2. Back in Firebase, open **Firestore Database → Data → users** and click your document (look for your email).
3. Click **Add field**: name `admin`, type **boolean**, value **true**. Then change `verified` to **true**.
4. Refresh the site. You'll see **Site admin** under your name, and the **Settings** and **Organizers** screens.

## 6. Set up your organization
1. In **Settings**, enter the organization's name, home ZIP code, and description. Replace the sample waiver with your own, and have a lawyer review it before real use.
2. Optional: click **Add 6 sample events** to try things out.
3. When other coordinators sign up, verify them in **Organizers** after checking they're real.

## 7. Set up your school clubs
1. Go to **Clubs** and choose **New club** for each club, like HOSA and NHS. Set the hour requirement and term dates.
2. Share each club's join code with its members. Students join from **My clubs**.
3. Next to a student's name, choose **Make officer** so they can approve hours and run club events.

## When rules change
If an update to the site includes a new `firestore.rules`, paste it into **Firestore Database → Rules** again and click **Publish**.

## Good to know
- **Cost:** Firebase's free plan has daily limits that are plenty for a school project or a small nonprofit. You won't be charged unless you add a payment method.
- **Competition day:** if the internet is unreliable, use the demo buttons on the login page. Demo mode works offline and never touches your live data.
- **Who can see what:** volunteers' phone numbers, ZIP codes, and emergency contacts are visible only to themselves and verified coordinators. Only coordinators can mark attendance or hours. Only a site admin can verify organizers. `firestore.rules` has the details.

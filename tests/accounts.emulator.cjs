// Exercise the web forms against Firebase Authentication and Firestore with the project's rules.
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {randomUUID} = require("node:crypto");
const helper = require("./browser-helpers.cjs");
const project = "demo-volunteerhub";
const authOrigin = "http://127.0.0.1:9099";
const projectEndpoint = authOrigin + "/emulator/v1/projects/" + project;
const sdk = path.dirname(require.resolve("firebase/package.json"));
const html = fs.readFileSync(path.resolve(__dirname, "../volunteerhub-web/vh-web/index.html"), "utf8");
test.before(helper.start);
test.after(helper.stop);

async function connectedPage(t){
  const page = await helper.page(t);
  const site = page.url();
  await page.context().grantPermissions(["local-network-access"], {origin:site});
  await page.route(site, route => route.fulfill({contentType:"text/html", body:html.replace("connect-src 'self'", "connect-src 'self' http://127.0.0.1:8875 http://127.0.0.1:9099")}));
  await page.route("**/fixture-sdk/*", route => route.fulfill({path:path.join(sdk,path.basename(new URL(route.request().url()).pathname)),contentType:"application/javascript"}));
  await page.route("**/js/firebase-config.js", route => route.fulfill({contentType:"application/javascript",body:`
    window.FIREBASE_CONFIG = {projectId:"${project}",apiKey:"fixture-api-key",appId:"1:123:web:fixture",authDomain:"localhost"};
    window.FIREBASE_SDK_BASE = "/fixture-sdk/";
    window.FIREBASE_EMULATOR = (auth, fs) => {
      auth.useEmulator("${authOrigin}", {disableWarnings:true});
      fs.useEmulator("127.0.0.1",8875);
    };
  `}));
  await page.goto(site);
  await page.waitForFunction(() => Cloud.ready);
  return page;
}

async function signIn(page,email,password){
  if (!await page.locator("#loginForm").count()) await page.locator('.landing-actions a[href="#login"]').click();
  await page.getByLabel("Email",{exact:true}).fill(email);
  await page.getByLabel("Password",{exact:true}).fill(password);
  await page.locator('#loginForm button[type="submit"]').click();
}

for (const role of ["volunteer","coordinator"]){
  test(role + " registration survives sign-out and a fresh browser, then opens real records after email verification", async t => {
    const email = "member-" + randomUUID() + "@example.invalid", password = "Service-" + randomUUID();
    const page = await connectedPage(t);
    await page.locator('.landing-actions a[href="#signup"]').click();
    await page.locator("#su-role-" + role).check();
    await page.locator("#su-name").fill("River Park");
    await page.locator("#su-email").fill(email);
    await page.locator("#su-pass").fill(password);
    await page.locator("#su-pass2").fill(password);
    if (role === "volunteer") await page.locator("#su-waiver").check();
    await page.locator('#signupForm button[type="submit"]').click();
    const heading = role === "volunteer" ? "Volunteer workspace" : "Coordinator workspace";
    await page.getByRole("heading",{name:heading}).waitFor();
    const profile = await page.evaluate(async () => (await Cloud.fs.doc("users/" + Cloud.auth.currentUser.uid).get({source:"server"})).data());
    assert.equal(profile.name,"River Park");
    assert.equal(profile.role,role);
    assert.equal(profile.email,email);
    assert.equal(profile.verified,false);
    assert.equal(profile.admin,undefined);
    assert.ok(!Object.keys(profile).some(key => /password|passHash|passSalt/i.test(key)));
    assert.equal(await page.evaluate(() => localStorage.getItem(KEY)),null);
    assert.equal(await page.locator(".example-activity details").count() > 0,true);
    await page.locator(".example-activity summary").first().click();
    assert.ok(await page.locator(".example-activity details[open] p").first().isVisible());
    await page.reload();
    await page.getByRole("heading",{name:heading}).waitFor();
    await page.getByRole("button",{name:"Sign out"}).click();
    await page.getByRole("heading",{name:"Sign in"}).waitFor();
    assert.equal(await page.locator(".example-activity").count(),0);

    const fresh = await connectedPage(t);
    await signIn(fresh,email,password);
    await fresh.getByRole("heading",{name:heading}).waitFor();
    assert.equal(await fresh.evaluate(() => Cloud.auth.currentUser.uid),profile.id);
    await fresh.getByRole("button",{name:"Send verification email"}).click();
    await fresh.getByRole("button",{name:"Resend email"}).waitFor();
    const {oobCodes} = await fetch(projectEndpoint+"/oobCodes").then(r=>r.json());
    const code = oobCodes.find(entry => entry.email === email && entry.requestType === "VERIFY_EMAIL");
    assert.ok(code,"The local Firebase mail transport received a verification link");
    const verified = await fetch(authOrigin+"/identitytoolkit.googleapis.com/v1/accounts:update?key=fixture-api-key",{
      method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({oobCode:code.oobCode})
    });
    assert.equal(verified.status,200);
    await fresh.getByRole("button",{name:"Check verification"}).click();
    await fresh.waitForFunction(() => DB.live && !Cloud.loadPhase);
    assert.equal(await fresh.evaluate(() => currentUser().id),profile.id);
    assert.equal(await fresh.locator('.rail [data-v="events"]').count(),role === "coordinator" ? 1 : 0);
    assert.equal(await fresh.locator('.rail [data-v="settings"]').count(),0);
    assert.equal(await fresh.evaluate(() => state.events.length),0,"Illustrative shifts stay out of live records");
  });
}

test("an existing sign-in with an interrupted profile can choose its role and recover", async t => {
  const email = "recovery-" + randomUUID() + "@example.invalid", password = "Account-" + randomUUID();
  const created = await fetch(authOrigin + "/identitytoolkit.googleapis.com/v1/accounts:signUp?key=fixture-api-key",{
    method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password,returnSecureToken:true})
  });
  assert.equal(created.status,200);
  const page = await connectedPage(t);
  await signIn(page,email,password);
  await page.getByRole("heading",{name:"Finish your profile"}).waitFor();
  await page.locator("#su-role-coordinator").check();
  await page.locator("#su-name").fill("Morgan Hill");
  await page.getByRole("button",{name:"Save profile"}).click();
  await page.getByRole("heading",{name:"Coordinator workspace"}).waitFor();
  assert.equal(await page.evaluate(() => Cloud.previewProfile.name),"Morgan Hill");
});

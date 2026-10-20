/**
 * APP STORE CONNECT, WITHOUT SIGNING IN.
 * Copied from the FotoPal repo (~/dev/fotopal/app/scripts/asc.mts); Chair
 * Buddy adds `register`. .release/asc/config.json points at the shared team key.
 *
 *   node scripts/asc.mts register --bundle au.com.chairbuddy.app --name "Chair Buddy"
 *   npx tsx scripts/asc.mts status  --bundle ai.fotopal.agent --build 8
 *   npx tsx scripts/asc.mts release --bundle ai.fotopal.agent --build 8 [--group "Name" ...]
 *   npx tsx scripts/asc.mts groups  --bundle ai.fotopal.agent
 *   npx tsx scripts/asc.mts submit  --bundle ai.fotopal.companion --version 1.3.3 --build 37 --notes-file notes.txt [--dry-run]
 *
 * `submit` is the App Store release: it creates the version (or reuses one still
 * editable), attaches the build, sets What's New in every locale, checks that the
 * App Review details carried over, and submits for review with release after
 * approval. Only one version per app can be in review; a version that is
 * WAITING_FOR_REVIEW cannot be changed without cancelling that submission.
 *
 * `release` waits for Apple to finish processing the build, then adds it to
 * every TestFlight group on the app (or the named ones). Export compliance is
 * already answered in each target's Info.plist (ITSAppUsesNonExemptEncryption),
 * so a build needs nothing else to reach testers.
 *
 * The key is Jeff's App Store Connect API team key (App Manager access), kept
 * git-ignored in .release/asc/ with config.json naming the issuer and key ids.
 * Nothing here prints the key. Jeff asked for this on 2026-09-26 so releases
 * stop needing him to sign in to App Store Connect each day.
 */
import { readFileSync } from 'node:fs';
import { createPrivateKey, sign } from 'node:crypto';

const args = process.argv.slice(2);
const cmd = args[0];
const opt = (name: string) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : undefined; };
const opts = (name: string) => args.flatMap((a, i) => (a === `--${name}` ? [args[i + 1]] : []));

const cfg = JSON.parse(readFileSync('.release/asc/config.json', 'utf8')) as { issuerId: string; keyId: string; keyPath: string };
const key = createPrivateKey(readFileSync(cfg.keyPath));

/** ES256 JWT, 15 minutes, as Apple specifies. */
function token(): string {
  const b64 = (o: object | Buffer) => Buffer.from(o instanceof Buffer ? o : JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const head = b64({ alg: 'ES256', kid: cfg.keyId, typ: 'JWT' });
  const body = b64({ iss: cfg.issuerId, iat: now, exp: now + 15 * 60, aud: 'appstoreconnect-v1' });
  const sig = sign('sha256', Buffer.from(`${head}.${body}`), { key, dsaEncoding: 'ieee-p1363' });
  return `${head}.${body}.${b64(sig)}`;
}

type Resource = { id: string; type: string; attributes: Record<string, unknown> };
async function api<T = { data: Resource[] }>(method: string, path: string, body?: unknown): Promise<T> {
  const r = await fetch(`https://api.appstoreconnect.apple.com/v1${path}`, {
    method, headers: { authorization: `Bearer ${token()}`, 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
  });
  if (r.status === 204) return undefined as T;
  const j = await r.json() as T & { errors?: { title: string; detail: string }[] };
  if (!r.ok) throw new Error(`${method} ${path}: ${r.status} ${(j.errors ?? []).map(e => `${e.title}: ${e.detail}`).join('; ')}`);
  return j;
}

async function app(bundle: string): Promise<Resource> {
  const { data } = await api('GET', `/apps?filter[bundleId]=${encodeURIComponent(bundle)}`);
  if (!data.length) throw new Error(`No app with bundle id ${bundle}`);
  return data[0];
}
async function build(appId: string, version: string): Promise<Resource | undefined> {
  const { data } = await api('GET', `/builds?filter[app]=${appId}&filter[version]=${version}&sort=-uploadedDate&limit=5`);
  return data[0];
}
async function groups(appId: string): Promise<Resource[]> {
  return (await api('GET', `/betaGroups?filter[app]=${appId}&limit=50`)).data;
}
const describe = (b: Resource) => `build ${b.attributes.version} (${b.attributes.processingState}${b.attributes.expired ? ', expired' : ''}) uploaded ${b.attributes.uploadedDate}`;

const bundle = opt('bundle');
if (cmd === 'register' && bundle) {
  // Registers the explicit App ID in the developer portal. Creating the App
  // Store Connect app record itself isn't possible through the API.
  const { data } = await api('GET', `/bundleIds?filter[identifier]=${encodeURIComponent(bundle)}`);
  const existing = data.find(d => d.attributes.identifier === bundle);
  if (existing) console.log(`bundle id ${bundle} already registered (${existing.id})`);
  else {
    const name = opt('name') ?? bundle;
    const made = (await api<{ data: Resource }>('POST', '/bundleIds', { data: { type: 'bundleIds', attributes: { identifier: bundle, name, platform: 'IOS' } } })).data;
    console.log(`registered bundle id ${bundle} (${made.id})`);
  }
  const apps = (await api('GET', `/apps?filter[bundleId]=${encodeURIComponent(bundle)}`)).data;
  console.log(apps.length ? `app record exists: ${apps[0].attributes.name} (${apps[0].id})` : 'no App Store Connect app record yet: create it in the web UI');
  process.exit(0);
}
if (!cmd || !bundle) { console.error('usage: asc.mts status|release|groups|submit --bundle <id> [--build <n>] [--group <name>] [--version <x.y.z> --notes-file <path> --dry-run]'); process.exit(2); }
const a = await app(bundle);
console.log(`${a.attributes.name} (${bundle})`);

if (cmd === 'submit') {
  // App Store release: create (or reuse) the version, attach a processed build,
  // set What's New, check the review details carried over, then submit for
  // review with release after approval. --dry-run stops before submitting.
  const versionString = opt('version'); const buildNo = opt('build'); const notesFile = opt('notes-file');
  if (!versionString || !buildNo) throw new Error('--version <x.y.z> and --build <n> are required');
  const b = await build(a.id, buildNo);
  if (!b || b.attributes.processingState !== 'VALID') throw new Error(`build ${buildNo} is not processed: ${b ? describe(b) : 'not uploaded'}`);
  console.log(`  ${describe(b)}`);
  let v = (await api('GET', `/apps/${a.id}/appStoreVersions?filter[versionString]=${versionString}&limit=1`)).data[0];
  if (!v) {
    v = (await api<{ data: Resource }>('POST', '/appStoreVersions', { data: { type: 'appStoreVersions', attributes: { platform: 'IOS', versionString, releaseType: 'AFTER_APPROVAL' }, relationships: { app: { data: { type: 'apps', id: a.id } } } } })).data;
    console.log(`  created version ${versionString}`);
  } else console.log(`  version ${versionString} is ${v.attributes.appStoreState}`);
  if (!['PREPARE_FOR_SUBMISSION', 'DEVELOPER_REJECTED', 'REJECTED', 'METADATA_REJECTED'].includes(String(v.attributes.appStoreState))) throw new Error(`version ${versionString} cannot be edited in state ${v.attributes.appStoreState}`);
  await api('PATCH', `/appStoreVersions/${v.id}/relationships/build`, { data: { type: 'builds', id: b.id } });
  console.log(`  build ${buildNo} attached`);
  if (notesFile) {
    const whatsNew = readFileSync(notesFile, 'utf8').trim();
    for (const l of (await api('GET', `/appStoreVersions/${v.id}/appStoreVersionLocalizations`)).data) {
      await api('PATCH', `/appStoreVersionLocalizations/${l.id}`, { data: { type: 'appStoreVersionLocalizations', id: l.id, attributes: { whatsNew } } });
      console.log(`  what's new set for ${l.attributes.locale}`);
    }
  }
  // Apple copies the review contact, demo account and notes from the previous version; refuse if that did not happen.
  const rd = (await api<{ data: Resource | null }>('GET', `/appStoreVersions/${v.id}/appStoreReviewDetail`).catch(() => ({ data: null }))).data;
  if (!rd) throw new Error('no App Review details on this version; set them in App Store Connect first');
  console.log(`  review details: contact ${rd.attributes.contactFirstName}, demo account ${rd.attributes.demoAccountRequired ? 'yes' : 'no'}`);
  if (args.includes('--dry-run')) { console.log('  dry run: not submitted'); process.exit(0); }
  const sub = (await api<{ data: Resource }>('POST', '/reviewSubmissions', { data: { type: 'reviewSubmissions', attributes: { platform: 'IOS' }, relationships: { app: { data: { type: 'apps', id: a.id } } } } })).data;
  await api('POST', '/reviewSubmissionItems', { data: { type: 'reviewSubmissionItems', relationships: { reviewSubmission: { data: { type: 'reviewSubmissions', id: sub.id } }, appStoreVersion: { data: { type: 'appStoreVersions', id: v.id } } } } });
  const done = (await api<{ data: Resource }>('PATCH', `/reviewSubmissions/${sub.id}`, { data: { type: 'reviewSubmissions', id: sub.id, attributes: { submitted: true } } })).data;
  console.log(`  submitted: ${done.attributes.state} (${done.attributes.submittedDate}); releases automatically after approval`);
} else if (cmd === 'groups') {
  for (const g of await groups(a.id)) console.log(`  ${g.attributes.isInternalGroup ? 'internal' : 'external'}  ${g.attributes.name}  ${g.id}`);
} else {
  const version = opt('build');
  if (!version) throw new Error('--build <n> is required');
  let b = await build(a.id, version);
  if (cmd === 'status') { console.log(b ? `  ${describe(b)}` : '  not uploaded yet'); process.exit(0); }
  // Apple usually processes a build in 10–30 minutes; poll for up to an hour.
  for (let i = 0; i < 60 && (!b || b.attributes.processingState !== 'VALID'); i++) {
    console.log(`  waiting: ${b ? describe(b) : 'not visible yet'}`);
    if (b && ['FAILED', 'INVALID'].includes(String(b.attributes.processingState))) throw new Error('Apple rejected the build in processing');
    await new Promise(r => setTimeout(r, 60_000));
    b = await build(a.id, version);
  }
  if (!b || b.attributes.processingState !== 'VALID') throw new Error('Gave up waiting for processing');
  console.log(`  ${describe(b)}`);
  const wanted = opts('group');
  const all = await groups(a.id);
  const targets = wanted.length ? all.filter(g => wanted.includes(String(g.attributes.name))) : all;
  const missing = wanted.filter(w => !targets.some(g => g.attributes.name === w));
  if (missing.length) throw new Error(`No such group: ${missing.join(', ')}`);
  for (const g of targets) {
    // An internal group set to "all builds" gets every build the moment it is
    // processed; Apple refuses an explicit assignment (422), so report and move on.
    if (g.attributes.isInternalGroup && g.attributes.hasAccessToAllBuilds) { console.log(`  internal group "${g.attributes.name}" already has every build`); continue; }
    // An external group needs Beta App Review on the build first (once per build).
    if (!g.attributes.isInternalGroup) {
      const sub = await api<{ data: Resource | null }>('GET', `/builds/${b.id}/betaAppReviewSubmission`).catch(() => ({ data: null }));
      if (!sub.data) {
        await api('POST', '/betaAppReviewSubmissions', { data: { type: 'betaAppReviewSubmissions', relationships: { build: { data: { type: 'builds', id: b.id } } } } });
        console.log('  submitted for Beta App Review');
      } else console.log(`  beta review: ${sub.data.attributes.betaReviewState}`);
    }
    await api('POST', `/betaGroups/${g.id}/relationships/builds`, { data: [{ type: 'builds', id: b.id }] });
    console.log(`  added to ${g.attributes.isInternalGroup ? 'internal' : 'external'} group "${g.attributes.name}"`);
  }
  console.log('done');
}

import { Scraper } from 'agent-twitter-client';
const username = process.env.X_USERNAME || 'chen_og0023';
const password = process.env.X_PASSWORD;
if (!password) { console.error('Set X_PASSWORD env var'); process.exit(1); }
const s = new Scraper({ verbose: false });
console.log('Logging in as', username, '...');
await s.login(username, password);
const cookies = await s.getCookies();
const strs = cookies.map(c => `${c.key}=${c.value}; Domain=${c.domain}; Path=${c.path}${c.secure ? '; Secure' : ''}`);
console.log('\n=== X_COOKIES (copy this) ===');
console.log(JSON.stringify(strs));

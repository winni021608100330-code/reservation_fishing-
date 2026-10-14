const ISSUER='https://token.actions.githubusercontent.com';
export const AUDIENCE='coconut-fishing-state';
function bytes(text){if(!/^[A-Za-z0-9_-]+$/.test(text))throw Error('invalid_token');const base=text.replace(/-/g,'+').replace(/_/g,'/');return Uint8Array.from(atob(base.padEnd(Math.ceil(base.length/4)*4,'=')),c=>c.charCodeAt(0));}
function json(text){return JSON.parse(new TextDecoder().decode(bytes(text)));}
export async function verifyGithub(token,config,fetcher=fetch){
 if(typeof token!=='string'||token.length>16000)throw Error('invalid_token');const parts=token.split('.');if(parts.length!==3)throw Error('invalid_token');const header=json(parts[0]),claims=json(parts[1]),now=Math.floor(Date.now()/1000);
 if(header.alg!=='RS256'||typeof header.kid!=='string'||claims.iss!==ISSUER||claims.aud!==AUDIENCE||!Number.isFinite(claims.exp)||claims.exp<=now||claims.iat>now+60||claims.nbf>now+60)throw Error('invalid_claims');
 if(String(claims.repository_id)!==config.repoId||String(claims.repository_owner_id)!==config.ownerId||claims.repository!==config.repository||claims.repository_visibility!=='public'||!config.refs.includes(claims.ref)||claims.workflow_ref!==config.repository+'/.github/workflows/fishing-cloudflare.yml@'+claims.ref)throw Error('workflow_not_allowed');
 const response=await fetcher(ISSUER+'/.well-known/jwks');if(!response.ok)throw Error('issuer_unavailable');const keys=await response.json(),jwk=keys.keys?.find(k=>k.kid===header.kid&&k.kty==='RSA'&&(!k.alg||k.alg==='RS256'));if(!jwk)throw Error('issuer_key_not_found');const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,bytes(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))throw Error('invalid_signature');return claims;
}

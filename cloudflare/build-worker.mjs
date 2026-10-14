import fs from 'node:fs/promises';
const boats=(await fs.readFile(new URL('../netlify/functions/lib/boats.mjs',import.meta.url),'utf8')).replace(/export /g,'');
const status=(await fs.readFile(new URL('../netlify/functions/status.mjs',import.meta.url),'utf8')).replace(/^import .*\r?\n/m,'').replace('export default async (req) => {','const getStatus = async (req) => {');
const router=await fs.readFile(new URL('./router-template.mjs',import.meta.url),'utf8');await fs.writeFile(new URL('./public/_worker.js',import.meta.url),boats+'\n'+status+'\n'+router);console.log('Cloudflare worker built from preserved boat parser and status logic');

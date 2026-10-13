import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { gameApi } from '../../../src/api.js';
export const dynamic = 'force-dynamic';
export async function GET(request: Request) {
  const user=await getChatGPTUser();
  return gameApi(request,env.DB,user?.userId);
}
export async function POST(request: Request) {
  const user=await getChatGPTUser();
  return gameApi(request,env.DB,user?.userId);
}

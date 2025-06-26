// lib/snaptradeClient.ts
import dotenv from 'dotenv';
import { Snaptrade } from 'snaptrade-typescript-sdk';

dotenv.config();

export const snaptrade = new Snaptrade({
  clientId: process.env.SNAPTRADE_CLIENT_ID,
  consumerKey: process.env.SNAPTRADE_CONSUMER_KEY!,
});

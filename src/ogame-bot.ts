#!/usr/bin/env node

import { bot } from './bot/bot';

bot().catch(e => {
  console.error(e);
  console.error('An error occured');
});

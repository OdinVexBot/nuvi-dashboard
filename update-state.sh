#!/bin/bash
cd /home/apps/nuvi-dashboard
eval "$(node /home/ClawdBotAdmin/.openclaw/akv-env/akv-to-env.js --export-env 2>/dev/null)"
node scripts/update-nuvi-state.js >> update.log 2>&1

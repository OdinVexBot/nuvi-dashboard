#!/bin/bash
cd /home/ClawdBotAdmin/.openclaw/workspace/skills/m365-graph-vexbot
eval "$(node /home/ClawdBotAdmin/.openclaw/akv-env/akv-to-env.js --export-env 2>/dev/null)"
node scripts/update-nuvi-state.js >> /home/apps/nuvi-dashboard/update.log 2>&1

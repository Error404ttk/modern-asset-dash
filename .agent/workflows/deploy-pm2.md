---
description: Deploy the application using PM2 and Serve
---

This workflow builds the application and starts/restarts it using PM2.

1. Install dependencies (if not already done)
```bash
npm install
```

2. Build the application
// turbo
```bash
npm run build
```

3. Start or Restart PM2
// turbo
```bash
pm2 start ecosystem.config.cjs
```

4. Save PM2 list (optional, for startup persistence)
```bash
pm2 save
```

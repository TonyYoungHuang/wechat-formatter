# Paibanmao Production Operations

This runbook covers the first paid beta deployment for Paibanmao SaaS.

## Release Order

1. Pull or upload the new release.
2. Install dependencies with `corepack pnpm install --frozen-lockfile`.
3. Run `corepack pnpm check:env`.
4. Run `corepack pnpm prisma validate`.
5. Run `corepack pnpm db:deploy`.
6. Run `corepack pnpm prisma:generate`.
7. Run `corepack pnpm build`.
8. Restart the process manager.
9. Run `OPS_BASE_URL=https://paibanmao.cn corepack pnpm ops:verify`.
10. Run `SMOKE_BASE_URL=https://paibanmao.cn corepack pnpm smoke:public`.

Run `smoke:app` against production only with a planned smoke account and enough quota, because it writes data.

## Process Manager

PM2 option:

```bash
mkdir -p logs
corepack pnpm install --frozen-lockfile
corepack pnpm build
pm2 start ecosystem.config.cjs
pm2 save
pm2 logs paibanmao-saas
```

systemd option:

```bash
sudo cp deploy/paibanmao.service /etc/systemd/system/paibanmao.service
sudo systemctl daemon-reload
sudo systemctl enable paibanmao
sudo systemctl restart paibanmao
sudo journalctl -u paibanmao -f
```

## Nginx

Use `deploy/nginx-paibanmao.conf` as the starting point, then verify:

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -I https://paibanmao.cn/api/health
```

## Logs

Server-side unexpected API errors are written as JSON lines with:

- `level`
- `message`
- `service`
- `timestamp`
- contextual fields such as `error`, `jobId`, and `generationJobId`

PM2 writes to `logs/pm2-out.log` and `logs/pm2-error.log`. systemd writes to journald.

## Alerts

Use `ops:verify` from cron, a cloud monitor, or BaoTa scheduled task:

```bash
OPS_BASE_URL=https://paibanmao.cn \
HEALTH_ALERT_WEBHOOK_URL=https://your-webhook.example/paibanmao \
corepack pnpm ops:verify
```

The script checks `/api/health`, `/robots.txt`, and `/sitemap.xml`. If a check fails and `HEALTH_ALERT_WEBHOOK_URL` is set, it posts a JSON alert payload.

## Backups

Install PostgreSQL client tools so `pg_dump` is available, then run:

```bash
BACKUP_DIR=/data/backups/paibanmao corepack pnpm backup:db
```

Keep at least:

- 7 daily backups
- 4 weekly backups
- 3 monthly backups

Test restore before launch:

```bash
createdb paibanmao_restore_test
pg_restore --dbname paibanmao_restore_test /data/backups/paibanmao/paibanmao-YYYY-MM-DD.dump
```

## Migration Safety

Before every production migration:

1. Run `backup:db`.
2. Run `prisma migrate deploy` on staging or a copied database.
3. Confirm the release starts with the new Prisma client.
4. Deploy during a low-traffic window.
5. Keep the previous release artifact available for rollback.

Never edit an already-applied migration. Create a new migration instead.

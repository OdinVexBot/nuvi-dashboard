# GitHub Webhook Setup Instructions

This guide will help you set up automatic deployment for the nuvi-dashboard when you push changes to GitHub.

## Step 1: Configure the Webhook Script

1. Open `webhook.php` and update these variables:
   ```php
   $SECRET = 'your-secret-key-here'; // Generate a random string (use: openssl rand -hex 32)
   $REPO_PATH = '/home/apps/nuvi-dashboard'; // Verify this is the correct path
   ```

2. Generate a secure secret key:
   ```bash
   openssl rand -hex 32
   ```
   Copy the output and use it as your `$SECRET`.

## Step 2: Deploy the Webhook Script

1. The `webhook.php` file should be accessible via HTTPS at a URL like:
   ```
   https://lab.odinz.net/lab/nuvi/webhook.php
   ```

2. Make sure the webhook script has the correct permissions:
   ```bash
   chmod 644 /home/apps/nuvi-dashboard/webhook.php
   ```

3. Ensure the web server user (www-data, apache, nginx, etc.) can run git commands:
   ```bash
   # Make sure the repo directory is owned by the web server user
   sudo chown -R www-data:www-data /home/apps/nuvi-dashboard

   # OR configure git to allow the directory
   cd /home/apps/nuvi-dashboard
   git config --global --add safe.directory /home/apps/nuvi-dashboard
   ```

## Step 3: Configure GitHub Webhook

1. Go to your GitHub repository: https://github.com/OdinVexBot/nuvi-dashboard

2. Click **Settings** → **Webhooks** → **Add webhook**

3. Configure the webhook:
   - **Payload URL**: `https://lab.odinz.net/lab/nuvi/webhook.php`
   - **Content type**: `application/json`
   - **Secret**: Paste the secret key you generated in Step 1
   - **Which events**: Select "Just the push event"
   - **Active**: ✓ Checked

4. Click **Add webhook**

## Step 4: Test the Webhook

1. Make a small change to the repository and push it:
   ```bash
   echo "# Test" >> README.md
   git add README.md
   git commit -m "Test webhook deployment"
   git push
   ```

2. Check the webhook delivery in GitHub:
   - Go to **Settings** → **Webhooks** → Click on your webhook
   - Click **Recent Deliveries** tab
   - You should see a successful delivery (green checkmark)

3. Check the log file on your server:
   ```bash
   tail -f /home/apps/nuvi-dashboard/webhook.log
   ```

## Troubleshooting

### Webhook returns 403 (Forbidden)
- The secret doesn't match. Verify the secret in `webhook.php` matches the GitHub webhook secret.

### Webhook returns 500 (Internal Server Error)
- Check the webhook.log file for errors
- Verify the web server user has permission to run git commands
- Verify the repository path is correct

### Git pull fails with "permission denied"
- Run: `sudo chown -R www-data:www-data /home/apps/nuvi-dashboard`
- Or configure git safe.directory as shown above

### Changes don't appear on the site
- Check if the git pull actually happened: `git log` on the server
- Verify the web server is serving from the correct directory
- Clear browser cache (Ctrl+Shift+R)

## Security Notes

- **Never commit the webhook.php file with a real secret to git!**
- Add the secret as an environment variable or use a separate config file
- Keep the webhook URL non-obvious (rename webhook.php to something unique)
- Monitor the webhook.log file for suspicious activity

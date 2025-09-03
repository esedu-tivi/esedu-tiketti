# Discord Bot Setup Guide

## Quick Setup Decision Tree

### 🎯 Do you have custom roles in your Discord server?

**NO - Just @everyone and the bot role:**
- Grant the bot **Administrator** permission for simplest setup
- This bypasses all permission complexity
- Go to: Server Settings → Roles → EseduTiketti → Enable "Administrator"

**YES - Multiple roles exist:**
- Move the bot role **above** all member roles
- The bot needs to be higher than roles it manages
- Go to: Server Settings → Roles → Drag bot role up in the hierarchy

## Required Bot Permissions

If not using Administrator, the bot needs these specific permissions:

### Permission List
- ✅ **View Channels** - To see and access channels
- ✅ **Manage Channels** - To create private ticket channels
- ✅ **Manage Roles** - To set channel permissions for users (CRITICAL!)
- ✅ **Send Messages** - To send messages in channels
- ✅ **Embed Links** - To send rich message embeds
- ✅ **Read Message History** - To read previous messages in channels
- ✅ **Use Application Commands** - To register and use slash commands

## Setup Instructions

### Option 1: Invite Link with Permissions (Recommended)

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Select your bot application
3. Navigate to **OAuth2** → **URL Generator**
4. Select the following scopes:
   - `bot`
   - `applications.commands`
5. Select the required bot permissions listed above
6. Copy the generated URL
7. Use this URL to invite the bot to your server

### Option 2: Manual Permission Setup

If the bot is already in your server:

1. Open Discord and go to your server
2. Right-click on the server name → **Server Settings**
3. Navigate to **Roles**
4. Find your bot's role (usually named after the bot)
5. Enable all the permissions listed above
6. Save changes

### Option 3: Create Permission Integer

Use this permission integer when creating invite links: `536988752`

This includes:
- View Channels
- Send Messages
- Embed Links
- Manage Channels
- Manage Roles
- Read Message History
- Use Application Commands

## Troubleshooting

### "Missing Permissions" Error

If you see this error when using `/tiketti`:

**For Simple Servers (only @everyone + bot role):**
1. Grant Administrator permission to the bot
2. Server Settings → Roles → Bot Role → Enable "Administrator"
3. This is the easiest solution for simple setups

**For Complex Servers (multiple roles):**
1. Check the bot's position in role hierarchy
2. Server Settings → Roles → Drag bot role ABOVE member roles
3. Ensure "Manage Roles" permission is enabled

### Bot Can't Create Private Channels

**Common Issues:**
1. **Role Hierarchy**: Bot role must be ABOVE roles it manages
2. **Missing "Manage Roles"**: This permission is critical for setting channel permissions
3. **Simple Fix**: Grant Administrator if you trust the bot

### Channels Created But Not Private

This happens when the bot can create channels but can't set permissions:
- **Solution 1**: Grant Administrator permission (easiest)
- **Solution 2**: Ensure bot role is high in hierarchy + has "Manage Roles"

### Category Permissions

If using a category for tickets:
1. Right-click the category → Edit Category
2. Go to Permissions
3. Add the bot with all required permissions
4. Make sure the bot can manage permissions in that category

## Environment Variables

Optional configuration in `.env`:

```env
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_TICKET_CATEGORY_ID=category_id_for_tickets  # Optional

# Cleanup Configuration (in hours)
DISCORD_CLEANUP_INTERVAL_HOURS=1        # How often to check for cleanup
DISCORD_CLOSED_TICKET_TTL_HOURS=24      # Delete closed tickets after X hours
DISCORD_INACTIVE_TICKET_TTL_HOURS=48    # Delete inactive tickets after X hours
```

## Testing

After setup, test the bot:

1. Type `/tiketti` in any channel
2. The bot should create a private ticket channel
3. Follow the prompts to create a ticket
4. Test closing the ticket with the button

If you encounter any issues, check:
- Bot permissions (the bot will tell you what's missing)
- Bot role hierarchy
- Environment variables are set correctly
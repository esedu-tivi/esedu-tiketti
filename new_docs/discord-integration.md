# Discord Integration

## Overview

The esedu-tiketti system includes Discord integration that allows users to create support tickets directly from Discord without needing to link accounts. When a user creates a ticket via Discord, a private channel is created for communication between the user and support staff.

## Features

### 1. Ticket Creation via Discord
- **Command**: `/tiketti` - Creates a new support ticket
- **Process**: 
  1. User runs `/tiketti` command
  2. Bot creates a private channel visible only to the user
  3. Bot guides user through ticket creation via conversation
  4. Ticket is created in the web application
  5. Channel becomes a live communication bridge

### 2. Bidirectional Message Sync
- Messages sent in Discord appear as comments in the web app in real-time
- Comments from support staff in web app appear instantly in Discord channel
- Attachments (images/videos) are synchronized
- Status updates are reflected in both systems
- WebSocket ensures real-time updates without refresh

### 3. Automatic User Management
- Discord users are automatically created in the system
- No account linking required
- Users identified by Discord ID
- Email format: `discord_{user_id}@discord.local`

### 4. Status Management & Permissions
- Discord users can close their own tickets via button
- Support agents can reopen tickets from web app
- Permissions automatically adjust:
  - **Open/In Progress**: User can send messages
  - **Resolved/Closed**: User has read-only access (cannot send messages)
  - **Reopened**: Full permissions restored with notification

### 5. Automatic Channel Cleanup
- **Closed tickets**: Channels deleted after 24 hours
- **Inactive tickets**: Channels deleted after 48 hours
- **Manual deletion**: Immediate channel removal when ticket deleted in web app
- Configurable TTL (Time To Live) settings
- Cleanup service runs hourly
- **Cleanup countdown**: Bot status displays next cleanup time

### 6. Bot Status Display
- **Rotating status**: Displays ticket statistics and cleanup countdown
- **Ticket counts**: Shows open, in progress, and total tickets
- **Real-time updates**: Status updates immediately when tickets change
- **Event-driven**: No database polling, purely event-based updates
- **Format**: Custom status without "Playing/Watching/Listening" prefixes

### 7. Ticket Broadcast Notifications
- **Support channel notifications**: Broadcasts new ticket creation to configured Discord channel
- **Real-time alerts**: Support agents get instant notifications about new tickets
- **Rich embeds**: Shows ticket details including title, description, priority, category, and creator
- **Finnish language**: All messages displayed in Finnish
- **Configurable**: Enable/disable broadcasts and select target channel via admin panel
- **Human tickets only**: Only broadcasts human-created tickets (excludes AI-generated training tickets)
- **Works for web and Discord**: Notifies for both web and Discord-created tickets by real users

## Technical Implementation

### Database Schema

The following fields were added to support Discord integration:

#### User Model
```prisma
isDiscordUser   Boolean   @default(false)
discordId       String?   @unique
discordUsername String?
discordServerId String?
```

#### Ticket Model
```prisma
sourceType        String?  @default("WEB") // "WEB" | "DISCORD"
discordChannelId  String?  @unique
discordServerId   String?
```

#### Comment Model
```prisma
discordMessageId String?
isFromDiscord    Boolean @default(false)
```

#### DiscordSettings Model
```prisma
broadcastChannelId  String?  // Discord channel ID for ticket creation broadcasts
enableBroadcast     Boolean  @default(false)  // Enable/disable ticket creation broadcasts
```

### Discord Bot Architecture

#### Core Files
- `backend/src/discord/bot.ts` - Main bot setup and slash command registration
- `backend/src/discord/ticketConversation.ts` - Conversational ticket creation flow
- `backend/src/discord/messageSync.ts` - Bidirectional message synchronization

#### Key Components

1. **Bot Initialization** (`bot.ts`)
   - Registers `/tiketti` slash command
   - Handles interaction events
   - Creates private channels with proper permissions
   - **Status management**: Rotates between ticket counts and cleanup countdown
   - **Event-driven updates**: `onTicketChanged()` method for instant status updates
   - **Performance optimized**: No recurring database queries

2. **Ticket Creation Flow** (`ticketConversation.ts`)
   - Guides user through ticket creation
   - Collects title, description, and device information
   - Creates ticket in database
   - Sets up message sync for ongoing communication
   - **Finnish-only**: All messages and prompts in Finnish

3. **Message Synchronization** (`messageSync.ts`)
   - `setupChannelSync()` - Listens for Discord messages and syncs to web app
   - `sendMessageToDiscord()` - Sends web app comments to Discord
   - `sendStatusUpdateToDiscord()` - Sends status changes to Discord
   - **Permission handling**: Removes send permissions for RESOLVED/CLOSED tickets

4. **Channel Cleanup** (`channelCleanup.ts`)
   - Hourly cleanup job for old tickets
   - Immediate deletion when ticket deleted from web
   - Configurable TTL settings
   - Status countdown display integration

### Integration Points

#### Comment Controller
The comment controller (`ticketController.ts`) was updated to:
- Send comments to Discord when ticket has `discordChannelId`
- Exclude Discord users from sending duplicate messages

#### Status Updates
When ticket status changes:
- System sends formatted embed to Discord channel
- Shows old status, new status, and who made the change
- Special handling for CLOSED/RESOLVED status (read-only permissions)
- Discord bot status updates immediately via event system
- Timeline entries created for all status changes

## Configuration

### Environment Variables
Add these to your `.env` file:

```env
# Discord Integration
DISCORD_BOT_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_client_id_here
# Optional: Discord category ID for organizing ticket channels
# DISCORD_TICKET_CATEGORY_ID=1234567890123456789
```

### Broadcast Channel Setup
1. **Enable broadcast**: Go to Admin → Discord Settings → Broadcast tab
2. **Select channel**: Choose a Discord channel where support agents can see new ticket notifications
3. **Configure permissions**: Ensure bot has permission to send messages in the selected channel
4. **Test**: Create a test ticket to verify broadcasts are working

### Discord Bot Setup

1. **Create Discord Application**
   - Go to https://discord.com/developers/applications
   - Click "New Application"
   - Give it a name (e.g., "Esedu Tiketti Bot")

2. **Create Bot**
   - Go to "Bot" section
   - Click "Add Bot"
   - Copy the token for `DISCORD_BOT_TOKEN`
   - Enable "MESSAGE CONTENT INTENT" under Privileged Gateway Intents

3. **Get Client ID**
   - Go to "OAuth2" → "General"
   - Copy the Client ID for `DISCORD_CLIENT_ID`

4. **Set Bot Permissions - IMPORTANT!**
   
   **For Simple Servers (only @everyone + bot role):**
   - Grant **Administrator** permission for easiest setup
   - This bypasses all permission complexity
   
   **For Complex Servers (multiple roles):**
   - Required permissions:
     - View Channels
     - Manage Channels
     - **Manage Roles** (CRITICAL for private channels!)
     - Send Messages
     - Embed Links
     - Read Message History
     - Use Application Commands
   - **Bot role must be ABOVE member roles in hierarchy!**

5. **Invite Bot to Server**
   - Go to "OAuth2" → "URL Generator"
   - Select scopes: `bot`, `applications.commands`
   - Select required permissions (or Administrator)
   - Use generated URL to invite bot

6. **Configure Role Hierarchy**
   - Go to Discord Server Settings → Roles
   - **Simple setup**: Grant Administrator to bot role
   - **Advanced setup**: Drag bot role above member roles

## Usage Flow

### For Discord Users

1. **Create Ticket**
   ```
   User: /tiketti
   Bot: Creating private support channel...
   ```

2. **Provide Information**
   ```
   Bot: What's your issue briefly?
   User: Printer not working
   
   Bot: Please describe the issue in detail
   User: Room 205 printer shows paper jam but no paper stuck
   
   Bot: What device/software is affected?
   User: HP LaserJet in room 205
   ```

3. **Ticket Created**
   ```
   Bot: ✅ Ticket created!
        📋 Ticket ID: #ABC-123
        Status: Open
        Priority: Medium
   ```

4. **Ongoing Communication**
   - User sends messages in Discord channel
   - Support responds from web app
   - All messages synchronized

### For Support Staff

1. **See Discord Tickets in Web App**
   - Tickets show source as "DISCORD"
   - Discord username visible in ticket details

2. **Respond to Tickets**
   - Add comments normally in web app
   - Comments appear as embeds in Discord
   - Author shown as "Name (Support/Admin)"

3. **Update Status**
   - Change status in web app
   - Status update sent to Discord channel
   - Channel remains open for follow-up

## Message Formatting

### Support Messages in Discord
```
┌─────────────────────────────┐
│ John Doe (Tuki)             │
├─────────────────────────────┤
│ Voin auttaa tässä asiassa.  │
│ Kokeile käynnistää...       │
└─────────────────────────────┘
```

### Status Updates in Discord
```
📊 Tilan päivitys
Edellinen: Avoin
Uusi: Käsittelyssä  
Päivittänyt: John Doe
```

### Bot Status Display
```
🎫 Avoimia: 5 | Käsittelyssä: 3 | Yhteensä: 12
```
Alternating with:
```
🧹 Seuraava siivous: 2h 30min
```

## User Management Features

### User Blocking
- **Block users from creating tickets**: Admin can block Discord users who abuse the system
- **Instant rejection**: Blocked users receive immediate error message when using `/tiketti`
- **No channel creation**: System prevents channel creation for blocked users
- **Block toggle**: Easy block/unblock through web UI

### Ticket Creation Cancellation
- **Cancel button**: Users can cancel ticket creation at any time during the process
- **Channel cleanup**: Cancelled channels are automatically deleted after 3 seconds
- **No database pollution**: Cancelled tickets don't create database entries

## Channel Cleanup System

### Automatic Cleanup Rules
1. **Closed tickets**: Deleted after `cleanupTTLHours` (default: 24 hours)
2. **Inactive tickets**: Deleted after `inactiveTTLHours` (default: 48 hours)
3. **Orphaned channels**: Deleted after 1 hour if no ticket created
   - Handles cancelled ticket creation
   - Cleans up failed ticket creation attempts
   - Prevents channel accumulation

### Cleanup Process
- **Hourly execution**: Cleanup runs every hour automatically
- **Single timer**: All cleanup tasks happen in same cycle for efficiency
- **Configurable TTLs**: Admin can adjust cleanup timing through settings
- **Smart detection**: Only deletes channels with no user activity

## Security Considerations

1. **Channel Permissions**
   - Only ticket creator and bot can view channel
   - Guild default permissions denied
   - Support staff don't need Discord accounts

2. **User Isolation**
   - Discord users can't access web app directly
   - Separate user accounts with `isDiscordUser` flag
   - No sensitive data exposed in Discord
   - Blocked users tracked with `isBlocked` flag

3. **Rate Limiting**
   - Message collectors have 10-minute timeout
   - Prevents channel spam
   - Automatic cleanup of inactive collectors

## Troubleshooting

### Bot Not Responding
- Check `DISCORD_BOT_TOKEN` is set correctly
- Verify bot has required permissions
- Check logs for connection errors

### Messages Not Syncing
- Verify `discordChannelId` is set on ticket
- Check if message collector is active
- Ensure bot can access the channel

### Commands Not Working
- Re-register commands after bot restart
- Check `DISCORD_CLIENT_ID` is correct
- Verify bot has slash command permissions

## Future Enhancements

Potential improvements for the Discord integration:

1. **Quick Actions**
   - Button to close ticket
   - Priority change buttons
   - Request more info button

2. **Channel Management**
   - Auto-archive after resolution
   - Channel categories by status
   - Scheduled cleanup of old channels

3. **Rich Media**
   - Better attachment handling
   - Screen sharing support
   - Voice channel creation for calls

4. **Advanced Features**
   - Multi-language support
   - Custom ticket forms
   - Integration with knowledge base
   - Ticket templates

5. **Analytics**
   - Discord-specific metrics
   - Response time tracking
   - User satisfaction from Discord
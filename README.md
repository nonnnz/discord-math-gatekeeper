# 🧪 The Discord Gauntlet

A collection of chaotic and experimental features for Discord servers! Currently featuring:

1. **Troll Math Verification**: Forces users to solve complex math problems to enter a voice channel. 💀
2. **Gemini TTS Voice**: An AI-powered voice that speaks with customizable personas (Default: Rage Gamer). 🗣️

## ✨ Features

- **Math Verification**: Users attempting to join the "Waiting Room" are blocked until they solve a math problem.
- **Complex Logic**:
  - 70% Chance: Standard Ops (`+`, `-`, `*`, `/`) with parentheses.
  - 30% Chance: **University Level** (Calculus, Integrals, Logs, Factorials, Modulo).
- **Gemini TTS (Text-to-Speech)**: High-quality AI voice generation using `gemini-3.1-flash-tts-preview`.
- **Dynamic Personas**: Customize how the bot speaks via the `/setprompt` command.
- **Gen Z / Troll Persona**: Uses heavy slang ("no cap", "rizz", "skill issue") and emojis.
- **Roast & Retry**: Wrong answers trigger roasts and immediate new problems.

## 🎮 Commands

| Command                | Description                                                                                |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| `/join <room_id>`      | Joins a voice channel.                                                                     |
| `/leave`               | Leaves the current voice channel.                                                          |
| `/say <text> [prompt]` | Speaks text using Gemini TTS. If `prompt` is provided, it permanently updates the persona. |
| `/setprompt <prompt>`  | Updates the persona prompt for the server.                                                 |
| `/reset`               | Resets the persona prompt back to default.                                                 |

## 🚀 Setup

### 1. Prerequisites

- [Bun](https://bun.sh) (Recommended) or Node.js.
- Discord Bot Token with `Guilds`, `GuildVoiceStates`, `GuildMessages`, `MessageContent` intents.
- [Google Gemini API Key](https://aistudio.google.com/app/apikey).

### 2. Installation

```bash
bun install
```

### 3. Configuration

Create a `.env` file in the root directory:

```env
DISCORD_TOKEN=your_bot_token_here
GUILD_ID=your_server_id (for instant command updates)
SOURCE_VOICE_CHANNEL_ID=voice_channel_id_to_watch
TARGET_VOICE_CHANNEL_ID=voice_channel_id_to_move_users_to
ASK_CHANNEL_ID=text_channel_id_for_questions
GEMINI_API_KEY=your_gemini_api_key
```

### 4. Run the Bot

**Development:**

```bash
bun run dev
```

**Production:**

```bash
bun run start
```

## 🚀 Production Best Practices

For production, it is recommended to use a process manager to ensure the bot restarts automatically if it crashes.

### Option 1: Using PM2

1. Install PM2: `npm install -g pm2`
2. Start the bot:
   ```bash
   pm2 start bun --name "fun-experiments-bot" -- run start
   ```

### Option 2: Using Systemd (Linux)

Create a service file at `/etc/systemd/system/fun-bot.service`:

```ini
[Unit]
Description=Discord Fun Experiments Bot
After=network.target

[Service]
Type=simple
User=your-user
WorkingDirectory=/path/to/DiscordBot-1
ExecStart=/usr/local/bin/bun run start
Restart=always

[Install]
WantedBy=multi-user.target
```

Then run: `systemctl enable --now fun-bot`

## 🧠 How it Works

### Math Verification

1.  User joins the **Source Voice Channel**.
2.  Bot sends a button-based math problem (e.g., `d/dx(x^2) | x=3`) to the user's DM or fallback channel.
3.  User clicks the button matching the answer (1️⃣-🔟).
4.  **Correct**: User is moved to the **Target Voice Channel**.
5.  **Wrong**: User gets roasted and a new problem appears.

### Voice TTS

1.  Bot must be in a voice channel (`/join`).
2.  The bot uses `ffmpeg` and `opusscript` to pipe Gemini's raw PCM audio into Discord.
3.  The Persona system uses Google AI Studio's best-practice prompting structure to define character behavior.

## 🤡 Example Roasts

> "Imagine failing math in 2026 💀"
> "Skill issue fr fr 📉"
> "My brother in Christ, use a calculator 📱"

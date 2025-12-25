# 🧮 Troll Math Verification Bot

A chaos-infused Discord bot that forces users to solve complex math problems to enter a voice channel. If they fail, they get roasted. 💀

## ✨ Features

- **Math Verification**: Users attempting to join the "Waiting Room" are blocked until they solve a math problem.
- **Complex Logic**:
  - 70% Chance: Standard Ops (`+`, `-`, `*`, `/`) with parentheses.
  - 30% Chance: **University Level** (Calculus, Integrals, Logs, Factorials, Modulo).
  - _Don't worry, they are solvable in your head (usually)._ 🧠
- **Gen Z / Troll Persona**: The bot uses heavy slang ("no cap", "rizz", "skill issue") and emojis.
- **Roast & Retry**:
  - Wrong answer? The bot roasts you with a random joke/insult.
  - Generates a **new** problem immediately in the same message.
- **Interactive Buttons**: 5 choices (1 correct, 4 random).

## 🚀 Setup

### 1. Prerequisites

- [Bun](https://bun.sh) (or Node.js)
- A Discord Bot Token with proper intents enabled (`Guilds`, `GuildVoiceStates`, `GuildMessages`, `MessageContent`).

### 2. Installation

```bash
bun install
```

### 3. Configuration

Create a `.env` file in the root directory:

```env
DISCORD_TOKEN=your_bot_token_here
SOURCE_VOICE_CHANNEL_ID=voice_channel_id_to_watch
TARGET_VOICE_CHANNEL_ID=voice_channel_id_to_move_users_to
ASK_CHANNEL_ID=text_channel_id_for_questions
```

### 4. Run the Bot

```bash
bun run bot.ts
```

## 🎮 How it Works

1.  User joins the **Source Voice Channel**.
2.  Bot sends a math problem (e.g., `(3 + 5) - 2` or `d/dx(x^2) | x=3`) to the **Ask Channel**.
3.  User clicks the button matching the answer (1️⃣-🔟).
4.  **Correct**: User is moved to the **Target Voice Channel**.
5.  **Wrong**: User gets roasted (ephemeral message) and a new problem appears.

## 🤡 Example Roasts

> "Imagine failing math in 2026 💀"
> "Skill issue fr fr 📉"
> "My brother in Christ, use a calculator 📱"

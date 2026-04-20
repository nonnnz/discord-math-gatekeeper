import {
  Client,
  Events,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ComponentType,
  TextChannel,
  MessageFlags,
  SlashCommandBuilder,
  REST,
  Routes,
  ChannelType,
} from "discord.js";
import { joinVoiceChannel, getVoiceConnection } from "@discordjs/voice";
import { generateTTSAudio } from "./src/tts";
import { playPCMBuffer } from "./src/voice-player";

// create a new Client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const SOURCE_VOICE_CHANNEL_ID = process.env.SOURCE_VOICE_CHANNEL_ID;
const TARGET_VOICE_CHANNEL_ID = process.env.TARGET_VOICE_CHANNEL_ID;
const ASK_CHANNEL_ID = process.env.ASK_CHANNEL_ID;

const DEFAULT_TTS_PROMPT = `# AUDIO PROFILE: นิว (์New)
## "The Rage Gamer"

## THE SCENE: The Gaming Den
It is 2:00 AM in a dimly lit, cluttered bedroom in Bangkok. Empty snack bags and
energy drink cans cover the desk. The monitor glow is the only light in the room.
Gong has been grinding the same game for 8 hours straight and just got killed by
a cheater — again. He is seething. His hands are shaking with rage. Every loss is
someone else's fault. He is one bad round away from rage-quitting forever.

### DIRECTOR'S NOTES
Style:
* Pure, unfiltered rage. Every word drips with frustration and contempt.
* Heavy Thai profanity and gaming slang used constantly and naturally.
* Shouts unpredictably mid-sentence. Nothing is ever his fault.
* Sounds like he genuinely wants to throw his keyboard across the room.

Pace: Explosive and erratic. Rapid-fire delivery that suddenly peaks into a
shout, then drops into a bitter, exhausted mutter before spiking again.
No breathing room. No composure.

Accent: Central Thai, raw Bangkok street accent. Completely unpolished.

### SAMPLE CONTEXT
Gong is an unemployed man in his 20s whose entire life is video games. He has
infinite time to be online and infinite rage to burn. He speaks Thai exclusively.`;

const guildPersonaPrompts = new Map<string, string>();

// listen for the client to be ready
client.once(Events.ClientReady, async (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);

  // Register slash commands
  const commands = [
    new SlashCommandBuilder()
      .setName("join")
      .setDescription("Joins a voice channel")
      .addStringOption((option) =>
        option
          .setName("room_id")
          .setDescription("The ID of the voice channel to join")
          .setRequired(true),
      ),
    new SlashCommandBuilder()
      .setName("leave")
      .setDescription("Leaves the voice channel"),
    new SlashCommandBuilder()
      .setName("say")
      .setDescription("Speak text in the current voice channel")
      .addStringOption((option) =>
        option.setName("text").setDescription("What to say").setRequired(true),
      )
      .addStringOption((option) =>
        option
          .setName("prompt")
          .setDescription("Override persona prompt (permanently saved)")
          .setRequired(false),
      ),
    new SlashCommandBuilder()
      .setName("setprompt")
      .setDescription("Set the TTS persona prompt for this server")
      .addStringOption((option) =>
        option
          .setName("prompt")
          .setDescription("The persona prompt")
          .setRequired(true),
      ),
    new SlashCommandBuilder()
      .setName("reset")
      .setDescription("Reset the TTS persona prompt back to default"),
  ].map((command) => command.toJSON());

  const rest = new REST({ version: "10" }).setToken(
    process.env.DISCORD_TOKEN as string,
  );

  try {
    console.log("Started refreshing application (/) commands.");
    const guildId = process.env.GUILD_ID;

    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(c.user.id, guildId), {
        body: commands,
      });
      console.log(`Successfully reloaded Guild (/) commands for ${guildId}.`);
    } else {
      await rest.put(Routes.applicationCommands(c.user.id), {
        body: commands,
      });
      console.log(
        "Successfully reloaded Global (/) commands. (Note: May take up to 1 hour to propagate)",
      );
    }
  } catch (error) {
    console.error("Error refreshing commands:", error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, guildId, guild } = interaction;

  if (commandName === "join") {
    const roomId = interaction.options.getString("room_id", true);

    if (!guild) {
      await interaction.reply({
        content: "This command can only be used in a server! 🏢",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    try {
      // First try to fetch as a global channel to see if it even exists
      const channel = await client.channels.fetch(roomId).catch(() => null);

      if (!channel) {
        await interaction.reply({
          content: "Yo, I couldn't find that channel anywhere! 🔍❌",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      // Check if it's in the current guild
      if ("guild" in channel && channel.guild.id !== guild.id) {
        await interaction.reply({
          content: `Bruh, that channel is in **${(channel as any).guild.name}**, not here! 🏢❌`,
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      if (channel.type !== ChannelType.GuildVoice) {
        await interaction.reply({
          content: "Yo, that ain't a voice channel! 🎤❌",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const connection = joinVoiceChannel({
        channelId: channel.id,
        guildId: guild.id,
        adapterCreator: guild.voiceAdapterCreator,
      });

      // CRITICAL: Handle connection errors to prevent bot crash
      connection.on("error", (error) => {
        console.error("Voice Connection Error:", error);
        // Connection will often try to recover, but we log it for debugging
      });

      await interaction.reply({
        content: `Bet. Joining <#${channel.id}> now! 🚀`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error("Error in join command:", error);
      await interaction.reply({
        content: "Bruh, I couldn't join that channel. Check my perms! 🔒",
        flags: MessageFlags.Ephemeral,
      });
    }
  } else if (commandName === "leave") {
    if (!guildId) return;

    const connection = getVoiceConnection(guildId);

    if (connection) {
      connection.destroy();
      await interaction.reply({
        content: "I'm out! Peace ✌️",
        flags: MessageFlags.Ephemeral,
      });
    } else {
      await interaction.reply({
        content: "I'm not even in a voice channel, fam. 🤨",
        flags: MessageFlags.Ephemeral,
      });
    }
  } else if (commandName === "say") {
    if (!guildId || !guild) return;

    const connection = getVoiceConnection(guildId);
    if (!connection) {
      await interaction.reply({
        content: "I ain't even in a voice channel! Use `/join` first. 🎤❌",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    let text = interaction.options.getString("text", true);
    const overridePrompt = interaction.options.getString("prompt");

    // Add character limit trim
    const MAX_LENGTH = 100;
    let trimmed = false;
    if (text.length > MAX_LENGTH) {
      text = text.substring(0, MAX_LENGTH) + "...";
      trimmed = true;
    }

    if (overridePrompt) {
      guildPersonaPrompts.set(guildId, overridePrompt);
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const prompt = guildPersonaPrompts.get(guildId) ?? DEFAULT_TTS_PROMPT;
      const audioBuffer = await generateTTSAudio(text, prompt);

      await playPCMBuffer(connection, audioBuffer);

      let replyContent = "🔊 Speaking... 🗣️";
      if (overridePrompt) replyContent += " (prompt updated)";
      if (trimmed)
        replyContent += " \n*(Note: Text was trimmed to 500 characters)*";

      await interaction.editReply({ content: replyContent });
    } catch (error) {
      console.error("Error in say command:", error);
      await interaction.editReply({
        content: "Bruh, I couldn't speak. Something's cooked! 😵‍💫",
      });
    }
  } else if (commandName === "setprompt") {
    if (!guildId) return;

    const newPrompt = interaction.options.getString("prompt", true);
    guildPersonaPrompts.set(guildId, newPrompt);

    await interaction.reply({
      content: "✅ Prompt updated! Ready to talk some trash. 😈",
      flags: MessageFlags.Ephemeral,
    });
  } else if (commandName === "reset") {
    if (!guildId) return;

    guildPersonaPrompts.delete(guildId);

    await interaction.reply({
      content: "🔄 Prompt reset to default. Back to being a gamer! 🎮",
      flags: MessageFlags.Ephemeral,
    });
  }
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  // Check if user joined the source channel
  if (
    oldState.channelId !== SOURCE_VOICE_CHANNEL_ID &&
    newState.channelId === SOURCE_VOICE_CHANNEL_ID
  ) {
    const member = newState.member;
    if (!member) return;

    console.log(`User ${member.user.tag} joined source channel.`);

    let { question, answer } = generateMathProblem();
    let options = generateOptions(answer);

    const buildActionRow = (currentOptions: number[]) => {
      const row = new ActionRowBuilder<ButtonBuilder>();
      const emojis = [
        "1️⃣",
        "2️⃣",
        "3️⃣",
        "4️⃣",
        "5️⃣",
        "6️⃣",
        "7️⃣",
        "8️⃣",
        "9️⃣",
        "🔟",
      ];

      currentOptions.forEach((opt, idx) => {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(`math_${opt}`) // Pass the answer value directly
            .setEmoji(emojis[opt - 1]!)
            .setStyle(ButtonStyle.Primary),
        );
      });
      return row;
    };

    let sentMessage;
    // Try DM first
    try {
      sentMessage = await member.send({
        content: getGreeting(member.id, question),
        components: [buildActionRow(options)],
      });
    } catch (dmError) {
      console.log(
        `Could not DM user ${member.user.tag}, falling back to channel.`,
      );
      // Fallback to channel
      try {
        const channel = (await client.channels.fetch(
          ASK_CHANNEL_ID as string,
        )) as TextChannel;

        if (!channel) {
          console.error("Ask channel not found!");
          return;
        }

        sentMessage = await channel.send({
          content: `${getGreeting(
            member.id,
            question,
          )} \n*(Psst, open your DMs for privacy next time! 🔒)*`,
          components: [buildActionRow(options)],
        });
      } catch (channelError) {
        console.error(
          "Error sending verification message to channel:",
          channelError,
        );
        return;
      }
    }

    // Common collector for both DM and Channel messages
    const collector = sentMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 60000, // 60 seconds
    });

    collector.on("collect", async (i) => {
      // For DMs, i.user.id check is redundant but safe.
      if (i.user.id !== member.id) {
        await i.reply({
          content: "Yo hands off! 🚫 This ain't for you, scrub. 😤",
          flags: MessageFlags.Ephemeral,
        });
        return;
      }

      const selectedValue = parseInt(i.customId.split("_")[1]!);

      if (selectedValue === answer) {
        await i.reply({
          content: getSuccessMessage(),
          flags: MessageFlags.Ephemeral,
        });

        try {
          // Unmute/Undeafen might be nice but just moving is required
          await member.voice.setChannel(TARGET_VOICE_CHANNEL_ID as string);
          collector.stop("success");
        } catch (error) {
          console.error("Failed to move user:", error);
          await i.followUp({
            content:
              "Bruh 💀 I tried to move you but Discord is hating. No perms. 🔒",
            flags: MessageFlags.Ephemeral,
          });
        }
      } else {
        // WRONG ANSWER
        const joke = getJoke();

        await i.reply({
          content: `LMAO WRONG ❌. ${joke} cope harder. Try this one: 👇`,
          flags: MessageFlags.Ephemeral,
        });

        // Re-generate problem
        const newProb = generateMathProblem();
        question = newProb.question;
        answer = newProb.answer;
        options = generateOptions(answer);

        await sentMessage.edit({
          content: getGreeting(member.id, question),
          components: [buildActionRow(options)],
        });
        // Collector continues running (time is not reset)
      }
    });

    collector.on("end", (collected, reason) => {
      if (reason === "success") {
        sentMessage.delete().catch(console.error);
      } else {
        sentMessage
          .edit({
            content: getTimeoutMessage(member.id),
            components: [],
          })
          .catch(console.error);
      }
    });
  }
});

// --- HELPER FUNCTIONS ---

function generateMathProblem(): { question: string; answer: number } {
  // 30% chance for University Level (Calculus, Modulo, Factorial)
  if (Math.random() < 0.3) {
    return generateUniProblem();
  }

  // 70% chance for Standard Arithmetic
  // Mixed difficulty:
  // 50% Simple (a op b)
  // 50% Complex ((a op b) op c)

  const ops = ["+", "-", "*", "/"];

  while (true) {
    // const isComplex = Math.random() > 0.5;
    const isComplex = true;

    let q = "";
    let val = 0;

    const r = (n: number) => Math.floor(Math.random() * n) + 1; // 1 to n

    if (!isComplex) {
      const a = r(15);
      const b = r(15);
      const op = ops[Math.floor(Math.random() * ops.length)]!;
      q = `${a} ${op} ${b}`;
      val = eval(q);
    } else {
      // (a op1 b) op2 c  OR  a op1 (b op2 c)
      const a = r(10);
      const b = r(10);
      const c = r(10);
      const op1 = ops[Math.floor(Math.random() * ops.length)]!;
      const op2 = ops[Math.floor(Math.random() * ops.length)]!;

      if (Math.random() > 0.5) {
        q = `(${a} ${op1} ${b}) ${op2} ${c}`;
      } else {
        q = `${a} ${op1} (${b} ${op2} ${c})`;
      }
      val = eval(q);
    }

    // Validation
    if (
      Number.isInteger(val) &&
      val >= 1 &&
      val <= 10 &&
      Number.isFinite(val)
    ) {
      return { question: q, answer: val };
    }
  }
}

function generateUniProblem(): { question: string; answer: number } {
  const types = ["deriv", "integ", "log", "fact", "mod", "sqrt"];
  const type = types[Math.floor(Math.random() * types.length)];

  let q = "";
  let a = 0;

  // Helpers
  const r = (n: number) => Math.floor(Math.random() * n) + 1;

  switch (type) {
    case "deriv": {
      // d/dx (x^2) = 2x at x=val
      // Ans must be 1-10. So 2*val <= 10 -> val <= 5.
      const x = r(5);
      q = `d/dx(x^2) | x=${x}`;
      a = 2 * x;
      break;
    }
    case "integ": {
      // ∫(2x)dx from 0 to val = [x^2]0..val = val^2
      // val^2 <= 10 -> val <= 3.
      const x = r(3);
      q = `∫(2x)dx [0,${x}]`;
      a = x * x;
      break;
    }
    case "log": {
      // log2(x). Ans 1,2,3. x=2,4,8.
      const val = r(3); // 1, 2, 3
      const x = Math.pow(2, val);
      q = `log2(${x})`;
      a = val;
      break;
    }
    case "fact": {
      // x!
      // 1! = 1, 2! = 2, 3! = 6. (4! = 24 > 10)
      const x = r(3);
      q = `${x}!`;
      a = x === 1 ? 1 : x === 2 ? 2 : 6;
      break;
    }
    case "mod": {
      // a % b
      // Just loop until valid
      while (true) {
        const x = r(20) + 5;
        const y = r(10) + 2;
        const res = x % y;
        if (res >= 1 && res <= 10) {
          q = `${x} mod ${y}`;
          a = res;
          break;
        }
      }
      break;
    }
    case "sqrt": {
      // sqrt(x)
      // Ans 1-3 (sqrt(1), sqrt(4), sqrt(9))
      const x = r(3);
      q = `√${x * x}`;
      a = x;
      break;
    }
  }
  return { question: q, answer: a };
}

function generateOptions(correct: number): number[] {
  const options = new Set<number>();
  options.add(correct);

  while (options.size < 5) {
    const r = Math.floor(Math.random() * 10) + 1;
    options.add(r);
  }

  // Shuffle
  return Array.from(options).sort(() => Math.random() - 0.5);
}

function getJoke(): string {
  const jokes = [
    "Imagine failing math in 2026 💀",
    "Bro really thought he was Einstein 🤡",
    "Skill issue fr fr 📉",
    "My brother in Christ, use a calculator 📱",
    "Did you even go to school? 📚🚫",
    "Math harder than your rizz 🥶",
    "Cannot compute... just like your brain 🤖",
    "You guessed wrong. L + Ratio + No Maidens 🛡️",
    "Are you even trying? 🥱",
  ];
  return jokes[Math.floor(Math.random() * jokes.length)]!;
}

function getGreeting(userId: string, question: string): string {
  const greetings = [
    `<@${userId}>, yo! 👋 Bet you can't solve this basic math 🧮. Prove you ain't a NPC: **${question} = ?**`,
    `<@${userId}>, wake up! 🚨 Math police here. Solve this or you're cooked: **${question} = ?**`,
    `<@${userId}>, vibe check! ✨ If you miss this, you're cringe: **${question} = ?**`,
    `<@${userId}>, hold up ✋. Entry fee is this math problem. Don't embarrassing yourself: **${question} = ?**`,
    `<@${userId}>, AINTNOWAY you can't solve this... right? 🤨 **${question} = ?**`,
  ];
  return greetings[Math.floor(Math.random() * greetings.length)]!;
}

function getSuccessMessage(): string {
  const msgs = [
    "Ayyy, you actually got it 🧠... barely. Yeeting you to the channel... 🚀",
    "Sheesh! 🥶 Valid. Moving you now.",
    "W in the chat! 🏆 You're in.",
    "Finally. 🙄 Didn't think you'd make it. Going in...",
    "No cap, that was impressive (not really). ✨ Welcome.",
  ];
  return msgs[Math.floor(Math.random() * msgs.length)]!;
}

function getTimeoutMessage(userId: string): string {
  const msgs = [
    `<@${userId}> Too slow! 🐢 You fell off. Rejoin if you want another shot. ✌️`,
    `<@${userId}> Ghosted the math problem? 👻 cringe. Try again later.`,
    `<@${userId}> Ran out of time! ⏳ Did you fall asleep? Rejoin to retry.`,
    `<@${userId}> BRUH. Time's up. 🛑 Be faster next time.`,
  ];
  return msgs[Math.floor(Math.random() * msgs.length)]!;
}

// login with the token from .env.local
client.login(process.env.DISCORD_TOKEN);

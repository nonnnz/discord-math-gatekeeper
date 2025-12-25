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
} from "discord.js";

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

// listen for the client to be ready
client.once(Events.ClientReady, (c) => {
  console.log(`Ready! Logged in as ${c.user.tag}`);
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
            .setStyle(ButtonStyle.Primary)
        );
      });
      return row;
    };

    try {
      const channel = (await client.channels.fetch(
        ASK_CHANNEL_ID as string
      )) as TextChannel;

      if (!channel) {
        console.error("Ask channel not found!");
        return;
      }

      const sentMessage = await channel.send({
        content: getGreeting(member.id, question),
        components: [buildActionRow(options)],
      });

      const collector = sentMessage.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 60000, // 60 seconds
      });

      collector.on("collect", async (i) => {
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
    } catch (error) {
      console.error("Error sending verification message:", error);
    }
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

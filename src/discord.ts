import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  Message,
} from 'discord.js';
import dotenv from 'dotenv';

import { startMinecraft } from './';
import notifier from './notifier';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

if (!process.env.DISCORD_MESSAGE_ID) {
  throw new Error('DISCORD_MESSAGE_ID is not defined');
}

const messageId = process.env.DISCORD_MESSAGE_ID;

interface UpdateInfo {
  minecraft: {
    playerCount?: Number,
    isOnline: Boolean,
    timeRemaining?: Number,
  }
}

const channelId = process.env.DISCORD_CHANNEL_ID;
const token = process.env.DISCORD_TOKEN;

if (!channelId || !token) {
  throw new Error("DISCORD_CHANNEL_ID or DISCORD_TOKEN is not defined");
}

const client = new Client({
  intents: [],
});

client.on("ready", () => {
  console.log(`Discord client logged in as ${client.user?.tag}!`);
});

const setup = async () => {
  await client.login(token);
  await createMessageIfItDoesntExist();
}

/**
 * Update the status message
 * @param udpateInfo The update info
 * @returns The message id
 */
const update = async (udpateInfo: UpdateInfo): Promise<void> => {
  const channel = await client.channels.fetch(channelId);

  if (!channel) {
    throw new Error("Channel not found");
  }

  const embed = generateEmbed(udpateInfo);

  if (!channel.isTextBased()) {
    throw new Error("Channel is not text based");
  }

  let message: Message | null = null;

  message = await channel.messages.fetch(messageId);
  await message.edit({ embeds: [embed] });

  if (!udpateInfo.minecraft.isOnline) {
    const actionRow = new ActionRowBuilder()
      .addComponents(new ButtonBuilder()
        .setLabel("Start Minecraft")
        .setStyle(ButtonStyle.Primary)
        .setCustomId("start-minecraft")
      );

    await message.edit({
      // @ts-ignore
      components: [actionRow],
    })
  } else {
    await message.edit({
      components: [],
    })
  }
  return;
};

const generateEmbed = (udpateInfo: UpdateInfo): EmbedBuilder => {
  const embed = new EmbedBuilder();

  embed.setTitle("MEGATRON Serveurs");
  embed.setDescription("Voici l'état des serveurs de jeux s'exécutant sur le serveur MEGATRON");
  let statusMessage: string = '';
  if (udpateInfo.minecraft.isOnline) {
    if (udpateInfo.minecraft.timeRemaining && udpateInfo.minecraft.playerCount === 0) {
      statusMessage += `:green_circle: En ligne\n:alarm_clock: Temps restant avant l'arret automatique: ${udpateInfo.minecraft.timeRemaining} minutes`;
    } else {
      statusMessage += `:green_circle: En ligne`;
    }

    statusMessage += `\n:man_bowing: Joueurs : ${udpateInfo.minecraft.playerCount}/20`;
  } else {
    statusMessage += `:red_circle: Hors ligne\n`;
  }
  embed.addFields([
    {
      name: "Minecraft",
      value: statusMessage,
    },
  ]);
  embed.setFooter({
    text: `Dernière mise à jour ${new Date().toLocaleString()}`,
  });

  return embed;
};

// Listen for the start minecraft button
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isButton()) {
    return;
  }

  if (interaction.customId === "start-minecraft") {
    notifier(
      "Minecraft server starting",
      `The minecraft server is starting. Requested by ${interaction.user.tag}`,
      "https://portainer.mrpink.dev",
    );
    console.log(`Start requested by ${interaction.user.tag}`);
    await interaction.reply({ content: "Le serveur minecraft va démarrer...", ephemeral: true });
    await startMinecraft();
    interaction.deleteReply();
  }
});

const createMessageIfItDoesntExist = async () => {
  const channel = await client.channels.fetch(channelId);

  if (!channel) {
    throw new Error("Channel not found");
  }

  if (!channel.isTextBased()) {
    throw new Error("Channel is not text based");
  }

  const message = await channel.messages.fetch(messageId);

  if (!message) {
    // Send a new message with out embed
    const embed = new EmbedBuilder();
    embed.setTitle("MEGATRON Serveurs, démarrage...");
    const message = await channel.send({ embeds: [embed] });
    console.log(`Message created ${message.id} , shutting down`);
    process.exit(0);
  } else {
    console.log("Message already exists");
  }
}

export { client, setup, update };

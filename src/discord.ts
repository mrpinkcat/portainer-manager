import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  Client,
  EmbedBuilder,
  Message,
} from 'discord.js';
import dotenv from 'dotenv';
import fs from 'fs';

import { startMinecraft } from './';
import DiscordJson from './data/discord.json';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

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

  if (DiscordJson.messageId !== null) {
    message = await channel.messages.fetch(DiscordJson.messageId);
    message.edit({ embeds: [embed] });
  } else {
    message = await channel.send({ embeds: [embed] });

    const json = JSON.stringify({
      messageId: message.id,
    });
    fs.writeFileSync('src/data/discord.json', json);
  }

  if (!udpateInfo.minecraft.isOnline) {
    const actionRow = new ActionRowBuilder()
      .addComponents(new ButtonBuilder()
        .setLabel("Start Minecraft")
        .setStyle(ButtonStyle.Primary)
        .setCustomId("start-minecraft")
      );

    message.edit({
      // @ts-ignore
      components: [actionRow],
    })
  } else {
    message.edit({
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
    console.log(interaction.client.user?.tag);
    await interaction.reply({ content: "Le serveur minecraft va démarrer...", ephemeral: true });
    await startMinecraft();
    interaction.deleteReply();
  }
});

export { client, setup, update };

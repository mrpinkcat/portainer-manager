import {
  getJwt,
  getStack,
  getStacks,
  Stack,
  StackStatus,
  startStack,
  stopStack,
} from './api';
import {
  setup,
  update,
} from './discord';
import notifier from './notifier';
import {
  connect,
  disconnect,
  getPlayerCount,
  waitUntilConnected,
} from './rcon';

enum ServerStopResonponseStatus {
  SUCCESS = 'success',
  CANCELED = 'canceled',
  ALREADY_LAUNCHED = 'already_launched',
};

enum ServerStatus {
  STOPPED = 'stopped',
  WAIT_FOR_STOP = 'wait_for_stop',
  STARTING = 'starting',
  RUNNING = 'running',
};

const tick = 30 * 1000;
let minecraftStack: Stack | null = null;
let token: string | null = null;
let stopTimeout: number | null = null;
let serverStatus: ServerStatus = ServerStatus.STOPPED;

const start = async () => {
  console.log("Starting...");
  
  if (!process.env.STOP_TIMEOUT) {
    throw new Error("STOP_TIMEOUT is not defined");
  }
  stopTimeout = parseInt(process.env.STOP_TIMEOUT);

  await setup();
  token = await getJwt();
  const stacks = await getStacks(token);
  minecraftStack = stacks.find((stack) => stack.Name === "minecraft-server") || null;
  if (minecraftStack) {
    if (minecraftStack.Status !== StackStatus.STOPPED) {
      serverStatus = ServerStatus.RUNNING;
    } else {
      serverStatus = ServerStatus.STOPPED;
    }

    updateDiscordMessage();
    setInterval(async () => {
      console.log(`Updating discord message at ${new Date().toISOString()}...`);
      await updateDiscordMessage();
      console.log(`Discord message updated at ${new Date().toISOString()}`);
    }, tick);
  }
};

const updateDiscordMessage = async () => {
  if (minecraftStack === null || token === null) {
    throw new Error("Minecraft stack not found");
  }
  // Check if the minecraft stack is online
  minecraftStack = await getStack(minecraftStack.Id, token);
  const isOnline = minecraftStack.Status === StackStatus.DEPLOYED && (serverStatus === ServerStatus.RUNNING || serverStatus === ServerStatus.WAIT_FOR_STOP);

  if (isOnline) {
    await connect();
    const playerCount = await getPlayerCount();
    if (playerCount === 0) {
      startServerStopTimer(minecraftStack.Id);
    }
    if (timeRemaining !== null) {
      await update({ minecraft: { isOnline, playerCount, timeRemaining } });
    } else {
      await update({ minecraft: { playerCount, isOnline } });
    }
  } else {
    await update({ minecraft: { isOnline } });
  }
};

const startMinecraft = async () =>{
  if (minecraftStack === null || token === null) {
    throw new Error("Minecraft stack not found");
  }

  serverStatus = ServerStatus.STARTING;

  await startStack(minecraftStack.Id, token);
  await waitUntilConnected();

  serverStatus = ServerStatus.RUNNING;

  await updateDiscordMessage();

  return;
};

const stopMinecraft = async () => {
  if (minecraftStack === null || token === null) {
    throw new Error("Minecraft stack not found");
  }

  await disconnect();
  await stopStack(minecraftStack.Id, token);
  await updateDiscordMessage();
};

let timeRemaining: number | null = null;

const startServerStopTimer = async (stackId: number): Promise<ServerStopResonponseStatus> => new Promise(async (resolve) => {
  if (serverStatus === ServerStatus.WAIT_FOR_STOP) {
    console.log("Server stop timer already launched");
    resolve(ServerStopResonponseStatus.ALREADY_LAUNCHED);
    return;
  }

  if (minecraftStack === null || token === null || stopTimeout === null) {
    throw new Error("Minecraft stack not found or stop timeout is not defined");
  }

  serverStatus = ServerStatus.WAIT_FOR_STOP;
  let playerCount = 0;

  timeRemaining = stopTimeout;
  // Wait until the server is empty for 15 minutes
  while (timeRemaining > 0 || timeRemaining === null) {
    console.log(`Waiting for ${timeRemaining} minutes to stop the server...`);
    await connect();
    playerCount = await getPlayerCount();
    if (playerCount === 0) {
      console.log("No players online");
      timeRemaining -= 1;
    } else {
      console.log(`${playerCount} players online, Cancelling server stop timer...`);
      timeRemaining = null;
      serverStatus = ServerStatus.RUNNING;
      resolve(ServerStopResonponseStatus.CANCELED);
      return;
    }
    console.log("Waiting 1 minute...");
    await new Promise((resolve) => setTimeout(resolve, tick));
  }
  
  if (timeRemaining === 0) {
    console.log("Stopping server...");
    await disconnect();
    await stopStack(minecraftStack.Id, token);
    await updateDiscordMessage();
    console.log("Server stopped by timer");
    timeRemaining = null;
    serverStatus = ServerStatus.STOPPED;
    notifier(
      "Server stopped by timer",
      `The server has been stopped by the timer because no players were online for ${stopTimeout} minutes`,
      "https://portainer.mrpink.dev",
    );
    resolve(ServerStopResonponseStatus.SUCCESS);
  } else {
    console.log("Server stop timer canceled");
    serverStatus = ServerStatus.RUNNING;
    timeRemaining = null;
    resolve(ServerStopResonponseStatus.CANCELED);
  }
});

start();

export { ServerStopResonponseStatus, startMinecraft, startServerStopTimer };

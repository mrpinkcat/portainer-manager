import dotenv from 'dotenv';
import Rcon from 'rcon';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const rcon = new Rcon(process.env.SERVER_ADDRESS, 25575, process.env.RCON_PASSWORD);

let isRconConnected = false;

if (!process.env.STOP_TIMEOUT) {
  throw new Error('STOP_TIMEOUT is not defined');
}
const stopTImeout = parseInt(process.env.STOP_TIMEOUT);

const connectRcon = async () => new Promise<void>((resolve, reject) => {
  if (isRconConnected) {
    resolve();
  } else {
    console.log('RCON connecting...');
    rcon.connect();
    rcon
    .on('auth', () => {
      isRconConnected = true;
      console.log('Authed!');
      rcon.removeAllListeners('auth');
      resolve();  
    });
  }
});

const waitUntilConnected = async () => new Promise<void>((resolve, reject) => {
  if (isRconConnected) {
    console.log('RCON is already connected');
    resolve();
  } else {
    console.log('RCON connecting...');
    rcon.connect();
    rcon
    .on('auth', () => {
      isRconConnected = true;
      console.log('Authed!');
      rcon.removeAllListeners('auth');
      resolve();
    });
    rcon
    .on('error', (error: Error) => {
      // Retry to connect
      console.error('Not authed, retrying in 10 seconds...');
      setTimeout(() => {
        rcon.connect();
      }, 10000);
    });
  }
});

const getPlayerCount = async (): Promise<number> => new Promise((resolve, reject) => {
  if (!isRconConnected) {
    console.error('RCON is not connected !!!')
    reject('RCON is not connected');
  }
  console.log('Getting player count...');
  rcon.send('list');

  rcon
  .on('response', (response: String) => {
    const playerCount = response.match(/(?<=There are )\d+(?= of a max)/g)?.[0];
    // Player count response
    if (playerCount) {
      console.log('Player count: ', playerCount);
      rcon.removeAllListeners('response');
      resolve(parseInt(playerCount));
    }
  });
});

const disconnect = async () => new Promise<void>((resolve, reject) => {
  if (!isRconConnected) {
    resolve();
  } else {
    console.log('RCON disconnecting...');
    rcon.disconnect();
    rcon.on('end', () => {
      isRconConnected = false;
      console.log('RCON disconnected');
      rcon.removeAllListeners('end');
      resolve();
    });
  }
});

export {
  connectRcon as connect,
  disconnect,
  getPlayerCount,
  waitUntilConnected,
};

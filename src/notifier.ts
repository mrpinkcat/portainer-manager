import axios from 'axios';
import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const pushoverCreds = {
  token: process.env.PUSHOVER_TOKEN,
  user: process.env.PUSHOVER_USER,
};

export default async (title: string, message: string, link: string) => {
  try {
    await axios.post('https://api.pushover.net/1/messages.json', {
      ...pushoverCreds,
      title,
      message,
      url: link,
    });
  } catch (error) {
    console.error(error);
    console.log('ERROR');
  }
}



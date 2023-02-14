import axios from 'axios';
import dotenv from 'dotenv';
import https from 'https';

enum StackStatus {
  DEPLOYED = 1,
  STOPPED = 2,
}

interface Stack {
  Name: String,
  Id: number,
  Status: StackStatus,
}

if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

const api = axios.create({
  // baseURL: "https://portainer.mrpink.dev/api",
  baseURL: "https://192.168.1.252:9443/api",
  headers: {
    "Content-Type": "application/json",
    "Accept": "application/json",
  },
  httpsAgent: new https.Agent({
    rejectUnauthorized: false,
  }),
});

const getJwt = async (): Promise<string> => {
  console.log('Portainer connecting...');
  return await api.post("/auth", {
    username: "gatien",
    password: "xhv5PNU5ujf!mxd0kaz",
  })
  .then((response) => {
    console.log('Json web token retrieved');
    return response.data.jwt;
  })
  .catch((error) => {
    console.log(error.response.data);
  });
};

const getStacks = async (token: String): Promise<Stack[]> => {
  console.log('Getting portainer stacks...');
  return await api.get("/stacks", {
    headers: {
      "Authorization": `Bearer ${token}`,
    },
  })
  .then((response) => {
    console.log('Stacks retrieved');
    return response.data;
  })
  .catch((error) => {
    console.log(error.response.data);
  });
};

const getStack = async (stackId: Number, token: String): Promise<Stack> => {
  console.log(`Getting stack ${stackId}...`);
  return await api.get(`/stacks/${stackId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  .then((response) => {
    console.log(`Stack ${stackId} retrieved`);
    return response.data;
  })
  .catch((error) => {
    console.log(error.response.data);
  });
};

const stopStack = async (stackId: Number, token: String): Promise<Stack> => {
  console.log(`Stopping stack ${stackId}...`);
  return await api.post(`/stacks/${stackId}/stop?endpointId=2`, {}, {
    "headers": {
      "Authorization": `Bearer ${token}`,
    },
  })
  .then((response) => {
    console.log(`Stack ${stackId} stopped`);
    return response.data;
  })
  .catch((error) => {
    console.log(error.response.data);
    console.log(error.response.status);
  });
};

const startStack = async (stackId: Number, token: String) => {
  console.log(`Starting stack ${stackId}...`);
  await api.post(`/stacks/${stackId}/start?endpointId=2`, {}, {
    "headers": {
      "Authorization": `Bearer ${token}`,
    },
  })
  console.log(`Stack ${stackId} started`);
};

export {
  getJwt,
  getStack,
  getStacks,
  Stack,
  StackStatus,
  startStack,
  stopStack,
};

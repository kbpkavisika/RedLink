import axios from 'axios';

const api = axios.create({
  baseURL: '/api',   //every request made using api automatically starts with /api
  headers: { 'Content-Type': 'application/json' }, // The data is in JSON format
});

export default api;

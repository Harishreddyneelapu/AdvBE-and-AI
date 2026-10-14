import { Queue } from "bullmq";
import Redis from "ioredis";
const connection= new Redis("redis://localhost:6379",{
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});
const emailQueue = new Queue("emailQueue", {
  connection
});

export default emailQueue;
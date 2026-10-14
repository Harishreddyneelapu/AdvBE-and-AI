import { Worker } from "bullmq";
import Redis from "ioredis";
import sendEmail from "./lib/sendEmail";

const connection= new Redis("redis://localhost:6379",{
  maxRetriesPerRequest: null,
});
const worker = new Worker("emailQueue", async (job) => {
    console.log("job started");
    const {email} = job.data;
    await sendEmail(email);
    console.log("job completed");
    
  },{connection});
  worker.run();   
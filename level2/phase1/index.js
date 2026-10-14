import express from "express";
import dotenv from "dotenv";
import connectDb from "./lib/db.js";
import User from "./model/user.model.js";
import Redis from "ioredis";
import rateLimiter from "./middleware/ratelimit.js";
import sendEmail from "./lib/sendEmail.js";
import emailQueue from "./queue.js";

dotenv.config();
const PORT = process.env.PORT || 5000;

const app = express();

const redis = new Redis(process.env.REDIS_URL);

app.use(express.json());
app.get("/", (req, res) => {
  res.send("Hello from redis phase 1");
});
app.post("/create", async (req, res) => {
    const {name, email, password} = req.body; 
    const user = await User.create({name, email, password});
    emailQueue.add("sendEmail", {email});    
    return res.json(user);
});

app.get("/get",rateLimiter, async (req, res) => {
    const user = await User.find({});
    return res.json(user); 
});
app.get("/get-with-redis", async (req, res) => {
    const cachedUsers = await redis.get("users");
    if (cachedUsers) {
        return res.json(JSON.parse(cachedUsers));
    }
    const user = await User.find({});
    await redis.set("users", JSON.stringify(user), "EX", 10);
    return res.json(user);
});

app.post("/send-otp", async (req,res) =>{
    const {email} = req.body;

    const otp = Math.floor(100000+Math.random()*900000).toString()

    await redis.set(`otp:${email}`, otp, "Ex",30)

    return res.json({otp})
})

app.post("/verify-otp", async (req,res) =>{
    const {email,otp} = req.body;


    const cachedOtp = await redis.get(`otp:${email}`)
    if(!cachedOtp){
        return res.status(400).json({message: "OTP not found"}) 
    }
    if(cachedOtp !== otp){
        return res.status(400).json({message: "Invalid OTP"})
    }  
     await redis.del(`otp:${email}`)
    return res.json({message: "OTP verified"})
})





app.listen(PORT, () => {
    connectDb();
  console.log(`Server is running on port ${PORT}`);
}); 
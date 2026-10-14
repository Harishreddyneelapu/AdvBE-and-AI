import mongoose from "mongoose";

const connectDb= async()=>{
    try{
        await mongoose.connect(process.env.MONGODB_URL)
        console.log("MongoDB connected successfully")
    }catch(err){
        console.log("Error connecting to MongoDB",err)
    }
}
export default connectDb
import express from "express";
import dotenv from "dotenv";
import proxy from "express-http-proxy";

dotenv.config();
const PORT = process.env.PORT || 5000;

const app = express();

app.get("/", (req, res) => {
    return res.send(`Hello from ${process.env.SERVER_NAME}`);
});
app.use(express.json());
app.use("/auth", proxy("http://auth-service:8001"));
app.use("/order", proxy("http://order-service:8002"));
app.use("/product", proxy("http://product-service:8003"));


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 

 
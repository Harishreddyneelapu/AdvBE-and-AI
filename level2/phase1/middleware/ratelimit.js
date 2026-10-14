const rateLimiter = async (req, res, next) => {
  const redis = req.app.get("redis");
  const ip = req.ip;
  const key=`rate_limit:${ip}`;
  
  const currentTime = Math.floor(Date.now() / 1000);
  const windowSize = 60; // 1 minute
  const maxRequests = 5;

  try {
    const requests = await redis.get(ip);
    if (requests) {
      const requestCount = parseInt(requests);
      if (requestCount >= maxRequests) {
        return res.status(429).json({ message: "Too many requests" });
      } else {
        await redis.incr(ip);
      }
    } else {
      await redis.set(ip, 1, "EX", windowSize);
    }
    next();
  } catch (err) {
    console.error("Error in rate limiter middleware:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export default rateLimiter;
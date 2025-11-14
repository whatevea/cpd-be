import mongoose from "mongoose";

let cachedConnection = null;

const connectDB = async () => {
  if (cachedConnection) {
    return cachedConnection;
  }

  const MONGODB_URI = process.env.MONGODB_URI;

  if (!MONGODB_URI) {
    console.error("Missing MONGODB_URI environment variable.");
    throw new Error("MONGODB_URI is not defined");
  }

  try {
    cachedConnection = await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(
      `MongoDB connected: ${cachedConnection.connection.host}`
    );
    return cachedConnection;
  } catch (error) {
    cachedConnection = null;
    console.error("MongoDB connection error:", error);
    throw error;
  }
};

export default connectDB;

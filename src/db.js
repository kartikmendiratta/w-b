import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

// Load MongoDB URI from environment, fall back to the previous hardcoded value
const mongoURI = process.env.MONGO_URI ;

export const connectDB = async () => {
    try {
      await mongoose.connect(mongoURI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      console.log("MongoDB connected successfully");
    } catch (err) {
      console.error("MongoDB connection error:", err);
    }
  };
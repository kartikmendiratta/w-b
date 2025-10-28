import mongoose from 'mongoose';

const mongoURI = 'mongodb+srv://testkartik770_db_user:%23itsnote%40%24Y007@webchat.72l7qdm.mongodb.net/?retryWrites=true&w=majority&appName=webchat';

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
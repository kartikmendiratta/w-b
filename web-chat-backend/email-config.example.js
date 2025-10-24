// Email Configuration Example
// Copy this to email-config.js and fill in your details

export const emailConfig = {
  // Gmail Configuration
  service: 'gmail',
  auth: {
    user: 'your-email@gmail.com',
    pass: 'your-app-password' // Use App Password, not regular password
  },
  
  // Alternative: SendGrid
  // apiKey: 'your-sendgrid-api-key',
  
  // Alternative: AWS SES
  // accessKeyId: 'your-access-key',
  // secretAccessKey: 'your-secret-key',
  // region: 'us-east-1'
};

// Instructions:
// 1. For Gmail:
//    - Enable 2-factor authentication
//    - Generate an App Password
//    - Use the App Password as EMAIL_PASS
//
// 2. For SendGrid:
//    - Sign up at sendgrid.com
//    - Get API key
//    - Use API key as EMAIL_PASS
//
// 3. For AWS SES:
//    - Set up AWS SES
//    - Create IAM user with SES permissions
//    - Use access keys



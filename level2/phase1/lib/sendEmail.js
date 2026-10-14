const sendEmail = async (email, otp) => {
    await new Promise((resolve) => setTimeout(resolve, 5000));  
    console.log(`Email sent to ${email} with OTP: ${otp}`);
}

export default sendEmail
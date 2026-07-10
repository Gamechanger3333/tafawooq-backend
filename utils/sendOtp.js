const { Resend } = require('resend');

let resendClient = null;

const getResendClient = () => {
    if (!resendClient) {
        if (!process.env.RESEND_API_KEY) {
            throw new Error('RESEND_API_KEY is not configured');
        }
        resendClient = new Resend(process.env.RESEND_API_KEY);
    }
    return resendClient;
};

const sendOtp = async (email, otp, type = 'verification') => {
    try {
        const resend = getResendClient();

        // Different email templates based on type
        const emailTemplates = {
            verification: {
                subject: "Email Verification Code",
                title: "Email Verification",
                message: "Your verification code is:"
            },
            passwordReset: {
                subject: "Password Reset Code",
                title: "Password Reset",
                message: "Your password reset code is:"
            }
        };

        const template = emailTemplates[type] || emailTemplates.verification;

        const fromAddress = process.env.RESEND_FROM_EMAIL || 'Tafawoq <onboarding@resend.dev>';

        const { data, error } = await resend.emails.send({
            from: fromAddress,
            to: email,
            subject: template.subject,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">${template.title}</h2>
                    <p>${template.message}</p>
                    <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
                        <h1 style="color: #007bff; font-size: 32px; margin: 0;">${otp}</h1>
                    </div>
                    <p>This code will expire in 10 minutes.</p>
                    <p style="color: #666; font-size: 12px;">If you didn't request this code, please ignore this email.</p>
                </div>
            `,
        });

        if (error) {
            console.error('Error sending email via Resend:', error);
            throw new Error('Failed to send OTP email');
        }

        console.log('Email sent successfully via Resend:', data?.id);
        return data;
    } catch (error) {
        console.error('Error sending email:', error);
        throw new Error('Failed to send OTP email');
    }
};

module.exports = sendOtp;

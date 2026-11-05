package com.brr.ai_coach_interview.service;

import jakarta.mail.internet.MimeMessage;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Slf4j
@Service
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${spring.mail.properties.mail.smtp.from:${spring.mail.username:bhushanrajurajurkar@gmail.com}}")
    private String fromEmail;

    @Value("${app.frontend.url:http://localhost:8080}")
    private String frontendUrl;

    @Value("${app.mail.dev-mode:true}")
    private boolean devMode;

    /**
     * Sends account activation email containing the verification link.
     */
    public void sendActivationEmail(String toEmail, String activationToken, String username) {
        String activationUrl = frontendUrl + "/api/auth/activate?token=" + activationToken;

        log.info("===============================================================================");
        log.info("[ACCOUNT ACTIVATION EMAIL]");
        log.info("To: {}", toEmail);
        log.info("Username: {}", username);
        log.info("Activation URL: {}", activationUrl);
        log.info("JWT Activation Token: {}", activationToken);
        log.info("===============================================================================");

        if (devMode || mailSender == null) {
            log.info("Dev mode or simulated SMTP: Activation URL logged above for immediate local testing.");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "AI Interview Coach");
            helper.setTo(toEmail);
            helper.setSubject("AI Interview Coach - Activate Your Account");

            String htmlContent = buildActivationEmailHtml(activationUrl, activationToken, username);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("Account activation email successfully dispatched to {}", toEmail);
        } catch (Exception ex) {
            log.warn("Could not dispatch SMTP activation email: {}. The link is available in console logs.", ex.getMessage());
        }
    }

    /**
     * Sends password reset email containing the JWT reset link.
     */
    public void sendPasswordResetEmail(String toEmail, String resetToken) {
        String resetUrl = frontendUrl + "/reset-password.html?token=" + resetToken;

        log.info("===============================================================================");
        log.info("[PASSWORD RESET EMAIL]");
        log.info("To: {}", toEmail);
        log.info("Reset URL: {}", resetUrl);
        log.info("JWT Reset Token: {}", resetToken);
        log.info("===============================================================================");

        if (devMode || mailSender == null) {
            log.info("Dev mode or no SMTP sender: Reset link logged above for fast local testing.");
            return;
        }

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setFrom(fromEmail, "AI Interview Coach");
            helper.setTo(toEmail);
            helper.setSubject("AI Interview Coach - Password Reset Request");

            String htmlContent = buildResetEmailHtml(resetUrl, resetToken);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("Password reset email successfully dispatched to {}", toEmail);
        } catch (Exception ex) {
            log.warn("Could not dispatch SMTP email: {}. The reset link is available in the logs.", ex.getMessage());
        }
    }

    private String buildActivationEmailHtml(String activationUrl, String token, String username) {
        return "<!DOCTYPE html>"
                + "<html>"
                + "<head><meta charset='UTF-8'><style>"
                + "body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b0f19; color: #f8fafc; padding: 24px; margin: 0; }"
                + ".card { background: #111827; max-width: 600px; margin: 0 auto; border-radius: 14px; padding: 36px; border: 1px solid #2e384d; box-shadow: 0 10px 25px rgba(0,0,0,0.4); }"
                + ".logo { font-size: 22px; font-weight: 800; color: #818cf8; margin-bottom: 20px; display: inline-block; }"
                + "h2 { font-size: 24px; color: #ffffff; margin-top: 0; margin-bottom: 12px; }"
                + "p { color: #cbd5e1; font-size: 15px; line-height: 1.6; margin: 0 0 16px 0; }"
                + ".btn { display: inline-block; background: linear-gradient(135deg, #6366f1, #4f46e5); color: #ffffff !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; margin: 24px 0; box-shadow: 0 4px 14px rgba(99,102,241,0.4); text-align: center; }"
                + ".url-box { background: #1a2234; padding: 12px 16px; border-radius: 8px; word-break: break-all; color: #94a3b8; font-size: 12px; border: 1px solid #2e384d; }"
                + ".footer { margin-top: 32px; padding-top: 20px; border-top: 1px solid #1f2937; font-size: 12px; color: #64748b; }"
                + "</style></head>"
                + "<body>"
                + "<div class='card'>"
                + "<div class='logo'>⚡ AI Interview Coach</div>"
                + "<h2>Welcome, " + username + "!</h2>"
                + "<p>Thank you for registering with AI Interview Coach. Please click the button below to verify your email address and activate your account.</p>"
                + "<div style='text-align:center;'><a href='" + activationUrl + "' class='btn'>Activate My Account</a></div>"
                + "<p>Or copy and paste this activation URL directly into your web browser:</p>"
                + "<div class='url-box'>" + activationUrl + "</div>"
                + "<p class='footer'>This activation link is valid for 24 hours. If you did not create this account, please ignore this email.</p>"
                + "</div></body></html>";
    }

    private String buildResetEmailHtml(String resetUrl, String token) {
        return "<!DOCTYPE html>"
                + "<html>"
                + "<head><meta charset='UTF-8'><style>"
                + "body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0b0f19; color: #f8fafc; padding: 20px; }"
                + ".card { background: #111827; max-width: 600px; margin: 0 auto; border-radius: 12px; padding: 32px; border: 1px solid #2e384d; }"
                + ".btn { display: inline-block; background: #6366f1; color: #ffffff !important; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0; }"
                + ".token-box { background: #1a2234; padding: 12px; border-radius: 6px; font-family: monospace; word-break: break-all; color: #a5b4fc; font-size: 13px; }"
                + ".footer { margin-top: 24px; font-size: 12px; color: #64748b; }"
                + "</style></head>"
                + "<body>"
                + "<div class='card'>"
                + "<h2 style='color:#818cf8;margin-top:0;'>AI Interview Coach</h2>"
                + "<h3>Password Reset Request</h3>"
                + "<p>Hello,</p>"
                + "<p>We received a request to reset your password. Click the button below to set a new password. This link is valid for 15 minutes.</p>"
                + "<a href='" + resetUrl + "' class='btn'>Reset Your Password</a>"
                + "<p>Or copy this link into your browser:</p>"
                + "<p style='word-break:break-all;color:#94a3b8;font-size:13px;'>" + resetUrl + "</p>"
                + "<p>Your JWT Reset Token:</p>"
                + "<div class='token-box'>" + token + "</div>"
                + "<p class='footer'>If you did not request a password reset, you can safely ignore this email.</p>"
                + "</div></body></html>";
    }
}

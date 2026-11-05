package com.brr.ai_coach_interview.controller;

import com.brr.ai_coach_interview.dto.*;
import com.brr.ai_coach_interview.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Value("${app.frontend.url:http://localhost:8080}")
    private String frontendUrl;

    /**
     * User registration with username, email, password, and optional profile image upload.
     * Issues activation email containing JWT verification token.
     */
    @PostMapping(value = "/register", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<AuthResponse>> register(
            @RequestParam("username") String username,
            @RequestParam("email") String email,
            @RequestParam("password") String password,
            @RequestParam(value = "profileImage", required = false) MultipartFile profileImage) {

        RegisterRequest request = RegisterRequest.builder()
                .username(username)
                .email(email)
                .password(password)
                .profileImage(profileImage)
                .build();

        AuthResponse authResponse = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Registration successful! An activation link has been sent to your email. Please verify your account before logging in.", authResponse));
    }

    /**
     * User login returning JWT access token.
     * Rejects unactivated accounts.
     */
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse authResponse = authService.login(request);
        return ResponseEntity.ok(ApiResponse.ok("Login successful!", authResponse));
    }

    /**
     * Account activation endpoint via GET link (clicked from email client).
     */
    @GetMapping(value = "/activate", produces = {MediaType.APPLICATION_JSON_VALUE, MediaType.TEXT_HTML_VALUE})
    public ResponseEntity<?> activateAccount(
            @RequestParam("token") String token,
            @RequestHeader(value = "Accept", defaultValue = "") String acceptHeader) {

        try {
            ApiResponse<String> result = authService.activateAccount(token);

            // If request came from a web browser, return a polished confirmation page
            if (acceptHeader.contains(MediaType.TEXT_HTML_VALUE)) {
                String loginUrl = frontendUrl.contains("8080") ? "/login.html?activated=true" : frontendUrl + "/?activated=true";
                String html = "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Account Activated</title><style>"
                        + "body { font-family: system-ui, -apple-system, sans-serif; background: #0b0f19; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }"
                        + ".card { background: #111827; border: 1px solid #2e384d; border-radius: 16px; padding: 40px; max-width: 500px; text-align: center; box-shadow: 0 15px 35px rgba(0,0,0,0.5); }"
                        + ".icon { font-size: 54px; margin-bottom: 16px; }"
                        + "h1 { font-size: 26px; color: #ffffff; margin: 0 0 12px 0; font-weight: 800; }"
                        + "p { color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 0 0 28px 0; }"
                        + ".btn { display: inline-block; background: linear-gradient(135deg, #6366f1, #4f46e5); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; box-shadow: 0 4px 14px rgba(99,102,241,0.4); }"
                        + "</style></head><body>"
                        + "<div class='card'>"
                        + "<div class='icon'>✅</div>"
                        + "<h1>Account Activated!</h1>"
                        + "<p>" + result.getMessage() + "</p>"
                        + "<a href='" + loginUrl + "' class='btn'>Log In to Your Account</a>"
                        + "</div></body></html>";
                return ResponseEntity.ok().contentType(MediaType.TEXT_HTML).body(html);
            }

            return ResponseEntity.ok(result);

        } catch (Exception ex) {
            if (acceptHeader.contains(MediaType.TEXT_HTML_VALUE)) {
                String html = "<!DOCTYPE html><html><head><meta charset='UTF-8'><title>Activation Failed</title><style>"
                        + "body { font-family: system-ui, -apple-system, sans-serif; background: #0b0f19; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }"
                        + ".card { background: #111827; border: 1px solid #ef4444; border-radius: 16px; padding: 40px; max-width: 500px; text-align: center; box-shadow: 0 15px 35px rgba(0,0,0,0.5); }"
                        + ".icon { font-size: 54px; margin-bottom: 16px; }"
                        + "h1 { font-size: 26px; color: #f87171; margin: 0 0 12px 0; font-weight: 800; }"
                        + "p { color: #cbd5e1; font-size: 15px; line-height: 1.6; margin: 0 0 28px 0; }"
                        + ".btn { display: inline-block; background: #334155; color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 15px; }"
                        + "</style></head><body>"
                        + "<div class='card'>"
                        + "<div class='icon'>⚠️</div>"
                        + "<h1>Activation Link Expired or Invalid</h1>"
                        + "<p>" + ex.getMessage() + "</p>"
                        + "<a href='/' class='btn'>Return to Home</a>"
                        + "</div></body></html>";
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).contentType(MediaType.TEXT_HTML).body(html);
            }
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(ApiResponse.error(ex.getMessage()));
        }
    }

    /**
     * Account activation endpoint via POST (called programmatically by frontend).
     */
    @PostMapping("/activate")
    public ResponseEntity<ApiResponse<String>> activateAccountPost(@RequestBody Map<String, String> body) {
        String token = body.get("token");
        ApiResponse<String> response = authService.activateAccount(token);
        return ResponseEntity.ok(response);
    }

    /**
     * Resend activation email link.
     */
    @PostMapping("/resend-activation")
    public ResponseEntity<ApiResponse<String>> resendActivation(@RequestBody Map<String, String> body) {
        String email = body.get("email");
        ApiResponse<String> response = authService.resendActivationEmail(email);
        return ResponseEntity.ok(response);
    }

    /**
     * Forgot password - generates JWT email token and sends email with reset link.
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<ApiResponse<String>> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        ApiResponse<String> response = authService.forgotPassword(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Reset password using JWT token sent to user's email.
     */
    @PostMapping("/reset-password")
    public ResponseEntity<ApiResponse<Void>> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        ApiResponse<Void> response = authService.resetPassword(request);
        return ResponseEntity.ok(response);
    }

    /**
     * Check if a reset token is valid and not expired.
     */
    @GetMapping("/verify-reset-token")
    public ResponseEntity<ApiResponse<Boolean>> verifyResetToken(@RequestParam("token") String token) {
        ApiResponse<Boolean> response = authService.verifyResetToken(token);
        return ResponseEntity.ok(response);
    }
}

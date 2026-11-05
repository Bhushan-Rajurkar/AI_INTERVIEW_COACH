package com.brr.ai_coach_interview.service;

import com.brr.ai_coach_interview.dto.*;
import com.brr.ai_coach_interview.entity.User;
import com.brr.ai_coach_interview.repository.UserRepository;
import com.brr.ai_coach_interview.security.JwtService;
import com.brr.ai_coach_interview.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final CloudinaryService cloudinaryService;
    private final EmailService emailService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (request.getUsername() == null || request.getUsername().trim().isEmpty()) {
            throw new IllegalArgumentException("Username is required");
        }
        if (request.getEmail() == null || request.getEmail().trim().isEmpty()) {
            throw new IllegalArgumentException("Email is required");
        }
        if (request.getPassword() == null || request.getPassword().length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters");
        }

        String username = request.getUsername().trim();
        String email = request.getEmail().trim().toLowerCase();

        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("Username '" + username + "' is already taken");
        }

        if (userRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email '" + email + "' is already registered");
        }

        // Handle profile image upload to Cloudinary
        String profileImageUrl = null;
        if (request.getProfileImage() != null && !request.getProfileImage().isEmpty()) {
            profileImageUrl = cloudinaryService.uploadProfileImage(request.getProfileImage());
        }

        // If no image uploaded, use an appealing default avatar
        if (profileImageUrl == null) {
            profileImageUrl = "https://api.dicebear.com/7.x/bottts/svg?seed=" + username;
        }

        // Create new user with emailVerified = false
        User user = User.builder()
                .username(username)
                .email(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .profileImageUrl(profileImageUrl)
                .role("ROLE_USER")
                .emailVerified(false)
                .build();

        user = userRepository.save(user);

        // Generate Account Activation JWT Token and dispatch email
        String activationToken = jwtService.generateEmailVerificationToken(user.getEmail());
        emailService.sendActivationEmail(user.getEmail(), activationToken, user.getUsername());

        log.info("User registered: {} (emailVerified: false). Activation link dispatched.", user.getUsername());

        return AuthResponse.builder()
                .token(activationToken) // returned for reference / dev mode
                .type("Bearer")
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .profileImageUrl(user.getProfileImageUrl())
                .role(user.getRole())
                .build();
    }

    public AuthResponse login(LoginRequest request) {
        String identifier = request.getUsernameOrEmail().trim();

        // 1. Check if user exists by username or email
        User user = userRepository.findByUsername(identifier)
                .or(() -> userRepository.findByEmail(identifier))
                .orElseThrow(() -> new BadCredentialsException("Invalid username/email or password"));

        // 2. Reject login if email is not activated
        if (!user.isEmailVerified()) {
            throw new DisabledException("Your account is not activated yet. Please click the activation link sent to your email (" + user.getEmail() + ") to activate your account before logging in.");
        }

        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(identifier, request.getPassword())
            );

            UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
            String token = jwtService.generateToken(principal, user.getId(), user.getEmail());

            return AuthResponse.builder()
                    .token(token)
                    .type("Bearer")
                    .id(user.getId())
                    .username(user.getUsername())
                    .email(user.getEmail())
                    .profileImageUrl(user.getProfileImageUrl())
                    .role(user.getRole())
                    .build();
        } catch (BadCredentialsException ex) {
            throw new BadCredentialsException("Invalid username/email or password");
        }
    }

    @Transactional
    public ApiResponse<String> activateAccount(String token) {
        if (token == null || token.trim().isEmpty()) {
            throw new IllegalArgumentException("Activation token is required");
        }

        token = token.trim();

        if (jwtService.isTokenExpired(token)) {
            throw new IllegalArgumentException("Activation link has expired. Please request a new activation email.");
        }

        String purpose = jwtService.extractPurpose(token);
        if (!"EMAIL_VERIFICATION".equals(purpose)) {
            throw new IllegalArgumentException("Invalid activation token.");
        }

        String email = jwtService.extractUsername(token);
        if (email == null) {
            email = jwtService.extractEmail(token);
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User account associated with this token was not found."));

        if (user.isEmailVerified()) {
            return ApiResponse.ok("Your account is already activated! You can log in directly with your email and password.", user.getEmail());
        }

        user.setEmailVerified(true);
        userRepository.save(user);

        log.info("Account successfully activated for user: {} ({})", user.getUsername(), user.getEmail());
        return ApiResponse.ok("Account successfully activated! You can now log in with your email and password.", user.getEmail());
    }

    public ApiResponse<String> resendActivationEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new IllegalArgumentException("Email is required");
        }
        String cleanEmail = email.trim().toLowerCase();
        User user = userRepository.findByEmail(cleanEmail)
                .orElseThrow(() -> new IllegalArgumentException("No account registered with email: " + cleanEmail));

        if (user.isEmailVerified()) {
            return ApiResponse.ok("This account is already activated. You can log in directly.", cleanEmail);
        }

        String activationToken = jwtService.generateEmailVerificationToken(user.getEmail());
        emailService.sendActivationEmail(user.getEmail(), activationToken, user.getUsername());

        return ApiResponse.ok("A new activation link has been sent to " + cleanEmail, activationToken);
    }

    public ApiResponse<String> forgotPassword(ForgotPasswordRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("No account found with email: " + email));

        // Generate Password Reset JWT Token
        String resetToken = jwtService.generatePasswordResetToken(user.getEmail());

        // Dispatch reset email
        emailService.sendPasswordResetEmail(user.getEmail(), resetToken);

        return ApiResponse.ok("Password reset link and email JWT token have been sent to " + email, resetToken);
    }

    @Transactional
    public ApiResponse<Void> resetPassword(ResetPasswordRequest request) {
        String token = request.getToken().trim();

        if (jwtService.isTokenExpired(token)) {
            throw new IllegalArgumentException("Password reset token has expired. Please request a new one.");
        }

        String purpose = jwtService.extractPurpose(token);
        if (!"PASSWORD_RESET".equals(purpose)) {
            throw new IllegalArgumentException("Invalid token type. Not a password reset token.");
        }

        String email = jwtService.extractUsername(token);
        if (email == null) {
            email = jwtService.extractEmail(token);
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new IllegalArgumentException("User associated with this token does not exist"));

        if (!jwtService.isPasswordResetTokenValid(token, user.getEmail())) {
            throw new IllegalArgumentException("Invalid or corrupted password reset token");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        log.info("Password successfully updated for user: {}", user.getEmail());
        return ApiResponse.ok("Password has been successfully reset! You can now log in with your new password.");
    }

    public ApiResponse<Boolean> verifyResetToken(String token) {
        try {
            boolean expired = jwtService.isTokenExpired(token);
            String purpose = jwtService.extractPurpose(token);
            boolean isValid = !expired && "PASSWORD_RESET".equals(purpose);
            return ApiResponse.ok("Token status checked", isValid);
        } catch (Exception e) {
            return ApiResponse.ok("Token is invalid", false);
        }
    }
}

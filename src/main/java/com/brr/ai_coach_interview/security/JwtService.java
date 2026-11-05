package com.brr.ai_coach_interview.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.function.Function;

@Service
public class JwtService {

    private final SecretKey signingKey;
    private final long expirationMs;
    private final long resetExpirationMs;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expiration-ms:86400000}") long expirationMs,
            @Value("${app.jwt.reset-expiration-ms:900000}") long resetExpirationMs) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
        this.resetExpirationMs = resetExpirationMs;
    }

    /**
     * Generate standard auth token for logged in user.
     */
    public String generateToken(UserDetails userDetails, Long userId, String email) {
        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("userId", userId);
        extraClaims.put("email", email);
        extraClaims.put("purpose", "AUTH");
        return buildToken(extraClaims, userDetails.getUsername(), expirationMs);
    }

    /**
     * Generate Password Reset JWT Token linked to email.
     */
    public String generatePasswordResetToken(String email) {
        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("purpose", "PASSWORD_RESET");
        extraClaims.put("email", email);
        return buildToken(extraClaims, email, resetExpirationMs);
    }

    /**
     * Generate Email Verification JWT Token.
     */
    public String generateEmailVerificationToken(String email) {
        Map<String, Object> extraClaims = new HashMap<>();
        extraClaims.put("purpose", "EMAIL_VERIFICATION");
        extraClaims.put("email", email);
        return buildToken(extraClaims, email, expirationMs); // 24 hours
    }

    private String buildToken(Map<String, Object> extraClaims, String subject, long expirationDuration) {
        long now = System.currentTimeMillis();
        return Jwts.builder()
                .claims(extraClaims)
                .subject(subject)
                .issuedAt(new Date(now))
                .expiration(new Date(now + expirationDuration))
                .signWith(signingKey)
                .compact();
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public String extractEmail(String token) {
        Claims claims = extractAllClaims(token);
        return claims.get("email", String.class);
    }

    public String extractPurpose(String token) {
        Claims claims = extractAllClaims(token);
        return claims.get("purpose", String.class);
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        final Claims claims = extractAllClaims(token);
        return claimsResolver.apply(claims);
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        try {
            final String username = extractUsername(token);
            return (username.equals(userDetails.getUsername())) && !isTokenExpired(token);
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public boolean isPasswordResetTokenValid(String token, String email) {
        try {
            final String subjectOrEmail = extractUsername(token);
            final String purpose = extractPurpose(token);
            return (email.equalsIgnoreCase(subjectOrEmail) || email.equalsIgnoreCase(extractEmail(token)))
                    && "PASSWORD_RESET".equals(purpose)
                    && !isTokenExpired(token);
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public boolean isEmailVerificationTokenValid(String token, String email) {
        try {
            final String subjectOrEmail = extractUsername(token);
            final String purpose = extractPurpose(token);
            return (email.equalsIgnoreCase(subjectOrEmail) || email.equalsIgnoreCase(extractEmail(token)))
                    && "EMAIL_VERIFICATION".equals(purpose)
                    && !isTokenExpired(token);
        } catch (JwtException | IllegalArgumentException e) {
            return false;
        }
    }

    public boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    public Claims extractAllClaims(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }
}


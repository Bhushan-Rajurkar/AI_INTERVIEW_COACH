package com.brr.ai_coach_interview;

import com.brr.ai_coach_interview.dto.*;
import com.brr.ai_coach_interview.entity.InterviewQuestion;
import com.brr.ai_coach_interview.entity.InterviewSession;
import com.brr.ai_coach_interview.security.JwtService;
import com.brr.ai_coach_interview.service.AiInterviewCoachService;
import com.brr.ai_coach_interview.service.AuthService;
import com.brr.ai_coach_interview.service.UserService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
class AuthAndInterviewIntegrationTest {

    @Autowired
    private AuthService authService;

    @Autowired
    private UserService userService;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private AiInterviewCoachService coachService;

    @Test
    @DisplayName("Complete E2E Auth: Register, Login, Forgot Password JWT, Reset Password, Interview Coaching")
    void testCompleteAuthAndInterviewWorkflow() {
        String username = "testuser_" + System.currentTimeMillis();
        String email = username + "@example.com";
        String initialPassword = "Password123!";
        String newPassword = "NewSecretPassword456!";

        // 1. Register user with profile picture
        MockMultipartFile profileImage = new MockMultipartFile(
                "profileImage",
                "avatar.png",
                "image/png",
                "fake image content".getBytes()
        );

        RegisterRequest registerReq = RegisterRequest.builder()
                .username(username)
                .email(email)
                .password(initialPassword)
                .profileImage(profileImage)
                .build();

        System.out.println(">>> STEP 1: Registering user " + username);
        AuthResponse regResponse = authService.register(registerReq);
        System.out.println(">>> STEP 1 COMPLETED. Token: " + regResponse.getToken());
        assertNotNull(regResponse.getToken(), "JWT token should be returned upon registration");
        assertEquals(username, regResponse.getUsername());
        assertEquals(email, regResponse.getEmail());
        assertNotNull(regResponse.getProfileImageUrl());

        // 2. Login with credentials
        System.out.println(">>> STEP 2: Logging in");
        LoginRequest loginReq = LoginRequest.builder()
                .usernameOrEmail(username)
                .password(initialPassword)
                .build();

        AuthResponse loginResponse = authService.login(loginReq);
        System.out.println(">>> STEP 2 COMPLETED. Login token: " + loginResponse.getToken());
        assertNotNull(loginResponse.getToken());
        assertEquals(username, jwtService.extractUsername(loginResponse.getToken()));

        // 3. Request Forgot Password -> Generates Email JWT Token
        System.out.println(">>> STEP 3: Requesting forgot password");
        ForgotPasswordRequest forgotReq = ForgotPasswordRequest.builder()
                .email(email)
                .build();

        ApiResponse<String> forgotResp = authService.forgotPassword(forgotReq);
        System.out.println(">>> STEP 3 COMPLETED. Reset Token: " + forgotResp.getData());
        assertTrue(forgotResp.isSuccess());
        String resetToken = forgotResp.getData();
        assertNotNull(resetToken);
        assertEquals("PASSWORD_RESET", jwtService.extractPurpose(resetToken));

        // 4. Verify the Reset Token
        System.out.println(">>> STEP 4: Verifying reset token");
        ApiResponse<Boolean> verifyResp = authService.verifyResetToken(resetToken);
        assertTrue(verifyResp.getData());

        // 5. Reset Password using the JWT Reset Token
        System.out.println(">>> STEP 5: Resetting password with email JWT token");
        ResetPasswordRequest resetReq = ResetPasswordRequest.builder()
                .token(resetToken)
                .newPassword(newPassword)
                .build();

        ApiResponse<Void> resetResp = authService.resetPassword(resetReq);
        System.out.println(">>> STEP 5 COMPLETED: " + resetResp.getMessage());
        assertTrue(resetResp.isSuccess());

        // 6. Verify old password fails and new password succeeds
        assertThrows(Exception.class, () -> authService.login(LoginRequest.builder()
                .usernameOrEmail(username)
                .password(initialPassword)
                .build()));

        AuthResponse newLoginResponse = authService.login(LoginRequest.builder()
                .usernameOrEmail(email)
                .password(newPassword)
                .build());
        assertNotNull(newLoginResponse.getToken());

        // 7. Start AI Mock Interview Session
        var user = userService.getUserByUsername(username);
        StartInterviewRequest interviewReq = StartInterviewRequest.builder()
                .jobRole("Full Stack Java & Spring Boot Developer")
                .experienceLevel("Mid-Level")
                .questionCount(3)
                .build();

        InterviewSession session = coachService.startInterview(user, interviewReq);
        assertNotNull(session.getId());
        assertEquals(3, session.getQuestions().size());

        // 8. Fetch question and submit detailed response
        Optional<InterviewQuestion> nextQuestionOpt = coachService.getNextQuestion(session.getId());
        assertTrue(nextQuestionOpt.isPresent());
        InterviewQuestion question = nextQuestionOpt.get();

        SubmitAnswerRequest answerReq = SubmitAnswerRequest.builder()
                .questionId(question.getId())
                .answer("In Java, ConcurrentHashMap achieves thread safety by partitioning into buckets and locking only specific bucket nodes using synchronized blocks and CAS (Compare-And-Swap) operations instead of locking the entire table.")
                .build();

        AnswerEvaluationDto evalDto = coachService.evaluateAnswer(user, session.getId(), answerReq);
        assertNotNull(evalDto);
        assertTrue(evalDto.getScore() >= 50, "Expected good score for accurate technical answer");
        assertNotNull(evalDto.getFeedback());
        assertNotNull(evalDto.getModelAnswer());
    }
}

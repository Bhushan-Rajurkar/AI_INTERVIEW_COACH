package com.brr.ai_coach_interview.controller;

import com.brr.ai_coach_interview.dto.AnswerEvaluationDto;
import com.brr.ai_coach_interview.dto.ApiResponse;
import com.brr.ai_coach_interview.dto.QuestionTypeAnticipationDto;
import com.brr.ai_coach_interview.dto.ScoreTrendDto;
import com.brr.ai_coach_interview.dto.SessionSummaryDto;
import com.brr.ai_coach_interview.dto.StartInterviewRequest;
import com.brr.ai_coach_interview.dto.SubmitAnswerRequest;
import com.brr.ai_coach_interview.entity.InterviewQuestion;
import com.brr.ai_coach_interview.entity.InterviewSession;
import com.brr.ai_coach_interview.entity.User;
import com.brr.ai_coach_interview.service.AiInterviewCoachService;
import com.brr.ai_coach_interview.service.ResumeParserService;
import com.brr.ai_coach_interview.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/interview")
@RequiredArgsConstructor
public class InterviewController {

    private final AiInterviewCoachService interviewCoachService;
    private final ResumeParserService resumeParserService;
    private final UserService userService;

    /**
     * Start a mock interview by uploading a resume (PDF or DOCX).
     */
    @PostMapping(value = "/start-with-resume", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<InterviewSession>> startInterviewWithResume(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam("resumeFile") MultipartFile resumeFile,
            @RequestParam(value = "difficulty", defaultValue = "Medium") String difficulty,
            @RequestParam(value = "questionCount", defaultValue = "5") int questionCount) {

        User user = userService.getUserByUsername(userDetails.getUsername());
        InterviewSession session = interviewCoachService.startInterviewWithResume(user, resumeFile, difficulty, questionCount);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Resume uploaded and AI interview questions generated!", session));
    }

    /**
     * Start a job-tailored interview specifying a Target Job Role, Job Description, and optional resume.
     */
    @PostMapping(value = "/start-role-specific", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<InterviewSession>> startRoleSpecificInterview(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam("jobRole") String jobRole,
            @RequestParam(value = "jobDescription", required = false) String jobDescription,
            @RequestParam(value = "resumeFile", required = false) MultipartFile resumeFile,
            @RequestParam(value = "difficulty", defaultValue = "Medium") String difficulty,
            @RequestParam(value = "questionCount", defaultValue = "5") int questionCount) {

        User user = userService.getUserByUsername(userDetails.getUsername());
        InterviewSession session = interviewCoachService.startRoleSpecificInterview(
                user, jobRole, jobDescription, resumeFile, difficulty, questionCount);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Role-tailored interview initialized successfully", session));
    }

    /**
     * Anticipate the types of questions that will be asked in an interview based on the uploaded resume.
     */
    @PostMapping(value = "/practice-questions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<QuestionTypeAnticipationDto>> getAnticipatedQuestions(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(value = "resumeFile", required = false) MultipartFile resumeFile,
            @RequestParam(value = "resumeText", required = false) String resumeText) {

        User user = (userDetails != null) ? userService.getUserByUsername(userDetails.getUsername()) : null;
        QuestionTypeAnticipationDto dto = interviewCoachService.anticipateQuestions(user, resumeFile, resumeText);
        return ResponseEntity.ok(ApiResponse.ok("Anticipated question breakdown generated successfully", dto));
    }

    /**
     * Preview extracted text from an uploaded resume.
     */
    @PostMapping(value = "/extract-resume", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<Map<String, String>>> extractResumeText(
            @RequestParam("resumeFile") MultipartFile resumeFile) {
        String text = resumeParserService.extractText(resumeFile);
        return ResponseEntity.ok(ApiResponse.ok("Resume content extracted successfully", Map.of(
                "fileName", resumeFile.getOriginalFilename() != null ? resumeFile.getOriginalFilename() : "resume",
                "extractedText", text
        )));
    }

    /**
     * Start a mock interview using standard configuration or pre-extracted resume text.
     */
    @PostMapping("/start")
    public ResponseEntity<ApiResponse<InterviewSession>> startInterview(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody StartInterviewRequest request) {
        User user = userService.getUserByUsername(userDetails.getUsername());
        InterviewSession session = interviewCoachService.startInterview(user, request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Interview session started successfully", session));
    }

    /**
     * Retrieve the next unanswered question in the session.
     */
    @GetMapping("/{sessionId}/next-question")
    public ResponseEntity<ApiResponse<InterviewQuestion>> getNextQuestion(
            @PathVariable("sessionId") Long sessionId) {
        return interviewCoachService.getNextQuestion(sessionId)
                .map(question -> ResponseEntity.ok(ApiResponse.ok("Next question retrieved", question)))
                .orElseGet(() -> ResponseEntity.ok(ApiResponse.ok("All questions completed for this session", null)));
    }

    /**
     * Submit user's answer (typed or voice-transcribed) and get AI evaluation.
     */
    @PostMapping("/{sessionId}/submit-answer")
    public ResponseEntity<ApiResponse<AnswerEvaluationDto>> submitAnswer(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable("sessionId") Long sessionId,
            @Valid @RequestBody SubmitAnswerRequest request) {
        User user = userService.getUserByUsername(userDetails.getUsername());
        AnswerEvaluationDto evaluation = interviewCoachService.evaluateAnswer(user, sessionId, request);
        return ResponseEntity.ok(ApiResponse.ok("Answer evaluated successfully", evaluation));
    }

    /**
     * Retrieve session summary and score report.
     */
    @GetMapping("/{sessionId}/summary")
    public ResponseEntity<ApiResponse<SessionSummaryDto>> getSessionSummary(
            @PathVariable("sessionId") Long sessionId) {
        SessionSummaryDto summary = interviewCoachService.getSessionSummary(sessionId);
        return ResponseEntity.ok(ApiResponse.ok("Session summary retrieved", summary));
    }

    /**
     * List user's past interview sessions.
     */
    @GetMapping("/history")
    public ResponseEntity<ApiResponse<List<InterviewSession>>> getInterviewHistory(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.getUserByUsername(userDetails.getUsername());
        List<InterviewSession> history = interviewCoachService.getUserSessions(user);
        return ResponseEntity.ok(ApiResponse.ok("Interview history retrieved", history));
    }

    /**
     * Delete a past interview session.
     */
    @DeleteMapping("/session/{sessionId}")
    public ResponseEntity<ApiResponse<Void>> deleteSession(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable("sessionId") Long sessionId) {
        User user = userService.getUserByUsername(userDetails.getUsername());
        interviewCoachService.deleteSession(user, sessionId);
        return ResponseEntity.ok(ApiResponse.ok("Session deleted successfully", null));
    }

    /**
     * Get score trend across past completed sessions.
     */
    @GetMapping("/trend")
    public ResponseEntity<ApiResponse<List<ScoreTrendDto>>> getScoreTrend(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.getUserByUsername(userDetails.getUsername());
        List<ScoreTrendDto> trend = interviewCoachService.getScoreTrend(user);
        return ResponseEntity.ok(ApiResponse.ok("Score trend retrieved", trend));
    }
}

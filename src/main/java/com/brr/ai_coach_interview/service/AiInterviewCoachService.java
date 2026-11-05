package com.brr.ai_coach_interview.service;

import com.brr.ai_coach_interview.dto.AnswerEvaluationDto;
import com.brr.ai_coach_interview.dto.QuestionTypeAnticipationDto;
import com.brr.ai_coach_interview.dto.ScoreTrendDto;
import com.brr.ai_coach_interview.dto.SessionSummaryDto;
import com.brr.ai_coach_interview.dto.StartInterviewRequest;
import com.brr.ai_coach_interview.dto.SubmitAnswerRequest;
import com.brr.ai_coach_interview.entity.InterviewQuestion;
import com.brr.ai_coach_interview.entity.InterviewSession;
import com.brr.ai_coach_interview.entity.User;
import com.brr.ai_coach_interview.repository.InterviewQuestionRepository;
import com.brr.ai_coach_interview.repository.InterviewSessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiInterviewCoachService {

    private final InterviewSessionRepository sessionRepository;
    private final InterviewQuestionRepository questionRepository;
    private final ResumeParserService resumeParserService;
    private final GeminiAiService geminiAiService;

    /**
     * Starts an interview session by uploading a resume (PDF/DOCX),
     * extracting its text, and generating questions tailored to the resume and
     * difficulty using Gemini AI.
     */
    @Transactional
    public InterviewSession startInterviewWithResume(User user, MultipartFile resumeFile, String difficulty,
            int count) {
        if (difficulty == null || difficulty.isBlank()) {
            difficulty = "Medium";
        }
        if (count < 1)
            count = 3;
        if (count > 10)
            count = 10;

        String resumeText = resumeParserService.extractText(resumeFile);
        String originalFilename = resumeFile.getOriginalFilename() != null ? resumeFile.getOriginalFilename()
                : "resume.pdf";

        // Infer a role title from resume or set descriptive name
        String inferredRole = inferRoleFromResume(resumeText);

        InterviewSession session = InterviewSession.builder()
                .user(user)
                .jobRole(inferredRole)
                .experienceLevel(difficulty + " Interview")
                .difficulty(difficulty)
                .resumeFileName(originalFilename)
                .resumeText(resumeText)
                .status("IN_PROGRESS")
                .overallScore(0.0)
                .build();

        session = sessionRepository.save(session);

        // Fetch recent questions to prevent repetitive questions across consecutive mock interview sessions
        List<String> recentQuestions = getRecentQuestionTexts(user);

        // Generate questions tailored to resume using Gemini AI (with mandatory intro Q1)
        List<GeminiAiService.GeneratedQuestion> generated = geminiAiService.generateQuestionsFromResume(resumeText,
                difficulty, count, recentQuestions);

        List<InterviewQuestion> questions = new ArrayList<>();
        int order = 1;
        for (GeminiAiService.GeneratedQuestion gq : generated) {
            InterviewQuestion q = InterviewQuestion.builder()
                    .session(session)
                    .questionOrder(order++)
                    .questionText(gq.getQuestionText())
                    .category(gq.getCategory() != null ? gq.getCategory() : "Resume Assessment")
                    .modelAnswer(gq.getModelAnswer())
                    .build();
            questions.add(q);
        }

        questionRepository.saveAll(questions);
        session.setQuestions(questions);

        log.info("Started resume-based session #{} for user '{}' with {} questions", session.getId(),
                user.getUsername(), questions.size());
        return session;
    }

    /**
     * Standard session start with optional resume text.
     */
    @Transactional
    public InterviewSession startInterview(User user, StartInterviewRequest request) {
        String difficulty = request.getDifficulty() != null ? request.getDifficulty() : "Medium";
        int count = request.getQuestionCount() > 0 ? Math.min(request.getQuestionCount(), 10) : 5;

        String role = (request.getJobRole() != null && !request.getJobRole().isBlank())
                ? request.getJobRole()
                : "Software Engineer";

        InterviewSession session = InterviewSession.builder()
                .user(user)
                .jobRole(role)
                .jobDescription(request.getJobDescription())
                .experienceLevel(request.getExperienceLevel() != null ? request.getExperienceLevel() : difficulty)
                .difficulty(difficulty)
                .resumeText(request.getResumeText())
                .status("IN_PROGRESS")
                .overallScore(0.0)
                .build();

        session = sessionRepository.save(session);

        // Fetch recent questions to prevent repetitive questions across sessions
        List<String> recentQuestions = getRecentQuestionTexts(user);

        List<GeminiAiService.GeneratedQuestion> generated;
        if (request.getJobDescription() != null && !request.getJobDescription().isBlank()) {
            generated = geminiAiService.generateQuestionsForJobRole(role, request.getJobDescription(), request.getResumeText(), difficulty, count, recentQuestions);
        } else if (request.getResumeText() != null && !request.getResumeText().isBlank()) {
            generated = geminiAiService.generateQuestionsFromResume(request.getResumeText(), difficulty, count, recentQuestions);
        } else {
            // Generate using role and difficulty
            generated = geminiAiService.generateQuestionsFromResume(
                    "Target Job Role: " + role + ". Candidate Level: " + request.getExperienceLevel(),
                    difficulty,
                    count,
                    recentQuestions);
        }

        List<InterviewQuestion> questions = new ArrayList<>();
        int order = 1;
        for (GeminiAiService.GeneratedQuestion gq : generated) {
            InterviewQuestion q = InterviewQuestion.builder()
                    .session(session)
                    .questionOrder(order++)
                    .questionText(gq.getQuestionText())
                    .category(gq.getCategory() != null ? gq.getCategory() : "Core Interview")
                    .modelAnswer(gq.getModelAnswer())
                    .build();
            questions.add(q);
        }

        questionRepository.saveAll(questions);
        session.setQuestions(questions);

        return session;
    }

    /**
     * Start a job-tailored interview with explicit Job Role, Job Description, and optional resume.
     */
    @Transactional
    public InterviewSession startRoleSpecificInterview(User user, String jobRole, String jobDescription, MultipartFile resumeFile, String difficulty, int count) {
        String resumeText = null;
        String resumeFileName = null;

        if (resumeFile != null && !resumeFile.isEmpty()) {
            try {
                resumeText = resumeParserService.extractText(resumeFile);
                resumeFileName = resumeFile.getOriginalFilename();
            } catch (Exception e) {
                log.warn("Failed to extract resume in role-specific interview: {}", e.getMessage());
            }
        }

        if (count < 1) count = 3;
        if (count > 10) count = 10;
        if (difficulty == null || difficulty.isBlank()) difficulty = "Medium";
        if (jobRole == null || jobRole.isBlank()) jobRole = "Software Engineer";

        InterviewSession session = InterviewSession.builder()
                .user(user)
                .jobRole(jobRole)
                .jobDescription(jobDescription)
                .experienceLevel(difficulty + " Interview")
                .difficulty(difficulty)
                .resumeFileName(resumeFileName)
                .resumeText(resumeText)
                .status("IN_PROGRESS")
                .overallScore(0.0)
                .build();

        session = sessionRepository.save(session);

        // Fetch recent questions to prevent repetitive questions across sessions
        List<String> recentQuestions = getRecentQuestionTexts(user);

        List<GeminiAiService.GeneratedQuestion> generated = geminiAiService.generateQuestionsForJobRole(
                jobRole, jobDescription, resumeText, difficulty, count, recentQuestions);

        List<InterviewQuestion> questions = new ArrayList<>();
        int order = 1;
        for (GeminiAiService.GeneratedQuestion gq : generated) {
            InterviewQuestion q = InterviewQuestion.builder()
                    .session(session)
                    .questionOrder(order++)
                    .questionText(gq.getQuestionText())
                    .category(gq.getCategory() != null ? gq.getCategory() : "Role Assessment")
                    .modelAnswer(gq.getModelAnswer())
                    .build();
            questions.add(q);
        }

        questionRepository.saveAll(questions);
        session.setQuestions(questions);

        log.info("Started role-specific interview session #{} for user '{}' on role '{}' with {} questions",
                session.getId(), user.getUsername(), jobRole, questions.size());
        return session;
    }

    /**
     * Retrieves up to 20 recently asked question texts for the candidate to avoid duplicate interview questions.
     */
    private List<String> getRecentQuestionTexts(User user) {
        if (user == null || user.getId() == null) {
            return Collections.emptyList();
        }
        try {
            return questionRepository.findRecentQuestionTextsByUser(user, PageRequest.of(0, 20));
        } catch (Exception e) {
            log.warn("Could not retrieve recent questions for user '{}': {}", user.getUsername(), e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Analyzes uploaded or saved resume to anticipate the exact categories and questions asked.
     */
    public QuestionTypeAnticipationDto anticipateQuestions(User user, MultipartFile resumeFile, String optionalResumeText) {
        String textToAnalyze = optionalResumeText;

        if (resumeFile != null && !resumeFile.isEmpty()) {
            try {
                textToAnalyze = resumeParserService.extractText(resumeFile);
            } catch (Exception e) {
                log.warn("Failed to extract resume file for anticipation: {}", e.getMessage());
            }
        }

        if (textToAnalyze == null || textToAnalyze.isBlank()) {
            if (user != null) {
                List<InterviewSession> sessions = sessionRepository.findByUserOrderByCreatedAtDesc(user);
                for (InterviewSession s : sessions) {
                    if (s.getResumeText() != null && !s.getResumeText().isBlank()) {
                        textToAnalyze = s.getResumeText();
                        break;
                    }
                }
            }
        }

        if (textToAnalyze == null || textToAnalyze.isBlank()) {
            textToAnalyze = "Software Engineer candidate skilled in full stack development, Java, React, SQL, and REST APIs.";
        }

        return geminiAiService.anticipateQuestionTypes(textToAnalyze);
    }

    /**
     * Retrieves the next unanswered question for the session.
     */
    public Optional<InterviewQuestion> getNextQuestion(Long sessionId) {
        InterviewSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));

        return questionRepository.findFirstBySessionAndUserAnswerIsNullOrderByQuestionOrderAsc(session);
    }

    /**
     * Evaluates a candidate's answer using Gemini AI, returning score out of 10,
     * strengths, areas to improve, and actionable coaching feedback.
     */
    @Transactional
    public AnswerEvaluationDto evaluateAnswer(User user, Long sessionId, SubmitAnswerRequest request) {
        InterviewSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));

        if (!session.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Unauthorized access to interview session");
        }

        InterviewQuestion question = questionRepository.findById(request.getQuestionId())
                .orElseThrow(() -> new IllegalArgumentException("Question not found: " + request.getQuestionId()));

        String answer = request.getAnswer() != null ? request.getAnswer().trim() : "";
        question.setUserAnswer(answer);
        question.setAnsweredAt(LocalDateTime.now());

        // Perform AI evaluation with Gemini
        GeminiAiService.EvaluationResult eval = geminiAiService.evaluateAnswer(
                question.getQuestionText(),
                answer,
                session.getDifficulty() != null ? session.getDifficulty() : "Medium",
                question.getModelAnswer());

        question.setScore(eval.getScore());
        question.setStrengths(eval.getStrengths());
        question.setAreasToImprove(eval.getAreasToImprove());
        question.setFeedback(eval.getFeedback());
        if (eval.getModelAnswer() != null && !eval.getModelAnswer().isBlank()) {
            question.setModelAnswer(eval.getModelAnswer());
        }

        questionRepository.save(question);

        // Check if all questions are answered
        List<InterviewQuestion> allQuestions = questionRepository.findBySessionOrderByQuestionOrderAsc(session);
        boolean anyUnanswered = allQuestions.stream().anyMatch(q -> q.getUserAnswer() == null);

        Long nextQuestionId = null;
        if (anyUnanswered) {
            nextQuestionId = allQuestions.stream()
                    .filter(q -> q.getUserAnswer() == null)
                    .map(InterviewQuestion::getId)
                    .findFirst()
                    .orElse(null);
        } else {
            // All answered -> finalize session
            session.setStatus("COMPLETED");
            double avgScore = allQuestions.stream()
                    .mapToDouble(q -> q.getScore() != null ? q.getScore() : 0.0)
                    .average()
                    .orElse(0.0);
            avgScore = Math.round(avgScore * 10.0) / 10.0;
            session.setOverallScore(avgScore);
            session.setSummaryFeedback(buildSessionSummary(session, avgScore, allQuestions));
            sessionRepository.save(session);
        }

        return AnswerEvaluationDto.builder()
                .questionId(question.getId())
                .score(eval.getScore())
                .strengths(eval.getStrengths())
                .areasToImprove(eval.getAreasToImprove())
                .feedback(eval.getFeedback())
                .modelAnswer(question.getModelAnswer())
                .sessionCompleted(!anyUnanswered)
                .nextQuestionId(nextQuestionId)
                .build();
    }

    /**
     * Retrieves overall session summary report.
     */
    public SessionSummaryDto getSessionSummary(Long sessionId) {
        InterviewSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));

        List<InterviewQuestion> questions = questionRepository.findBySessionOrderByQuestionOrderAsc(session);

        List<SessionSummaryDto.QuestionDetailDto> qDtos = questions.stream()
                .map(q -> SessionSummaryDto.QuestionDetailDto.builder()
                        .id(q.getId())
                        .questionOrder(q.getQuestionOrder())
                        .questionText(q.getQuestionText())
                        .category(q.getCategory())
                        .userAnswer(q.getUserAnswer())
                        .score(q.getScore())
                        .strengths(q.getStrengths())
                        .areasToImprove(q.getAreasToImprove())
                        .feedback(q.getFeedback())
                        .modelAnswer(q.getModelAnswer())
                        .build())
                .collect(Collectors.toList());

        return SessionSummaryDto.builder()
                .sessionId(session.getId())
                .jobRole(session.getJobRole())
                .experienceLevel(session.getExperienceLevel())
                .difficulty(session.getDifficulty() != null ? session.getDifficulty() : "Medium")
                .status(session.getStatus())
                .overallScore(session.getOverallScore())
                .summaryFeedback(session.getSummaryFeedback())
                .resumeFileName(session.getResumeFileName())
                .createdAt(session.getCreatedAt())
                .questions(qDtos)
                .build();
    }

    /**
     * Retrieves all interview sessions for user.
     */
    public List<InterviewSession> getUserSessions(User user) {
        return sessionRepository.findByUserOrderByCreatedAtDesc(user);
    }

    /**
     * Deletes a session and all its associated questions.
     */
    @Transactional
    public void deleteSession(User user, Long sessionId) {
        InterviewSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException("Session not found: " + sessionId));

        if (!session.getUser().getId().equals(user.getId())) {
            throw new IllegalArgumentException("Unauthorized to delete this interview session");
        }

        sessionRepository.delete(session);
        log.info("Deleted interview session #{} for user '{}'", sessionId, user.getUsername());
    }

    /**
     * Retrieves score trend data across all completed sessions for progress
     * tracking.
     */
    public List<ScoreTrendDto> getScoreTrend(User user) {
        List<InterviewSession> sessions = sessionRepository.findByUserOrderByCreatedAtDesc(user);
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("MMM dd");

        List<ScoreTrendDto> trends = sessions.stream()
                .filter(s -> "COMPLETED".equals(s.getStatus()) && s.getOverallScore() != null)
                .map(s -> ScoreTrendDto.builder()
                        .sessionId(s.getId())
                        .jobRole(s.getJobRole())
                        .difficulty(s.getDifficulty() != null ? s.getDifficulty() : "Medium")
                        .overallScore(s.getOverallScore())
                        .createdAt(s.getCreatedAt())
                        .dateLabel(s.getCreatedAt() != null ? s.getCreatedAt().format(formatter) : "Recent")
                        .build())
                .collect(Collectors.toList());

        // Reverse to chronological order (oldest to newest)
        Collections.reverse(trends);
        return trends;
    }

    private String buildSessionSummary(InterviewSession session, double avgScore, List<InterviewQuestion> questions) {
        if (avgScore >= 8.5) {
            return "🌟 Outstanding Performance! You demonstrated exceptional technical mastery, structured thinking, and solid real-world engineering insights across your answers.";
        } else if (avgScore >= 7.0) {
            return "👍 Strong Interview Round! You showed good technical competence and relevant domain experience. Fine-tuning edge cases and architecture will make your answers stand out even further.";
        } else if (avgScore >= 5.0) {
            return "📈 Promising Baseline! You have a good understanding of foundational concepts, but review the suggested areas to improve to articulate deeper architectural trade-offs.";
        } else {
            return "💡 Practice Recommended! Focus on strengthening your core technical foundations and structuring your answers with concrete examples from your resume.";
        }
    }

    private String inferRoleFromResume(String text) {
        String lower = text.toLowerCase();
        if (lower.contains("full stack") || lower.contains("fullstack"))
            return "Full Stack Developer";
        if (lower.contains("backend") || lower.contains("spring boot") || lower.contains("java developer"))
            return "Backend Java Engineer";
        if (lower.contains("frontend") || lower.contains("react developer"))
            return "Frontend React Engineer";
        if (lower.contains("devops") || lower.contains("cloud engineer") || lower.contains("kubernetes"))
            return "DevOps & Cloud Engineer";
        if (lower.contains("data engineer") || lower.contains("machine learning") || lower.contains("ai engineer"))
            return "AI & Data Engineer";
        return "Software Engineer Candidate";
    }
}

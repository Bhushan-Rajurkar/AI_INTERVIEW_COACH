package com.brr.ai_coach_interview.service;

import com.brr.ai_coach_interview.dto.QuestionTypeAnticipationDto;
import com.brr.ai_coach_interview.entity.InterviewQuestion;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Slf4j
@Service
public class GeminiAiService {

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value("${gemini.api.model:gemini-1.5-flash}")
    private String model;

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GeneratedQuestion {
        private String questionText;
        private String category;
        private String modelAnswer;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EvaluationResult {
        private Double score; // out of 10
        private String strengths;
        private String areasToImprove;
        private String feedback;
        private String modelAnswer;
    }

    /**
     * Creates the mandatory introductory question that must start every mock
     * interview session.
     */
    public GeneratedQuestion createIntroQuestion() {
        return GeneratedQuestion.builder()
                .questionText(
                        "Please introduce yourself, walking through your technical background, skills, and key projects.")
                .category("Candidate Introduction (In-Depth)")
                .modelAnswer(
                        "The candidate should deliver a confident, structured 60 to 90-second introduction covering their background, core languages/frameworks (e.g. Java, Spring Boot, MySQL), primary production projects built, and what drives their engineering interest.")
                .build();
    }

    /**
     * Calls Gemini AI to generate tailored interview questions based on the
     * candidate's resume and difficulty.
     * Backwards-compatible overload without recent questions list.
     */
    public List<GeneratedQuestion> generateQuestionsFromResume(String resumeText, String difficulty, int count) {
        return generateQuestionsFromResume(resumeText, difficulty, count, Collections.emptyList());
    }

    /**
     * Calls Gemini AI to generate tailored interview questions based on the
     * candidate's resume,
     * ensuring mandatory self-introduction as Question 1, deep probing of resume
     * projects/experience,
     * a strictly balanced 50/50 alternating mix of small concise questions and long
     * in-depth questions,
     * and anti-repetition filtering across past sessions.
     */
    public List<GeneratedQuestion> generateQuestionsFromResume(String resumeText, String difficulty, int count,
            List<String> recentQuestions) {
        if (count < 1)
            count = 3;
        if (count > 10)
            count = 10;
        if (difficulty == null || difficulty.isBlank())
            difficulty = "Medium";

        int technicalCount = Math.max(1, count - 1);

        String recentExclusions = "";
        if (recentQuestions != null && !recentQuestions.isEmpty()) {
            StringBuilder sb = new StringBuilder(
                    "\nQUESTIONS PREVIOUSLY ASKED TO THIS CANDIDATE IN PAST SESSIONS (DO NOT REPEAT THESE QUESTIONS OR CLOSE VARIANTS):\n");
            for (String rq : recentQuestions) {
                if (rq != null && !rq.isBlank()) {
                    sb.append("- ").append(rq.trim()).append("\n");
                }
            }
            sb.append(
                    "Make sure the questions you generate are DIFFERENT and explore other technical topics, project components, and engineering trade-offs.\n");
            recentExclusions = sb.toString();
        }

        String prompt = String.format(
                """
                        You are an expert technical interviewer conducting a mock interview tailored to candidate's resume.
                        Analyze the candidate resume carefully and generate exactly %d TECHNICAL interview questions as a BALANCED MIX of SMALL/CONCISE questions and IN-DEPTH questions.
                        Difficulty Level: %s

                        CRITICAL QUESTION RULES:
                        1. DO NOT generate an 'Introduce yourself' question (Question 1 is already handled separately as the mandatory opening icebreaker).
                        2. STRICT 50/50 BALANCED MIX OF SMALL & LONG QUESTIONS:
                           - Exactly half the questions MUST be SMALL, CONCISE, AND DIRECT questions (testing core definitions, differences between two concepts, annotations, key syntax, under 18 words). Category MUST end with '(Concise)'.
                           - Exactly half the questions MUST be IN-DEPTH, ARCHITECTURAL, or SCENARIO questions (testing system design trade-offs, concurrency handling, database scaling, or troubleshooting). Category MUST end with '(In-Depth)'.
                           - Alternate strictly: Odd items in your list must be Concise, Even items must be In-Depth.
                        3. Deeply inspect the candidate's actual projects, frameworks, databases, and work experience mentioned in their resume (e.g. project architecture, data flow, concurrency, database modeling, REST API design, performance optimization).
                        4. Directly reference specific technologies and project details from their resume so the questions test authentic, hands-on engineering ownership.
                        5. Keep small questions short and direct (1 sentence). Keep in-depth questions focused on practical architecture and trade-offs (1 to 2 sentences).
                        6. DO NOT REPEAT any of the previously asked questions listed below. Ensure variety across sessions.
                        %s

                        JSON Format:
                        [
                          {
                            "questionText": "Direct technical question...",
                            "category": "Core Frameworks (Concise) | Project Architecture (In-Depth) | Database & Scale (In-Depth) | Language Mechanics (Concise)",
                            "modelAnswer": "A concise, documentation-grade model answer covering key concepts and trade-offs..."
                          }
                        ]

                        Candidate Resume Content:
                        \"\"\"
                        %s
                        \"\"\"
                        """,
                technicalCount, difficulty, recentExclusions,
                resumeText != null ? resumeText : "General Software Engineer Candidate");

        try {
            String rawResponse = callGemini(prompt);
            String jsonContent = extractJson(rawResponse);
            List<GeneratedQuestion> questions = objectMapper.readValue(jsonContent,
                    new TypeReference<List<GeneratedQuestion>>() {
                    });
            if (questions != null && !questions.isEmpty()) {
                List<GeneratedQuestion> result = new ArrayList<>();
                result.add(createIntroQuestion());
                for (GeneratedQuestion q : questions) {
                    if (q != null && q.getQuestionText() != null) {
                        String lower = q.getQuestionText().toLowerCase();
                        if (!lower.contains("introduce yourself") && !lower.contains("tell me about yourself")
                                && !lower.contains("introduce about yourself")) {
                            result.add(q);
                        }
                    }
                    if (result.size() >= count)
                        break;
                }
                // Enforce alternating (Concise) / (In-Depth) category tags for UI timer binding
                for (int i = 1; i < result.size(); i++) {
                    GeneratedQuestion gq = result.get(i);
                    String cat = gq.getCategory() != null ? gq.getCategory() : "Technical";
                    boolean shouldBeConcise = (i % 2 == 1); // Q2 (idx 1), Q4 (idx 3)... are Concise
                    if (shouldBeConcise) {
                        if (!cat.contains("(Concise)") && !cat.contains("(In-Depth)")) {
                            gq.setCategory(cat + " (Concise)");
                        }
                    } else {
                        if (!cat.contains("(Concise)") && !cat.contains("(In-Depth)")) {
                            gq.setCategory(cat + " (In-Depth)");
                        }
                    }
                }
                if (result.size() >= count) {
                    log.info("Gemini generated {} resume-tailored questions successfully with mandatory introduction.",
                            result.size());
                    return result;
                }
            }
        } catch (Exception e) {
            log.warn("Gemini API call or JSON parsing failed ({}), falling back to intelligent rotating question bank",
                    e.getMessage());
        }

        return fallbackResumeQuestions(resumeText, difficulty, count, recentQuestions);
    }

    /**
     * Generates questions tailored to a specific Target Job Role and Job
     * Description (with optional resume).
     * Backwards-compatible overload without recent questions list.
     */
    public List<GeneratedQuestion> generateQuestionsForJobRole(String jobRole, String jobDescription,
            String optionalResumeText, String difficulty, int count) {
        return generateQuestionsForJobRole(jobRole, jobDescription, optionalResumeText, difficulty, count,
                Collections.emptyList());
    }

    /**
     * Generates questions tailored to a specific Target Job Role and Job
     * Description (with optional resume),
     * ensuring mandatory self-introduction as Question 1, strict adherence to JD
     * requirements and duties,
     * a 50/50 alternating mix of small concise questions and long in-depth
     * questions,
     * and anti-repetition across previous sessions.
     */
    public List<GeneratedQuestion> generateQuestionsForJobRole(String jobRole, String jobDescription,
            String optionalResumeText, String difficulty, int count, List<String> recentQuestions) {
        if (count < 1)
            count = 3;
        if (count > 10)
            count = 10;
        if (difficulty == null || difficulty.isBlank())
            difficulty = "Medium";
        if (jobRole == null || jobRole.isBlank())
            jobRole = "Software Engineer";

        int technicalCount = Math.max(1, count - 1);

        String recentExclusions = "";
        if (recentQuestions != null && !recentQuestions.isEmpty()) {
            StringBuilder sb = new StringBuilder(
                    "\nQUESTIONS PREVIOUSLY ASKED TO THIS CANDIDATE IN PAST SESSIONS (DO NOT REPEAT THESE QUESTIONS OR CLOSE VARIANTS):\n");
            for (String rq : recentQuestions) {
                if (rq != null && !rq.isBlank()) {
                    sb.append("- ").append(rq.trim()).append("\n");
                }
            }
            sb.append(
                    "Make sure the questions you generate are DIFFERENT and explore other duties, frameworks, and architecture scenarios.\n");
            recentExclusions = sb.toString();
        }

        String prompt = String.format(
                """
                        You are a senior hiring manager and technical interviewer conducting a mock interview for the role of '%s'.
                        Generate exactly %d TECHNICAL interview questions tailored STRICTLY to the Job Description and Target Role below.
                        Difficulty Level: %s

                        CRITICAL ROLE & MIX RULES:
                        1. DO NOT generate an 'Introduce yourself' question (Question 1 is already handled separately as the mandatory opening icebreaker).
                        2. STRICT ADHERENCE TO TARGET JOB ROLE & JD:
                           - Every single question MUST directly test the specific tools, libraries, duties, frameworks, and engineering expectations explicitly mentioned in the Job Description or standard for '%s'.
                           - Do NOT ask generic trivia or unrelated topics. If JD is for Java Backend, stick to Java, Spring Boot, Hibernate, SQL; if JD is for Frontend, stick to JavaScript, React, CSS, APIs; if JD is for DevOps, stick to CI/CD, Docker, Kubernetes, Cloud.
                        3. STRICT 50/50 BALANCED MIX OF SMALL & LONG QUESTIONS:
                           - Exactly half the questions MUST be SMALL, ACCESSIBLE, AND CONCISE questions (testing core definitions, differences, annotations, syntax, or key concepts - under 18 words). Category tag MUST end with '(Concise)'.
                           - Exactly half the questions MUST be IN-DEPTH ARCHITECTURAL or SCENARIO questions (testing real-world workflows, failure modes, trade-offs, scaling, or edge cases). Category tag MUST end with '(In-Depth)'.
                           - Alternate strictly: Odd questions in this list must be Concise, Even questions must be In-Depth.
                        4. If candidate resume content is provided, link questions to their relevant hands-on experience fitting the target role.
                        5. Keep small questions short and direct (1 sentence). Keep in-depth questions focused on practical architecture and trade-offs (1 to 2 sentences).
                        6. DO NOT REPEAT any of the previously asked questions listed below.
                        %s

                        JSON Format:
                        [
                          {
                            "questionText": "Direct question strictly testing role requirements...",
                            "category": "Role Core (Concise) | System Design (In-Depth) | Framework Fundamentals (Concise) | Architecture & Trade-offs (In-Depth)",
                            "modelAnswer": "A clear, documentation-grade model answer covering key points..."
                          }
                        ]

                        Target Job Role:
                        %s

                        Job Description / Requirements:
                        \"\"\"
                        %s
                        \"\"\"

                        Candidate Resume (Optional):
                        \"\"\"
                        %s
                        \"\"\"
                        """,
                jobRole, technicalCount, difficulty, jobRole, recentExclusions, jobRole,
                jobDescription != null ? jobDescription : "General engineering requirements",
                optionalResumeText != null ? optionalResumeText : "Not provided");

        try {
            String rawResponse = callGemini(prompt);
            String jsonContent = extractJson(rawResponse);
            List<GeneratedQuestion> questions = objectMapper.readValue(jsonContent,
                    new TypeReference<List<GeneratedQuestion>>() {
                    });
            if (questions != null && !questions.isEmpty()) {
                List<GeneratedQuestion> result = new ArrayList<>();
                result.add(createIntroQuestion());
                for (GeneratedQuestion q : questions) {
                    if (q != null && q.getQuestionText() != null) {
                        String lower = q.getQuestionText().toLowerCase();
                        if (!lower.contains("introduce yourself") && !lower.contains("tell me about yourself")
                                && !lower.contains("introduce about yourself")) {
                            result.add(q);
                        }
                    }
                    if (result.size() >= count)
                        break;
                }
                // Enforce alternating (Concise) / (In-Depth) category tags for UI timer binding
                for (int i = 1; i < result.size(); i++) {
                    GeneratedQuestion gq = result.get(i);
                    String cat = gq.getCategory() != null ? gq.getCategory() : "Job Role Technical";
                    boolean shouldBeConcise = (i % 2 == 1); // Q2 (idx 1), Q4 (idx 3)... are Concise
                    if (shouldBeConcise) {
                        if (!cat.contains("(Concise)") && !cat.contains("(In-Depth)")) {
                            gq.setCategory(cat + " (Concise)");
                        }
                    } else {
                        if (!cat.contains("(Concise)") && !cat.contains("(In-Depth)")) {
                            gq.setCategory(cat + " (In-Depth)");
                        }
                    }
                }
                if (result.size() >= count) {
                    log.info("Gemini generated {} role-tailored questions for role '{}' with mandatory introduction.",
                            result.size(), jobRole);
                    return result;
                }
            }
        } catch (Exception e) {
            log.warn("Gemini call for role-specific questions failed ({}), using fallback generator", e.getMessage());
        }

        String combinedContext = "Job Role: " + jobRole + "\n" + (jobDescription != null ? jobDescription : "") + "\n"
                + (optionalResumeText != null ? optionalResumeText : "");
        return fallbackResumeQuestions(combinedContext, difficulty, count, recentQuestions);
    }

    /**
     * Analyzes candidate's uploaded resume to anticipate the exact question
     * categories,
     * sample questions, why interviewers ask them, and answer strategies.
     */
    public QuestionTypeAnticipationDto anticipateQuestionTypes(String resumeText) {
        String prompt = String.format(
                """
                        You are an elite tech career coach and technical hiring lead. Analyze this resume and determine the types of interview questions
                        that hiring managers will ask this candidate based on their uploaded resume.

                        Generate a comprehensive bank of AT LEAST 10 TO 12 technical and behavioral interview questions across 4 distinct categories.
                        For each question, provide a structured, meaningful BENCHMARK ANSWER written in CLEAR, SIMPLE, AND ACCESSIBLE LANGUAGE.
                        Avoid overly dense academic jargon; explain core mechanics step-by-step using plain English with highlighted important terms.

                        Return strictly a JSON object with:
                        - candidateRole: inferred role title (e.g. "Backend Java Developer")
                        - topSkillsIdentified: array of 4-6 key skills extracted from resume
                        - recommendedFocusAreas: array of 3 key topics they should review before the interview
                        - categories: array of 4 question type categories, each having:
                            - categoryName: "Project Architecture & Deep-Dive", "Core Language & Framework Fundamentals", "System Design, Databases & Scalability", "Behavioral & Engineering Ownership"
                            - description: what this category evaluates
                            - interviewerGoal: why recruiters/interviewers ask this type of question
                            - recommendedStrategy: how the candidate should structure their answer (e.g. STAR method)
                            - sampleQuestions: array of 2 to 3 questions per category (minimum 10 questions in total across all categories), each having:
                                - questionType: "Concept & Fundamentals" | "System Design & Architecture" | "Live Project Deep-Dive" | "Scenario & Troubleshooting" | "Behavioral & Ownership"
                                - questionText: clear, concise interview question
                                - keyTopics: key technical concepts with important words (e.g. "Heap vs Stack, garbage collector algorithms, reference counting, object lifecycle")
                                - mustMentionKeywords: comma-separated list of 5-8 crucial technical mechanisms, algorithms, data structures, and trade-offs that the candidate MUST speak in their ANSWER to earn full marks from a recruiter. DO NOT simply repeat words from the question prompt itself; provide the underlying solution terms the candidate needs to answer with (e.g. for a Heap vs Stack question, keywords should be "GC Roots, Mark-Sweep-Compact, Eden Space, Tenured Generation, Stack Frame Primitives, OutOfMemoryError Prevention")
                                - tipForAnswering: strategic coaching advice on how to structure the answer and what keywords recruiters listen for
                                - detailedAnswer: professional, documentation-style benchmark answer formatted with clear markdown headings (### 1. Section Title), bold keywords (**keyword**), bullet points, and clean step-by-step explanations
                                - sampleAnswerSummary: 1-2 sentence quick summary of the answer

                        Resume Content:
                        \"\"\"
                        %s
                        \"\"\"
                        """,
                resumeText != null ? resumeText : "General Software Engineer Candidate");

        try {
            String rawResponse = callGemini(prompt);
            String jsonContent = extractJson(rawResponse);
            QuestionTypeAnticipationDto dto = objectMapper.readValue(jsonContent, QuestionTypeAnticipationDto.class);
            if (dto != null && dto.getCategories() != null && !dto.getCategories().isEmpty()) {
                // Populate flattened allQuestions list with category tags and sequential IDs
                List<QuestionTypeAnticipationDto.SampleQuestion> flattened = new ArrayList<>();
                int idCounter = 1;
                for (QuestionTypeAnticipationDto.QuestionTypeCategory cat : dto.getCategories()) {
                    if (cat.getSampleQuestions() != null) {
                        for (QuestionTypeAnticipationDto.SampleQuestion sq : cat.getSampleQuestions()) {
                            sq.setId(idCounter++);
                            sq.setCategory(cat.getCategoryName());
                            flattened.add(sq);
                        }
                    }
                }
                dto.setAllQuestions(flattened);
                return dto;
            }
        } catch (Exception e) {
            log.warn("Gemini anticipation failed ({}), using intelligent fallback breakdown", e.getMessage());
        }

        return fallbackAnticipatedQuestions(resumeText);
    }

    /**
     * Calls Gemini AI to evaluate a candidate's answer with score out of 10,
     * strengths, and areas to improve.
     */
    public EvaluationResult evaluateAnswer(String questionText, String userAnswer, String difficulty,
            String defaultModelAnswer) {
        if (userAnswer == null || userAnswer.trim().isEmpty()) {
            return EvaluationResult.builder()
                    .score(0.0)
                    .strengths("None. No answer provided.")
                    .areasToImprove("Candidate submitted an empty or blank answer.")
                    .feedback("Please provide an explanation or code design to receive credit.")
                    .modelAnswer(defaultModelAnswer)
                    .build();
        }

        String prompt = String.format(
                """
                        You are an expert interview evaluator and senior hiring coach.
                        Evaluate the candidate's answer to the given question at '%s' difficulty.

                        Question:
                        \"%s\"

                        Candidate's Answer:
                        \"%s\"

                        Evaluation Instructions:
                        1. Score the answer strictly out of 10.0 (e.g. 8.5, 6.0, 9.2).
                           - 9.0-10.0: Masterful, accurate, covers edge cases and tradeoffs.
                           - 7.0-8.9: Strong answer with good technical depth.
                           - 5.0-6.9: Partially correct but lacks depth, examples, or precision.
                           - Below 5.0: Inaccurate, misleading, or excessively vague.
                        2. Detail 2-3 specific "strengths" (what the candidate explained well).
                        3. Detail 2-3 specific "areasToImprove" (key missing points, better alternatives, or deeper technical accuracy).
                        4. Provide constructive "feedback" summarising their performance.
                        5. Provide a refined "modelAnswer" summarizing the ideal standard.

                        Return strictly valid JSON object without extra markdown fences:
                        {
                          "score": 8.5,
                          "strengths": "- Clear explanation of...\\n- Accurate mention of...",
                          "areasToImprove": "- Did not mention...\\n- Could elaborate on...",
                          "feedback": "Overall strong response showing solid understanding...",
                          "modelAnswer": "An optimal answer includes..."
                        }
                        """,
                difficulty, questionText, userAnswer);

        try {
            String rawResponse = callGemini(prompt);
            String jsonContent = extractJson(rawResponse);
            JsonNode root = objectMapper.readTree(jsonContent);

            Double score = root.has("score") ? root.get("score").asDouble() : 7.0;
            if (score > 10.0)
                score = 10.0;
            if (score < 0.0)
                score = 0.0;
            // Round to 1 decimal place
            score = Math.round(score * 10.0) / 10.0;

            String strengths = root.has("strengths") ? root.get("strengths").asText()
                    : "Good effort on answering key concepts.";
            String areasToImprove = root.has("areasToImprove") ? root.get("areasToImprove").asText()
                    : "Add more specific architectural details.";
            String feedback = root.has("feedback") ? root.get("feedback").asText() : "Solid answer.";
            String modelAns = root.has("modelAnswer") && !root.get("modelAnswer").asText().isBlank()
                    ? root.get("modelAnswer").asText()
                    : defaultModelAnswer;

            return EvaluationResult.builder()
                    .score(score)
                    .strengths(strengths)
                    .areasToImprove(areasToImprove)
                    .feedback(feedback)
                    .modelAnswer(modelAns)
                    .build();

        } catch (Exception e) {
            log.warn("Gemini evaluation failed ({}), using fallback evaluator", e.getMessage());
            return fallbackEvaluation(questionText, userAnswer, difficulty, defaultModelAnswer);
        }
    }

    /**
     * Executes the Gemini REST call.
     */
    private String callGemini(String prompt) {
        String url = String.format("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
                model, apiKey);

        Map<String, Object> textPart = Map.of("text", prompt);
        Map<String, Object> partsObj = Map.of("parts", List.of(textPart));
        Map<String, Object> requestBody = Map.of("contents", List.of(partsObj));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
        ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

        if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
            try {
                JsonNode root = objectMapper.readTree(response.getBody());
                JsonNode candidates = root.path("candidates");
                if (candidates.isArray() && !candidates.isEmpty()) {
                    return candidates.get(0).path("content").path("parts").get(0).path("text").asText();
                }
            } catch (Exception e) {
                log.error("Failed to parse Gemini response payload", e);
            }
        }
        throw new RuntimeException("Empty or invalid response from Gemini API");
    }

    /**
     * Strips Markdown ```json fences if present.
     */
    private String extractJson(String text) {
        if (text == null)
            return "{}";
        String trimmed = text.trim();
        if (trimmed.startsWith("```json")) {
            trimmed = trimmed.substring(7);
        } else if (trimmed.startsWith("```")) {
            trimmed = trimmed.substring(3);
        }
        if (trimmed.endsWith("```")) {
            trimmed = trimmed.substring(0, trimmed.length() - 3);
        }
        return trimmed.trim();
    }

    /**
     * Fallback question generator when Gemini API is offline or quota exceeded.
     * Backwards-compatible overload.
     */
    private List<GeneratedQuestion> fallbackResumeQuestions(String resumeText, String difficulty, int count) {
        return fallbackResumeQuestions(resumeText, difficulty, count, Collections.emptyList());
    }

    /**
     * Fallback question generator when Gemini API is offline or quota exceeded.
     * Enforces Question 1 as mandatory self-introduction, selects dynamically from
     * an extensive 40+
     * question bank tailored to candidate resume technologies, and shuffles/rotates
     * while actively
     * excluding questions asked in recent interview sessions.
     */
    /**
     * Fallback question generator when Gemini API is offline or quota exceeded.
     * Enforces Question 1 as mandatory self-introduction (150s), selects
     * dynamically from an extensive 45+
     * question bank tailored to candidate resume/job role, guarantees a strictly
     * alternating 50/50 mix
     * of small concise questions (105s, 90-120s range) and long in-depth questions
     * (150s),
     * and actively excludes questions asked in recent interview sessions.
     */
    private List<GeneratedQuestion> fallbackResumeQuestions(String resumeText, String difficulty, int count,
            List<String> recentQuestions) {
        List<GeneratedQuestion> result = new ArrayList<>();
        result.add(createIntroQuestion());

        if (count <= 1) {
            return result;
        }

        List<GeneratedQuestion> pool = getAllFallbackTechnicalQuestions(resumeText);

        // Normalize recent questions for anti-repetition check
        Set<String> recentNormalized = new HashSet<>();
        if (recentQuestions != null) {
            for (String rq : recentQuestions) {
                if (rq != null && !rq.isBlank()) {
                    recentNormalized.add(rq.trim().toLowerCase());
                }
            }
        }

        // Partition pool into Concise (small/quick) vs In-Depth
        // (architectural/scenario) pools
        List<GeneratedQuestion> concisePool = new ArrayList<>();
        List<GeneratedQuestion> inDepthPool = new ArrayList<>();

        for (GeneratedQuestion q : pool) {
            String cat = q.getCategory() != null ? q.getCategory().toLowerCase() : "";
            if (cat.contains("(concise)") || cat.contains("concise")) {
                concisePool.add(q);
            } else {
                inDepthPool.add(q);
            }
        }

        // Partition into non-repeated and repeated
        List<GeneratedQuestion> conciseNonRep = filterOutRecent(concisePool, recentNormalized);
        List<GeneratedQuestion> inDepthNonRep = filterOutRecent(inDepthPool, recentNormalized);

        Collections.shuffle(conciseNonRep, new Random());
        Collections.shuffle(inDepthNonRep, new Random());
        Collections.shuffle(concisePool, new Random());
        Collections.shuffle(inDepthPool, new Random());

        int conciseIdx = 0;
        int inDepthIdx = 0;

        // Alternately interleave:
        // Q1 = Intro (In-Depth / 150s)
        // Q2 = Concise (Small / 105s)
        // Q3 = In-Depth (Long / 150s)
        // Q4 = Concise (Small / 105s)
        // Q5 = In-Depth (Long / 150s)
        while (result.size() < count) {
            boolean pickConcise = (result.size() % 2 == 1);
            GeneratedQuestion picked = null;

            if (pickConcise) {
                if (conciseIdx < conciseNonRep.size()) {
                    picked = conciseNonRep.get(conciseIdx++);
                } else if (conciseIdx < concisePool.size()) {
                    picked = concisePool.get(conciseIdx++);
                } else if (inDepthIdx < inDepthNonRep.size()) {
                    picked = inDepthNonRep.get(inDepthIdx++);
                } else if (inDepthIdx < inDepthPool.size()) {
                    picked = inDepthPool.get(inDepthIdx++);
                }
            } else {
                if (inDepthIdx < inDepthNonRep.size()) {
                    picked = inDepthNonRep.get(inDepthIdx++);
                } else if (inDepthIdx < inDepthPool.size()) {
                    picked = inDepthPool.get(inDepthIdx++);
                } else if (conciseIdx < conciseNonRep.size()) {
                    picked = conciseNonRep.get(conciseIdx++);
                } else if (conciseIdx < concisePool.size()) {
                    picked = concisePool.get(conciseIdx++);
                }
            }

            if (picked != null) {
                if (!result.contains(picked)) {
                    result.add(picked);
                }
            } else {
                break;
            }
        }

        return result;
    }

    private List<GeneratedQuestion> filterOutRecent(List<GeneratedQuestion> pool, Set<String> recentNormalized) {
        List<GeneratedQuestion> nonRepeated = new ArrayList<>();
        for (GeneratedQuestion q : pool) {
            String textNorm = q.getQuestionText().trim().toLowerCase();
            boolean isRecent = false;
            for (String rec : recentNormalized) {
                if (textNorm.contains(rec) || rec.contains(textNorm) ||
                        (textNorm.length() > 25 && rec.length() > 25 && similarityScore(textNorm, rec) > 0.60)) {
                    isRecent = true;
                    break;
                }
            }
            if (!isRecent) {
                nonRepeated.add(q);
            }
        }
        return nonRepeated;
    }

    /**
     * Computes Jaccard word similarity between two question texts to detect
     * duplicate questions.
     */
    private double similarityScore(String s1, String s2) {
        if (s1 == null || s2 == null)
            return 0.0;
        Set<String> words1 = new HashSet<>(Arrays.asList(s1.split("\\W+")));
        Set<String> words2 = new HashSet<>(Arrays.asList(s2.split("\\W+")));
        words1.remove("");
        words2.remove("");
        if (words1.isEmpty() || words2.isEmpty())
            return 0.0;
        Set<String> intersection = new HashSet<>(words1);
        intersection.retainAll(words2);
        return (2.0 * intersection.size()) / (words1.size() + words2.size());
    }

    /**
     * Extensive 50+ categorized bank of technical, project-based, and architectural
     * questions
     * tagged with (Concise) for 90-120s timer and (In-Depth) for 150s timer,
     * filtered and prioritized according to candidate resume tech stack.
     */
    private List<GeneratedQuestion> getAllFallbackTechnicalQuestions(String resumeText) {
        List<GeneratedQuestion> pool = new ArrayList<>();
        String lower = resumeText != null ? resumeText.toLowerCase() : "";

        boolean hasJava = lower.contains("java") || lower.contains("spring");
        boolean hasReact = lower.contains("react") || lower.contains("javascript") || lower.contains("frontend");
        boolean hasPython = lower.contains("python") || lower.contains("django") || lower.contains("fastapi");
        boolean hasDb = lower.contains("sql") || lower.contains("mysql") || lower.contains("postgres")
                || lower.contains("hibernate") || lower.contains("jpa");

        // 1. PROJECT ARCHITECTURE & HANDS-ON EXPERIENCE (In-Depth & Concise)
        pool.add(GeneratedQuestion.builder()
                .questionText(
                        "In your primary project, what database did you choose and why did it fit your data access patterns?")
                .category("Project Fundamentals (Concise)")
                .modelAnswer(
                        "The candidate should clearly state the chosen database (e.g. MySQL, PostgreSQL, MongoDB) and explain how schema consistency, ACID requirements, or flexible document structures suited the application requirements.")
                .build());

        pool.add(GeneratedQuestion.builder()
                .questionText(
                        "In your primary resume project, how did you design the backend API architecture and what trade-offs did you make?")
                .category("Project Architecture (In-Depth)")
                .modelAnswer(
                        "The candidate should walk through controller-service-repository layered design, request validation, database interactions, and justification for synchronous REST vs asynchronous jobs.")
                .build());

        pool.add(GeneratedQuestion.builder()
                .questionText(
                        "What testing framework or method did you use in your project to verify your API endpoints?")
                .category("Testing Basics (Concise)")
                .modelAnswer(
                        "Candidate should name tools such as JUnit, Mockito, or Postman, explaining how unit tests verify business logic while integration tests check endpoint HTTP response contracts.")
                .build());

        pool.add(GeneratedQuestion.builder()
                .questionText(
                        "What was the most challenging technical bug or performance bottleneck you encountered in your project, and how did you resolve it?")
                .category("Project Troubleshooting (In-Depth)")
                .modelAnswer(
                        "Candidate should use the STAR method: explain the observed failure, diagnostic tools used (logs, profiling, query execution plans), identified root cause, and regression fix.")
                .build());

        pool.add(GeneratedQuestion.builder()
                .questionText(
                        "How did you manage user authentication, session security, and state between your frontend and backend services?")
                .category("Security & Architecture (In-Depth)")
                .modelAnswer(
                        "Candidate should explain stateless JWT tokens vs sessions, BCrypt password hashing, token expiration with refresh mechanics, and CORS/CSRF protections.")
                .build());

        pool.add(GeneratedQuestion.builder()
                .questionText(
                        "Can you walk through a key database entity relationship you designed, and how you ensured data integrity under concurrent writes?")
                .category("Data Modeling (In-Depth)")
                .modelAnswer(
                        "Candidate should describe schema normalization, foreign key constraints, transaction boundaries, and locking mechanics (optimistic vs pessimistic) to avoid race conditions.")
                .build());

        pool.add(GeneratedQuestion.builder()
                .questionText(
                        "If your resume project received a 10x sudden spike in traffic, which component would bottleneck first and how would you scale it?")
                .category("Scalability & System Design (In-Depth)")
                .modelAnswer(
                        "Candidate should identify database connection pools or query latency, and suggest horizontal pod scaling, Redis caching, and read-replica offloading.")
                .build());

        // 2. JAVA CORE, CONCURRENCY & MEMORY MANAGEMENT (Concise & In-Depth)
        if (hasJava) {
            pool.add(GeneratedQuestion.builder()
                    .questionText("In Java, what is the difference between Heap and Stack memory?")
                    .category("Java Memory (Concise)")
                    .modelAnswer(
                            "Stack stores primitive values and thread-specific method call frames with LIFO access, while Heap stores dynamic objects referenced across threads and is managed by Garbage Collection.")
                    .build());

            pool.add(GeneratedQuestion.builder()
                    .questionText("What is the difference between an abstract class and an interface in Java?")
                    .category("Java OOP (Concise)")
                    .modelAnswer(
                            "An abstract class can declare instance state and non-public constructors, while an interface defines public contracts (plus default/static methods) and supports multiple implementation inheritance.")
                    .build());

            pool.add(GeneratedQuestion.builder()
                    .questionText("What does the volatile keyword guarantee in the Java Memory Model?")
                    .category("Java Concurrency (Concise)")
                    .modelAnswer(
                            "volatile guarantees CPU cache coherence so reads and writes go directly to main memory, establishing a happens-before visibility relationship without mutual exclusion locking.")
                    .build());

            pool.add(GeneratedQuestion.builder()
                    .questionText("What are Java Streams intermediate operations versus terminal operations?")
                    .category("Java Streams (Concise)")
                    .modelAnswer(
                            "Intermediate operations (filter, map) are lazy transformations that return a new Stream, while terminal operations (collect, count, forEach) trigger the stream pipeline execution.")
                    .build());

            pool.add(GeneratedQuestion.builder()
                    .questionText("In Java, what is the difference between fail-fast and fail-safe iterators?")
                    .category("Java Collections (Concise)")
                    .modelAnswer(
                            "Fail-fast iterators (e.g. ArrayList) throw ConcurrentModificationException on structural modifications during iteration, while fail-safe iterators (e.g. CopyOnWriteArrayList) traverse a cloned snapshot.")
                    .build());

            pool.add(GeneratedQuestion.builder()
                    .questionText("What is the difference between checked and unchecked exceptions in Java?")
                    .category("Java Exceptions (Concise)")
                    .modelAnswer(
                            "Checked exceptions (extending Exception) must be caught or declared at compile time, while unchecked exceptions (extending RuntimeException) represent programming defects and are unchecked at compile time.")
                    .build());

            pool.add(GeneratedQuestion.builder()
                    .questionText(
                            "How does the Garbage Collector reclaim unused objects in Java, and what causes an OutOfMemoryError?")
                    .category("Java Memory & GC (In-Depth)")
                    .modelAnswer(
                            "Garbage collection traverses GC roots using generational mark-sweep-compact algorithms. OutOfMemoryError occurs when unreferenced objects or memory leaks exhaust the heap or metaspace beyond allocated JVM limits.")
                    .build());

            pool.add(GeneratedQuestion.builder()
                    .questionText(
                            "How does Java handle concurrency, and what is the difference between the synchronized keyword and ReentrantLock?")
                    .category("Java Concurrency (In-Depth)")
                    .modelAnswer(
                            "synchronized provides implicit monitor locks with structured entry/exit, while ReentrantLock offers explicit tryLock with timeouts, fairness policies, and multiple Condition variables.")
                    .build());

            pool.add(GeneratedQuestion.builder()
                    .questionText("How does Java's ExecutorService thread pool manage worker threads and task queuing?")
                    .category("Java Concurrency (In-Depth)")
                    .modelAnswer(
                            "ExecutorService decouples task submission from execution using a core pool size, maximum pool size, blocking work queue (LinkedBlockingQueue), and rejection policies.")
                    .build());
        }

        // 3. SPRING BOOT & BACKEND FRAMEWORKS (Concise & In-Depth)
        if (hasJava) {
            pool.add(GeneratedQuestion.builder()
                    .questionText(
                            "In Spring Boot, what is the difference between @Component, @Service, and @Repository?")
                    .category("Spring Boot Core (Concise)")
                    .modelAnswer(
                            "@Component is the generic stereotype for managed beans, @Service designates service-layer business logic, and @Repository marks persistence access and enables automatic DAO exception translation.")
                    .build());

            pool.add(GeneratedQuestion.builder()
                    .questionText(
                            "What is the difference between Bean scopes like Singleton and Prototype in Spring Boot?")
                    .category("Spring Boot Architecture (Concise)")
                    .modelAnswer(
                            "Singleton (default) instantiates a single shared bean instance per Spring ApplicationContext, whereas Prototype creates a new separate bean instance every time it is injected or requested.")
                    .build());

            pool.add(GeneratedQuestion.builder()
                    .questionText("What is the difference between @RestController and @Controller in Spring?")
                    .category("Spring MVC (Concise)")
                    .modelAnswer(
                            "@Controller is used for traditional MVC returning views, while @RestController combines @Controller and @ResponseBody, automatically serializing method return objects directly into JSON/XML HTTP response bodies.")
                    .build());

            pool.add(GeneratedQuestion.builder()
                    .questionText(
                            "How does the @Transactional annotation manage database transactions and rollback behavior in Spring Boot?")
                    .category("Spring Boot Transactions (In-Depth)")
                    .modelAnswer(
                            "@Transactional uses AOP proxies around methods. Transactions commit on successful completion and automatically roll back on unchecked RuntimeExceptions (or specified checked exceptions).")
                    .build());

            pool.add(GeneratedQuestion.builder()
                    .questionText(
                            "How do you implement centralized global exception handling in Spring Boot REST APIs using @ControllerAdvice?")
                    .category("Spring Boot REST (In-Depth)")
                    .modelAnswer(
                            "@ControllerAdvice with @ExceptionHandler methods intercepts exceptions globally, formats structured JSON error responses with standard HTTP status codes, and prevents leaking stack traces.")
                    .build());

            pool.add(GeneratedQuestion.builder()
                    .questionText(
                            "How does Spring Boot auto-configuration work behind the scenes using conditional annotations like @ConditionalOnClass?")
                    .category("Spring Boot Internals (In-Depth)")
                    .modelAnswer(
                            "Auto-configuration scans META-INF/spring/org.springframework.boot.autoconfigure.AutoConfiguration.imports and evaluates conditions (@ConditionalOnClass, @ConditionalOnMissingBean) to instantiate default configurations.")
                    .build());
        }

        // 4. DATABASES, MYSQL, JPA/HIBERNATE & DATA PERSISTENCE (Concise & In-Depth)
        if (hasDb || hasJava) {
            pool.add(GeneratedQuestion.builder()
                    .questionText("In SQL databases, what is the difference between a Primary Key and a Foreign Key?")
                    .category("Database Fundamentals (Concise)")
                    .modelAnswer(
                            "A Primary Key uniquely identifies each row in a table and cannot contain null values. A Foreign Key references a Primary Key in another table to enforce referential integrity between relations.")
                    .build());

            pool.add(GeneratedQuestion.builder()
                    .questionText("What is the difference between WHERE and HAVING clauses in SQL?")
                    .category("SQL Queries (Concise)")
                    .modelAnswer(
                            "WHERE filters individual rows before grouping takes place, while HAVING filters aggregated group results after GROUP BY operations have been evaluated.")
                    .build());

            pool.add(GeneratedQuestion.builder()
                    .questionText("In relational databases, what are the ACID properties?")
                    .category("Database Fundamentals (Concise)")
                    .modelAnswer(
                            "ACID ensures Atomicity (all-or-nothing), Consistency (integrity constraints preserved), Isolation (concurrent transactions execute without interference), and Durability (committed writes persist).")
                    .build());

            pool.add(GeneratedQuestion.builder()
                    .questionText("What is the difference between JPA's cascade types and orphanRemoval = true?")
                    .category("JPA / Hibernate (Concise)")
                    .modelAnswer(
                            "CascadeType propagates entity lifecycle operations (persist, merge, remove) to child entities, while orphanRemoval = true automatically deletes child rows when dereferenced from a parent collection.")
                    .build());

            pool.add(GeneratedQuestion.builder()
                    .questionText(
                            "What is the N+1 query problem in Hibernate/JPA, and how do you resolve it using JOIN FETCH or Entity Graphs?")
                    .category("JPA & Hibernate Performance (In-Depth)")
                    .modelAnswer(
                            "N+1 occurs when fetching a parent collection executes 1 initial query plus N additional select queries for each child. It is solved using JOIN FETCH queries, Hibernate Entity Graphs, or batch size configuration.")
                    .build());

            pool.add(GeneratedQuestion.builder()
                    .questionText(
                            "Explain the difference between optimistic locking and pessimistic locking in database transactions.")
                    .category("Database Concurrency (In-Depth)")
                    .modelAnswer(
                            "Optimistic locking uses a @Version column and fails with OptimisticLockException on concurrent conflict. Pessimistic locking acquires exclusive database locks (SELECT ... FOR UPDATE) preventing concurrent access.")
                    .build());

            pool.add(GeneratedQuestion.builder()
                    .questionText(
                            "How do B-Tree database indexes improve SELECT query performance, and what is the trade-off during INSERT and UPDATE operations?")
                    .category("Database Indexing (In-Depth)")
                    .modelAnswer(
                            "B-Tree indexes provide logarithmic O(log N) lookup instead of full table scans, but write operations (INSERT/UPDATE/DELETE) incur latency overhead as index trees must be rebalanced.")
                    .build());
        }

        // 5. REST APIS, CACHING & SCALABILITY (Concise & In-Depth)
        pool.add(GeneratedQuestion.builder()
                .questionText(
                        "What HTTP status codes would you return for validation failure, unauthorized access, and resource not found?")
                .category("REST API Standards (Concise)")
                .modelAnswer(
                        "Validation failure: 400 Bad Request or 422 Unprocessable Entity. Unauthorized access: 401 Unauthorized (unauthenticated) or 403 Forbidden (insufficient roles). Missing resource: 404 Not Found.")
                .build());

        pool.add(GeneratedQuestion.builder()
                .questionText("In RESTful architecture, why is PUT idempotent while POST is non-idempotent?")
                .category("REST API Architecture (Concise)")
                .modelAnswer(
                        "An operation is idempotent if repeating it yields the exact same state. PUT replaces a resource at a URI with specified state, while POST typically creates a new record every execution.")
                .build());

        pool.add(GeneratedQuestion.builder()
                .questionText("What is CORS, and why does the browser block cross-origin requests?")
                .category("Web Security (Concise)")
                .modelAnswer(
                        "CORS (Cross-Origin Resource Sharing) is a browser security measure that restricts web applications from making HTTP requests to a domain different from the domain that served the web page, unless the server provides explicit access headers.")
                .build());

        pool.add(GeneratedQuestion.builder()
                .questionText(
                        "How do you implement distributed caching with Redis, and how do you prevent cache stampede and stale cache issues?")
                .category("Caching & Performance (In-Depth)")
                .modelAnswer(
                        "Cache data with appropriate TTLs, use Cache-Aside pattern, prevent stampede with distributed mutex locks or probabilistic early recomputation, and evict keys on write updates.")
                .build());

        pool.add(GeneratedQuestion.builder()
                .questionText(
                        "How would you design a rate limiter to protect backend endpoints from brute-force attacks and abuse?")
                .category("System Security & Scale (In-Depth)")
                .modelAnswer(
                        "Implement sliding window or token bucket algorithms in Redis keyed by client IP or authenticated API token to reject excessive requests with 429 Too Many Requests.")
                .build());

        // 6. FRONTEND / REACT (Concise & In-Depth)
        if (hasReact) {
            pool.add(GeneratedQuestion.builder()
                    .questionText("In React, what is the difference between props and state?")
                    .category("React Core (Concise)")
                    .modelAnswer(
                            "Props are read-only configuration passed down from a parent component, while state is mutable local component memory that triggers a re-render when updated via setter functions.")
                    .build());

            pool.add(GeneratedQuestion.builder()
                    .questionText("What is the purpose of the useEffect dependency array in React?")
                    .category("React Hooks (Concise)")
                    .modelAnswer(
                            "The dependency array declares values the effect relies on. An empty array runs the effect once after mount, omitting it runs after every render, and specified variables run it when those values change.")
                    .build());

            pool.add(GeneratedQuestion.builder()
                    .questionText(
                            "How does the React Virtual DOM diffing algorithm work, and why are unique keys required for list rendering?")
                    .category("React Internals (In-Depth)")
                    .modelAnswer(
                            "React maintains a lightweight Virtual DOM tree in memory, diffs changes against the previous render using heuristic reconciliation, and applies minimal patches to the real DOM. Unique keys allow React to track element identity across re-orders.")
                    .build());

            pool.add(GeneratedQuestion.builder()
                    .questionText(
                            "How do you prevent unnecessary re-renders in React components using React.memo and useCallback?")
                    .category("React Performance (In-Depth)")
                    .modelAnswer(
                            "React.memo memoizes the rendered output skipping renders when props are unchanged, while useCallback memoizes function instances preventing new references on parent re-renders.")
                    .build());
        }

        // 7. PYTHON (Concise & In-Depth)
        if (hasPython) {
            pool.add(GeneratedQuestion.builder()
                    .questionText("In Python, what is the main difference between a list and a tuple?")
                    .category("Python Fundamentals (Concise)")
                    .modelAnswer(
                            "Lists are mutable dynamic sequences enclosed in square brackets, while tuples are immutable fixed sequences enclosed in parentheses with lower memory overhead and dictionary key capability.")
                    .build());

            pool.add(GeneratedQuestion.builder()
                    .questionText(
                            "Explain the Global Interpreter Lock (GIL) in Python and how it affects multi-threaded applications.")
                    .category("Python Architecture (In-Depth)")
                    .modelAnswer(
                            "The GIL is a mutex preventing multiple native threads from executing Python bytecodes concurrently, limiting CPU-bound speedup across multi-core processors. Multiprocessing is used for CPU-bound tasks.")
                    .build());
        }

        // 8. DEVOPS, TESTING & RELIABILITY (Concise & In-Depth)
        pool.add(GeneratedQuestion.builder()
                .questionText("What is Docker containerization and how does a container differ from a virtual machine?")
                .category("DevOps & Containers (Concise)")
                .modelAnswer(
                        "Containers share the host OS kernel and isolate user space processes via Linux namespaces and cgroups, making them lightweight and fast to start compared to VMs with full guest OS hypervisors.")
                .build());

        pool.add(GeneratedQuestion.builder()
                .questionText("What is the difference between unit testing and integration testing?")
                .category("Testing Basics (Concise)")
                .modelAnswer(
                        "Unit testing tests isolated components (functions or classes) in isolation with mocked dependencies, whereas integration testing verifies interactions between collaborating units, databases, or external services.")
                .build());

        pool.add(GeneratedQuestion.builder()
                .questionText(
                        "In distributed systems, what is a Circuit Breaker pattern and how does it prevent cascading service failures?")
                .category("Resilience Engineering (In-Depth)")
                .modelAnswer(
                        "Circuit breakers (e.g. Resilience4j) track downstream failure rates. When failures exceed a threshold, the circuit trips OPEN, immediately rejecting calls or providing fallbacks to avoid resource exhaustion.")
                .build());

        pool.add(GeneratedQuestion.builder()
                .questionText(
                        "How do you approach unit testing and mocking dependencies using frameworks like JUnit and Mockito?")
                .category("Testing & Code Quality (In-Depth)")
                .modelAnswer(
                        "Isolate the class under test, mock external collaborators using @Mock and when().thenReturn(), assert method behavior, and verify interactions using verify().")
                .build());

        pool.add(GeneratedQuestion.builder()
                .questionText(
                        "How do you usually debug an error or unexpected production bug when code fails silently?")
                .category("Debugging & Troubleshooting (In-Depth)")
                .modelAnswer(
                        "Inspect server logs with correlation IDs, examine application APM traces, inspect database query plans, reproduce with unit tests, and verify fix under test conditions.")
                .build());

        return pool;
    }

    }

    /**
     * Fallback answer evaluation when Gemini is unreachable.
     */
    private EvaluationResult fallbackEvaluation(String questionText, String userAnswer, String difficulty,
            String defaultModelAnswer) {
        String answer = userAnswer.trim();
        int words = answer.split("\\s+").length;

        double score;
        String strengths;
        String areasToImprove;
        String feedback;

        if (words < 15) {
            score = 3.5;
            strengths = "- Attempted to address the question prompt directly.";
            areasToImprove = "- Answer is far too brief. Elaborate with technical mechanisms, concrete code structures, and architecture.";
            feedback = "Your answer is too short for a professional interview. Expand on your reasoning and provide concrete examples.";
        } else if (words < 45) {
            score = 6.5;
            strengths = "- Addressed the fundamental concept and demonstrated basic familiarity.";
            areasToImprove = "- Missed important edge cases, real-world trade-offs, and scalability considerations.";
            feedback = "A good baseline answer, but could be enhanced with deeper technical precision.";
        } else {
            score = 8.5;
            strengths = "- Thorough explanation with comprehensive technical details and structured thought process.\n- Effectively addressed edge cases and engineering trade-offs.";
            areasToImprove = "- Could further quantify performance metrics (e.g. latency, throughput, memory footprint).";
            feedback = "Excellent response! Clear, professional, and well-structured engineering explanation.";
        }

        return EvaluationResult.builder()
                .score(score)
                .strengths(strengths)
                .areasToImprove(areasToImprove)
                .feedback(feedback)
                .modelAnswer(
                        defaultModelAnswer != null ? defaultModelAnswer : "Refer to industry standard documentation.")
                .build();
    }

    /**
     * Fallback question type anticipation based on keyword analysis of candidate's
     * resume.
     */
    private QuestionTypeAnticipationDto fallbackAnticipatedQuestions(String resumeText) {
        String lower = resumeText != null ? resumeText.toLowerCase() : "";
        String role = "Software Engineer Candidate";
        List<String> skills = new ArrayList<>();

        if (lower.contains("java") || lower.contains("spring")) {
            role = "Backend Java Developer";
            skills.addAll(List.of("Java", "Spring Boot", "REST APIs", "Hibernate / JPA", "MySQL"));
        } else if (lower.contains("react") || lower.contains("javascript") || lower.contains("typescript")) {
            role = "Frontend React Developer";
            skills.addAll(List.of("React", "TypeScript", "State Management", "Tailwind CSS", "REST Integration"));
        } else if (lower.contains("python") || lower.contains("data") || lower.contains("machine learning")) {
            role = "Python & Data Engineer";
            skills.addAll(List.of("Python", "Pandas", "SQL", "Data Pipelines", "API Development"));
        } else {
            skills.addAll(List.of("Problem Solving", "Object-Oriented Design", "Databases", "Version Control",
                    "System Architecture"));
        }

        List<QuestionTypeAnticipationDto.QuestionTypeCategory> categories = new ArrayList<>();
        List<QuestionTypeAnticipationDto.SampleQuestion> allQuestions = new ArrayList<>();
        int idCounter = 1;

        // Category 1: Project Deep-Dive
        List<QuestionTypeAnticipationDto.SampleQuestion> qList1 = List.of(
                QuestionTypeAnticipationDto.SampleQuestion.builder()
                        .id(idCounter++)
                        .category("Project Architecture & Deep-Dive")
                        .questionType("Live Project Deep-Dive")
                        .questionText(
                                "Can you walk me through the architecture of a major project listed on your resume?")
                        .keyTopics(
                                "Layered architecture, Spring Boot, REST APIs, MySQL, JWT authentication, connection pooling")
                        .mustMentionKeywords(
                                "Presentation Layer, Spring Boot Microservice, Asynchronous Tasks, MySQL Database, BCrypt Hashing, HikariCP Connection Pool, @Transactional")
                        .tipForAnswering(
                                "Begin with the business problem, describe each system tier in plain terms, and state the business impact.")
                        .sampleAnswerSummary(
                                "Outline your client layer, business API tier, database schema, security mechanisms, and performance optimizations.")
                        .detailedAnswer(
                                "### 1. High-Level Purpose & Business Context\n- **Core Goal**: 'I developed an automated prescription reminder platform designed to eliminate missed patient doses and streamline medicine adherence.'\n\n### 2. Layer-by-Layer Architectural Breakdown\n- **Presentation Tier (React)**: Component-driven frontend consuming RESTful JSON endpoints with instant form validation and state updates.\n- **Application Tier (Spring Boot)**: Organized strictly into **Controller**, **Service**, and **Repository** layers. Enforces business rules, request validation, and stateless **JWT authentication filters**.\n- **Asynchronous Task Queue**: Background scheduled cron jobs query pending reminder events every hour and trigger SMS/Email notifications without blocking HTTP worker threads.\n- **Persistence Tier (MySQL)**: Normalized relational schema storing patients, prescriptions, and schedules with composite indexes on foreign keys for sub-10ms queries.\n\n### 3. Resilience, Concurrency & Security Standards\n- **Security**: Passwords encrypted with salted **BCrypt** hashing. All state-altering mutations execute inside **@Transactional** boundaries to guarantee atomic database commits.\n- **Performance**: Managed database connection pooling with **HikariCP** to handle concurrent traffic without thread starvation.")
                        .build(),
                QuestionTypeAnticipationDto.SampleQuestion.builder()
                        .id(idCounter++)
                        .category("Project Architecture & Deep-Dive")
                        .questionType("Scenario & Troubleshooting")
                        .questionText(
                                "What was the most challenging technical roadblock you encountered in your projects, and how did you resolve it?")
                        .keyTopics(
                                "Root cause analysis, N+1 query problem, profiling, database indexing, latency reduction")
                        .mustMentionKeywords(
                                "N+1 Query Problem, JOIN FETCH, Lazy Loading, SQL Query Logging, Composite Database Index, Latency Reduction")
                        .tipForAnswering(
                                "Avoid blaming tools; explain your systematic debugging process, what you measured, and how you prevented recurrence.")
                        .sampleAnswerSummary(
                                "Identify the bottleneck (e.g. slow database queries), the profiling tools used, and the verified fix.")
                        .detailedAnswer(
                                "### 1. The Incident (Situation)\n- During staging stress testing, loading the candidate reminder dashboard degraded severely, taking over **4.2 seconds** per page request.\n\n### 2. Root Cause Discovery (Investigation)\n- Enabled Hibernate SQL logging (`spring.jpa.show-sql=true`) and analyzed query metrics.\n- Diagnosed a classic **N+1 Query Problem**: fetching 50 prescriptions issued 1 primary query followed by 50 secondary queries to retrieve individual patient records.\n\n### 3. Technical Remedy (Action Taken)\n- Refactored Spring Data JPA queries using **JPQL JOIN FETCH** (`SELECT p FROM Prescription p JOIN FETCH p.patient`), consolidating 51 queries into a single SQL join.\n- Added a **Composite Database Index** on `(patient_id, scheduled_date)` to optimize lookup scans.\n\n### 4. Measurable Engineering Outcome\n- Endpoint response latency plummeted from **4,200ms to 210ms** (a **95% speed improvement**), eliminating database thread contention entirely.")
                        .build(),
                QuestionTypeAnticipationDto.SampleQuestion.builder()
                        .id(idCounter++)
                        .category("Project Architecture & Deep-Dive")
                        .questionType("Live Project Deep-Dive")
                        .questionText(
                                "How did you implement authentication and secure user access in your backend application?")
                        .keyTopics(
                                "JWT tokens, Spring Security Filter Chain, stateless sessions, BCrypt password hashing, role-based access")
                        .mustMentionKeywords(
                                "JWT (JSON Web Token), Spring Security Filter Chain, BCryptPasswordEncoder, Stateless Session, OncePerRequestFilter, SecurityContextHolder")
                        .tipForAnswering(
                                "Walk through the login handshake: credentials check -> token generation -> subsequent token validation.")
                        .sampleAnswerSummary(
                                "Explain stateless token-based authentication using Spring Security filters, BCrypt hashing, and JWT claims.")
                        .detailedAnswer(
                                "### 1. User Credential Verification\n- Client submits login credentials over HTTPS POST `/api/auth/login`.\n- Spring Security invokes **BCryptPasswordEncoder** to verify the incoming salted hash against stored database hashes without decrypting plain text.\n\n### 2. Token Generation & Stateless Handshake\n- Upon validation, the server generates a cryptographically signed **JSON Web Token (JWT)** containing `userId`, `roles`, and a 24-hour expiration timestamp.\n- Token is returned to the client and stored in secure browser storage.\n\n### 3. Request Interception & Authorization\n- Subsequent API requests attach `Authorization: Bearer <token>` in headers.\n- A custom **OncePerRequestFilter** extracts and validates the token signature, decodes authorities, and establishes the candidate's principal in the Spring **SecurityContextHolder**.")
                        .build());
        allQuestions.addAll(qList1);
        categories.add(QuestionTypeAnticipationDto.QuestionTypeCategory.builder()
                .categoryName("Project Architecture & Deep-Dive")
                .description(
                        "Questions examining the systems, tools, and technical decisions behind projects listed on your resume.")
                .interviewerGoal(
                        "To verify actual hands-on involvement, architectural trade-offs, and how you solve real development hurdles.")
                .recommendedStrategy(
                        "Use the STAR format (Situation, Task, Action, Result) and clearly quantify metrics (e.g. latency, users, code modularity).")
                .sampleQuestions(qList1)
                .build());

        // Category 2: Core Language & Framework Mechanics
        List<QuestionTypeAnticipationDto.SampleQuestion> qList2 = List.of(
                QuestionTypeAnticipationDto.SampleQuestion.builder()
                        .id(idCounter++)
                        .category("Core Language & Framework Fundamentals")
                        .questionType("Concept & Fundamentals")
                        .questionText("How does memory management and garbage collection operate in Java?")
                        .keyTopics("Heap vs Stack, garbage collector algorithms, reference counting, object lifecycle")
                        .mustMentionKeywords(
                                "GC Roots & Reachability Tracing, Mark-Sweep-Compact Algorithm, Eden Space, Tenured Generation, Stack Frames & Method Primitives, OutOfMemoryError Prevention")
                        .tipForAnswering(
                                "Explain Heap vs Stack in simple words first, then walk through how objects are born, used, and cleaned up. Essential buzzwords to include: Heap, Stack, GC Roots, Mark-Sweep-Compact, Eden Space, and Tenured.")
                        .sampleAnswerSummary(
                                "Distinguish stack memory (thread-local execution frames) from heap memory (shared objects), explaining reachability tracing and GC sweeps.")
                        .detailedAnswer(
                                "### 1. Architectural Memory Model (Heap vs Stack)\n- **Stack Memory (Thread Scratchpad)**: Stores temporary method execution frames, primitive values, and object references. Each thread has an isolated Stack. Automatically popped and freed upon method completion with zero GC overhead.\n- **Heap Memory (Shared Object Space)**: Shared global storage where all dynamic instances (`new User()`) reside. Managed exclusively by the **JVM Garbage Collector**.\n\n### 2. The Complete Object Lifecycle\n1. **Instantiation**: `new Order()` allocates contiguous memory in the **Eden Space** of the Heap.\n2. **Reachable & In-Use**: An active thread holds a reference pointer through a local Stack variable or static class reference.\n3. **Unreachable (Orphaned)**: When references are cleared (`order = null`) or the method exits, the object becomes unreferenced.\n4. **Garbage Collection & Memory Reclamation**: The JVM scans reachable roots and reclaims orphaned memory blocks.\n\n### 3. Garbage Collection Mechanisms & Algorithms\n- **Reference Counting vs Reachability Tracing**: Reference counting counts pointer links, but fails on circular dependencies (Object A points to B, and B points to A). Modern JVMs use **Reachability Tracing (Root Analysis)** starting from **GC Roots** (active thread stacks, static variables, JNI references). Any object unreachable from a root is scheduled for collection.\n- **Mark-Sweep-Compact Algorithm**:\n  - **Mark**: Identifies all live objects reachable from GC Roots.\n  - **Sweep**: Cleans all unreachable memory addresses.\n  - **Compact**: Defragments surviving memory into contiguous space to avoid memory allocation bottlenecks.\n- **Generational GC (Eden, Survivor, Tenured)**:\n  - **Young Generation (Eden, S0, S1)**: Rapidly cleaned by **Minor GC** using fast copy algorithms.\n  - **Old / Tenured Generation**: Objects that survive multiple GC cycles get promoted here and collected concurrently by collectors like **G1 GC** or **ZGC**.\n\n> 💡 Recruiter Summary: Contrast Stack vs Heap in 30 seconds, then explain reachability tracing from GC roots.")
                        .build(),
                QuestionTypeAnticipationDto.SampleQuestion.builder()
                        .id(idCounter++)
                        .category("Core Language & Framework Fundamentals")
                        .questionType("Concept & Fundamentals")
                        .questionText(
                                "What is the difference between an abstract class and an interface, and when do you choose one over the other?")
                        .keyTopics(
                                "Multiple inheritance, default methods, stateful behavior, contract design, polymorphism")
                        .mustMentionKeywords(
                                "Multiple Inheritance, Default & Static Methods (Java 8+), Instance State & Constructors, Contract vs Implementation Blueprint, Polymorphism & Loose Coupling")
                        .tipForAnswering(
                                "Provide a clear real-world design scenario rather than just reciting textbook definitions. Mention interface contracts vs class hierarchy.")
                        .sampleAnswerSummary(
                                "Interfaces define capabilities across unrelated classes; abstract classes share state and core boilerplate among a hierarchy.")
                        .detailedAnswer(
                                "### 1. Conceptual Distinction\n- **Interface (A Capability Contract)**: Specifies *what* a class can do without dictating how. For instance: `Runnable`, `Auditable`, or `PaymentProcessor`. Unrelated classes can implement the same interface.\n- **Abstract Class (A Blueprint Hierarchy)**: Specifies *what* a class is. Provides a shared partial implementation, common instance variables, and template methods for subclasses.\n\n### 2. Core Technical Differences\n- **Internal State**: Abstract classes can declare private non-static instance fields and constructors; interfaces only declare static final constants.\n- **Inheritance Rules**: Java permits implementing **multiple interfaces**, but extending only **one abstract class** (single class inheritance).\n- **Default Methods**: Since Java 8, interfaces allow `default` and `static` methods to add backward-compatible functionality without breaking implementers.\n\n### 3. Architectural Rule of Thumb\n- Choose an **Interface** when you want polymorphic behavior across independent modules (e.g. `NotificationService` implemented by `EmailNotifier` and `SlackNotifier`).\n- Choose an **Abstract Class** when related domain models share stateful variables and reusable boilerplate logic (e.g. `BaseEntity` managing `id`, `createdDate`, and `updatedDate`).")
                        .build(),
                QuestionTypeAnticipationDto.SampleQuestion.builder()
                        .id(idCounter++)
                        .category("Core Language & Framework Fundamentals")
                        .questionType("Concept & Fundamentals")
                        .questionText(
                                "How does Spring Boot's Dependency Injection and Inversion of Control (IoC) work?")
                        .keyTopics(
                                "Inversion of Control (IoC), @Autowired / Constructor Injection, Spring ApplicationContext, Singleton Scope")
                        .mustMentionKeywords(
                                "Constructor Injection vs Field Injection, Inversion of Control (IoC) Container, ApplicationContext Bean Lifecycle, Singleton Scope, Immutability, Loose Coupling & Mocking")
                        .tipForAnswering(
                                "Explain the problem of hard-coding 'new' objects vs letting the Spring container inject dependencies.")
                        .sampleAnswerSummary(
                                "Spring's IoC container manages bean lifecycles and automatically wires dependencies via constructor injection.")
                        .detailedAnswer(
                                "### 1. Inversion of Control (IoC) Core Idea\n- In traditional programming, objects explicitly instantiate their dependencies: `orderService = new OrderServiceImpl()`. This leads to tight coupling and rigid unit testing.\n- With **IoC**, control is inverted: the **Spring ApplicationContext (IoC Container)** discovers, configures, and manages bean lifecycles at application startup.\n\n### 2. Dependency Injection (DI) Mechanism\n- Rather than creating dependencies internally, dependencies are injected into classes via constructors: `public OrderController(OrderService orderService) { this.orderService = orderService; }`.\n- Spring scans `@Component`, `@Service`, and `@Repository` annotations to instantiate beans and resolve dependency graphs automatically.\n\n### 3. Why Constructor Injection is the Industry Standard\n- **Immutability**: Allows marking fields `private final`.\n- **Safe Unit Testing**: Dependencies can be effortlessly mocked in JUnit tests without needing Spring context reflection.\n- **Fail-Fast Safety**: Eliminates hidden `NullPointerExceptions` at startup if a required dependency is missing.")
                        .build());
        allQuestions.addAll(qList2);
        categories.add(QuestionTypeAnticipationDto.QuestionTypeCategory.builder()
                .categoryName("Core Language & Framework Fundamentals")
                .description(
                        "Targeted questions testing syntax precision, runtime behavior, and framework lifecycle concepts.")
                .interviewerGoal(
                        "To verify that you don't merely copy code, but understand how the runtime, memory, and framework internals function.")
                .recommendedStrategy(
                        "Give a crisp 1-sentence definition first, then immediately follow up with a concrete code snippet or real-world example.")
                .sampleQuestions(qList2)
                .build());

        // Category 3: System Design & API Engineering
        List<QuestionTypeAnticipationDto.SampleQuestion> qList3 = List.of(
                QuestionTypeAnticipationDto.SampleQuestion.builder()
                        .id(idCounter++)
                        .category("System Design, Databases & Scalability")
                        .questionType("System Design & Architecture")
                        .questionText(
                                "How do you design an idempotent REST API endpoint for processing sensitive transactions?")
                        .keyTopics(
                                "Idempotency keys, HTTP verbs (POST vs PUT), transaction isolation, database constraints, Redis locks")
                        .mustMentionKeywords(
                                "Idempotency-Key Header, UUID Token, Redis Cache Lookup, TTL (Time-To-Live), Unique Database Constraint, HTTP 409 Conflict, Safe Retries")
                        .tipForAnswering(
                                "Explain duplicate request prevention using unique request tokens and database lock mechanics.")
                        .sampleAnswerSummary(
                                "Use client-generated unique idempotency keys cached with TTL and enforce unique database constraints.")
                        .detailedAnswer(
                                "### 1. Problem Statement\n- If a mobile client submits a payment POST request and experiences a network drop, automatic client retries might charge the customer twice without idempotency guarantees.\n\n### 2. The 4-Step Idempotency Pattern\n- **Step 1 (Client UUID)**: Client generates a unique `Idempotency-Key: 9b1deb4d...` attached in HTTP request headers.\n- **Step 2 (Redis Lock Check)**: Server checks **Redis**. If status is `PROCESSING`, return **HTTP 409 Conflict** to reject concurrent race conditions. If status is `COMPLETED`, return the cached JSON result immediately without re-executing.\n- **Step 3 (Transactional DB Record)**: Inside the Spring `@Transactional` block, insert the transaction and key into an idempotency table with a `UNIQUE` index.\n- **Step 4 (Deterministic Cache Write)**: Once the transaction commits, write the response payload to Redis with a **24-hour TTL (Time-To-Live)**.\n\n### 3. Edge Cases & Resilience\n- Handles network dropouts gracefully: subsequent identical retries receive the verified receipt without executing duplicate side effects.")
                        .build(),
                QuestionTypeAnticipationDto.SampleQuestion.builder()
                        .id(idCounter++)
                        .category("System Design, Databases & Scalability")
                        .questionType("System Design & Architecture")
                        .questionText(
                                "When would you choose a relational database (SQL) over a document or NoSQL database for your application?")
                        .keyTopics(
                                "ACID compliance, schema flexibility, relational joins, horizontal sharding, BASE consistency")
                        .mustMentionKeywords(
                                "ACID Transactions, Relational Foreign Keys, Multi-Table JOINs, Document / Key-Value Store, Horizontal Sharding, Massive Write Throughput, BASE Consistency")
                        .tipForAnswering(
                                "Frame your choice around data access patterns, transactional consistency, and scalability needs.")
                        .sampleAnswerSummary(
                                "Choose relational for structured schemas requiring strong ACID guarantees; choose NoSQL for unstructured, write-heavy partitioned datasets.")
                        .detailedAnswer(
                                "### 1. Criteria for Relational Databases (PostgreSQL / MySQL)\n- **Strict ACID Guarantees**: Financial ledgers, inventory, and billing where dirty reads or partial writes compromise business integrity.\n- **Complex Relationships**: Relational structures with normalized tables (e.g. Users, Orders, Payments) needing relational integrity and multi-table **SQL JOINs**.\n- **Schema Predictability**: Structured business schemas requiring strong constraints, indexes, and migrations.\n\n### 2. Criteria for NoSQL Databases (MongoDB / Cassandra / DynamoDB)\n- **High Write Velocity**: Real-time event streams, sensor telemetry, and IoT ingestion requiring distributed horizontal sharding.\n- **Unstructured / Polymorphic Data**: Rapidly mutating document formats or product catalogs where schemas vary per record.\n- **Eventual Consistency (BASE)**: Systems that favor extreme availability over immediate transactional consistency across clusters.")
                        .build(),
                QuestionTypeAnticipationDto.SampleQuestion.builder()
                        .id(idCounter++)
                        .category("System Design, Databases & Scalability")
                        .questionType("System Design & Architecture")
                        .questionText(
                                "How would you implement caching with Redis in a Spring Boot application to handle traffic spikes?")
                        .keyTopics(
                                "Cache-aside pattern, Redis TTL (Time-To-Live), @Cacheable, cache invalidation, cache stampede")
                        .mustMentionKeywords(
                                "Cache-Aside Pattern, Redis In-Memory Store, Cache Hit vs Cache Miss, TTL (Time-To-Live), @Cacheable, @CacheEvict Invalidation, Low Latency")
                        .tipForAnswering(
                                "Explain what gets cached, how long it stays cached, and how to update the cache when data changes.")
                        .sampleAnswerSummary(
                                "Use Spring Cache annotations with Redis to store expensive database queries with TTL and evict on updates.")
                        .detailedAnswer(
                                "### 1. The Cache-Aside Pattern\n- Application reads from in-memory **Redis** before querying the relational database.\n- **Cache Hit**: Returns cached JSON payload within **1-2ms**, completely offloading load from the database.\n- **Cache Miss**: Queries MySQL, populates Redis with a configured **TTL (Time-To-Live)** of 15 minutes, and responds to the client.\n\n### 2. Spring Boot Implementation\n- Annotate read methods with `@Cacheable(value = 'products', key = '#id')`.\n- Configure JSON serialization to ensure clean, human-readable cache values.\n\n### 3. Cache Invalidation & Consistency\n- When an admin updates pricing, the `@CacheEvict(value = 'products', key = '#id')` hook immediately purges the stale entry from Redis, preventing stale data reads.")
                        .build());
        allQuestions.addAll(qList3);
        categories.add(QuestionTypeAnticipationDto.QuestionTypeCategory.builder()
                .categoryName("System Design, Databases & Scalability")
                .description(
                        "Questions exploring database modeling, caching, authentication, and horizontal scalability.")
                .interviewerGoal(
                        "To evaluate whether your solutions scale reliably without breaking under heavy concurrency or traffic spikes.")
                .recommendedStrategy(
                        "Always state your assumptions, discuss trade-offs (e.g. consistency vs availability), and justify your database choices.")
                .sampleQuestions(qList3)
                .build());

        // Category 4: Behavioral & Engineering Ownership
        List<QuestionTypeAnticipationDto.SampleQuestion> qList4 = List.of(
                QuestionTypeAnticipationDto.SampleQuestion.builder()
                        .id(idCounter++)
                        .category("Behavioral, Code Quality & Team Ownership")
                        .questionType("Behavioral & Ownership")
                        .questionText(
                                "How do you approach a situation where a pull request has differing architectural opinions among team members?")
                        .keyTopics(
                                "Constructive review, benchmarks, prototyping, standard conventions, blameless communication")
                        .mustMentionKeywords(
                                "Constructive Code Review, Blameless Communication, 5-Minute Sync, Objective Benchmarking, Architecture Standards, Consensus Documentation")
                        .tipForAnswering(
                                "Emphasize mutual respect, objective performance testing, and aligning with team architectural standards.")
                        .sampleAnswerSummary(
                                "Initiate a brief sync, evaluate trade-offs with benchmarks or proofs of concept, and document the consensus.")
                        .detailedAnswer(
                                "### 1. Maintain a Blameless Engineering Mindset\n- Focus review comments strictly on readability, maintainability, test coverage, and performance rather than stylistic opinions.\n\n### 2. Pivot to a Synchronous 5-Minute Huddle\n- If a pull request comment thread exceeds 2-3 iterations of text exchanges, asynchronous messaging becomes counterproductive. I schedule a quick 5-minute video sync.\n\n### 3. Use Objective Metrics & Micro-Benchmarks\n- When two valid implementations exist, write a quick prototype or performance benchmark to let empirical data decide rather than subjective debate.\n\n### 4. Align & Document Consensus\n- Once the team agrees on a pattern, document the decision in team engineering guidelines to maintain consistency in future reviews.")
                        .build(),
                QuestionTypeAnticipationDto.SampleQuestion.builder()
                        .id(idCounter++)
                        .category("Behavioral, Code Quality & Team Ownership")
                        .questionType("Behavioral & Ownership")
                        .questionText(
                                "Can you describe a time when project requirements changed close to a release deadline, and how you responded?")
                        .keyTopics(
                                "Agile prioritization, stakeholder communication, MVP scope trimming, risk mitigation")
                        .mustMentionKeywords(
                                "Agile Prioritization, Stakeholder Communication, MVP Critical Path, Scope Trimming, Risk Mitigation, Automated Integration Tests")
                        .tipForAnswering(
                                "Highlight calmness under pressure, transparent communication, and breaking scope into must-haves vs nice-to-haves.")
                        .sampleAnswerSummary(
                                "Communicate trade-offs transparently, prioritize core critical path features, and deliver on time without compromising stability.")
                        .detailedAnswer(
                                "### 1. Stay Calm & Evaluate the Blast Radius\n- When requirements shift late, I immediately analyze dependencies to determine whether existing modules can be adapted or if architectural changes are needed.\n\n### 2. Transparent Stakeholder Communication\n- Present clear trade-offs to product managers: 'We can deliver the core payment logic by Friday, but we should postpone cosmetic email themes to sprint 2 to guarantee zero production regressions.'\n\n### 3. Focus on the Critical Path MVP\n- Scope out non-essential nice-to-haves, write automated integration tests for the primary business path, and ensure production deployments are reliable and zero-downtime.")
                        .build());
        allQuestions.addAll(qList4);
        categories.add(QuestionTypeAnticipationDto.QuestionTypeCategory.builder()
                .categoryName("Behavioral, Code Quality & Team Ownership")
                .description(
                        "Questions evaluating how you handle code reviews, ambiguous requirements, and cross-functional communication.")
                .interviewerGoal(
                        "To assess whether you are a collaborative, proactive team player who raises engineering standards.")
                .recommendedStrategy(
                        "Highlight empathy, constructive communication, and data-driven technical decision-making.")
                .sampleQuestions(qList4)
                .build());

        return QuestionTypeAnticipationDto.builder()
                .candidateRole(role)
                .topSkillsIdentified(skills)
                .recommendedFocusAreas(List.of(
                        "Review core concurrency and memory management fundamentals",
                        "Prepare concrete STAR metrics for your two main resume projects",
                        "Brush up on API idempotency and database indexing mechanics"))
                .categories(categories)
                .allQuestions(allQuestions)
                .build();
    }
}

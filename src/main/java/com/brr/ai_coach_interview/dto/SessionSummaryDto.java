package com.brr.ai_coach_interview.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SessionSummaryDto {
    private Long sessionId;
    private String jobRole;
    private String experienceLevel;
    private String difficulty; // Easy, Medium, Hard
    private String status;
    private Double overallScore; // Overall score out of 10
    private String summaryFeedback;
    private String resumeFileName;
    private LocalDateTime createdAt;
    private List<QuestionDetailDto> questions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestionDetailDto {
        private Long id;
        private int questionOrder;
        private String questionText;
        private String category;
        private String userAnswer;
        private Double score; // Score out of 10
        private String feedback;
        private String strengths;
        private String areasToImprove;
        private String modelAnswer;
    }
}

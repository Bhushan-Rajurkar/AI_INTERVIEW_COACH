package com.brr.ai_coach_interview.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnswerEvaluationDto {
    private Long questionId;
    private Double score; // Score out of 10 (e.g. 8.5)
    private String feedback;
    private String strengths; // Strengths identified by AI
    private String areasToImprove; // Areas to improve identified by AI
    private String modelAnswer;
    private boolean sessionCompleted;
    private Long nextQuestionId;
}

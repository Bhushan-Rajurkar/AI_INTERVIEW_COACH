package com.brr.ai_coach_interview.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionTypeAnticipationDto {
    private String candidateRole;
    private List<String> topSkillsIdentified;
    private List<String> recommendedFocusAreas;
    private List<QuestionTypeCategory> categories;
    private List<SampleQuestion> allQuestions;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class QuestionTypeCategory {
        private String categoryName;
        private String description;
        private String interviewerGoal;
        private String recommendedStrategy;
        private List<SampleQuestion> sampleQuestions;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SampleQuestion {
        private int id;
        private String questionText;
        private String category;
        private String questionType;
        private String keyTopics;
        private String tipForAnswering;
        private String mustMentionKeywords;
        private String detailedAnswer;
        private String sampleAnswerSummary;
    }
}

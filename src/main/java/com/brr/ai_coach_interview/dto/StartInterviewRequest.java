package com.brr.ai_coach_interview.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StartInterviewRequest {
    private String jobRole; // optional, e.g. "Software Engineer" or inferred from resume
    private String jobDescription; // Target job description or requirements
    private String experienceLevel; // "Junior", "Mid-Level", "Senior"
    
    @Builder.Default
    private String difficulty = "Medium"; // "Easy", "Medium", "Hard"

    @Builder.Default
    private int questionCount = 5;

    private String resumeText; // Extracted plain text of resume
}

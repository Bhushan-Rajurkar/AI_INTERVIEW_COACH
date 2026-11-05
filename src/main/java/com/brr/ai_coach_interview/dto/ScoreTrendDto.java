package com.brr.ai_coach_interview.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScoreTrendDto {
    private Long sessionId;
    private String jobRole;
    private String difficulty;
    private Double overallScore; // Score out of 10
    private LocalDateTime createdAt;
    private String dateLabel; // e.g. "Nov 02"
}


package com.brr.ai_coach_interview.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "interview_questions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InterviewQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private InterviewSession session;

    @Column(name = "question_order", nullable = false)
    private int questionOrder;

    @Column(name = "question_text", nullable = false, length = 1000)
    private String questionText;

    private String category; // Technical, Problem-Solving, Behavioral, Architecture, Resume Project

    @Column(name = "user_answer", columnDefinition = "TEXT")
    private String userAnswer;

    @Column(name = "score")
    private Double score; // Score out of 10 (e.g. 8.5)

    @Column(columnDefinition = "TEXT")
    private String feedback;

    @Column(columnDefinition = "TEXT")
    private String strengths; // Strengths identified by AI

    @Column(name = "areas_to_improve", columnDefinition = "TEXT")
    private String areasToImprove; // Areas to improve identified by AI

    @Column(name = "model_answer", columnDefinition = "TEXT")
    private String modelAnswer;

    @Column(name = "answered_at")
    private LocalDateTime answeredAt;
}

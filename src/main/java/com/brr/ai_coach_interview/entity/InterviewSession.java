package com.brr.ai_coach_interview.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "interview_sessions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class InterviewSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password"})
    private User user;

    @Column(name = "job_role")
    private String jobRole;

    @Column(name = "job_description", columnDefinition = "TEXT")
    private String jobDescription;

    @Column(name = "experience_level")
    private String experienceLevel;

    @Column(name = "difficulty")
    @Builder.Default
    private String difficulty = "Medium"; // Easy, Medium, Hard

    @Column(name = "resume_file_name")
    private String resumeFileName;

    @Column(name = "resume_text", columnDefinition = "TEXT")
    private String resumeText;

    @Column(nullable = false)
    @Builder.Default
    private String status = "IN_PROGRESS"; // IN_PROGRESS, COMPLETED

    @Column(name = "overall_score")
    private Double overallScore; // Average score out of 10 (e.g. 8.2)

    @Column(name = "summary_feedback", columnDefinition = "TEXT")
    private String summaryFeedback;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @OneToMany(mappedBy = "session", cascade = CascadeType.ALL)
    @Builder.Default
    private List<InterviewQuestion> questions = new ArrayList<>();

    /**
     * Defensive setter that maintains the existing collection reference to prevent
     * Hibernate orphan-deletion and collection-unreferenced exceptions.
     */
    public void setQuestions(List<InterviewQuestion> newQuestions) {
        if (this.questions == null) {
            this.questions = new ArrayList<>();
        } else {
            this.questions.clear();
        }
        if (newQuestions != null) {
            this.questions.addAll(newQuestions);
        }
    }
}

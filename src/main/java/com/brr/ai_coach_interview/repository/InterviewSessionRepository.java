package com.brr.ai_coach_interview.repository;

import com.brr.ai_coach_interview.entity.InterviewSession;
import com.brr.ai_coach_interview.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface InterviewSessionRepository extends JpaRepository<InterviewSession, Long> {
    List<InterviewSession> findByUserOrderByCreatedAtDesc(User user);
}


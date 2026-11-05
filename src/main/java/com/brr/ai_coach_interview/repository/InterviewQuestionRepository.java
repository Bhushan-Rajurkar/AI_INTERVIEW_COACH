package com.brr.ai_coach_interview.repository;

import com.brr.ai_coach_interview.entity.InterviewQuestion;
import com.brr.ai_coach_interview.entity.InterviewSession;
import com.brr.ai_coach_interview.entity.User;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InterviewQuestionRepository extends JpaRepository<InterviewQuestion, Long> {
    List<InterviewQuestion> findBySessionOrderByQuestionOrderAsc(InterviewSession session);

    Optional<InterviewQuestion> findFirstBySessionAndUserAnswerIsNullOrderByQuestionOrderAsc(InterviewSession session);

    @Query("SELECT q.questionText FROM InterviewQuestion q WHERE q.session.user = :user ORDER BY q.id DESC")
    List<String> findRecentQuestionTextsByUser(@Param("user") User user, Pageable pageable);
}


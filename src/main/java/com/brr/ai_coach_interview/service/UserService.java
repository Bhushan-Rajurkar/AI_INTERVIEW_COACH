package com.brr.ai_coach_interview.service;

import com.brr.ai_coach_interview.dto.UserProfileDto;
import com.brr.ai_coach_interview.entity.User;
import com.brr.ai_coach_interview.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final CloudinaryService cloudinaryService;

    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new UsernameNotFoundException("User not found: " + username));
    }

    public UserProfileDto getUserProfile(String username) {
        User user = getUserByUsername(username);
        return UserProfileDto.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .profileImageUrl(user.getProfileImageUrl())
                .role(user.getRole())
                .emailVerified(user.isEmailVerified())
                .createdAt(user.getCreatedAt())
                .build();
    }

    @Transactional
    public UserProfileDto updateProfileImage(String username, MultipartFile file) {
        User user = getUserByUsername(username);
        String imageUrl = cloudinaryService.uploadProfileImage(file);
        if (imageUrl != null) {
            user.setProfileImageUrl(imageUrl);
            user = userRepository.save(user);
        }
        return getUserProfile(user.getUsername());
    }
}

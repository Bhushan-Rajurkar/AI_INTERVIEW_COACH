package com.brr.ai_coach_interview.controller;

import com.brr.ai_coach_interview.dto.ApiResponse;
import com.brr.ai_coach_interview.dto.UserProfileDto;
import com.brr.ai_coach_interview.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping({"/me", "/profile"})
    public ResponseEntity<ApiResponse<UserProfileDto>> getCurrentUser(
            @AuthenticationPrincipal UserDetails userDetails) {
        UserProfileDto profile = userService.getUserProfile(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.ok("User profile retrieved", profile));
    }

    @PostMapping(value = "/profile-image", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<UserProfileDto>> updateProfileImage(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam("file") MultipartFile file) {
        UserProfileDto updated = userService.updateProfileImage(userDetails.getUsername(), file);
        return ResponseEntity.ok(ApiResponse.ok("Profile image updated successfully", updated));
    }
}


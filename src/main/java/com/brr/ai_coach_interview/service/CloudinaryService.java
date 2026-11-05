package com.brr.ai_coach_interview.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
public class CloudinaryService {

    private final Cloudinary cloudinary;
    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(".jpg", ".jpeg", ".png", ".webp", ".gif");

    /**
     * Uploads user profile image to Cloudinary and returns the public HTTPS URL.
     */
    public String uploadProfileImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return null;
        }

        String originalFilename = Objects.requireNonNullElse(file.getOriginalFilename(), "profile.png");
        String extension = "";
        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex > 0) {
            extension = originalFilename.substring(dotIndex).toLowerCase();
        }

        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Invalid image file format. Allowed formats: " + ALLOWED_EXTENSIONS);
        }

        try {
            Map uploadParams = ObjectUtils.asMap(
                    "folder", "interview_coach/profiles",
                    "resource_type", "image"
            );

            @SuppressWarnings("unchecked")
            Map<String, Object> uploadResult = cloudinary.uploader().upload(file.getBytes(), uploadParams);

            String secureUrl = (String) uploadResult.get("secure_url");
            if (secureUrl == null) {
                secureUrl = (String) uploadResult.get("url");
            }

            log.info("Uploaded profile image to Cloudinary: {}", secureUrl);
            return secureUrl;
        } catch (IOException e) {
            log.error("Failed to upload image to Cloudinary", e);
            throw new RuntimeException("Could not upload profile image to Cloudinary: " + e.getMessage(), e);
        }
    }
}


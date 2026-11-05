package com.brr.ai_coach_interview.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Slf4j
@Service
public class FileStorageService {

    private final Path uploadLocation;
    private static final List<String> ALLOWED_EXTENSIONS = Arrays.asList(".jpg", ".jpeg", ".png", ".webp", ".gif");

    public FileStorageService(@Value("${app.upload.dir:uploads/profiles}") String uploadDir) {
        this.uploadLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        try {
            Files.createDirectories(this.uploadLocation);
            log.info("File storage initialized at: {}", this.uploadLocation);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize file storage directory", e);
        }
    }

    /**
     * Stores an uploaded profile image and returns the web-accessible URL path.
     */
    public String storeProfileImage(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            return null;
        }

        String originalFilename = StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
        String extension = "";
        int dotIndex = originalFilename.lastIndexOf('.');
        if (dotIndex > 0) {
            extension = originalFilename.substring(dotIndex).toLowerCase();
        }

        if (!ALLOWED_EXTENSIONS.contains(extension)) {
            throw new IllegalArgumentException("Invalid image file format. Allowed formats: " + ALLOWED_EXTENSIONS);
        }

        // Generate unique filename to avoid collision
        String uniqueFilename = UUID.randomUUID().toString() + extension;

        try {
            if (uniqueFilename.contains("..")) {
                throw new IllegalArgumentException("Invalid path sequence in filename");
            }

            Path targetLocation = this.uploadLocation.resolve(uniqueFilename);
            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, targetLocation, StandardCopyOption.REPLACE_EXISTING);
            }

            log.info("Profile image stored: {}", uniqueFilename);
            // Return public web path
            return "/uploads/profiles/" + uniqueFilename;
        } catch (IOException e) {
            log.error("Failed to store file {}", originalFilename, e);
            throw new RuntimeException("Could not store image file", e);
        }
    }
}


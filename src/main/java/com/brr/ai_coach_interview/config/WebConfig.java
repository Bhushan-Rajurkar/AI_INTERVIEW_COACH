package com.brr.ai_coach_interview.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${app.upload.dir:uploads/profiles}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        Path uploadPath = Paths.get(uploadDir).toAbsolutePath().normalize();
        String uploadResourceLocation = uploadPath.toUri().toString();

        if (!uploadResourceLocation.endsWith("/")) {
            uploadResourceLocation += "/";
        }

        registry.addResourceHandler("/uploads/profiles/**")
                .addResourceLocations(uploadResourceLocation);

        Path rootUploadsPath = Paths.get("uploads").toAbsolutePath().normalize();
        String rootUploadsLocation = rootUploadsPath.toUri().toString();
        if (!rootUploadsLocation.endsWith("/")) {
            rootUploadsLocation += "/";
        }
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(rootUploadsLocation);
    }
}


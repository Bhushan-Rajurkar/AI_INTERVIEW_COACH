package com.brr.ai_coach_interview;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.BufferedReader;
import java.io.File;
import java.io.FileReader;

@SpringBootApplication
public class AiCoachInterviewApplication {

    public static void main(String[] args) {
        loadEnvFile();
        SpringApplication.run(AiCoachInterviewApplication.class, args);
    }

    /**
     * Reads key-value pairs from .env in project root and registers them as System properties
     * before the Spring context initializes, allowing application.properties placeholders to resolve seamlessly.
     */
    private static void loadEnvFile() {
        File envFile = new File(".env");
        if (!envFile.exists() || !envFile.isFile()) {
            return;
        }
        try (BufferedReader reader = new BufferedReader(new FileReader(envFile))) {
            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if (line.isEmpty() || line.startsWith("#") || !line.contains("=")) {
                    continue;
                }
                int eqIdx = line.indexOf('=');
                String key = line.substring(0, eqIdx).trim();
                String value = line.substring(eqIdx + 1).trim();

                // Strip surrounding quotes if present
                if (value.startsWith("\"") && value.endsWith("\"") && value.length() >= 2) {
                    value = value.substring(1, value.length() - 1);
                } else if (value.startsWith("'") && value.endsWith("'") && value.length() >= 2) {
                    value = value.substring(1, value.length() - 1);
                }

                // Do not override properties already supplied via command-line (-Dkey=value) or OS environment
                if (System.getProperty(key) == null && System.getenv(key) == null) {
                    System.setProperty(key, value);
                }
            }
        } catch (Exception ignored) {
            // Gracefully continue with system environment variables or defaults
        }
    }

}

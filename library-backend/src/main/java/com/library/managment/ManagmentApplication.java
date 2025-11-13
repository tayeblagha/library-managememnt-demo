package com.library.managment;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling

public class ManagmentApplication {

	public static void main(String[] args) {
		SpringApplication.run(ManagmentApplication.class, args);
	}

}

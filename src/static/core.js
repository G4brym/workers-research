function loadNewResearch() {
	console.log("loaded");
	// HTMX event handlers
	document.addEventListener("htmx:beforeRequest", (evt) => {
		const query = document.getElementById("initial-query").value.trim();
		if (!query) {
			evt.preventDefault();
			alert("Please enter a research question before proceeding.");
			return;
		}

		// Disable the button during request
		document.getElementById("generate-questions-btn").disabled = true;
	});

	document.addEventListener("htmx:afterRequest", (evt) => {
		// Re-enable the button
		document.getElementById("generate-questions-btn").disabled = false;

		if (evt.detail.successful) {
			// Scroll to follow-up section
			document.getElementById("followup-section").scrollIntoView({
				behavior: "smooth",
				block: "start",
			});

			// Set up the final form
			setupFinalForm();
		} else {
			console.error("Error generating questions:", evt.detail.xhr.responseText);
			alert("Failed to generate questions. Please try again.");
		}
	});

	function setupFinalForm() {
		const originalQuery = document.getElementById("initial-query").value;
		document.getElementById("original-query-hidden").value = originalQuery;
		const originalDepth = document.getElementById("initial-depth").value;
		document.getElementById("depth-hidden").value = originalDepth;
		const originalBreadth = document.getElementById("initial-breadth").value;
		document.getElementById("breadth-hidden").value = originalBreadth;

		// Add event listener to start research button when it's created
		setTimeout(() => {
			const startBtn = document.getElementById("start-research-btn");
			if (startBtn) {
				startBtn.addEventListener("click", (e) => {
					e.preventDefault();

					// Validate all questions are answered
					const questions = document.querySelectorAll(
						"#followup-section input, #followup-section textarea, #followup-section select",
					);
					let allAnswered = true;

					questions.forEach((question) => {
						if (!question.value.trim()) {
							allAnswered = false;
							question.classList.add("border-red-500");
						} else {
							question.classList.remove("border-red-500");
						}
					});

					if (!allAnswered) {
						alert("Please answer all questions before starting the research.");
						return;
					}

					// Show loading state
					startBtn.disabled = true;
					startBtn.innerHTML = `
                            <svg class="animate-spin h-4 w-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Starting Research...
                        `;

					// Copy all question answers to final form
					const finalForm = document.getElementById("final-form");

					// Clear existing question fields
					const existingFields = finalForm.querySelectorAll(
						'input[name^="question_"], input[name^="answer_"]',
					);
					existingFields.forEach((field) => field.remove());

					// Add questions and answers
					questions.forEach((input, index) => {
						const questionText = input
							.closest(".question-item")
							.querySelector(".question-text").textContent;

						// Add question
						const questionField = document.createElement("input");
						questionField.type = "hidden";
						questionField.name = `question`;
						questionField.value = questionText;
						finalForm.appendChild(questionField);

						// Add answer
						const answerField = document.createElement("input");
						answerField.type = "hidden";
						answerField.name = `answer`;
						answerField.value = input.value;
						finalForm.appendChild(answerField);
					});

					// Submit the final form
					finalForm.submit();
				});
			}
		}, 100);
	}

	// Handle textarea auto-resize
	document.addEventListener("input", (e) => {
		if (e.target.tagName === "TEXTAREA") {
			e.target.style.height = "auto";
			e.target.style.height = e.target.scrollHeight + "px";
		}
	});
}

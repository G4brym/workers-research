function loadNewResearch() {
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
		const initialLearnings = document.getElementById("initial-learnings").value;
		document.getElementById("initial-learnings-hidden").value = initialLearnings;

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

document.addEventListener("DOMContentLoaded", () => {
	document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
		anchor.addEventListener("click", function (e) {
			e.preventDefault();
			document.querySelector(this.getAttribute("href"))?.scrollIntoView({
				behavior: "smooth",
			});
		});
	});
});

function loadResearchList() {
	// Add interactive functionality
	document.addEventListener("DOMContentLoaded", () => {
		// Search functionality
		const searchInput = document.querySelector('input[type="text"]');
		searchInput.addEventListener("input", (e) => {
			// In a real app, this would filter the results
			console.log("Searching for:", e.target.value);
		});

		// Filter dropdowns
		const filterSelects = document.querySelectorAll("select");
		filterSelects.forEach((select) => {
			select.addEventListener("change", (e) => {
				// In a real app, this would filter the results
				console.log("Filter changed:", e.target.value);
			});
		});

		// Action buttons
		const actionButtons = document.querySelectorAll("button");
		actionButtons.forEach((button) => {
			if (
				button.textContent.includes("View") ||
				button.textContent.includes("Continue") ||
				button.textContent.includes("Retry")
			) {
				button.addEventListener("click", (e) => {
					e.preventDefault();
					console.log("Action clicked:", button.textContent);
					// In a real app, this would navigate to the appropriate page
				});
			}
		});
	});
}

function rerun(id) {
	if (confirm("Are you sure you want to rerun this item?")) {
		const form = document.createElement("form");
		form.method = "POST";
		form.action = "/re-run";

		const idField = document.createElement("input");
		idField.type = "hidden";
		idField.name = "id";
		idField.value = id;

		form.appendChild(idField);
		document.body.appendChild(form);
		form.submit();
	}
}

function deleteItem(id) {
	if (confirm("Are you sure you want to delete this item?")) {
		const form = document.createElement("form");
		form.method = "POST";
		form.action = "/delete";

		const idField = document.createElement("input");
		idField.type = "hidden";
		idField.name = "id";
		idField.value = id;

		form.appendChild(idField);
		document.body.appendChild(form);
		form.submit();
	}
}
